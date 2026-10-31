# Verificação do PTCGMAP 2.1

Atualização em 31/10/2026, antes de publicar no GitHub e no Site:

- `npm run typecheck`: passou.
- `npm test`: **34 testes passaram** (27 anteriores + 7 dos assistentes).
- `expo export --platform web`: passou; bundle estático React Native Web gerado.
- `qa/assistants_check.py`: **14 verificações passaram** no Chromium real com rede externa bloqueada. Seleção independente de listas, partida assistida, análise, aplicação da sequência, execução do turno adversário, histórico, desfazer sem novo turno automático e retomada após recarregar. Viewports 320×568, 390×844, 810×1080 e 1366×1024 sem overflow horizontal. Sem exceções JavaScript. Relatório em `qa/assistants-report.json`.
- Novos testes de domínio verificam custos tipados, uma ligação/turno, evolução, dano, Phantom Dive, Nocautes, Prêmios, vitória simplificada, conservação de 120 cópias, recuo, promoção preservando dano/anexos, orçamento do analisador, independência de informações ocultas, recusa de plano obsoleto, Checkup/mulligan manual e reversão por histórico.

A cobertura do robô é limitada aos perfis de `ASSISTANTS.md`. Não foi provada uma jogada globalmente ótima nem validado um motor completo de regras. Não houve nova compilação IPA 2.1 nem teste nativo em hardware nesta atualização. Os testes abaixo pertencem à entrega anterior e foram preservados como registro histórico.

---

# Verificação do PTCGMAP 2.0

Data: 31/10/2026. Código analisado e atualizado em Linux, Node.js 24.19.0, Expo SDK 54. A compilação iOS em nuvem usa o workflow macOS do repositório. A interface usa um único modal nativo com uma pilha lógica de painéis, evitando múltiplas apresentações simultâneas em UIKit.

## Domínio e persistência

`npm test`: **27 testes passaram** — 13 de parser/Prêmios/utilitários, 9 de mesa e 5 de migração/persistência/catálogo.

Cobertura relevante: listas TCG Live/Limitless e galerias, impressões distintas, contagem de 60 cartas, regras de exclusão dos seis Prêmios, conservação de 60/120 cópias, compra, permutações de embaralhamento, pilhas de evolução/anexos, capacidade das zonas, ampliação manual do Banco, privacidade visual, transição de turno, desfazer exato, migração sem sobrescrever a chave antiga, fila serial, sessão e histórico após serialização, recusa de dados inválidos e correspondência única no catálogo. Um teste executa **1.000 ações variadas**, verifica invariantes a cada ação e compara o snapshot restaurado por desfazer.

`npm run typecheck`: passou. A sintaxe Bash do script de IPA foi conferida com `bash -n`. O projeto nativo PTCGMAP e seu scheme foram gerados com Expo prebuild em Linux.

## Interface e cache no navegador

Testes executados com Playwright + Chromium real, sem respostas de catálogo simuladas. Relatórios: [qa/browser-report.json](qa/browser-report.json), [qa/interaction-report.json](qa/interaction-report.json) e [qa/startup-report.json](qa/startup-report.json). Roteiros e relatórios adicionais: `qa/startup_check.py`, `qa/layout_check.py` e `qa/error_check.py`. Execute primeiro `browser_check.py`, depois `interaction_check.py`; os demais verificam cenários complementares.

Foram exercitados importação e edição de deck, manutenção da sessão ao editar a biblioteca, compra, desfazer, busca, movimentação para Banco/Ativo, anexação de Energia, evolução, dano/condições/Habilidade, revelação e retirada de Prêmios, devolução por desfazer, treino solo e controle dos dois lados. A passagem de jogador removeu a mesa da árvore e a mão adversária permaneceu oculta; estudo revelou os dois lados explicitamente.

A rodada final de preparação baixou **21 imagens reais de 24 tipos** do exemplo para IndexedDB; rodadas anteriores obtiveram 22. A última rodada registrou também uma falha de rede em Rare Candy, sem apagar os arquivos já baixados. A fonte não ofereceu imagem para as duas Energias SVE; o fallback legível e a importação de imagem permanecem disponíveis. O seletor de arquivos importou uma imagem real local com a rede externa bloqueada.

O teste bloqueou todas as requisições HTTPS externas e confirmou renderização a partir de URLs Blob, sem download remoto. A sessão foi comparada após recarregar e também após fechar/reabrir o contexto persistente do navegador. As imagens locais foram retomadas com a rede externa ainda bloqueada. O código web continuou servido por localhost: isso testa dados e cache offline, não primeira carga de uma PWA totalmente desconectada.

Verificados viewports de **390×844**, **1024×768** e **1366×1024**, sem overflow horizontal do documento. Em paisagem de iPad, os campos ficam lado a lado; no iPhone a barra de ações rola horizontalmente. As verificações de interação e retomada passaram, incluindo migração real dos dados antigos, preservação de marcadores/VSTAR e recusa de sobrescrever um registro ilegível. Os estados ARIA de seleção e marcação foram corrigidos e conferidos. Não houve exceção JavaScript não tratada nesses fluxos. A rodada adicional também conferiu 320×568 e 810×1080. Somando os cinco relatórios de navegador, passaram 53 verificações, incluindo o erro de capacidade exibido no diálogo ativo sem movimentar a carta. Capturas de tela, imagens de teste e o perfil de navegador ficam fora do Git.

## Compilação

A exportação de bundles Android, iOS/Hermes e web foi executada com sucesso. Isso não equivale a instalação em hardware. O build Xcode remoto concluiu com sucesso; resultado e verificação abaixo.

## Limites da verificação

Não houve teste em iPhone/iPad físico, leitor de tela VoiceOver, assinatura por sideloader, teste de atualização sobre uma instalação real nem execução em modo avião em hardware. O cache nativo Documents e o picker nativo fazem parte do código, mas seus testes de execução aqui foram feitos pelo adaptador web; a compilação nativa é verificada separadamente.

A mesa não valida todas as regras, não automatiza ataques/efeitos/vitória e não possui adversário automático. Os dados de JSON exportados não incluem os arquivos de imagem, e não há restauração de backup pela interface nesta versão. Os artefatos antigos de PrizeCheck 1.0 continuam no histórico e não são o binário desta atualização.

## Resultado Xcode e IPA 2.0

- [Execução 41153961418](https://github.com/rauloutubro-debug/Prizetcg/actions/runs/41153961418): **success**; commit compilado `41f2b6006c2366e015c4ad367257f9c251a99436`.
- Testes e TypeScript passaram também no runner macOS.
- Arquivo compilado: `PTCGMAP-unsigned.ipa`, 6.719.160 bytes, versão 2.0.0 (build 2), bundle ID `com.prizecheck.tcg`.
- Destino: aparelho iOS arm64, iOS mínimo 15.1, famílias iPhone e iPad.
- O arquivo baixado foi conferido pelo digest do artefato GitHub, SHA-256 do IPA e CRC do ZIP.
- Executável Mach-O sem assinatura embutida; ausência de `_CodeSignature` e de `embedded.mobileprovision`; bundle embutido com 4.538.716 bytes.
- SHA-256 do IPA: `15f324e3da8aa156acdb1bcaabd786fa3c5b979bde013cdfb535900259d039c7`.

O verificador reproduzível está em `scripts/verify-ipa.py`. Os testes físicos e de assinatura/instalação pelo sideloader continuam pendentes, conforme os limites acima.
