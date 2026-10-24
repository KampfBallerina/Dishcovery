# Sync über Dropbox

Der Code liegt in `src/sync/`. `dropbox.ts` enthält Login und API-Aufrufe, `sync.ts` die Engine, `merge.ts` den Merge.

## Login

OAuth 2 mit PKCE direkt aus dem Browser. Der App-Key steht in `src/config.ts` (öffentlich, ein Secret gibt es nicht). `token_access_type=offline` liefert ein Refresh-Token, das in `meta.auth` liegt. Der PKCE-Verifier liegt in IndexedDB statt in sessionStorage, weil iOS nach dem Login einen neuen Browsing-Kontext öffnen kann.

Die App braucht **vollen Dropbox-Zugriff**, keinen App-Ordner. Ein geteilter Ordner hängt bei jeder Person an einem anderen Pfad, und App-Ordner lassen sich nicht sinnvoll teilen. Die App liest und schreibt trotzdem nur unter `meta.root`.

## Ablauf von `sync()`

Ausgelöst wird er beim Start, 1,5 s nach jedem `save()`, bei `online`, beim Zurückkehren in die App und alle 60 s.

1. **Pull:** `list_folder` (rekursiv), danach nur noch `list_folder/continue` mit dem gespeicherten Cursor.
   - Für JSON-Dateien mit neuer `rev` wird die Datei geladen und `merge(lokal, remote)` gebildet.
   - Der Datensatz bleibt dirty, wenn er lokal geändert war oder lokal neuere Felder hat.
   - Fotos werden geladen, falls sie lokal fehlen.
2. **Push:** Alle `_dirty`-Datensätze werden mit `mode: update(rev)` hochgeladen, neue mit `mode: add`.
   - Ein Konflikt heißt, dass jemand anderes zuerst geschrieben hat. Dann folgen erneut Pull, Merge und Push, höchstens 3 Durchläufe.
   - Nach dem Upload bleibt ein Datensatz dirty, falls er währenddessen bearbeitet wurde (Vergleich von `_ts`).
3. **Aufräumen:** Wochen älter als „letzte Woche“ schreiben `lastEaten` in ihre Gerichte und werden dann lokal und in Dropbox gelöscht. Ein 409 beim Löschen ist ok, dann war ein anderes Gerät schneller.

## Merge

Pro Feld gewinnt der höhere Zeitstempel, bei Gleichstand der lokale Wert. Grundlage ist die Geräteuhr.

shortcut: Bei stark falsch gehender Uhr gewinnt dieses Gerät zu oft. Auf Hybrid-Logical-Clocks umstellen, falls das je auffällt.

## Löschen

- **Gerichte und Einkaufsentwurf:** Tombstone `deleted: true` (Datei bleibt).
- **Wochen:** werden echt gelöscht. Der Pull reagiert auf `deleted`-Einträge im Ordner `weeks/`.
- **Fotos:** werden nie gelöscht. shortcut: Fotos gelöschter Gerichte bleiben in Dropbox liegen. Aufräumen, falls der Ordner zu groß wird.

## Ordner wechseln

`chooseRoot()` löscht Cursor und `_rev` und markiert alles als dirty. So wird der lokale Bestand in den neuen Ordner gemergt.
