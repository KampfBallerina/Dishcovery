# Dishcovery – Leitfaden für Agenten

Dishcovery ist eine Haushalts-App fürs iPhone, gebaut als PWA: gemeinsame Gerichte (Rezept, Zutaten, Foto, Videolink), ein Wochenplan mit Würfeln und Assistent, und ein Einkaufsentwurf, der an Bring! übergeben wird. Die App läuft komplett offline. Der Sync geht über einen geteilten Dropbox-Ordner, einen eigenen Server gibt es nicht.

## Stack und Befehle

- Vite + React 19 + TypeScript, Dexie (IndexedDB), vite-plugin-pwa, Vitest
- `npm run dev`: Dev-Server unter `http://localhost:5173/Dishcovery/`
- `npm test`: Logik-Tests (`src/logic/logic.test.ts`)
- `npm run build`: Typecheck und Build nach `dist/`
- Deployment: Ein Push auf `main` baut und veröffentlicht die App über GitHub Actions auf GitHub Pages (`.github/workflows/deploy.yml`).

## Aufbau

```
src/
  db.ts            Datenmodell, Dexie-Tabellen, save() – der einzige Schreibweg für synchronisierte Daten
  sync/            Dropbox-Login (PKCE), API-Aufrufe, Sync-Engine, Merge
  logic/           reine Funktionen: Wochen-IDs, Würfeln, Assistent, Einkauf (+ Tests)
  ui/              Bildschirme und gemeinsame Komponenten (components.tsx)
  i18n/            t() und de.json – alle sichtbaren Texte
  styles.css       Design-Tokens und alle Styles
docs/              Detail-Dokumente, siehe unten
```

## Regeln

1. **Synchronisierte Daten nur über `save(table, id, patch)` schreiben.** Die Funktion setzt Zeitstempel pro Feld und das Dirty-Flag. Ein direktes `put` geht am Sync vorbei. Löschen heißt `save(..., { deleted: true })`, außer bei Wochen (siehe docs/sync.md).
2. **Dropbox nur in `src/sync/` ansprechen.**
3. **Jeder sichtbare Text kommt aus `de.json` über `t()`.** Auch in CSS stehen keine Texte.
4. **UI- und UX-Arbeit immer mit dem Skill `frontend-design`.** Vorher docs/ui.md lesen, denn dort stehen Tokens und Gestaltungsprinzipien.
5. **Neue Logik mit Verzweigungen kommt als reine Funktion nach `src/logic/`, mit Test.**
6. **Keine neuen Abhängigkeiten für ein paar Zeilen Code.**
7. **Abkürzungen mit bekannter Grenze bekommen einen Kommentar** im Format `shortcut: <Grenze>, <wann ausbauen>`.

## Detail-Dokumente (nur bei Bedarf lesen)

- [docs/entscheidungen.md](docs/entscheidungen.md): was mit dem Nutzer vereinbart wurde und warum. Vor Funktionsänderungen lesen.
- [docs/datenmodell.md](docs/datenmodell.md): Gerichte, Wochen, Einkaufsentwurf, Fotos
- [docs/sync.md](docs/sync.md): Dropbox-Ordner, Merge, Konflikte, Aufräumen alter Wochen
- [docs/planer.md](docs/planer.md): Regeln für Würfeln und Assistent
- [docs/bring.md](docs/bring.md): Übergabe der Einkaufsliste an Bring! (JSON-Import, getestete Fakten)
- [docs/ui.md](docs/ui.md): Design-Tokens, Teller-Prinzip, Texte
- [docs/setup-dropbox.md](docs/setup-dropbox.md): Dropbox-App anlegen und Deployment (für Menschen)
