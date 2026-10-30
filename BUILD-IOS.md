# Gerar o arquivo .ipa

O projeto está configurado para compilar iOS no EAS Build. O serviço usa macOS/Xcode na nuvem, permitindo solicitar o build a partir de Linux, Windows ou macOS.

## Pré-requisitos

É necessária uma conta Expo autenticada e uma conta Apple Developer Program com permissão para criar o App ID, certificado de distribuição e perfil de provisionamento. Se o identificador `com.prizecheck.tcg` não pertencer à sua equipe, altere `expo.ios.bundleIdentifier` em `app.json` para um identificador disponível antes de configurar as credenciais.

## Preparação única

Na pasta do projeto:

```bash
npm ci
npx eas-cli login
npx eas-cli init
```

`init` associa o aplicativo à conta Expo selecionada e grava `extra.eas.projectId` em `app.json`. Esse ID não foi inventado nem associado a uma conta de terceiros nesta entrega. Em uma cópia sem repositório Git, inicialize o repositório quando o CLI oferecer essa opção.

## Build de distribuição

```bash
npm run build:ios
```

No primeiro build, o EAS solicita as credenciais da equipe Apple. Configure ou reutilize o certificado e o perfil de provisionamento corretos. Depois, aguarde o build remoto. A página do build disponibiliza o download do `.ipa` assinado.

O perfil `production` usa distribuição App Store. Seu IPA é destinado ao App Store Connect/TestFlight; não é uma instalação direta em qualquer iPhone. O comando apenas compila, sem enviar para a loja. A disponibilização no TestFlight exige envio ao App Store Connect, processamento e configuração de testers como uma etapa posterior.

## Instalação direta em aparelhos registrados

Se o objetivo é testar por instalação direta, registre o iPhone na equipe Apple:

```bash
npx eas-cli device:create
npm run build:ios:preview
```

O perfil `preview` gera distribuição interna ad hoc, normalmente restrita aos dispositivos incluídos no provisionamento. Ele também precisa da conta Apple Developer e das credenciais válidas. Uma build para simulador não substitui esse IPA.

## Estado desta entrega

Ambiente disponível: Linux, sem Xcode e sem credenciais Apple configuradas. Não foi gerado arquivo `.ipa`. A exportação de bundles Android/iOS/web anterior valida o empacotamento JavaScript/Hermes; ela não compila o executável iOS nem realiza assinatura. O build remoto permanece dependente de autenticação Expo e provisionamento Apple.
