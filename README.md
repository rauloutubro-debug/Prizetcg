# PTCGMAP 2.0

Aplicativo React Native + Expo + TypeScript para treino local de Pokémon TCG. Oferece biblioteca de decks, imagens reais preparadas para uso offline, mesa manual solo ou para dois lados e as ferramentas de torneio do PrizeCheck original.

## Começar

Node.js 22 LTS, npm e um cliente de desenvolvimento compatível com Expo SDK 54.

```bash
npm ci
npm start
```

Para testar a interface no navegador:

```bash
npm run web
```

Para compilar o cliente localmente: `npm run ios:native` exige macOS/Xcode/CocoaPods; `npm run android:native` exige Android SDK/JDK. Se o Expo Go atual não suportar SDK 54, use uma development build compatível. A compilação em nuvem para sideload está documentada em [BUILD-IOS-UNSIGNED.md](BUILD-IOS-UNSIGNED.md) e não requer um Mac local.

## Usar o app

1. Em **Meus Decks**, importe uma lista TCG Live ou Limitless com cabeçalhos Pokémon, Trainer/Treinador e Energy/Energia. O exemplo completo pode ser preenchido pelo botão correspondente. A lista deve ter 60 cartas; o app não verifica rotação, legalidade ou limite de cópias por nome.
2. Toque em **Preparar offline**. A operação consulta a API pública TCGdex, identifica a impressão por coleção e número e baixa as imagens disponíveis. É possível interromper após a carta atual e continuar depois.
3. Em **Ver cartas → Ampliar**, importe um arquivo de imagem para uma carta ausente. O ID TCGdex opcional permite uma associação manual. Confira a edição nesse caso. O catálogo está em inglês; as imagens podem ser substituídas por arquivos que você pode utilizar.
4. Em **Treinar**, escolha treino solo ou dois lados, selecione os decks e prepare a mesa. A preparação embaralha, compra 7 e separa 6 Prêmios. Você escolhe o Ativo e o Banco; não há seleção automática de Básicos ou mulligan.
5. Toque em uma carta para mover, virar, revelar, ampliar, anexar Energia/Ferramenta, empilhar evolução ou alterar marcadores. Cartas fora da mão podem ser localizadas pelos botões de zona. **Buscar no baralho** é uma busca manual com acesso à ordem atual; embaralhe explicitamente depois de resolvê-la.
6. **Desfazer** restaura o estado anterior, incluindo ordem de baralho, pilhas e marcadores. O histórico mantém as últimas 60 ações. Há anotações manuais de efeitos e moeda registrada no histórico.
7. **Repetir mão inicial** prepara outra sessão com as cópias dos mesmos decks. Editar ou excluir uma lista da biblioteca não altera a partida em andamento.

## Mesa manual

A mesa inclui Baralho, Mão, Ativo, Banco, Prêmios, Descarte, Zona Perdida e um Estádio compartilhado. As cartas são cópias individuais identificadas por UUID; não são contadores agregados. Movimentações são atômicas e preservam todas as cópias. Espaços padrão: um Ativo, cinco de Banco e seis Prêmios. É possível ajustar manualmente o Banco para oito posições quando necessário; reduzir o limite não descarta cartas automaticamente.

Entre Ativo e Banco, mover um Pokémon mantém a pilha. Para outras zonas, a operação move o conjunto como cartas separadas e limpa dano, condições e uso de Habilidade dessas cartas. Anexos podem ser selecionados individualmente para serem destacados e movidos. Evoluir transfere os anexos e o dano ao novo topo, remove condições e mantém as cartas anteriores empilhadas. A cadeia de evolução e o tipo de Treinador são conferidos pelo jogador.

Energia, Apoiador, VSTAR, GX e ACE SPEC são marcadores manuais. Próximo turno libera Energia, Apoiador e Habilidades de quem começa; ele não compra uma carta. ACE SPEC é um lembrete de uso, não uma proibição de reutilização se um efeito permitir recuperá-la.

Ataques, efeitos, custos, Nocautes, vitória, mulligans e legalidade não são automatizados. Use movimentações, marcadores e anotações para resolver manualmente as situações. Não há adversário de IA ou jogo online.

## Privacidade no mesmo aparelho

No modo de dois lados, a mão adversária fica oculta. A busca no baralho é restrita ao lado controlado. Prêmios começam virados para baixo. Virar uma carta na mesa ou nos Prêmios e revelar uma carta são operações explícitas. A mão só é compartilhada pela revelação explícita. O modo **Revelar ambos para estudo** mostra as identidades dos dois lados, inclusive nas inspeções de zonas.

A troca de controle remove a mesa da árvore de interface e mostra uma tela para passar o aparelho. No retorno do aplicativo em segundo plano, a passagem é exibida novamente na mesa dupla. As anotações são compartilhadas: não escreva nelas informações que deseja manter ocultas.

Esse é um controle visual para treino local, não uma barreira contra alguém com acesso aos arquivos de dados, ao backup ou às ferramentas de desenvolvimento do próprio aparelho.

## Dados e offline

- O identificador iOS `com.prizecheck.tcg` foi mantido. A chave antiga `@prizecheck/state/v1` e seus marcadores permanecem sob o Store original.
- A nova biblioteca copia o deck antigo na primeira execução e usa `@ptcgmap/workspace/v2`, sem apagar a sessão de torneio.
- Sessão, listas, catálogo e histórico são gravados por uma fila serial. A interface mostra se salvou ou se houve falha. Dados ilegíveis são preservados; a sessão temporária não os sobrescreve.
- Em iOS/Android, as imagens ficam em Documents com nomes próprios e referências relativas à pasta do app. No navegador, ficam como Blobs no IndexedDB. A renderização usa apenas esses arquivos locais; não há fallback remoto silencioso.
- O modo offline bloqueia a preparação de novos downloads e mantém importação de arquivos, treino, listas e imagens já disponíveis.
- A biblioteca pode exportar os dados em JSON por Configurações. Esse backup não inclui os arquivos de imagem nem implementa uma restauração pela interface; mantenha também suas listas e imagens originais.
- A instalação nativa empacotada contém o bundle do app. A versão web de desenvolvimento/exportada depende do servidor para carregar o código: não é uma PWA com primeira carga offline.

Para preservar dados ao atualizar no iPhone, mantenha o identificador e a identidade de assinatura usados na instalação anterior e instale como atualização. Desinstalar o app remove seu armazenamento. A assinatura posterior pelo sideloader e a atualização no aparelho ainda precisam ser validadas pelo usuário.

## Estrutura

```text
App.tsx                    Shell, áreas seguras e navegação adaptativa
src/battle/                Tipos, ações, invariantes, histórico, desfazer e visibilidade
src/catalog/               Resolução TCGdex, identificação de impressão e cache de arquivos
src/workspace/             Biblioteca, sessão, fila de persistência e migração
src/screens/               Início, Meus Decks, Treinar, Configurações e utilitários antigos
src/components/            Cartas, ampliação, zonas, ações e host de um único modal nativo
src/domain/                Parser e lógica original dos Prêmios, preservados
src/state/                 Store e persistência originais dos utilitários
qa/                        Roteiros e relatórios de testes no navegador
```

As definições das cartas e as cópias da sessão são independentes da biblioteca editável. O reducer de batalha recebe ações estruturadas; embaralhamento injeta uma permutação gerada fora do reducer. Cada ação é validada antes de substituir o estado. Não há servidor, login, assinatura de serviço ou envio de decklists para o catálogo.

## Verificar

```bash
npm test
npm run typecheck
npm run build:web
```

Consulte [VALIDATION.md](VALIDATION.md) para os resultados e seus limites, [RESEARCH.md](RESEARCH.md) para a análise do projeto/REA/referência e [BUILD-IOS-UNSIGNED.md](BUILD-IOS-UNSIGNED.md) para compilação e instalação. Os roteiros em `qa/` usam Python Playwright e Chromium em Linux, com o app servido na porta 8081; `browser_check.py` deve ser executado antes de `interaction_check.py`.

## Imagens e atribuição

Fontes: [TCGdex API](https://api.tcgdex.net/v2/en/sets), [documentação TCGdex](https://tcgdex.dev/), arquivos escolhidos pelo usuário. A arte pertence aos respectivos titulares de Pokémon; o aplicativo não transfere direitos sobre as imagens. Imagens reais do catálogo não são incluídas no repositório: são baixadas no aparelho por uma ação explícita.

Projeto independente, sem vínculo com a The Pokémon Company. Em torneios, consulte a organização sobre o uso de dispositivos e ferramentas de auxílio.
