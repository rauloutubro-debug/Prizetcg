# Compilar PTCGMAP para iPhone/iPad sem Mac local

O workflow `.github/workflows/ios-unsigned.yml` usa um runner `macos-15` do GitHub Actions e gera **PTCGMAP-unsigned.ipa** para sideload. Ele compila o executável iOS; não renomeia um ZIP de JavaScript nem tenta recompilar o IPA anterior.

## Na nuvem

1. Abra **Actions → Build iOS unsigned IPA** no repositório.
2. Execute **Run workflow** na branch desejada. Um push de código também dispara o workflow.
3. Aguarde testes, TypeScript, Expo prebuild, instalação dos Pods e `xcodebuild archive` em Release.
4. Baixe o artefato **PTCGMAP-unsigned** e extraia `PTCGMAP-unsigned.ipa` e o checksum SHA-256.
5. Use seu sideloader para assinar e instalar o IPA no iPhone/iPad.

Esse build não usa conta Expo, certificado Apple ou provisionamento. O sideloader fará a assinatura depois e terá seus próprios requisitos. Um IPA sem assinatura não é instalável diretamente pelo iOS. Nenhum envio à App Store faz parte do workflow.

O projeto nativo e o scheme são detectados após o prebuild. O identificador `com.prizecheck.tcg` foi mantido; o nome exibido passou a PTCGMAP. Para reter os dados existentes, use a mesma identidade de assinatura do sideloader e instale como atualização, sem desinstalar o app anterior. A manutenção dos dados durante a instalação pelo sideloader precisa ser verificada no aparelho.

## Em um Mac com Xcode

```bash
npm ci
npm run build:ios:unsigned
```

É necessário Xcode, SDK iphoneos, CocoaPods e Node.js. O script recusa execução direta em Linux; no GitHub Actions o Mac é fornecido pelo runner.

A compilação desativa assinatura, usa destino de aparelho iOS e confere executável arm64 e `main.jsbundle` antes de criar `Payload/<app>.app` dentro do IPA. O bundle é embutido: o app nativo instalado não depende de Metro para funcionar.

Para um cliente local de desenvolvimento no simulador, use `npm run ios:native` em macOS com Xcode. Para distribuição assinada por EAS, os perfis anteriores permanecem em `eas.json`; consulte BUILD-IOS.md e configure as contas necessárias somente se escolher esse caminho.

## Verificação do aparelho

A compilação não substitui o teste em hardware. Verifique a atualização sobre a instalação anterior, a importação de imagens pelo Files, a retomada depois de encerrar o app e o treino em modo avião. Os resultados já executados estão em VALIDATION.md.

## Build verificado desta versão

[PTCGMAP 2.0, build 2 — execução concluída](https://github.com/rauloutubro-debug/Prizetcg/actions/runs/41153961418). O IPA é para iPhone/iPad arm64 com iOS 15.1 ou superior, sem assinatura. A assinatura deve ser feita pelo seu sideloader. A instalação no aparelho ainda não foi testada nesta entrega.

É possível conferir a estrutura e o checksum em Linux, Windows com Python ou macOS:

```bash
python3 scripts/verify-ipa.py PTCGMAP-unsigned.ipa 15f324e3da8aa156acdb1bcaabd786fa3c5b979bde013cdfb535900259d039c7
```

O hash acima corresponde à execução citada; um novo build pode produzir outro hash.
