# Análise e decisões — 31/10/2026

## Projeto de entrada

Repositório: https://github.com/rauloutubro-debug/Prizetcg, analisado a partir do commit `85ac3244b8e0d72342759224fc031d30f8d734bc`.

Havia código-fonte completo em React Native 0.81.5, React 19.1, Expo SDK 54 e TypeScript, além de um workflow macOS para IPA sem assinatura. Portanto, não foi necessário extrair nem tentar recompilar o IPA antigo. O IPA não foi usado como substituto do código-fonte.

O aplicativo anterior tinha três telas: importação de um deck, rastreamento inicial dos Prêmios e ferramentas de dano/condições/moeda/Habilidades/VSTAR/GX/ACE SPEC. Persistia uma única lista e seus marcadores no AsyncStorage. Não havia biblioteca com várias listas, catálogo de imagens ou estado de batalha com cópias individuais.

O parser, os cálculos dos Prêmios, o Store antigo e as ferramentas foram mantidos. O novo armazenamento usa outra chave e copia a lista anterior para a biblioteca sem apagar os marcadores. O bundle ID e o scheme originais foram mantidos para continuidade da instalação.

## REA e referência pública

Não foi encontrado comando `rea`/`REA`, dependência do projeto ou ferramenta/skill REA no catálogo disponível. Não foram inventados comandos nem declarado uso de REA. A alternativa disponível foi Python Playwright com Chromium, usada para navegar em páginas públicas sem login.

Referência: https://pokemoncard.io/deck-search?sft_category=standard.

A página carregou com HTTP 200 no Chromium, com título “Pokémon Deck Search - PokemonCard”. Foram observados:

- Navegação de Decks, Cards, Tools e Battle Table, além de acesso a Deck Builder e Play.
- Busca por nome de deck ou carta, seletor de formato, resumo de filtros ativos e limpeza de filtros.
- Botão Filters, aberto de fato no navegador: revelou filtros de cartas incluídas/excluídas, autor, tamanho, ordenação, datas e preços.
- Grade de decks com identidade visual baseada em cartas, nome e informações auxiliares.
- Estados de resultados e botão Load More.

A adaptação própria usa biblioteca local pesquisável por nome de deck ou carta, prévias de cartas, edição/importação e acesso direto ao treino. A identidade PTCGMAP, os componentes, a navegação e o estado da mesa foram implementados no projeto. Não foram copiados HTML, CSS, autenticação, credenciais, dados privados, banco de decks da comunidade ou mecanismos internos do site.

## Catálogo e imagens

A API pública TCGdex foi consultada e verificada com respostas reais. A sigla oficial pode apontar para mais de uma coleção, por exemplo uma coleção principal e sua galeria. Os números também podem ter zeros à esquerda. A implementação consulta os candidatos e exige uma correspondência única de número normalizado; não usa o nome sozinho para selecionar arte.

Uma consulta manual de ID TCGdex permite corrigir associações; a importação de imagem permite cobrir impressões sem arte disponível. TCGdex disponibiliza WebP e PNG. Algumas respostas WebP observadas tinham cabeçalho CORS malformado (`*,*`); o navegador recusava a leitura. A preparação usa o PNG documentado da mesma impressão quando necessário, sem proxy, autenticação ou desativação da proteção do navegador.

No deck de exemplo, foram obtidas 22 das 24 imagens de tipos de cartas em rodadas anteriores; a rodada final obteve 21, com uma falha de rede adicional em Rare Candy. A fonte não forneceu arte para as duas entradas de Energia SVE 2 e SVE 5. Elas mantiveram identificação e opção de importação; não foi inventada uma imagem ou trocada a impressão silenciosamente. A importação de um arquivo de imagem local foi exercitada na interface.

Não foram recebidas novas imagens de cartas anexadas nesta solicitação. Os arquivos de IPA/código anteriores foram preservados; a nova arte do ícone é própria e as imagens de cartas são preparadas no aparelho.
