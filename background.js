'use strict';
importScripts('core.js');
const C = MWColors;
const BLOCK_KEY = 'mwcf-pause-until-v1';
let queue = Promise.resolve(), lastFetch = 0;
let loaded = null;
const inFlight = new Map();
function trusted(sender) {
  if (sender.id !== chrome.runtime.id) return false;
  try { return new URL(sender.url || sender.tab?.url || '').origin === 'https://makerworld.com'; }
  catch { return false; }
}
async function cache() {
  if (!loaded) loaded = chrome.storage.local.get(C.CACHE_KEY).then(data => data[C.CACHE_KEY] || {}).catch(() => ({}));
  return loaded;
}
async function remember(model) {
  const data = await cache();
  data[model.id] = model;
  const items = Object.values(data).sort((a, b) => b.fetchedAt - a.fetchedAt).slice(0, C.LIMITS.cache);
  const trimmed = {}; let size = 0;
  for (const item of items) {
    const length = JSON.stringify(item).length;
    if (size + length > 2000000) continue;
    trimmed[item.id] = item; size += length;
  }
  loaded = Promise.resolve(trimmed);
  await chrome.storage.local.set({[C.CACHE_KEY]: await loaded});
}
class RequestError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
async function readResponse(response) {
  if ([401, 403, 429].includes(response.status)) {
    const seconds = Number(response.headers.get('Retry-After'));
    const duration = Number.isFinite(seconds) && seconds > 0 ? Math.max(15 * 60000, seconds * 1000) : 15 * 60000;
    await chrome.storage.local.set({[BLOCK_KEY]: Date.now() + Math.min(duration, 86400000)});
    throw new RequestError('blocked', 'A consulta foi pausada pelo site. Tente novamente mais tarde.');
  }
  if (!response.ok) throw new RequestError('http-' + response.status, 'O serviço respondeu ' + response.status + '.');
  const declared = Number(response.headers.get('content-length'));
  if (declared > 6000000) throw new RequestError('large', 'Resposta maior que o limite de leitura.');
  const text = await response.text();
  if (text.length > 6000000) throw new RequestError('large', 'Resposta maior que o limite de leitura.');
  if (/^\s*</.test(text) && /cf-chl-|verify you are human|checking your browser|just a moment\.\.\.|captcha-container/i.test(text)) {
    await chrome.storage.local.set({[BLOCK_KEY]: Date.now() + 15 * 60000});
    throw new RequestError('blocked', 'O site pediu uma verificação. A análise foi pausada.');
  }
  return text;
}
async function getModel(id) {
  const blocked = await chrome.storage.local.get(BLOCK_KEY);
  if (Number(blocked[BLOCK_KEY]) > Date.now()) throw new RequestError('blocked', 'Consultas pausadas temporariamente pelo site. Abra um modelo normalmente ou aguarde 15 minutos.');
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - (Date.now() - lastFetch))));
  lastFetch = Date.now();
  let model = null;
  try {
    // Public model metadata only. No bearer token, login, download, or visit-history mutation.
    const response = await fetch('https://api.bambulab.com/v1/design-service/design/' + id, {
      credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000), headers: {'Accept': 'application/json'}
    });
    const raw = await readResponse(response);
    try { model = C.extractModel(JSON.parse(raw), id); } catch { /* May be an ordinary HTML response. */ }
  } catch (error) {
    if (error.code === 'blocked' || error.name === 'TimeoutError' || error.name === 'AbortError') throw error;
    // A missing endpoint can still have its public metadata in the model page.
    if (error.code && error.code !== 'http-404') throw error;
  }
  if (!model?.profiles.some(p => p.colors.length)) {
    const response = await fetch('https://makerworld.com/pt/models/' + id, {
      credentials: 'include', redirect: 'follow', signal: AbortSignal.timeout(15000), headers: {'Accept': 'text/html'}
    });
    const raw = await readResponse(response);
    model = C.embeddedModels(raw, id) || model;
  }
  model ||= {id, title: '', profiles: [], fetchedAt: Date.now()};
  await remember(model);
  return model;
}
async function lookup(id) {
  const found = (await cache())[id];
  if (C.cacheFresh(found)) return found;
  if (inFlight.has(id)) return inFlight.get(id);
  const work = queue.then(() => getModel(id));
  queue = work.catch(() => {});
  inFlight.set(id, work);
  try { return await work; } finally { inFlight.delete(id); }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!trusted(sender)) return false;
  let task;
  if (message?.type === 'MWCF_LOOKUP' && /^\d{1,12}$/.test(String(message.id))) {
    task = lookup(String(message.id)).then(model => ({ok: true, model}));
  } else if (message?.type === 'MWCF_CACHED') {
    const ids = Array.isArray(message.ids) ? message.ids.filter(id => /^\d{1,12}$/.test(String(id))).slice(0, 1000) : [];
    task = cache().then(data => ({ok: true, models: Object.fromEntries(ids.filter(id => C.cacheFresh(data[id])).map(id => [id, data[id]]))}));
  } else if (message?.type === 'MWCF_OBSERVED' && /^\d{1,12}$/.test(String(message.id))) {
    // Re-parse only public filament fields; never store raw page JSON or account data.
    const model = C.extractModel(message.payload, String(message.id));
    if (!model?.profiles.some(p => p.colors.length)) return false;
    task = remember(model).then(() => ({ok: true, model}));
  } else if (message?.type === 'MWCF_CLEAR_CACHE') {
    task = queue.then(async () => {
      loaded = Promise.resolve({});
      await chrome.storage.local.remove(C.CACHE_KEY);
      return {ok: true};
    });
  } else return false;
  task.catch(error => ({ok: false, code: error.code || 'network', error: error.name === 'TimeoutError' ? 'A consulta demorou demais. Tente novamente depois.' : 'Não foi possível consultar este modelo. ' + String(error.message || '').slice(0, 180)})).then(reply);
  return true;
});
chrome.action.onClicked.addListener(async tab => {
  if (!tab?.id) return;
  try {
    if (new URL(tab.url || '').origin === 'https://makerworld.com') await chrome.tabs.sendMessage(tab.id, {type: 'MWCF_TOGGLE_PANEL'});
    else await chrome.tabs.create({url: 'https://makerworld.com/pt'});
  } catch { /* An older page needs a normal reload after installing the extension. */ }
});
