# IPA sem assinatura para sideload

Este é o fluxo para gerar um executável iOS de aparelho e empacotá-lo em `Payload/PrizeCheckTCG.app` dentro de `PrizeCheckTCG-unsigned.ipa`, sem certificado ou provisionamento Apple. Não é necessário um Mac local: o GitHub Actions fornece macOS e Xcode.

Não requer login Expo, conta Apple Developer paga ou credenciais Apple para compilar. É necessário um repositório GitHub com Actions habilitado e disponibilidade de minutos para runners macOS conforme o plano da conta.

## Gerar pelo navegador

1. Coloque o conteúdo desta pasta na raiz de um repositório GitHub seu, incluindo `.github/workflows/ios-unsigned.yml`, `scripts/`, código-fonte e `package-lock.json`. Os arquivos ocultos precisam ser incluídos. Não envie `node_modules`, `build`, `output` ou os bundles exportados.
2. O push dos arquivos dispara o workflow **Build iOS unsigned IPA**. Também é possível executar em **Actions → Build iOS unsigned IPA → Run workflow**, quando o workflow estiver na branch padrão.
3. Aguarde a conclusão. Se falhar, consulte o passo e o artefato `ios-build-log` quando disponível.
4. Abra a execução concluída e baixe o artefato **PrizeCheckTCG-unsigned**. Extraia o ZIP do artefato: dentro estará `PrizeCheckTCG-unsigned.ipa` e seu checksum SHA-256.
5. Importe esse `.ipa` no sideloader escolhido para realizar a assinatura e instalação. Os requisitos de Apple ID, certificado, renovação e dispositivo dependem do sideloader. O arquivo não assinado não é instalável diretamente pelo iOS.

O workflow não publica o app na App Store e não contém etapas de assinatura. O app é compilado em Release para `iphoneos`, com arquitetura arm64 e bundle JavaScript/Hermes embutido, sem depender de Metro ou Expo Go. O script valida a presença do executável arm64 e de `main.jsbundle` antes de empacotar.

## Script usado na nuvem

```bash
npm ci
npm run build:ios:unsigned
```

O segundo comando exige macOS/Xcode/CocoaPods; executá-lo em Linux falha com uma mensagem explícita. Dentro do GitHub Actions, essas ferramentas são fornecidas pelo runner `macos-15`. O script gera o projeto nativo via Expo prebuild, instala os Pods e executa `xcodebuild archive` com assinatura desativada. Em seguida, empacota o `.app` compilado em um IPA.

## Estado real da entrega

A compilação Xcode e o empacotamento concluíram com sucesso no [build 2 do repositório](https://github.com/rauloutubro-debug/Prizetcg/actions/runs/41144886344), a partir do commit `648ef04a406da95fa5931fc111464543176a7c2f`. O artefato `PrizeCheckTCG-unsigned` contém o IPA e seu checksum. Os artefatos desse workflow ficam disponíveis por sete dias; para gerar novamente, execute o workflow.

Arquivo gerado: `PrizeCheckTCG-unsigned.ipa`, 6.616.728 bytes, versão 1.0.0 (build 1), bundle ID `com.prizecheck.tcg`, iOS mínimo 15.1. A conferência do arquivo baixado confirmou executável Mach-O arm64 para aparelho iOS, bundle embutido, CRC do ZIP válido, ausência de assinatura no executável e ausência de provisionamento e assinatura de recursos no app.

SHA-256: `e7e714def4978e1f78d44c7c80650489bbe80815f127d00a44af133c692fbbd3`.

Ainda não foi validada a assinatura por um sideloader nem a instalação em um iPhone físico. Os perfis EAS assinados do guia anterior são opcionais e não são usados neste fluxo.
