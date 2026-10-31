(async function () {
  'use strict';
  if (document.getElementById('mwcf-root')) return;
  const C = MWColors;
  let settings = C.sanitizeSettings(), open = false, running = false, stopRequested = false, token = 0;
  let notice = 'Escolha suas cores e analise os modelos desta página.';
  let currentId = null, focusedId = null, refreshTimer = null, lastUrl = location.href;
  const cards = new Map(), models = new Map(), errors = new Map();
  const host = document.createElement('div');
  host.id = 'mwcf-root';
  host.setAttribute('data-mwcf-owned', '1');
  host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483646;line-height:normal;color-scheme:light;';
  const shadow = host.attachShadow({mode: 'open'});
  // All interpolated content below is static. Remote titles/colour names use textContent.
  shadow.innerHTML = `
    <style>
    :host{all:initial;font:13px/1.45 system-ui,-apple-system,sans-serif;color:#202b31;color-scheme:light}
    *{box-sizing:border-box}button,input,select{font:inherit}button,a,input,select{-webkit-tap-highlight-color:transparent}
    button{cursor:pointer}button:disabled{cursor:default;opacity:.5}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #2768c9;outline-offset:2px}
    [hidden]{display:none!important}.launcher{display:flex;align-items:center;gap:8px;border:1px solid #244b3d;border-radius:99px;background:#153e30;color:white;padding:12px 17px;box-shadow:0 5px 20px #0002;font-weight:700}
    .launcher svg{width:17px;height:17px}.panel{width:360px;max-width:calc(100vw - 28px);max-height:calc(100dvh - 36px);overflow-y:auto;overscroll-behavior:contain;border:1px solid #d3ddda;border-radius:18px;background:#fff;box-shadow:0 12px 50px #142a2830;}
    header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 18px 12px;background:#f1f7f3;border-radius:17px 17px 0 0}h2{font-size:18px;letter-spacing:-.4px;margin:0}header small{display:block;color:#547062;font-size:11px;margin-top:3px}header button{border:0;border-radius:8px;background:#e0eae3;color:#213f32;width:30px;height:30px;font-size:20px}
    .body{padding:14px 18px 17px}p{margin:0 0 12px}.muted{font-size:11px;line-height:1.5;color:#5d6b73}.label{display:block;margin:12px 0 6px;font-size:12px;font-weight:700}
    .palette{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.swatch{display:flex;align-items:center;gap:6px;border:1px solid #dce3df;background:#fff;border-radius:9px;color:#485951;padding:8px 6px;font-size:11px;min-width:0;text-align:left}.swatch[aria-pressed=true]{border-color:#408363;background:#eaf5ef;color:#153e30;font-weight:700}.dot{display:inline-block;border:1px solid #0003;border-radius:50%;flex:none;width:15px;height:15px}.swatch .name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tick{margin-left:auto;font-size:11px;min-width:9px}
    select,input[type=text]{width:100%;border:1px solid #cbd6cf;border-radius:8px;padding:8px;background:#fff;color:#233b30}input[type=checkbox]{accent-color:#276447;width:15px;height:15px;flex:none;margin:2px 0 0}
    .check{display:flex;align-items:flex-start;gap:8px;font-size:12px;margin:10px 0}.check span{flex:1}.check small{display:block;font-size:10px;color:#66756d;margin-top:3px}details{margin-top:12px;border-top:1px solid #edf0ee;padding-top:10px}summary{cursor:pointer;font-size:12px;color:#405a4c;font-weight:600}.row{display:flex;align-items:center;gap:7px;margin-top:9px}.row input[type=color]{height:33px;width:40px;padding:2px;border:1px solid #cbd6cf;border-radius:7px;background:#fff;flex:none}.row input[type=text]{font-size:11px;min-width:0}.secondary{border:1px solid #cbd6cf;border-radius:8px;background:white;color:#325542;padding:8px 10px;white-space:nowrap;font-size:11px}
    .actions{display:flex;gap:7px;margin-top:15px}.primary{flex:1;border:0;border-radius:9px;background:#1c5c3e;color:white;padding:11px;font-size:12px;font-weight:700}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:12px 0}.stat{border-radius:9px;background:#f3f6f4;padding:8px 5px;text-align:center;font-size:10px;color:#536459}.stat strong{display:block;color:#233e30;font-size:18px}.status{min-height:34px;overflow-wrap:anywhere;font-size:11px;color:#425d4c;margin:8px 0 0}progress{width:100%;height:5px;accent-color:#287f50;margin-top:8px}.fine{margin-top:10px;font-size:10px;line-height:1.5;color:#68786e}.model-box{border-top:1px solid #e1e8e2;margin-top:13px;padding-top:12px}.model-box h3{font-size:12px;margin:0 0 8px;overflow-wrap:anywhere}.model-box a{color:#215f44;text-decoration:underline;font-size:11px}.profile{margin:8px 0;border:1px solid #e0e7e2;border-radius:8px;padding:8px;font-size:11px}.profile-title{font-weight:600;display:block;overflow-wrap:anywhere}.colors{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}.colors .dot{width:16px;height:16px}.result{font-size:11px;color:#405f4b}.edit-list{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}.edit-item{display:flex;align-items:center;gap:5px;font-size:10px}.edit-item input{width:27px;height:24px;padding:0;border:1px solid #ddd;border-radius:4px;background:white}.edit-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tone-info{font-size:10px;color:#69766e;margin:5px 0}
    @media(prefers-reduced-motion:no-preference){.launcher:hover{transform:translateY(-1px)}}
    </style>
    <button class="launcher" id="launch" aria-expanded="false" aria-controls="panel" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 4h18l-7 8v7l-4 2v-9z"/></svg><span id="launch-label">Minhas cores</span></button>
    <section class="panel" id="panel" aria-label="Filtrar MakerWorld por cores" hidden>
      <header><div><h2>Minhas cores</h2><small>Filtro pessoal para o MakerWorld</small></div><button id="close" aria-label="Recolher painel" type="button">×</button></header>
      <div class="body">
        <p class="muted">Um modelo entra quando pelo menos um perfil de impressão usa suas cores. A análise usa os filamentos informados no perfil.</p>
        <div class="palette" id="palette" aria-label="Filamentos disponíveis"></div>
        <label class="label" for="mode">Como comparar</label><select id="mode"><option value="family">Família de cor — aceita outros tons</option><option value="tone">Tom semelhante — compara o RGB</option></select>
        <p class="tone-info" id="tone-info">Ex.: verde claro e verde escuro contam como verde.</p>
        <label class="check"><input id="flexible" type="checkbox"><span>Aceitar qualquer modelo de uma cor<small>Você escolhe uma das suas cores ao imprimir.</small></span></label>
        <label class="check"><input id="enabled" type="checkbox"><span>Filtro ligado</span></label>
        <label class="check"><input id="hide-incompatible" type="checkbox"><span>Ocultar incompatíveis</span></label>
        <label class="check"><input id="hide-unknown" type="checkbox"><span>Ocultar analisados sem dados de cor<small>Os ainda não analisados continuam visíveis.</small></span></label>
        <div class="actions"><button class="primary" id="analyze" type="button">Analisar até 20 modelos</button><button class="secondary" id="stop" type="button" disabled>Parar</button></div>
        <progress id="progress" max="1" value="0" aria-label="Progresso da análise" hidden></progress>
        <div class="stats"><div class="stat"><strong id="compatible-count">0</strong>Compatíveis</div><div class="stat"><strong id="incompatible-count">0</strong>Falta cor</div><div class="stat"><strong id="unknown-count">0</strong>Sem análise / dados</div></div>
        <p class="status" id="status" role="status" aria-live="polite"></p>
        <p class="fine">Escolha “mais baixados” no MakerWorld: o filtro mantém a ordem original. Role a página para carregar outros modelos e analise o próximo lote.</p>
        <div class="model-box" id="model-box" hidden></div>
        <details><summary>Ajustar filamentos e cache</summary><p class="fine">Altere os tons abaixo para aproximar o filtro dos seus rolos. A comparação por família é aproximada; confirme o perfil antes de imprimir.</p><div class="edit-list" id="edit-list"></div><div class="row"><input type="text" id="new-name" aria-label="Nome da nova cor" placeholder="Nome da cor" maxlength="40"><input type="color" id="new-color" aria-label="Nova cor" value="#FFFFFF"><button class="secondary" id="add" type="button">Adicionar</button></div><div class="row"><button class="secondary" id="clear-cache" type="button">Limpar cache</button><button class="secondary" id="reset" type="button">Restaurar cores</button></div><p class="fine">As preferências e os dados públicos de cor ficam neste navegador. Nenhum arquivo 3MF é baixado.</p></details>
      </div>
    </section>`;
  document.body.append(host);
  const $ = id => shadow.getElementById(id);
  const send = async message => {
    try { return await chrome.runtime.sendMessage(message); }
    catch { return {ok: false, code: 'extension', error: 'Recarregue esta página depois de instalar ou atualizar a extensão.'}; }
  };
  function setOpen(value) {
    open = value;
    $('panel').hidden = !open;
    $('launch').hidden = open;
    $('launch').setAttribute('aria-expanded', String(open));
    if (open) { refresh(); $('close').focus(); }
  }
  function status(text) { notice = text; $('status').textContent = notice; }
  async function save() {
    settings = C.sanitizeSettings(settings);
    try { await chrome.storage.local.set({[C.SETTINGS_KEY]: settings}); }
    catch { status('Não foi possível salvar as preferências. Recarregue a página.'); }
    renderControls(); applyAll();
  }
  function renderControls() {
    $('mode').value = settings.mode;
    $('tone-info').textContent = settings.mode === 'family' ? 'Ex.: verde claro e verde escuro contam como verde.' : 'Ajuste abaixo o tom do seu rolo. É uma aproximação por RGB, não uma medição física.';
    $('enabled').checked = settings.enabled;
    $('hide-incompatible').checked = settings.hideIncompatible;
    $('hide-unknown').checked = settings.hideUnknown;
    $('flexible').checked = settings.flexibleSingle;
    $('launch-label').textContent = 'Minhas cores · ' + settings.inventory.filter(c => c.enabled).length;
    $('palette').replaceChildren(); $('edit-list').replaceChildren();
    settings.inventory.forEach((color, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'swatch';
      button.setAttribute('aria-pressed', String(color.enabled)); button.title = color.name + ' · ' + color.hex;
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.backgroundColor = color.hex;
      const name = document.createElement('span'); name.className = 'name'; name.textContent = color.name;
      const tick = document.createElement('span'); tick.className = 'tick'; tick.textContent = color.enabled ? '✓' : ''; tick.setAttribute('aria-hidden', 'true');
      button.append(dot, name, tick); button.addEventListener('click', () => { settings.inventory[index].enabled = !settings.inventory[index].enabled; save(); });
      $('palette').append(button);
      const label = document.createElement('label'); label.className = 'edit-item';
      const input = document.createElement('input'); input.type = 'color'; input.value = color.hex.slice(0, 7); input.setAttribute('aria-label', 'Tom do filamento ' + color.name);
      input.addEventListener('change', () => { settings.inventory[index].hex = input.value; save(); });
      const text = document.createElement('span'); text.textContent = color.name;
      label.append(input, text); $('edit-list').append(label);
    });
    $('add').disabled = settings.inventory.length >= 40;
    updateStats();
  }
  function allIds(element) {
    const ids = new Set();
    if (element.matches?.('a[href]')) { const id = C.modelId(element.href); if (id) ids.add(id); }
    for (const link of element.querySelectorAll('a[href*="/models/"]')) { const id = C.modelId(link.href); if (id) ids.add(id); if (ids.size > 1) break; }
    return ids;
  }
  function cardFor(link, id) {
    let candidate = link.querySelector('img,picture,video') ? link : null;
    let node = link;
    for (let depth = 0; depth < 5 && node?.parentElement; depth++) {
      node = node.parentElement;
      if (['BODY', 'HTML', 'MAIN', 'NAV', 'HEADER', 'FOOTER'].includes(node.tagName)) break;
      if (node.closest('[data-mwcf-owned]')) break;
      const ids = allIds(node);
      if (ids.size !== 1 || !ids.has(id)) break;
      const rect = node.getBoundingClientRect();
      if (rect.width > 740 || rect.height > 800) break;
      if (node.querySelector('img,picture,video')) candidate = node;
      if (/card/i.test(node.className || '') || node.tagName === 'ARTICLE') break;
    }
    return candidate;
  }
  async function hydrate() {
    const ids = [...cards.keys()].filter(id => !models.has(id));
    if (!ids.length) return;
    const result = await send({type: 'MWCF_CACHED', ids});
    if (result?.ok) for (const [id, model] of Object.entries(result.models || {})) models.set(id, model);
    applyAll();
  }
  function refresh() {
    currentId = C.modelId(location.href);
    const next = new Map();
    for (const link of (currentId ? [] : document.querySelectorAll('a[href*="/models/"]'))) {
      if (link.closest('[data-mwcf-owned]')) continue;
      const id = C.modelId(link.href);
      if (!id || id === currentId) continue;
      const card = cardFor(link, id);
      if (!card) continue;
      if (!next.has(id)) next.set(id, new Set());
      next.get(id).add(card);
    }
    // Restore nodes that cease to be cards, e.g. after SPA navigation or recycling.
    for (const [id, nodes] of cards) for (const node of nodes) {
      if (!next.get(id)?.has(node)) {
        node.removeAttribute('data-mwcf-hidden');
        for (const badge of node.querySelectorAll('.mwcf-badge')) badge.remove();
      }
    }
    cards.clear(); for (const [id, nodes] of next) cards.set(id, nodes);
    applyAll(); hydrate();
  }
  function resultFor(id) {
    if (models.has(id)) return C.evaluate(models.get(id), settings);
    if (errors.has(id)) return {status: 'error', reason: errors.get(id)};
    return {status: 'unscanned', reason: 'Ainda não analisado'};
  }
  function labelFor(result) {
    if (result.status === 'compatible') return '✓ Cores compatíveis' + (result.best?.flexible ? ' · 1 cor' : '');
    if (result.status === 'incompatible') return '× ' + result.reason;
    if (result.status === 'error') return '? Consulta indisponível';
    if (result.status === 'unknown') return '? Cores não informadas';
    return '○ Cores: não analisado';
  }
  function applyAll() {
    for (const [id, nodes] of cards) {
      const result = resultFor(id);
      for (const node of nodes) {
        const hidden = settings.enabled && ((settings.hideIncompatible && result.status === 'incompatible') || (settings.hideUnknown && result.status === 'unknown'));
        if (hidden) node.setAttribute('data-mwcf-hidden', '1'); else node.removeAttribute('data-mwcf-hidden');
        let badge = [...node.children].find(n => n.classList?.contains('mwcf-badge'));
        if (!badge) {
          badge = document.createElement('span'); badge.className = 'mwcf-badge'; badge.setAttribute('data-mwcf-owned', '1');
          badge.setAttribute('role', 'button'); badge.tabIndex = 0;
          const show = event => { event.preventDefault(); event.stopPropagation(); focusedId = id; setOpen(true); renderDetails(); };
          badge.addEventListener('click', show);
          badge.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') show(e); });
          node.append(badge);
        }
        badge.hidden = !settings.enabled;
        badge.dataset.state = result.status;
        const label = labelFor(result);
        if (badge.textContent !== label) badge.textContent = label;
        badge.title = result.reason + '. Clique para ver os perfis.';
      }
    }
    updateStats(); renderDetails();
  }
  function updateStats() {
    let compatible = 0, incompatible = 0, unknown = 0;
    const ids = new Set([...cards.keys(), ...(currentId ? [currentId] : [])]);
    for (const id of ids) { const r = resultFor(id); if (r.status === 'compatible') compatible++; else if (r.status === 'incompatible') incompatible++; else unknown++; }
    $('compatible-count').textContent = String(compatible); $('incompatible-count').textContent = String(incompatible); $('unknown-count').textContent = String(unknown);
    $('analyze').disabled = running || !settings.inventory.some(c => c.enabled);
    $('stop').disabled = !running || stopRequested;
    $('status').textContent = notice;
  }
  function renderDetails() {
    const id = focusedId || currentId, box = $('model-box');
    if (!id) { box.hidden = true; return; }
    box.hidden = false; box.replaceChildren();
    const model = models.get(id), result = resultFor(id);
    const h = document.createElement('h3'); h.textContent = model?.title || (id === currentId ? 'Modelo aberto' : 'Modelo ' + id);
    const p = document.createElement('p'); p.className = 'result'; p.textContent = labelFor(result);
    box.append(h, p);
    if (result.status === 'error') { const note = document.createElement('p'); note.className = 'muted'; note.textContent = result.reason; box.append(note); }
    for (const profile of (result.profiles || []).slice(0, 30)) {
      const item = document.createElement('div'); item.className = 'profile';
      const title = document.createElement('span'); title.className = 'profile-title'; title.textContent = profile.title;
      const colors = document.createElement('div'); colors.className = 'colors';
      for (const color of profile.colors) {
        const dot = document.createElement('span'); dot.className = 'dot'; dot.style.backgroundColor = color; dot.title = C.familyName(color) + ' · ' + color; dot.setAttribute('role', 'img'); dot.setAttribute('aria-label', dot.title); colors.append(dot);
      }
      const state = document.createElement('span'); state.className = 'result';
      state.textContent = !profile.complete ? '? Dados de cor incompletos' : profile.compatible ? '✓ Compatível' + (profile.flexible ? ' com troca de cor' : '') : '× Falta: ' + [...new Set(profile.missing.map(C.familyName))].join(', ');
      item.append(title, colors, state);
      if (/^\d+$/.test(profile.id)) {
        const a = document.createElement('a'); a.href = 'https://makerworld.com/pt/models/' + id + '#profileId=' + profile.id; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Abrir este perfil ↗'; a.style.cssText = 'display:block;margin-top:5px'; item.append(a);
      }
      box.append(item);
    }
  }
  async function observeCurrent() {
    const id = C.modelId(location.href);
    if (!id) return;
    for (const script of document.querySelectorAll('script#__NEXT_DATA__,script[type="application/json"]')) {
      if (script.textContent.length > 6000000) continue;
      try {
        const model = C.extractModel(JSON.parse(script.textContent), id);
        if (!model?.profiles.some(p => p.colors.length)) continue;
        models.set(id, model); errors.delete(id); applyAll();
        const payload = {id, title: model.title, instances: model.profiles.map(p => ({id: p.id, title: p.title, isDefault: p.isDefault, materialColorCnt: p.colors.length + p.unknown, instanceFilaments: p.colors.map(color => ({color}))}))};
        await send({type: 'MWCF_OBSERVED', id, payload});
        return;
      } catch { /* Not a JSON model payload. */ }
    }
    const cached = await send({type: 'MWCF_CACHED', ids: [id]});
    if (cached?.ok && cached.models?.[id]) { models.set(id, cached.models[id]); applyAll(); }
  }
  async function analyze() {
    if (running || !settings.inventory.some(c => c.enabled)) return;
    refresh();
    const ids = [...new Set([...(currentId ? [currentId] : []), ...cards.keys()])].filter(id => !models.has(id)).slice(0, C.LIMITS.batch);
    if (!ids.length) { status('Os modelos carregados já foram analisados. Role a página para carregar mais.'); return; }
    running = true; stopRequested = false; const myToken = ++token; let done = 0, blocked = false;
    $('progress').hidden = false; $('progress').max = ids.length; $('progress').value = 0; updateStats();
    try {
      for (const id of ids) {
        if (stopRequested || myToken !== token) break;
        status('Analisando ' + (done + 1) + ' de ' + ids.length + '…');
        const response = await send({type: 'MWCF_LOOKUP', id});
        if (myToken !== token) break;
        if (response?.ok) { models.set(id, response.model); errors.delete(id); }
        else {
          const message = response?.error || 'Consulta indisponível. Tente novamente mais tarde.';
          errors.set(id, message);
          if (response?.code === 'blocked') { blocked = true; status(message); break; }
        }
        done++; $('progress').value = done; applyAll();
      }
      if (!blocked && myToken === token) status(!stopRequested ? 'Lote concluído: ' + done + ' modelos analisados. Role a página para carregar mais.' : 'Análise interrompida. Os resultados obtidos foram mantidos.');
    } finally { if (myToken === token) { running = false; $('progress').hidden = true; applyAll(); } }
  }
  $('launch').addEventListener('click', () => setOpen(true));
  $('close').addEventListener('click', () => { setOpen(false); $('launch').focus(); });
  shadow.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { setOpen(false); $('launch').focus(); } });
  $('analyze').addEventListener('click', analyze);
  $('stop').addEventListener('click', () => { stopRequested = true; status('Parando após a consulta atual…'); updateStats(); });
  const binding = {'enabled': 'enabled', 'hide-incompatible': 'hideIncompatible', 'hide-unknown': 'hideUnknown', 'flexible': 'flexibleSingle'};
  Object.entries(binding).forEach(([id, setting]) => $(id).addEventListener('change', () => { settings[setting] = $(id).checked; save(); }));
  $('mode').addEventListener('change', () => { settings.mode = $('mode').value; save(); });
  $('add').addEventListener('click', () => {
    if (settings.inventory.length >= 40) return;
    const hex = $('new-color').value;
    settings.inventory.push({id: 'custom-' + Date.now(), name: $('new-name').value.trim() || C.familyName(hex), hex, enabled: true});
    $('new-name').value = ''; save();
  });
  $('reset').addEventListener('click', () => { settings.inventory = C.clone(C.DEFAULTS.inventory); save(); status('Branco, preto, verde e vermelho selecionados.'); });
  $('clear-cache').addEventListener('click', async () => {
    if (running) { status('Pare a análise antes de limpar o cache.'); return; }
    const result = await send({type: 'MWCF_CLEAR_CACHE'});
    if (result?.ok) { models.clear(); errors.clear(); applyAll(); status('Cache de cores limpo. Você pode analisar novamente.'); }
    else status(result?.error || 'Não foi possível limpar o cache.');
  });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === 'MWCF_TOGGLE_PANEL') { setOpen(!open); reply({ok: true}); }
    return false;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[C.SETTINGS_KEY]) { settings = C.sanitizeSettings(changes[C.SETTINGS_KEY].newValue); renderControls(); applyAll(); }
    if (changes[C.CACHE_KEY]?.newValue) {
      const cache = changes[C.CACHE_KEY].newValue;
      for (const id of [...cards.keys(), ...(currentId ? [currentId] : [])]) if (C.cacheFresh(cache[id])) { models.set(id, cache[id]); errors.delete(id); }
      applyAll();
    } else if (changes[C.CACHE_KEY] && !changes[C.CACHE_KEY].newValue) {
      models.clear(); errors.clear(); applyAll();
    }
  });
  try { const stored = await chrome.storage.local.get(C.SETTINGS_KEY); settings = C.sanitizeSettings(stored[C.SETTINGS_KEY]); } catch { /* Defaults stay available. */ }
  renderControls(); refresh(); observeCurrent();
  const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(m => {
      if ((m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest?.('[data-mwcf-owned]')) return false;
      const changed = [...m.addedNodes, ...m.removedNodes];
      return changed.some(n => n.nodeType === 1 && !n.hasAttribute('data-mwcf-owned'));
    });
    if (!relevant) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href; focusedId = null; running = false; stopRequested = false; token++; $('progress').hidden = true; observeCurrent();
      }
      refresh();
    }, 250);
  });
  observer.observe(document.body, {childList: true, subtree: true});
})();
