# Sync über Dropbox

Der Code liegt in `src/sync/`. `dropbox.ts` enthält Login und API-Aufrufe, `sync.ts` die Engine, `merge.ts` den Merge.

## Login

OAuth 2 mit PKCE direkt aus dem Browser. Der App-Key steht in `src/config.ts` (öffentlich, ein Secret gibt es nicht). `token_access_type=offline` liefert ein Refresh-Token, das in `meta.auth` liegt. Der PKCE-Verifier liegt in IndexedDB statt in sessionStorage, weil iOS nach dem Login einen neuen Browsing-Kontext öffnen kann.

**Trennen** (`disconnect()` in `household.ts`): Das Token wird bei Dropbox widerrufen, ohne Netz nur lokal vergessen. Danach werden Login, Ordner und Cursor gelöscht. Die Gerichte bleiben auf dem Gerät und in Dropbox. Bei erneutem Verbinden markiert `chooseRoot()` alles als dirty und mergt es wieder ein.

Die App braucht **vollen Dropbox-Zugriff**, keinen App-Ordner. Ein geteilter Ordner hängt bei jeder Person an einem anderen Pfad, und App-Ordner lassen sich nicht sinnvoll teilen. Die App liest und schreibt trotzdem nur unter `meta.root`. Für das Einladen kommen die Rechte `sharing.read` und `sharing.write` dazu.

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

## Haushaltsordner (`household.ts`)

Es gibt keine Ordnerauswahl. `checkHousehold()` läuft nach dem Login und bei jedem Start:

1. **Offene Einladung prüfen:** `sharing/list_mountable_folders` sucht einen noch nicht eingebundenen Ordner namens `Dishcovery`. Gibt es einen, erscheint das Fenster „Du wurdest eingeladen“.
   - **Beitreten:** `sharing/mount_folder`, danach wird der Ordner mit `chooseRoot()` zum Haushaltsordner.
   - **Später:** Die Einladung wird in `meta.inviteDismissed` gemerkt und erscheint nur noch als Hinweis im Haushalt.
2. **Ohne Einladung und ohne Ordner:** Zuerst wird ein schon geteilter `Dishcovery`-Ordner gesucht (`sharing/list_folders`), sonst `/Dishcovery` angelegt. Eine 409 heißt, dass er schon existiert.

**Einladen:** `files/get_metadata` liefert die `shared_folder_id`. Fehlt sie, wird der Ordner erst mit `sharing/share_folder` geteilt; ein Async-Job wird abgefragt. Danach `sharing/add_folder_member` mit `editor`-Rechten. Dropbox verschickt die Mail.

**Fehlende Rechte:** Ein Token aus der Zeit vor `sharing.*` liefert 401 `missing_scope`. Dann zeigt die App „Einmal neu verbinden“.

shortcut: Einladungen werden am Ordnernamen `Dishcovery` erkannt. Benennt jemand den Ordner um, erkennt die App die Einladung nicht mehr. Eine Markierungsdatei einführen, falls das vorkommt.

## Ordner wechseln

`chooseRoot()` löscht Cursor und `_rev` und markiert alles als dirty. So wird der lokale Bestand in den neuen Ordner gemergt. Wer beitritt, bringt seine bisherigen Gerichte also in den Haushalt mit.
