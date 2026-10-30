# PrizeCheck TCG

Aplicativo mobile em **React Native + Expo + TypeScript**, com modo escuro padrão, sessão offline e versão web para desenvolvimento. Interface em português; nomes das cartas são preservados no idioma importado.

Para **IPA sem assinatura destinado a sideload**, consulte [BUILD-IOS-UNSIGNED.md](BUILD-IOS-UNSIGNED.md). O workflow GitHub Actions compila na nuvem sem exigir um Mac local, login Expo ou assinatura Apple. Para distribuição assinada por EAS Build, consulte [BUILD-IOS.md](BUILD-IOS.md).

## Executar

Requisitos: Node.js 22 LTS ou superior, npm e Expo Go compatível com o SDK 54. Se a versão atual do Expo Go não suportar esse SDK, use uma development build compatível ou atualize o SDK seguindo a documentação do Expo.

```bash
npm install
npm start
```

Abra no Android/iOS com um cliente Expo compatível. Para web:

```bash
npm run web
```

Com Android SDK/emulador configurado, use `npm run android`. Para o simulador iOS, use `npm run ios` em macOS com Xcode. Os comandos iniciam o ambiente de desenvolvimento; não geram um APK/IPA de produção.

Para compilar e instalar um cliente nativo local sem depender do Expo Go, use `npm run android:native` com Android SDK/JDK configurados, ou `npm run ios:native` em macOS com Xcode e CocoaPods. Esses comandos geram os projetos nativos a partir da configuração Expo e compilam uma versão de desenvolvimento.

```bash
npm run typecheck
npm test
npm run build:web
```

`build:web` produz `dist/`. Não há serviço remoto, chave de API, login ou backend para configurar. A instalação inicial de dependências e o carregamento do bundle de desenvolvimento exigem conexão. O aplicativo nativo empacotado mantém os recursos locais; a exportação web não inclui service worker nem promete primeira carga offline.

## Arquitetura recomendada

React Native com Expo permite uma base para Android e iOS, controles nativos e compilação web para desenvolvimento. TypeScript ajuda a preservar as invariantes de contagem. Para esse MVP, um reducer e Context são suficientes: não há necessidade de backend, Redux, banco remoto ou navegação externa. AsyncStorage mantém uma única sessão por aparelho/origem do navegador. Dados não são criptografados nem sincronizados entre dispositivos.

```text
App.tsx                         Shell responsivo e navegação das três telas
src/
  domain/
    types.ts                    Contratos do deck e da partida
    parser.ts                   Importação TCG Live / Limitless
    prizes.ts                   Intervalos e invariantes dos seis Prêmios
    match.ts                    Reducer: ações e transições de estado
    demo.ts                     Deck de demonstração
  state/
    Store.tsx                   Context, hidratação e persistência
    storage.ts                  Serialização, validação e fila de gravações
  screens/
    TrackerScreen.tsx           Conferência inicial e retirada de Prêmios
    BoardScreen.tsx             Pokémon, dano, condições, Habilidades e moeda
    DeckScreen.tsx              Importação, validação e revisão da lista
  components/UI.tsx             Botões, contador, badges e diálogos
  theme.ts                     Cores e estilos compartilhados
tests/domain.test.ts            Testes da lógica competitiva
```

A lógica de domínio não importa React Native. Ela pode ser reutilizada em outra interface, executada em testes e evoluir sem acoplar regras à apresentação. O layout usa navegação inferior em celular e lateral em telas a partir de 1000 px; a área de conteúdo fica limitada a 850 px. Controles principais têm alvos de toque de pelo menos 44 px, labels de acessibilidade e estados expressos por texto. A moeda respeita a preferência de redução de movimento.

## Importação

Aceita categorias em inglês ou português, cabeçalhos com dois-pontos ou parênteses, acentos, CRLF, quantidades com `x`, bullets `*`, código de coleção e número. Não consulta uma API de cartas.

```text
Pokémon: 18
4 Dreepy TWM 128
...
Trainer: 34
4 Arven OBF 186
...
Energy: 8
4 Fire Energy SVE 2
...
Total Cards: 60
```

As reticências acima explicam o formato: não devem ser incluídas numa lista real. Use “Preencher com exemplo” para uma lista completa.

- Linhas da mesma identidade (categoria + nome + coleção + número) são agregadas.
- Impressões diferentes permanecem separadas para que o usuário possa contar cópias corretamente.
- Linhas não reconhecidas mostram o número da linha; não são descartadas silenciosamente.
- Cartas sem cabeçalho precisam de categoria; somente nomes contendo Energy/Energia permitem identificar energia sem cabeçalho.
- O importador exige 60 cartas e ao menos uma entrada de Pokémon. Isso não equivale a validar um deck competitivo: não verifica rotação, Pokémon Básicos, limite de cópias por nome nem legalidade do formato.
- A importação substitui o deck e inicia uma nova partida, após revisão em um diálogo.

## Modelo correto dos Prêmios

“Ainda não vi esta carta” não significa “esta carta está nos Prêmios”. O aplicativo mantém um **retrato de uma única conferência inicial**, antes de retirar Prêmios, com exatamente seis cartas nos Prêmios.

Para cada tipo de carta:

```text
quantidade = total de cópias na lista
fora = cópias distintas contabilizadas fora dos Prêmios
faltantes = quantidade − fora
confirmados = cópias diretamente identificadas nos Prêmios por um efeito permitido

mínimo = max(confirmados, 6 − soma dos faltantes dos outros tipos)
máximo = min(faltantes, 6 − soma dos confirmados dos outros tipos)
```

Enquanto `mínimo != máximo`, a interface mostra um intervalo possível. Não apresenta porcentagens nem uma distribuição probabilística inventada. Mesmo antes do fim da conferência, restrições podem tornar uma quantidade específica certa.

Ao contabilizar **54 cópias distintas fora dos Prêmios**, todos os faltantes são os seis Prêmios. Alternativamente, seis identificações diretas permitem fechar o mapa. A finalização congela esse retrato e libera contadores para retirar cada tipo de carta, limitados ao número confirmado. Não conhece as posições físicas das cartas.

Inclua todas as zonas fora dos Prêmios: deck, mão, campo, descarte, Zona Perdida e outras relevantes. Uma carta já contabilizada não pode ser somada de novo porque voltou a aparecer. Confirmações diretas não podem se sobrepor às cópias fora dos Prêmios. O reducer bloqueia ações incompatíveis, contagens negativas e mais de seis confirmações. Se você já retirou Prêmios antes de fazer a conferência, inicie uma nova sessão de treino: esse fluxo não reconstrói retroativamente a composição inicial.

## Ferramentas de mesa

- Um espaço ativo e cinco de Banco, todos renomeáveis.
- Dano `+10`, `+50`, `+100`, controles de remoção e valor personalizado múltiplo de dez.
- Veneno e Queimadura coexistem; Sono, Paralisia e Confusão se substituem.
- Uma marca de Habilidade por espaço, liberada por “Próximo turno”.
- VSTAR, GX e ACE SPEC como lembretes manuais que persistem entre turnos.
- ACE SPEC é uma restrição de construção do deck, não um poder necessariamente consumido para sempre. O marcador pode ser desfeito quando uma carta é recuperada.
- Moeda com um byte de aleatoriedade de `expo-crypto`: paridade define cada face sem viés de módulo; a animação não determina o resultado.
- “Limpar” prepara um espaço para outro Pokémon; “Nova partida” reinicia toda a sessão e mantém o deck.

## Persistência e limites

O Store aguarda a hidratação antes de gravar, valida a versão e as invariantes e serializa as gravações para evitar que uma operação antiga sobrescreva a mais recente. Falhas são mostradas na interface. Se um registro anterior não puder ser recuperado, ele é preservado; a sessão exibida funciona temporariamente em memória para não apagar os dados originais. Não há mecanismo de backup nesta versão.

O app é uma base funcional de treino, não um motor completo de regras. Não automatiza dano de Checkup, Nocaute, recuo, evolução, troca de ativo, poderes de múltiplas Habilidades por carta nem efeitos que substituem ou mudam os Prêmios. Também não mantém biblioteca de vários decks, histórico, fotos de cartas ou sincronização. Para trocar o Pokémon de espaço, atualize seus marcadores manualmente.

Em eventos presenciais, consulte a organização sobre dispositivos eletrônicos e ferramentas de auxílio durante a partida. A ferramenta não garante autorização para uso em torneios oficiais. Projeto independente, sem vínculo com a The Pokémon Company.

## Evolução sugerida

Para escalar, mantenha o domínio puro e acrescente uma biblioteca de decks com IDs próprios, backup/exportação de sessões e um modo de substituição de Prêmios por eventos explícitos. Migre AsyncStorage para SQLite somente se houver histórico ou consultas que justifiquem isso. Para distribuição mobile, configure uma development build e perfis EAS Build; atualize identificadores `com.prizecheck.tcg` para os da sua organização e valide em aparelhos reais antes de publicar nas lojas.
