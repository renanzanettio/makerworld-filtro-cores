# MakerWorld — Minhas cores

Extensão pessoal para Chrome e Edge, versão experimental 0.1.0. O código-fonte está incluído para você inspecionar e editar, sem servidor próprio, conta extra, chave de API ou assinatura.

## Instalar no Chrome

1. Extraia o ZIP para uma pasta que você pretende manter no computador.
2. Abra `chrome://extensions` na barra de endereço.
3. Ative **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta **makerworld-cores**, a que contém `manifest.json`. Não selecione o ZIP nem uma pasta acima dela.
6. Abra o MakerWorld ou recarregue as abas do site que já estavam abertas.

No Edge, faça o mesmo em `edge://extensions`.

## Usar

1. Pesquise normalmente no MakerWorld. Se quiser priorizar popularidade, escolha a ordenação **mais baixados** no próprio site.
2. Abra **Minhas cores**, no canto inferior direito. O ícone da extensão também abre e recolhe o painel.
3. Branco, preto, verde e vermelho já começam selecionados. Marque outras cores conforme comprar filamentos.
4. Clique em **Analisar até 20 modelos**. Os resultados aparecem conforme cada consulta termina.
5. Os modelos analisados sem nenhum perfil compatível são ocultados por padrão. Desmarque **Ocultar incompatíveis** para vê-los novamente, com a indicação das cores que faltam.
6. Role a página para o MakerWorld carregar mais resultados e analise outro lote. A extensão não percorre o catálogo inteiro nem altera a busca ou a ordem original.
7. Clique no selo de um cartão para conferir os perfis, as cores e o link do perfil correspondente.

Em uma página de modelo, o botão analisa apenas o modelo aberto. A extensão também tenta aproveitar os dados de cor já incorporados à página.

### Como a comparação funciona

- **Família de cor**, padrão: diferentes tons de verde contam como verde. É uma classificação aproximada a partir do RGB publicado pelo perfil.
- **Tom semelhante**: compara o RGB com os tons do seu inventário. Em **Ajustar filamentos e cache**, altere a amostra para se aproximar do seu rolo real. Não é uma medição física de cor ou acabamento.
- **Aceitar qualquer modelo de uma cor**, desligado por padrão: permite uma peça monocromática mesmo que o autor tenha usado uma cor que você não tem. Você deverá trocar essa cor no Bambu Studio.
- Um modelo entra quando **ao menos um perfil completo** utiliza somente suas cores. As cores de perfis alternativos não são somadas entre si.
- **Cores não informadas** é diferente de incompatível. Dados incompletos ou falhas de consulta não são tratados como comprovação de que falta uma cor. Os ainda não analisados permanecem visíveis.
- Filamentos explicitamente não utilizados, com consumo igual a zero, são desconsiderados. Todas as placas de um perfil são consideradas quando seus dados estão disponíveis.
- O filtro verifica cores. Não confirma material, tamanho, bico ou compatibilidade com sua impressora.

### Limites desta versão

O acesso ao MakerWorld e ao serviço de metadados foi restringido no ambiente em que a extensão foi criada. A lógica e a interface são verificadas com dados de teste locais; **não houve validação ponta a ponta contra o MakerWorld real**. A versão é experimental: os campos e os seletores do site podem mudar e exigir ajuste.

A leitura tenta os metadados públicos de modelo da Bambu Lab; se o recurso estiver ausente ou não fornecer as cores, tenta o JSON incorporado na página pública do modelo. Não há uma API pública oficial com contrato estável para esta integração. Se houver bloqueio, exigência de autenticação ou limite de consultas, a extensão pausa; não resolve desafios, extrai tokens ou contorna o bloqueio. O modo local continua mostrando dados já obtidos. Não são baixados arquivos 3MF para descobrir cores.

O filtro só consegue avaliar os perfis que o site publica nos metadados consultados. Um perfil ausente ou uma cor não informada pode exigir conferência manual. Perfis incompletos não produzem uma classificação positiva por conta própria.

### Privacidade e permissões

- `storage`: salva seu inventário e um cache de até 500 modelos neste navegador. Cores conhecidas expiram em 7 dias; resultados sem dados expiram em 1 hora.
- `https://makerworld.com/*`: encontra cartões, lê dados públicos de cores e exibe o painel no site.
- `https://api.bambulab.com/*`: consulta os metadados públicos de um modelo por ID, sem enviar credenciais.
- O código não solicita acesso a outros sites, não lê senhas ou tokens, não usa serviços de análise e não envia seu inventário para terceiros.
- As consultas são sequenciais, com intervalo mínimo de 1,2 segundo entre modelos. Depois de uma resposta 401, 403 ou 429, as novas consultas são pausadas por pelo menos 15 minutos. Limpar o cache não remove essa pausa.

Para atualizar o código, mantenha a pasta e clique em **Recarregar** no cartão da extensão em `chrome://extensions`. Depois recarregue o MakerWorld. Para remover a extensão, clique em **Remover** nessa mesma tela.

## Testar sem instalar

Abra `demo/index.html`. É uma demonstração com seis modelos fictícios, sem solicitações de rede. Ela usa o mesmo painel e a mesma lógica do filtro. As preferências da demonstração ficam separadas das preferências da extensão.

## Para editar o código

Não há compilação nem dependências para usar a extensão.

- `core.js`: extração dos perfis, normalização e comparação de cores.
- `background.js`: consultas, cache e pausa em caso de bloqueio.
- `content.js` e `cards.css`: painel, identificação de cartões e filtros visuais.
- `tests/`: verificações automatizadas com o runner nativo do Node.

Rode `node --test tests/core.test.cjs tests/background.test.cjs` na pasta do projeto. O teste opcional de integração da interface requer o pacote `linkedom`: `npm install --no-save linkedom`, depois `node --test tests/content.test.cjs`.

Validação em 30/10/2026: **53 testes locais passaram** — 35 de leitura e comparação de cores, 9 de consultas/cache e 9 de integração do painel com DOM simulado. Incluem limite de 20 modelos, rolagem dinâmica, manutenção da ordem, pausa em bloqueios e restauração dos cartões. Esses testes não substituem uma validação no MakerWorld real ou uma conferência visual no Chrome.

Referências técnicas: [content scripts no Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [requisições de extensões](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) e [observações de integração da comunidade](https://github.com/Doridian/OpenBambuAPI/blob/main/cloud-makerworld.md). A extensão é independente e não é um produto oficial da Bambu Lab ou do MakerWorld.
