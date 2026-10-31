/* Shared, dependency-free logic. This file never reads accounts or photographs. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MWColors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SETTINGS_KEY = 'mwcf-settings-v1';
  const CACHE_KEY = 'mwcf-cache-v1';
  const LIMITS = {batch: 20, cache: 500, ttl: 7 * 86400000, unknownTtl: 3600000};
  const PALETTE = [
    ['white', 'Branco', '#FFFFFF'], ['black', 'Preto', '#161616'],
    ['green', 'Verde', '#00A650'], ['red', 'Vermelho', '#DB2428'],
    ['yellow', 'Amarelo', '#F5D52B'], ['blue', 'Azul', '#2257CA'],
    ['orange', 'Laranja', '#F58A24'], ['pink', 'Rosa', '#ED82B0'],
    ['purple', 'Roxo', '#8549BB'], ['brown', 'Marrom', '#79513A'],
    ['beige', 'Bege', '#D7BD91'], ['gray', 'Cinza', '#939393'],
    ['cyan', 'Ciano', '#25C6D4']
  ];
  const DEFAULTS = {
    enabled: true, mode: 'family', hideIncompatible: true, hideUnknown: false,
    flexibleSingle: false, tolerance: 48,
    inventory: PALETTE.map(([id, name, hex], i) => ({id, name, hex, enabled: i < 4}))
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const key = value => String(value).replace(/[_\-\s]/g, '').toLowerCase();
  const field = (obj, ...names) => {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const name of names) if (Object.hasOwn(obj, name)) return obj[name];
    for (const [k, v] of Object.entries(obj)) if (names.some(n => key(n) === key(k))) return v;
    return undefined;
  };
  function hex(value) {
    if (typeof value !== 'string') return null;
    let s = value.trim().replace(/^0x/i, '').replace(/^#/, '');
    if (/^[\da-f]{3}$/i.test(s)) s = s.split('').map(c => c + c).join('');
    if (!/^[\da-f]{6}(?:[\da-f]{2})?$/i.test(s)) return null;
    return '#' + s.toUpperCase();
  }
  function rgb(value) {
    const h = hex(value);
    return h ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : null;
  }
  function family(value) {
    const h = hex(value);
    if (!h) return 'unknown';
    if (h.length === 9 && parseInt(h.slice(7), 16) < 230) return 'transparent';
    const [r, g, b] = rgb(h).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const s = max ? d / max : 0;
    if (max <= .17) return 'black';
    if (s <= .14) return max >= .87 ? 'white' : 'gray';
    if (s <= .19 && max >= .92) return 'white';
    let hue = d === 0 ? 0 : max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
    if (hue >= 18 && hue <= 65 && s < .48 && max >= .68) return 'beige';
    if (hue >= 12 && hue < 50 && max < .65) return 'brown';
    if ((hue < 16 || hue >= 345) && s < .55 && max > .72) return 'pink';
    if (hue < 16 || hue >= 345) return 'red';
    if (hue < 44) return 'orange';
    if (hue < 76) return 'yellow';
    if (hue < 168) return 'green';
    if (hue < 200) return 'cyan';
    if (hue < 258) return 'blue';
    if (hue < 298) return 'purple';
    return 'pink';
  }
  function familyName(value) {
    const f = family(value);
    return PALETTE.find(p => p[0] === f)?.[1] || (f === 'transparent' ? 'Transparente' : 'Cor não identificada');
  }
  function sanitizeSettings(input) {
    const s = input && typeof input === 'object' ? input : {};
    const items = Array.isArray(s.inventory) ? s.inventory.slice(0, 40) : DEFAULTS.inventory;
    const inventory = items.filter(v => v && hex(v.hex)).map((v, i) => ({
      id: String(v.id || 'color-' + i).slice(0, 80),
      name: String(v.name || familyName(v.hex)).slice(0, 40), hex: hex(v.hex), enabled: v.enabled === true
    }));
    return {
      enabled: s.enabled !== false, mode: s.mode === 'tone' ? 'tone' : 'family',
      hideIncompatible: s.hideIncompatible !== false, hideUnknown: s.hideUnknown === true,
      flexibleSingle: s.flexibleSingle === true,
      tolerance: Number.isFinite(s.tolerance) ? Math.max(0, Math.min(100, s.tolerance)) : 48,
      inventory: inventory.length ? inventory : clone(DEFAULTS.inventory)
    };
  }
  function matches(required, available, settings) {
    const a = hex(required), b = hex(available);
    if (!a || !b) return false;
    if (settings.mode === 'family') return family(a) !== 'unknown' && family(a) === family(b);
    const alphaA = a.length === 9 ? parseInt(a.slice(7), 16) : 255;
    const alphaB = b.length === 9 ? parseInt(b.slice(7), 16) : 255;
    if (Math.abs(alphaA - alphaB) > 20) return false;
    return Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i])) <= settings.tolerance;
  }
  function modelId(url, base = 'https://makerworld.com') {
    try {
      const u = new URL(url, base);
      if (u.protocol !== 'https:' || u.hostname !== 'makerworld.com') return null;
      return u.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?models\/(\d+)(?:[-/]|$)/i)?.[1] || null;
    } catch { return null; }
  }
  function used(filament) {
    const values = ['usedG', 'usedM', 'used_g', 'used_m'].filter(k => filament[k] !== undefined && filament[k] !== null && filament[k] !== '').map(k => Number(filament[k])).filter(Number.isFinite);
    return !values.length || values.some(n => n > 0);
  }
  function colorValue(value) {
    return hex(typeof value === 'string' ? value : field(value, 'color', 'colour', 'colorHex', 'filamentColor', 'filamentColour', 'hex'));
  }
  function parseProfile(profile, index = 0) {
    const colors = new Set();
    let records = 0, unknown = 0, unused = 0, authoritative = false;
    const read = list => {
      if (!Array.isArray(list)) return;
      authoritative = true;
      for (const f of list) {
        if (f && typeof f === 'object' && !used(f)) { unused++; continue; }
        records++;
        const h = colorValue(f);
        if (h) colors.add(h); else unknown++;
      }
    };
    const primary = field(profile, 'instanceFilaments', 'filaments', 'filamentColors', 'filamentColour');
    if (Array.isArray(primary) && primary.length) read(primary);
    else {
      // Fallback only inside an identified profile. Never collect cover/image/shop colours.
      const visit = (node, depth) => {
        if (!node || typeof node !== 'object' || depth > 8) return;
        for (const [k, v] of Object.entries(node)) {
          if (['filaments', 'instancefilaments', 'filamentcolors', 'filamentcolour'].includes(key(k)) && Array.isArray(v)) read(v);
          else if (['plates', 'plate', 'printinfo', 'prediction', 'config', 'plateinfo'].includes(key(k))) {
            if (Array.isArray(v)) v.forEach(n => visit(n, depth + 1)); else visit(v, depth + 1);
          }
        }
      };
      visit(profile, 0);
    }
    const declared = Number(field(profile, 'materialColorCnt', 'colorCount')) || 0;
    if (declared > colors.size + unknown + unused) unknown += declared - colors.size - unknown - unused;
    return {
      id: String(field(profile, 'profileId', 'id', 'instanceId') ?? 'unknown-' + index).slice(0, 80),
      title: String(field(profile, 'title', 'name') || 'Perfil ' + (index + 1)).slice(0, 160),
      colors: [...colors], complete: authoritative && records > 0 && colors.size > 0 && unknown === 0,
      unknown, isDefault: field(profile, 'isDefault') === true
    };
  }
  function extractModel(payload, requestedId) {
    const target = String(requestedId);
    let seen = 0, fallback = null;
    const queue = [payload];
    while (queue.length && seen++ < 15000) {
      const node = queue.shift();
      if (!node || typeof node !== 'object') continue;
      const profiles = field(node, 'instances', 'printProfiles');
      if (Array.isArray(profiles)) {
        const id = field(node, 'id', 'designId', 'modelId');
        if (id == null || String(id) === target) {
          const result = {
            id: target, title: String(field(node, 'title', 'name') || '').slice(0, 200),
            profiles: profiles.filter(v => v && typeof v === 'object').map(parseProfile), fetchedAt: Date.now()
          };
          if (result.profiles.some(p => p.colors.length)) return result;
          fallback ||= result;
        }
        // Never mix profiles from a recommended/different model into this one.
        continue;
      }
      for (const v of Object.values(node)) if (v && typeof v === 'object') queue.push(...(Array.isArray(v) ? v : [v]));
    }
    return fallback;
  }
  function embeddedModels(html, requestedId) {
    if (typeof html !== 'string' || html.length > 6000000) return null;
    let best = null;
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (!/(?:__NEXT_DATA__|application\/json)/i.test(match[1])) continue;
      try {
        const value = extractModel(JSON.parse(match[2]), requestedId);
        if (value?.profiles.some(p => p.colors.length)) return value;
        best ||= value;
      } catch { /* Executable scripts and malformed JSON are never evaluated. */ }
    }
    return best;
  }
  function evaluate(model, rawSettings) {
    const settings = sanitizeSettings(rawSettings);
    const stock = settings.inventory.filter(c => c.enabled);
    if (!stock.length) return {status: 'unknown', reason: 'Selecione pelo menos uma cor.', profiles: []};
    if (!model?.profiles?.length) return {status: 'unknown', reason: 'Cores dos perfis não informadas.', profiles: []};
    const results = model.profiles.map(p => {
      const flexible = settings.flexibleSingle && p.complete && p.colors.length === 1;
      const missing = p.colors.filter(c => !stock.some(s => matches(c, s.hex, settings)));
      return {...p, missing, compatible: p.complete && (flexible || missing.length === 0), flexible};
    });
    const compatible = results.filter(p => p.compatible);
    if (compatible.length) return {status: 'compatible', reason: compatible.length + (compatible.length === 1 ? ' perfil compatível' : ' perfis compatíveis'), profiles: results, best: compatible[0]};
    if (results.some(p => !p.complete)) return {status: 'unknown', reason: 'Há perfis com cores incompletas.', profiles: results};
    const best = [...results].sort((a, b) => a.missing.length - b.missing.length)[0];
    return {status: 'incompatible', reason: 'Falta: ' + [...new Set(best.missing.map(familyName))].join(', '), profiles: results, best};
  }
  function cacheFresh(model, now = Date.now()) {
    if (!model || !Number.isFinite(model.fetchedAt) || model.fetchedAt > now + 60000) return false;
    return now - model.fetchedAt < (model.profiles?.some(p => p.complete) ? LIMITS.ttl : LIMITS.unknownTtl);
  }
  return {SETTINGS_KEY, CACHE_KEY, LIMITS, PALETTE, DEFAULTS, clone, field, hex, rgb, family, familyName, sanitizeSettings, matches, modelId, parseProfile, extractModel, embeddedModels, evaluate, cacheFresh};
});
