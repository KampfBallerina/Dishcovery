# Übergabe an Bring!

Grundlage ist der offizielle Bring!-Import-Guide, Abschnitt „Import with JSON File“:
https://sites.google.com/getbring.com/bring-import-dev-guide/web-to-app-integration

## Ablauf (`src/sync/bring.ts`, UI in `ShoppingScreen.tsx`)

1. **„{n} Artikel an Bring! senden“:**
   - Die angehakten Artikel landen als `<Haushaltsordner>/bring/liste-<zeit>.json` in Dropbox. Ältere Dateien dort werden gelöscht.
   - Dazu entsteht ein öffentlicher Dropbox-Link (`sharing/create_shared_link_with_settings`).
2. Der Link wird zur Rohdatei umgebaut (`dl.dropboxusercontent.com`), dazu kommt `&f=liste.json`.
3. **„In Bring! öffnen“** ist ein echter Link auf `https://api.getbring.com/rest/bringrecipes/deeplink?url=<datei>&source=web&baseQuantity=1&requestedQuantity=1`.
   - Bring! antwortet mit einem Redirect auf `getbring.onelink.me`, das öffnet die App.
   - Die App zeigt die Artikel und lässt auswählen, welche auf die Liste kommen.

Der Ablauf hat bewusst zwei Schritte: Der Upload dauert einen Moment, und nur ein echter Link-Tipp öffnet unter iOS zuverlässig die Bring!-App.

## JSON-Format

```json
{ "author": "Dishcovery", "linkOutUrl": "<App-URL>", "imageUrl": "<App-URL>logo.png", "name": "Dishcovery-Einkauf 24. Oktober",
  "tagline": "", "yield": "", "time": "", "nutrition": {},
  "items": [{ "itemId": "Hackfleisch", "spec": "400 g" }, { "itemId": "Zwiebel", "spec": "2×" }] }
```

`itemId` ist der Artikelname, `spec` die Menge (`itemSpec()` in `logic/shopping.ts`). Bring! ordnet die Namen selbst seinem Katalog zu (z. B. „Zwiebel“ → „Zwiebeln“, Abteilung „Früchte & Gemüse“).

## Getestete Fakten (24.10.2026)

- Der Parser (`/rest/bringrecipes/parser?url=…`) lädt die Datei **serverseitig**, CORS spielt also keine Rolle.
- Er behandelt eine URL nur als JSON, wenn sie **auf `.json` endet**, auch wenn das im Query steht. Andernfalls parst er HTML und meldet „no recipe name found“.
- Die Teilen-Erweiterung von Bring! (iOS-Teilen-Menü) nimmt nur Rezept-Links an, kein Text („Could not detect recipe link in text“).

## Grenzen

- Funktioniert nur mit Dropbox-Verbindung und Internet. Ohne bleibt „Kopieren“ (eine Zeile pro Artikel, in Bring! einfügen).
- Die aktuelle Einkaufsliste ist über einen öffentlichen, nicht erratbaren Dropbox-Link lesbar, bis zur nächsten Übergabe. Dann wird die Datei gelöscht.
- shortcut: Wenn Dropbox das Link-Format ändert, kann die Umwandlung zur Rohdatei brechen. Dann `sharing/get_temporary_link` (4 h gültig) als Alternative prüfen.
