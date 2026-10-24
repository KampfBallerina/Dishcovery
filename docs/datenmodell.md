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

## Einkaufsentwurf (`ShoppingDraft`)

- `items[]`: `{ key, name, amount?, unit?, count, needed, manual? }`
- `createdBy`
- `handedOverAt`, `handedOverBy`: gesetzt, sobald die Liste an Bring! übergeben ist
- `deleted`: Entwurf verworfen

shortcut: `items` ist ein einziges Feld. Ändern zwei Personen offline gleichzeitig verschiedene Artikel, gewinnt eine Liste ganz. Auf Artikel als eigene Felder umbauen, falls das in der Praxis stört.
