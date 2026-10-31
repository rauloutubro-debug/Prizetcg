# Adversário local e treinador — PTCGMAP 2.1

## Uso

1. Importe e nomeie listas em **Meus Decks**. Em **Treinar**, escolha **Contra robô**, seu deck e a **Lista adversária**. As escolhas são independentes; uma mesma lista pode estar dos dois lados.
2. Prepare a mesa. Escolha seu Básico no Ativo pela mão; o robô escolhe um Básico reconhecido da própria mão. Sem Básico reconhecido, resolva um mulligan com os controles manuais/estudo ou use **Repetir mão inicial**. Mulligans e compras compensatórias não são automatizados.
3. **Iniciar partida com robô** confirma os Ativos e compra a carta do jogador A. A começa nesta versão. O Banco inicial do jogador é manual. O robô coloca seus Básicos no próprio turno.
4. **Analisar minhas opções** mostra até três alternativas. **Aplicar sequência** executa as ações e registra cada uma no histórico. Pode ser usado também na mesa solo ou dupla manual.
5. **Encerrar meu turno · robô joga** passa a vez, faz a compra de B, executa ações suportadas e devolve a vez com a compra de A. Não use **Comprar 1** para repetir a compra do turno: esse controle continua sendo uma compra manual de efeitos.
6. Ao ocorrer Checkup, resolva dano e condições com os controles manuais e confirme. Após Nocaute do seu Ativo, promova um Pokémon manualmente. **Retomar partida assistida** continua a partir daí. Se o robô precisar de uma intervenção, o erro explica a pendência.
7. **Desfazer** reverte uma ação, sem reiniciar automaticamente o robô. **Continuar como mesa manual** desativa o adversário sem apagar as cartas. Sessão, modo e marcadores são salvos no aparelho.

## O que os assistentes fazem

Código puro em `src/assistants`: perfis por **coleção:número**, resolução explícita de efeitos, planejamento e execução do adversário. Não usam serviço de IA, servidor, conta ou conexão. Fonte dos dados impressos: endpoints públicos `https://api.tcgdex.net/v2/en/cards/{id}` para sv06-128/129/130, sv03.5-016, sv03-164, swsh11-058, swsh9-040 e sv06.5-038. Perfis de Treinadores implementam somente os efeitos citados abaixo; confira a impressão ao estender o catálogo.

O treinador faz busca limitada (largura 6, profundidade 3, orçamento de 180 candidatos), pontua preparação, Energia, evolução, dano e Nocaute. A frase “melhor sequência encontrada” se refere **somente às ações suportadas dentro desse orçamento**. Não é uma prova de jogada ótima nem uma simulação completa dos turnos futuros. Não estima a política adversária, sorte ou probabilidades de compras futuras.

O planejamento usa a própria mão e o campo público; não classifica cartas da mão inimiga, ordem dos baralhos ou identidades dos Prêmios. Efeitos de compra/busca encerram a previsão. Ao executar uma busca legal ou Recon Directive, o robô pode consultar as cartas a que aquele efeito dá acesso e então planejar novamente. Prêmios são tomados por posição, sem escolher sua identidade. Revelar ambos para estudo é uma ação explícita da interface; o treinador ainda ignora a mão adversária.

As ações passam pelo mesmo executor atômico da mesa e pelas invariantes de conservação. Um plano fica inválido quando muda o estado da mesa. No máximo 24 decisões por ativação do robô evitam ciclos; a operação roda no dispositivo. A execução é acionada por botões e não por efeitos de renderização, portanto desfazer e recarregar não provocam jogadas extras.

## Cobertura inicial

| Impressão | Automação |
|---|---|
| Dreepy TWM 128 | Básico, HP, recuo; Bite. Petty Grudge fica manual. |
| Drakloak TWM 129 | Evolução, Recon Directive e Dragon Headbutt. |
| Dragapult ex TWM 130 | Evolução comum/Rare Candy, Jet Headbutt e Phantom Dive. Os seis marcadores são distribuídos por heurística no Banco público antes dos Nocautes. |
| Pidgey MEW 16 | Call for Family, Tackle, fraqueza e resistência. |
| Pidgeot ex OBF 164 | Rare Candy, Quick Search compartilhada uma vez/turno; Blustery Wind sem descartar o Estádio opcional. Pidgeotto não tem perfil nesta versão. |
| Rotom V LOR 58 | Básico/HP/recuo; ataque e Instant Charge manuais. |
| Lumineon V BRS 40 | Básico/HP/recuo/fraqueza; Aqua Return e Luminous Sign manuais. |
| Fezandipiti ex SFA 38 | Cruel Arrow e fraqueza; Flip the Script manual. |
| SVE 2 / SVE 5 | Uma Energia básica de Fogo/Psíquica por ligação, respeitando custos tipados e Incolor. |
| Nest Ball SVI 181 / Buddy Poffin TEF 144 | Busca de Básicos para Banco, limite de HP do Poffin e embaralhamento. |
| Ultra Ball SVI 196 | Descartar duas, buscar Pokémon reconhecido, revelar e embaralhar. Escolhas por heurística. |
| Rare Candy SVI 191 | Estágio 2 correspondente na mão, Básico anterior ao turno, fora do primeiro turno de ambos. |
| Arven OBF 186 | Busca de Item e Ferramenta reconhecidos, revelação e embaralhamento. |
| Iono PAL 185 | Mãos embaralhadas no fundo, compras por número de Prêmios restante. |
| Professor's Research SVI 189 | Descarte da mão e compra de até sete disponíveis. |
| Forest Seal Stone SIT 156 / Rescue Board TEF 159 | Identificação como Ferramenta para Arven; uso, anexação e efeitos manuais. |

Outras versões com o mesmo nome NÃO herdam efeitos por suposição. Cartas sem perfil aparecem normalmente na mesa, mas não são jogadas pelo robô. A contagem da interface indica **versões com algum perfil**, não cobertura de todos os efeitos da carta. Para ampliar suporte, edite `src/assistants/profiles.ts`, adicione a resolução necessária em `rules.ts` e testes com dados impressos verificados. Imagens e perfis são independentes: baixar uma imagem não cria um efeito de regra.

## Limites e resolução manual

Não há motor completo de regras, validação de formato, rotação, mulligans, empate por condições simultâneas, efeitos de substituição/prevenção, bloqueios, Estádios, Ferramentas, Energias especiais, recuperação, habilidades e cartas fora da tabela. Modificadores externos podem tornar uma sugestão inadequada; resolva a ação manualmente ou desative o robô nessa situação. A automação não deve ser usada para arbitrar partidas.

Ataques suportados usam dano impresso, fraqueza ×2 e resistência −30 do alvo Ativo; dano ao Banco ignora ambos. Nocautes dão os Prêmios do perfil. Vitória simplificada cobre falta de Pokémon, último Prêmio e falha na compra inicial. Checkup fica totalmente manual, sem inventar resultados de moeda. Recuo suportado usa o custo impresso, Energias básicas e uma vez/turno; Ferramenta anexada ou Estádio exige intervenção manual. Condições que alteram o ataque suspendem sua automação. Uma habilidade de custo/defesa não implementada requer intervenção do jogador.

O controle manual permanece livre: mover Energia não liga automaticamente o marcador do turno, atacar por anotação não marca o ataque assistido e uma compra manual não substitui a compra inicial assistida. Ajuste marcadores conscientemente; para situações complexas, continue como mesa manual.

## Atualização rápida e site editável

O GitHub é a fonte principal. `npm ci`, `npm run typecheck`, `npm test` e `npm run build:web` verificam e geram `dist/`. O workflow **Check and build web** roda em Ubuntu e disponibiliza o artefato web. Não publica automaticamente em Sites. O workflow macOS do IPA agora é manual (**Actions → Build iOS unsigned IPA → Run workflow**), para evitar uma recompilação iOS a cada ajuste da interface.

A versão web usa o mesmo código React Native Web e permite editar listas e dados locais. O código completo também é preservado no repositório de fontes do Site para futuras edições. Alterações do GitHub e do Site não se sincronizam automaticamente: copie/integre as alterações e publique uma nova versão a partir do código revisado. A hospedagem pode exigir acesso do proprietário; o treino em si não tem conta. O navegador guarda seus dados por origem e não importa automaticamente os dados do app iOS. A primeira carga da página exige internet; esta versão web não é uma PWA com recarga offline. Com a página aberta, treino e imagens previamente armazenadas funcionam sem chamadas de rede.
