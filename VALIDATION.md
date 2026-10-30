# Verificação realizada

Data: 30/10/2026. Ambiente: Linux, Node.js 24.19.0, Expo SDK 54.

- `npm run typecheck`: passou, sem erros TypeScript.
- `npm test`: 12 testes passaram, nenhuma falha.
- `CI=1 EXPO_OFFLINE=1 npm run build:web`: exportação concluída.
- `CI=1 EXPO_OFFLINE=1 npx expo export --platform all --output-dir dist-native`: bundles web, Android e iOS gerados com sucesso; bundles nativos compilados para Hermes.
- `CI=1 EXPO_OFFLINE=1 npx expo install --check`: dependências compatíveis segundo os metadados locais do SDK. O próprio Expo informa que a checagem em modo offline não consulta metadados atualizados.

Os testes verificam importação TCG Live/Limitless, agrupamento por impressão, rejeição de linhas inválidas e total incorreto, intervalos de Prêmios, conferência de 54 cartas, seis identificações diretas, bloqueio de contagens inconsistentes, mapa finalizado, retirada de Prêmios, reinício de turno, recursos de partida e condições especiais. Um cenário enumera todos os arranjos possíveis e compara seus limites com os intervalos calculados.

Não foram executados emulador, navegador automatizado, build Gradle/Xcode, teste de acessibilidade com leitor de tela ou validação em aparelho físico. A exportação dos bundles não equivale a gerar APK/IPA nem a validar comportamento visual e persistência em um dispositivo. Os binários para as lojas, assinatura e publicação não fazem parte desta entrega.

O ZIP contém o código-fonte, o lockfile e os testes; não inclui `node_modules`, caches nem os bundles gerados. Rode `npm ci` para instalar as versões do lockfile.

## Preparação para IPA

Adicionados `eas.json`, número de build iOS `1`, scripts de build e `BUILD-IOS.md`. Configuração Expo resolvida com sucesso e perfis EAS conferidos. A verificação `eas whoami` retornou `Not logged in`; não há token Expo nem credenciais Apple configuradas no ambiente. O ambiente é Linux e não possui `xcodebuild`. Nenhum build remoto foi iniciado e nenhum IPA foi gerado.

## IPA sem assinatura para sideload

Adicionados o workflow `.github/workflows/ios-unsigned.yml`, o script `scripts/build-ios-unsigned.sh` e o guia `BUILD-IOS-UNSIGNED.md`. O projeto iOS `PrizeCheckTCG.xcodeproj` e seu scheme foram gerados por `expo prebuild --platform ios --no-install` com sucesso. A sintaxe Bash e o YAML passaram na verificação local. Os 12 testes do domínio e o TypeScript passaram novamente.

Este fluxo usa Xcode no runner macOS, desativa assinatura, compila Release para aparelho arm64, confere executável e JS bundle e empacota `Payload/PrizeCheckTCG.app` em um IPA. Não precisa de conta Expo nem credenciais Apple para compilar. O sideloader é responsável pela assinatura posterior. A compilação macOS ainda não foi executada e nenhum IPA sem assinatura foi produzido: falta definir um repositório GitHub de destino com Actions disponível.
