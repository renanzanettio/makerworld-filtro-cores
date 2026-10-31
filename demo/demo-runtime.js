/* Browser-extension API stub used exclusively by the local demonstration. */
(function () {
  const listeners = [], runtimeListeners = [];
  let data = {};
  try { data = JSON.parse(localStorage.getItem('mwcf-demo') || '{}'); } catch {}
  const fire = changes => listeners.forEach(listener => listener(changes, 'local'));
  const persist = () => { try { localStorage.setItem('mwcf-demo', JSON.stringify(data)); } catch {} };
  window.chrome = {
    storage: {
      local: {
        async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, data[k]])); },
        async set(next) {
          const changes = {};
          for (const [k, v] of Object.entries(next)) { changes[k] = {oldValue: data[k], newValue: v}; data[k] = v; }
          persist(); fire(changes);
        },
        async remove(key) { const oldValue = data[key]; delete data[key]; persist(); fire({[key]: {oldValue}}); }
      },
      onChanged: {addListener(fn) { listeners.push(fn); }}
    },
    runtime: {
      onMessage: {addListener(fn) { runtimeListeners.push(fn); }},
      async sendMessage(message) {
        const C = MWColors;
        if (message.type === 'MWCF_CACHED') {
          const cache = data[C.CACHE_KEY] || {};
          return {ok: true, models: Object.fromEntries(message.ids.filter(id => C.cacheFresh(cache[id])).map(id => [id, cache[id]]))};
        }
        if (message.type === 'MWCF_CLEAR_CACHE') { delete data[C.CACHE_KEY]; persist(); return {ok: true}; }
        if (message.type === 'MWCF_LOOKUP') {
          await new Promise(resolve => setTimeout(resolve, 280));
          const model = C.extractModel(MWCF_FIXTURES[message.id], message.id);
          if (!model) return {ok: false, error: 'Exemplo não encontrado.'};
          const cache = data[C.CACHE_KEY] || {}; cache[model.id] = model;
          await chrome.storage.local.set({[C.CACHE_KEY]: cache});
          return {ok: true, model};
        }
        return {ok: true};
      }
    }
  };
})();
