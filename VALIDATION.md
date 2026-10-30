# Verificação realizada

Data: 30/10/2026. Ambiente: Linux, Node.js 24.19.0, Expo SDK 54.

- `npm run typecheck`: passou, sem erros TypeScript.
- `npm test`: 12 testes passaram, nenhuma falha.
- `CI=1 EXPO_OFFLINE=1 npm run build:web`: exportação concluída.
- `CI=1 EXPO_OFFLINE=1 npx expo export --platform all --output-dir dist-native`: bundles web, Android e iOS gerados com sucesso; bundles nativos compilados para Hermes.
- `CI=1 EXPO_OFFLINE=1 npx expo install --check`: dependências compatíveis segundo os metadados locais do SDK. O próprio Expo informa que a checagem em modo offline não consulta metadados atualizados.

Os testes verificam importação TCG Live/Limitless, agrupamento por impressão, rejeição de linhas inválidas e total incorreto, intervalos de Prêmios, conferência de 54 cartas, seis identificações diretas, bloqueio de contagens inconsistentes, mapa finalizado, retirada de Prêmios, reinício de turno, recursos de partida e condições especiais. Um cenário enumera todos os arranjos possíveis e compara seus limites com os intervalos calculados.

Não foram executados emulador, navegador automatizado, build Gradle, teste de acessibilidade com leitor de tela ou validação em aparelho físico. O build Xcode remoto foi executado posteriormente, conforme a seção final. Os binários para as lojas, assinatura e publicação não fazem parte desta entrega.

O ZIP contém o código-fonte, o lockfile e os testes; não inclui `node_modules`, caches nem os bundles gerados. Rode `npm ci` para instalar as versões do lockfile.

## Preparação para IPA

Adicionados `eas.json`, número de build iOS `1`, scripts de build e `BUILD-IOS.md`. Configuração Expo resolvida com sucesso e perfis EAS conferidos. A verificação `eas whoami` retornou `Not logged in`; não há token Expo nem credenciais Apple configuradas no ambiente. O ambiente é Linux e não possui `xcodebuild`. Nenhum build remoto foi iniciado e nenhum IPA foi gerado.

## IPA sem assinatura para sideload

Adicionados o workflow `.github/workflows/ios-unsigned.yml`, o script `scripts/build-ios-unsigned.sh` e o guia `BUILD-IOS-UNSIGNED.md`. O projeto iOS `PrizeCheckTCG.xcodeproj` e seu scheme foram gerados por `expo prebuild --platform ios --no-install` com sucesso. A sintaxe Bash e o YAML passaram na verificação local. Os 12 testes do domínio e o TypeScript passaram novamente.

Este fluxo usa Xcode no runner macOS, desativa assinatura, compila Release para aparelho arm64, confere executável e JS bundle e empacota `Payload/PrizeCheckTCG.app` em um IPA. Não precisa de conta Expo nem credenciais Apple para compilar. O sideloader é responsável pela assinatura posterior.

### Resultado da compilação remota

- [GitHub Actions: execução 41144886344](https://github.com/rauloutubro-debug/Prizetcg/actions/runs/41144886344): **success**.
- Commit compilado: `648ef04a406da95fa5931fc111464543176a7c2f`.
- Os 12 testes e o TypeScript passaram no runner macOS.
- Arquivo: `PrizeCheckTCG-unsigned.ipa`, 6.616.728 bytes.
- Versão: 1.0.0 (1); bundle ID: `com.prizecheck.tcg`; iOS mínimo: 15.1.
- Download verificado: checksum do artefato GitHub, checksum do IPA e CRC das entradas do ZIP coincidem.
- Executável: Mach-O 64-bit arm64, plataforma iOS para aparelho, sem assinatura embutida.
- App sem `_CodeSignature` e sem `embedded.mobileprovision`; bundle JavaScript/Hermes embutido com 4.399.044 bytes.
- SHA-256 do IPA: `e7e714def4978e1f78d44c7c80650489bbe80815f127d00a44af133c692fbbd3`.

Assinatura por sideloader e execução em aparelho físico permanecem sem validação nesta entrega.
