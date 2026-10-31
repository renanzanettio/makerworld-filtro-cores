(function () {
  const grid = document.getElementById('grid');
  const art = [
    '<path d="M120 25 77 85h22L64 132h31l-46 50h142l-46-50h31l-35-47h22z" fill="#188449"/><path d="M112 182h16v18h-16z" fill="#33473c"/>',
    '<circle cx="120" cy="143" r="48" fill="#fff"/><circle cx="120" cy="76" r="30" fill="#fff"/><path d="M83 50h74l-37-34z" fill="#ce353e"/><path d="M88 104h65v14H88z" fill="#ce353e"/><circle cx="109" cy="72" r="4"/><circle cx="131" cy="72" r="4"/>',
    '<path d="M120 25 77 100h20l-40 78h126l-40-78h20z" fill="#188449"/><path d="m120 12 8 16 17 3-13 12 3 17-15-8-15 8 3-17-13-12 17-3z" fill="#e0ba29"/>',
    '<circle cx="120" cy="108" r="66" fill="#e1e6e9"/><text x="120" y="128" text-anchor="middle" font-size="66" fill="#7b8b94">?</text>',
    '<rect x="66" y="76" width="110" height="107" rx="6" fill="#c93242"/><path d="M110 76h22v107h-22zM66 109h110v22H66z" fill="#fff"/><path d="M119 75c-58-7-52-48-30-39 20 6 30 39 30 39zm2 0c58-7 52-48 30-39-20 6-30 39-30 39z" fill="none" stroke="#fff" stroke-width="10"/>',
    '<path d="M77 106q38-37 78-13l13-34 19-1-10 47-15 15-8 69h-12l-2-45h-24l-8 45H95z" fill="#79513a"/><path d="m179 62-8-30m7 17 20-13m-22 0-12-14" fill="none" stroke="#79513a" stroke-width="7"/>'
  ];
  Object.entries(MWCF_FIXTURES).forEach(([id, model], i) => {
    const card = document.createElement('article'); card.className = 'model-card';
    const link = document.createElement('a'); link.href = 'https://makerworld.com/pt/models/' + id; link.addEventListener('click', e => e.preventDefault());
    const img = document.createElement('img'); img.alt = model.title;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="220" viewBox="0 0 240 220"><rect width="240" height="220" fill="#edf1ec"/>' + art[i] + '</svg>';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const h = document.createElement('h2'); h.textContent = model.title;
    const text = document.createElement('p'); text.textContent = 'Dados fictícios para testar o filtro';
    link.append(img, h); card.append(link, text); grid.append(card);
  });
})();
