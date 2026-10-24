# Einrichtung (einmalig)

## 1. GitHub Pages

Im Repo `KampfBallerina/Dishcovery` unter **Settings → Pages → Source** die Option **„GitHub Actions“** wählen. Jeder Push auf `main` veröffentlicht die App danach unter `https://kampfballerina.github.io/Dishcovery/`. Andere Pages-Seiten auf dem Konto sind davon nicht betroffen.

## 2. Dropbox-App (App Console)

1. Die App ist unter https://www.dropbox.com/developers/apps angelegt: **Scoped access**, **Full Dropbox**.
2. Im Tab **Permissions** diese Rechte anhaken und auf **Submit** klicken:
   - `files.metadata.read`
   - `files.metadata.write`
   - `files.content.read`
   - `files.content.write`
   - `account_info.read`
   - `sharing.read` und `sharing.write` (für das Einladen und Beitreten)
3. Im Tab **Settings** bei den Redirect URIs muss beides eingetragen sein:
   - `https://kampfballerina.github.io/Dishcovery/`
   - `http://localhost:5173/Dishcovery/`
4. **„Allow public clients (PKCE)“** muss auf **Allow** stehen.
5. Der App key steht in `src/config.ts`.

Neue Rechte gelten nur für neue Anmeldungen. Wer vorher verbunden war, sieht in der App „Einmal neu verbinden“.

## 3. Nutzung im Haushalt

1. Die Adresse in **Safari** öffnen, auf **Teilen** tippen und **„Zum Home-Bildschirm“** wählen.
2. **Die erste Person** wählt **„Mit Dropbox verbinden“**. Die App legt den Ordner `/Dishcovery` selbst an.
3. Unter **Haushalt** (Personen-Symbol oben rechts) gibt sie bei **„Person einladen“** die E-Mail-Adresse ein. Dropbox verschickt die Einladung.
4. **Eingeladene** installieren die App und verbinden sich mit Dropbox, und zwar mit dem Konto zu genau dieser E-Mail-Adresse. Die App fragt dann „Du wurdest eingeladen“. Ein Tipp auf **Beitreten** genügt, die Einladungsmail muss nicht geöffnet werden.
