# Datenmodell

Die Typen stehen in `src/db.ts`, das hier ist der Überblick.

Jeder synchronisierte Datensatz (`Synced`) hat:
- `id`
- `_ts`: Zeitstempel pro Feld (ms), setzt `save()`
- `_dirty`: `1` = noch nicht hochgeladen
- `_rev`: Dropbox-Revision der zuletzt synchronisierten Datei
- `deleted`: Tombstone

`_dirty` und `_rev` gibt es nur lokal, sie werden nie hochgeladen.

## Tabellen

| Dexie-Tabelle | Dropbox-Ordner | Inhalt |
|---|---|---|
| `dishes` | `dishes/<uuid>.json` | Gericht |
| `weeks` | `weeks/<jahr>-w<kw>.json` | Wochenplan, z. B. `2026-w43` |
| `misc` | `misc/einkauf.json` | Einkaufsentwurf (`SHOPPING_ID`) |
| `photos` | `photos/<uuid>.jpg` | Fotos als Blob, nur hinzufügen, nie überschreiben |
| `meta` | – | nur lokal: `auth`, `userName`, `root`, `cursor`, `pkce` |

## Gericht (`Dish`)

- `name`
- `photo`: Pfad `photos/…`
- `videoUrl`, `sourceUrl`
- `ingredients[]`: `{ amount?, unit?, name }`
- `steps[]`
- `servings`, `minutes?`
- `tags[]`
- `notes?`
- `favorite`
- `lastEaten?`: ISO-Datum, wird beim Löschen alter Wochen gesetzt
- `updatedBy?`: Dropbox-Anzeigename

## Woche (`Week`)

Die Schlüssel haben die Form `"<tag>-<mahlzeit>"`, also `0-abend` bis `6-mittag`. Tag 0 ist Montag. Der Wert ist `{ dishId, locked }`.

- Der Abend ist immer sichtbar.
- Der Mittag ist nur sichtbar, wenn sein Schlüssel ein Objekt ist. `null` oder ein fehlender Schlüssel bedeuten ausgeblendet.
- Die Slots liegen bewusst flach auf oberster Ebene, damit der Merge pro Feld pro Slot greift.

## Einkauf (`ShoppingDraft`, id `einkauf`)

Die Liste selbst wird **live aus dem Wochenplan berechnet** (`shoppingList()` in `logic/shopping.ts`). Gespeichert und synchronisiert werden nur die Änderungen des Haushalts:

- `dayChoice`: Tag (`"2026-w44/0"`) → mit oder ohne; fehlt der Eintrag, zählen die nächsten 7 Tage
- `excluded`: abgewählte Artikel-Schlüssel (`name|einheit`), also „schon da“
- `sent`: schon an Bring! geschickte Schlüssel. Sie erscheinen unter „Schon bei Bring!“ und werden nicht erneut geschickt; `afterSend()` entfernt Schlüssel, die nicht mehr auf der Liste stehen.
- `extra`: eigene Artikel
- `handedOverAt`, `handedOverBy`: wann und von wem zuletzt geschickt

Ältere Felder (`items`, `deleted`, `createdBy`) aus der ersten Version werden ignoriert.

shortcut: Jedes Array wird als ein Feld gemergt. Ändern zwei Personen offline gleichzeitig, gewinnt eine Seite. Auf Felder pro Artikel umbauen, falls das stört. Ein schon gesendeter Schlüssel bleibt „gesendet“, auch wenn später mehr Menge dazukommt.