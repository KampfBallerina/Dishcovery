# Übergabe an Bring!

Grundlage ist der offizielle Bring!-Import-Guide, Abschnitt „Import with JSON File“:
https://sites.google.com/getbring.com/bring-import-dev-guide/web-to-app-integration

## Ablauf (`src/sync/bring.ts`, UI in `ShoppingScreen.tsx`)

1. **Im Hintergrund vorbereitet**, solange der Einkauf-Tab offen ist (0,6 s nach der letzten Änderung, nacheinander):
   - Die offenen, angehakten Artikel landen als `<Haushaltsordner>/bring/liste-<zeit>.json` in Dropbox.
   - Jedes Gerät ersetzt dabei nur seine eigene vorige Datei (`meta.bringFile`).
   - Dazu entsteht ein öffentlicher Dropbox-Link, umgebaut zur Rohdatei (`dl.dropboxusercontent.com`) mit `&f=liste.json` am Ende.
2. Daraus baut `bringDeeplink()` direkt Bring!s App-Link: `https://deeplink.getbring.com/import?type=RECIPE&src=<base64 der Parser-URL>`.
   - Die Parser-URL lautet `https://api.getbring.com/rest/bringrecipes/parser?url=<datei>&baseQuantity=1&requestedQuantity=1`.
   - `deeplink.getbring.com/*` ist laut seiner `apple-app-site-association` ein **Universal Link** der Bring!-App. iOS öffnet die App also direkt, ohne die Weiterleitung über `api.getbring.com` und `onelink.me`. Mit dieser Weiterleitung blieb die PWA vorher auf einer Webseite mit „X“ hängen.
3. **Ein Tipp** auf „{n} Artikel an Bring! senden“ ist ein echter Link (`target=_blank`) und öffnet Bring!. Gleichzeitig wandern die gesendeten Artikel in `sent`.

Ohne Dropbox gibt es „Für Bring! kopieren“ (eine Zeile pro Artikel, in Bring! einfügen).

## Mengen

`itemSpec()`: Eine Menge wird nur mit Einheit übergeben, also „1 Becher“ Schmand, aber nur „Apfel“ statt „1 Apfel“. Das gilt auch für die Anzeige und das Kopieren.

## JSON-Format

```json
{ "author": "Dishcovery", "linkOutUrl": "<App-URL>", "imageUrl": "<App-URL>logo.png", "name": "Dishcovery-Einkauf 24. Oktober",
  "tagline": "", "yield": "", "time": "", "nutrition": {},
  "items": [{ "itemId": "Hackfleisch", "spec": "400 g" }, { "itemId": "Zwiebel", "spec": "" }] }
```

`itemId` ist der Artikelname, `spec` die Menge (`itemSpec()` in `logic/shopping.ts`). Bring! ordnet die Namen selbst seinem Katalog zu (z. B. „Zwiebel“ → „Zwiebeln“, Abteilung „Früchte & Gemüse“).

## Getestete Fakten (24.10.2026)

- Der Parser (`/rest/bringrecipes/parser?url=…`) lädt die Datei **serverseitig**, CORS spielt also keine Rolle.
- Er behandelt eine URL nur als JSON, wenn sie **auf `.json` endet**, auch wenn das im Query steht. Andernfalls parst er HTML und meldet „no recipe name found“.
- Die Teilen-Erweiterung von Bring! (iOS-Teilen-Menü) nimmt nur Rezept-Links an, kein Text („Could not detect recipe link in text“).

## Grenzen

- Funktioniert nur mit Dropbox-Verbindung und Internet. Ohne bleibt „Kopieren“ (eine Zeile pro Artikel, in Bring! einfügen).
- Die vorbereitete Liste ist über einen öffentlichen, nicht erratbaren Dropbox-Link lesbar, bis dasselbe Gerät die nächste vorbereitet. Dann wird die Datei gelöscht.
- shortcut: Wenn Dropbox das Link-Format ändert, kann die Umwandlung zur Rohdatei brechen. Dann `sharing/get_temporary_link` (4 h gültig) als Alternative prüfen.
