# Einrichtung (einmalig, etwa 10 Minuten)

## 1. Repo auf GitHub veröffentlichen

1. Öffne in VS Code die Quellcodeverwaltung und wähle **„Publish to GitHub“**.
2. Als Name `dishcovery` eingeben und **public** wählen.
3. Auf GitHub unter **Settings → Pages → Source** die Option **„GitHub Actions“** wählen.
4. Nach dem ersten Workflow-Lauf ist die App erreichbar unter `https://<dein-github-name>.github.io/dishcovery/`.

## 2. Dropbox-App anlegen

1. Öffne https://www.dropbox.com/developers/apps und wähle **„Create app“**.
2. Bei der API **„Scoped access“** wählen, beim Zugriff **„Full Dropbox“**. Das ist nötig, damit die App den geteilten Ordner findet.
3. Name: z. B. `Dishcovery-<deinname>`. Der Name muss bei Dropbox weltweit eindeutig sein.
4. Im Tab **Permissions** diese Rechte anhaken und auf **Submit** klicken:
   - `files.metadata.read`
   - `files.metadata.write`
   - `files.content.read`
   - `files.content.write`
   - `account_info.read`
5. Im Tab **Settings** unter **OAuth 2 → Redirect URIs** beide Adressen hinzufügen:
   - `https://<dein-github-name>.github.io/dishcovery/`
   - `http://localhost:5173/dishcovery/` (für die Entwicklung)
6. Bei **„Allow public clients (Implicit Grant & PKCE)“** muss **Allow** stehen.
7. Den **App key** kopieren und in `src/config.ts` eintragen: `export const DROPBOX_APP_KEY = '…'`. Danach committen und pushen.

Die App bleibt im Status „Development“. Das reicht für bis zu 50 verbundene Konten, ohne bei Dropbox eine Freigabe zu beantragen.

## 3. Auf den iPhones installieren

1. Die Adresse in **Safari** öffnen, auf **Teilen** tippen und **„Zum Home-Bildschirm“** wählen.
2. Die App öffnen, auf das Zahnrad tippen und **„Mit Dropbox verbinden“** wählen.
3. **Die erste Person** legt mit „Neuer Ordner hier“ einen Ordner an, z. B. `Dishcovery`, und teilt ihn danach in der Dropbox-App mit den anderen.
4. **Alle anderen** nehmen die Freigabe in Dropbox an und wählen in Dishcovery denselben Ordner.

Ab dann sehen alle dieselben Gerichte, denselben Plan und denselben Einkaufsentwurf, auch offline. Die Änderungen werden übertragen, sobald wieder Internet da ist.
