# Alquimix — app iOS (Capacitor + Codemagic)

Jogo de ordenar poções por cor, empacotado como app iOS com Capacitor. Este guia foi escrito para quem **não tem Mac** e vai fazer tudo **pelo celular** (Safari no iPhone ou Chrome no Android).

## O que tem no projeto

| Arquivo | Para que serve |
|---|---|
| `www/index.html` | O jogo: 100 níveis em 10 capítulos com estrelas, poções misteriosas (a partir do nível 21), bônus diário de 7 dias, desafio do dia, frascos de 3, 4 e 5 camadas, prêmio ao fechar cada capítulo, 16 conquistas, 7 estilos de frasco, música e efeitos gerados por código (sem arquivos de áudio), tutorial no nível 1, modo relaxante separado da campanha, a coruja Ônix com dicas, respingos ao despejar, idiomas português, inglês e espanhol, ajustes, pausa e loja. No navegador, anúncios e compras são simulados; no app, são reais. |
| `www/fonts/` | Fonte Baloo 2 (licença OFL) embutida, para funcionar sem internet. |
| `src/native.js` | Ponte com os plugins nativos: salvamento (Preferences), vibração (Haptics), tela de abertura (Splash Screen), anúncios (AdMob + ATT + UMP) e compras (RevenueCat). |
| `scripts/build.mjs` | Gera `www/native.js` e injeta as chaves das variáveis de ambiente. |
| `ios/` | Projeto Xcode (usa Swift Package Manager, não precisa de CocoaPods). |
| `codemagic.yaml` | Compila na nuvem e envia ao TestFlight. |
| `assets/` | Ícone e tela de abertura originais (1024×1024 e 2732×2732). |

**Dados fixos**

- Nome: **Alquimix** — Bundle ID: **`com.alquimix.jogo`**
- Produtos: `noads` e `theme_ouro` (não consumíveis), `coins200`, `coins600` e `coins1500` (consumíveis)
- Anúncios: recompensado (frasco extra, desfazer, dobrar moedas) e intersticial a cada 3 níveis
- AdMob vem com os IDs de **teste** do Google. Não troque antes do app estar publicado.

> **Dica para o Safari no iPhone:** os sites da Apple para desenvolvedores e o do AdMob funcionam melhor em modo computador. Toque em **aA** na barra de endereço → **Solicitar Site para Computador**.

---

## Passo 1 — Conta de desenvolvedor da Apple

1. Instale o app **Apple Developer** (App Store) e entre com seu Apple ID.
2. Toque em **Conta → Inscrever-se agora** e pague a anuidade (US$ 99). A aprovação pode levar até 48 h.
3. Depois de aprovado, entre em **appstoreconnect.apple.com → Negócios** (Business) e:
   - aceite o **Acordo de apps pagos** (Paid Apps Agreement);
   - preencha **dados bancários** e **informações fiscais**.

   Sem isso as compras in-app **não aparecem** no app, nem em teste.

## Passo 2 — Registrar o Bundle ID

1. Abra **developer.apple.com/account** → **Certificates, IDs & Profiles** → **Identifiers** → botão **+**.
2. Escolha **App IDs** → **App** → Continue.
3. Description: `Alquimix` — Bundle ID: **Explicit** → `com.alquimix.jogo`.
4. Em Capabilities, confira que **In-App Purchase** está marcado (vem marcado). Continue → Register.

## Passo 3 — Criar o app na App Store Connect

1. **appstoreconnect.apple.com → Apps → + → Novo app**.
2. Plataforma **iOS**, Nome **Alquimix** (se já existir, use algo como "Alquimix: Poções"), Idioma **Português (Brasil)**, Bundle ID **com.alquimix.jogo**, SKU `alquimix`, Acesso total.
3. Abra o app → **Informações do app** → copie o **Apple ID** (um número como `6741234567`). Ele será a variável `APP_STORE_APPLE_ID`.

## Passo 4 — Chave de API da App Store Connect (para o Codemagic)

1. **App Store Connect → Usuários e acesso → Integrações → App Store Connect API → Chaves da equipe**.
2. Toque em **+**, nome `Codemagic`, acesso **Admin** → Gerar.
3. Anote o **Issuer ID** (no topo da página) e o **ID da chave** (Key ID).
4. Toque em **Baixar chave da API**. Só dá para baixar **uma vez**. O arquivo `AuthKey_XXXX.p8` vai para o app **Arquivos** (pasta Downloads).
5. Para copiar o conteúdo no iPhone: no app Arquivos, segure o arquivo → **Renomear** → troque `.p8` por `.txt` → abra, segure o texto → **Selecionar tudo → Copiar**. Copie tudo, inclusive `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`.

## Passo 5 — Cadastrar as compras in-app

Em **App Store Connect → seu app → Monetização → Compras dentro do app → +**, crie os 5 produtos. O **ID do produto** precisa ser exatamente este:

| Tipo | ID do produto | Nome de referência | Preço sugerido |
|---|---|---|---|
| Não consumível | `noads` | Remover anúncios | R$ 9,90 |
| Consumível | `coins200` | 200 moedas | R$ 4,90 |
| Consumível | `coins600` | 600 moedas | R$ 9,90 |
| Consumível | `coins1500` | 1500 moedas | R$ 19,90 |
| Não consumível | `theme_ouro` | Estilo Ouro | R$ 4,90 |

Em cada um: defina o **preço**, adicione a **localização Português (Brasil)** com nome e descrição, e em **Informações para revisão** envie uma captura de tela do jogo (pode ser da loja). O status deve ficar **Pronto para enviar**. Produtos com dados faltando costumam não carregar no app.

## Passo 6 — RevenueCat

1. Crie a conta em **app.revenuecat.com** e um projeto chamado `Alquimix`.
2. **Apps → + New → App Store**: nome `Alquimix iOS`, Bundle ID `com.alquimix.jogo`.
3. Na mesma tela, em **In-App Purchase Key**, envie uma chave de compras in-app:
   - App Store Connect → **Usuários e acesso → Integrações → Compras dentro do app** → **+** → gerar e baixar o `.p8`;
   - no RevenueCat, envie o arquivo (pelo seletor de arquivos do celular), informe o Key ID e o **Issuer ID** (o mesmo do passo 4).
4. **Product catalog → Products → + New**: cadastre os 5 IDs (`noads`, `coins200`, `coins600`, `coins1500`, `theme_ouro`) no app iOS.
5. (Opcional) **Entitlements**: crie `noads` (ligado ao produto `noads`) e `theme_ouro` (ligado a `theme_ouro`). O jogo funciona sem isso, mas fica mais fácil ver quem comprou.
6. **Project settings → API keys** → copie a **Public app-specific API key** do app iOS (começa com `appl_`). Ela será `REVENUECAT_IOS_KEY`.

## Passo 7 — AdMob

**Para testar no TestFlight, nada é obrigatório**: o app já usa os IDs de teste do Google e mostra anúncios marcados como "Test Ad".

Para preparar os anúncios reais (faça agora ou só antes de publicar):

1. Entre em **admob.google.com** (modo computador) → **Apps → Adicionar app → iOS** → "O app está listado em uma loja?" **Não** → nome `Alquimix`.
2. Copie o **ID do app** (`ca-app-pub-...~...`) → será `ADMOB_APP_ID`.
3. **Blocos de anúncios → Adicionar**:
   - **Premiado** (rewarded) → copie o ID (`ca-app-pub-.../...`) → `ADMOB_REWARDED_ID`;
   - **Intersticial** → copie o ID → `ADMOB_INTERSTITIAL_ID`.
4. **Privacidade e mensagens**:
   - crie e publique uma mensagem **Regulamentações europeias (GDPR)** para o app (é o formulário de consentimento UMP que o jogo já abre quando necessário);
   - crie e publique a **Mensagem explicativa do IDFA** (aparece antes do pedido de rastreamento da Apple).
5. Só coloque essas 3 variáveis no Codemagic **quando for publicar na App Store**. Nunca toque nos seus próprios anúncios reais: o Google pode bloquear a conta.

## Passo 8 — Codemagic

1. Entre em **codemagic.io** com sua conta do **GitHub**.
2. **Add application** → GitHub → escolha o repositório **Alquimix** → tipo **Other** / "codemagic.yaml". (Se pedir, autorize o Codemagic a ler o repositório.)
3. Abra o app no Codemagic → aba **Environment variables**. Crie cada variável abaixo no grupo **`alquimix`**, com **Secret** marcado:

   | Variável | Valor |
   |---|---|
   | `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID (passo 4) |
   | `APP_STORE_CONNECT_KEY_IDENTIFIER` | Key ID (passo 4) |
   | `APP_STORE_CONNECT_PRIVATE_KEY` | Texto completo do `.p8` (passo 4) |
   | `APP_STORE_APPLE_ID` | Apple ID numérico do app (passo 3) |
   | `REVENUECAT_IOS_KEY` | Chave `appl_...` (passo 6) |
   | `CERTIFICATE_PRIVATE_KEY` | Veja o item 4 abaixo |
   | `ADMOB_APP_ID`, `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID` | Só na hora de publicar (passo 7) |

4. **Gerar a `CERTIFICATE_PRIVATE_KEY`** (uma vez só, sem computador):
   - toque em **Start new build** → workflow **"Gerar chave do certificado (rodar 1 vez)"** → Start;
   - quando terminar (1–2 min), abra o build → **Artifacts** → baixe `certificado_chave.pem`;
   - abra o arquivo (renomeie para `.txt` se precisar, como no passo 4), copie **tudo** e cole na variável `CERTIFICATE_PRIVATE_KEY` do grupo `alquimix`;
   - apague o arquivo do celular. Guarde uma cópia em um gerenciador de senhas: ela é a chave do seu certificado de distribuição.
5. **Start new build** → workflow **"Alquimix iOS → TestFlight"** → branch `main` → Start.

   O build leva uns 15–25 minutos. Ele cria sozinho o certificado e o perfil de distribuição, numera a build e envia ao TestFlight. Se falhar, abra o passo vermelho e leia a última mensagem: `Falta a variável ...` indica qual variável está faltando.

## Passo 9 — Testar no iPhone pelo TestFlight

1. App Store Connect → seu app → **TestFlight**. Espere a build sair de "Processando" (10–30 min; chega um e-mail).
2. Em **Testes internos** crie um grupo, adicione você mesmo e marque a build.
3. Instale o app **TestFlight** no iPhone e aceite o convite.
4. O que conferir:
   - ao abrir: pedido de rastreamento ("Permitir que o app rastreie...");
   - **+1 frasco**, **Desfazer** (depois de usar os 3 grátis) e **dobrar moedas** mostram anúncio de teste e dão a recompensa só se você assistir até o fim;
   - ao passar dos níveis 3, 6, 9... aparece o intersticial;
   - vibração leve ao despejar e ao completar um frasco;
   - **Loja**: os preços vêm da App Store. Compras no TestFlight são de teste (não cobram). Compre `noads`, apague o app, instale de novo e toque em **Restaurar compras**.

## Passo 10 — Antes de publicar na App Store

- Coloque `ADMOB_APP_ID`, `ADMOB_REWARDED_ID` e `ADMOB_INTERSTITIAL_ID` reais no Codemagic e gere uma build nova.
- Publique uma **política de privacidade** (pode ser uma página simples, ex. no GitHub Pages ou Google Sites) e informe a URL no app.
- Em **Privacidade do app**, declare: Identificadores (ID do dispositivo) e Dados de uso, usados para **publicidade de terceiros** e **rastreamento**; Compras, para funcionalidade do app.
- Envie as capturas de tela (iPhone 6,9"), a classificação etária e, na versão, **adicione as 5 compras in-app** para revisão junto com o app.
- No AdMob, depois que o app estiver na loja, vincule o app à App Store e publique o `app-ads.txt` no site do desenvolvedor.

---

## Para quem tiver computador (opcional)

```bash
npm install
npm run serve          # joga no navegador em http://localhost:8080 (modo simulado)
npm run sync           # gera www/native.js e copia para ios/
```

`npm run build` lê as mesmas variáveis de ambiente do Codemagic (`REVENUECAT_IOS_KEY`, `ADMOB_*`). Sem elas, usa os IDs de teste do AdMob e deixa as compras simuladas.

Para trocar o ícone: substitua `assets/icon.png` (1024×1024, sem transparência) e rode `npx @capacitor/assets generate --ios`.
