# UI-Richtlinien

UI-Arbeit immer mit dem Skill `frontend-design`. Die Tokens stehen oben in `src/styles.css`.

## Tokens

| Token | Hell | Dunkel | Einsatz |
|---|---|---|---|
| `--tomato` | #E03C28 | #E8452F | Akzent, Kopf der Wochenansicht, Primär-Buttons |
| `--tomato-text` | #C0321F | #FF7B66 | roter Text (AA-Kontrast) |
| `--basil` | #3D7A3A | #7CBF70 | festgelegt, „lange nicht gegessen“, Erfolg |
| `--ink` | #2B2421 | #F3EEEA | Text |
| `--bg` / `--surface` | #FBFAF8 / #FFF | #1A1614 / #241F1C | Flächen |

- **Schrift:** Bricolage Grotesque (selbst gehostet über `@fontsource-variable`, funktioniert offline) für Tagesnamen, Gerichtnamen und Überschriften; für alles andere die iOS-Systemschrift.
- **Hell/Dunkel** folgt automatisch dem System über `prefers-color-scheme`.

## Prinzipien

- **Das Teller-Prinzip ist die Signatur der App.** Ein Gericht ist immer ein runder Teller (`<Plate>`): mit Foto, sonst mit dem Anfangsbuchstaben. Ein offener Slot ist ein gestrichelter leerer Teller, festgelegt heißt Basilikum-Rand mit Schloss. Keine Karten-Optik, sonst ruhige Listen mit feinen Trennlinien.
- **Kühnheit nur an einer Stelle:** dem tomatenroten Kopf der Wochenansicht mit großen Tagesnamen. Alles andere bleibt ruhig.
- **Touch-Ziele mindestens 44 px.** Safe-Areas (`env(safe-area-inset-*)`) beachten.
- **Bewegung nur als Antwort auf eine Aktion** (Sheet fährt hoch). `prefers-reduced-motion` wird respektiert.
- **Keine Großbuchstaben-Labels, keine Mittelpunkte als Trenner.** Metadaten werden mit Komma getrennt.
- **Sheets nutzen natives `<dialog>`** (`Sheet` in `components.tsx`).

## Texte

- Duzen im Haushalts-Ton („ihr“ für gemeinsame Entscheidungen).
- Ein Button sagt, was passiert („Entwurf erstellen“, „An Bring! übergeben“).
- Leere Zustände laden zum Handeln ein, Fehler sagen, was passiert ist und was man tun kann.
- Alle Texte stehen in `src/i18n/de.json`.
