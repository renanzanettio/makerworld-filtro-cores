/* Deliberately fictitious models: these are local test data, never search results. */
(function (root) {
  const profile = (id, title, colors, extra = {}) => ({id, title, instanceFilaments: colors.map(color => ({color, type: 'PLA', usedG: 10})), ...extra});
  root.MWCF_FIXTURES = {
    '990001': {id: 990001, title: 'Árvore verde · exemplo', instances: [profile(1, 'Árvore em verde', ['#00AE42'])]},
    '990002': {id: 990002, title: 'Boneco de neve · exemplo', instances: [profile(2, 'Branco, vermelho e preto', ['#FFFFFF', '#FF2424', '#000000'])]},
    '990003': {id: 990003, title: 'Estrela amarela · exemplo', instances: [profile(3, 'Verde com estrela amarela', ['#00AE42', '#F5D52B'])]},
    '990004': {id: 990004, title: 'Sem informação · exemplo', instances: [{id: 4, title: 'Cores não publicadas', materialColorCnt: 3}]},
    '990005': {id: 990005, title: 'Vários perfis · exemplo', instances: [profile(5, 'Azul com amarelo', ['#164BC0', '#F5D52B']), profile(6, 'Vermelho com branco', ['#DA292B', '#FFFFFF'])]},
    '990006': {id: 990006, title: 'Rena marrom · exemplo', instances: [profile(7, 'Uma cor: marrom', ['#79513A'])]}
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
