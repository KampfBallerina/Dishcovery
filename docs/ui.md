# UI-Richtlinien

UI-Arbeit immer mit dem Skill `frontend-design`. Die Tokens stehen oben in `src/styles.css`.

## Tokens

Die Farben sind **Fog** (Flächen) und **Marigold** (Akzent, aus dem Logo übernommen).

| Token | Hell | Dunkel | Einsatz |
|---|---|---|---|
| `--accent` | #F9A313 | #F9A313 | Marigold: Kopf der Woche, Primär-Buttons, aktive Tabs |
| `--on-accent` | #23241F | #23241F | Text auf Marigold (Weiß hätte zu wenig Kontrast) |
| `--accent-text` | #8A5600 | #FBB53F | Marigold als Schrift (AA-Kontrast) |
| `--bg` / `--surface` | #ECEDE8 (Fog) / #F8F8F5 | #1C1D1A / #262824 | Flächen |
| `--ink` / `--muted` | #23241F / #5E615A | #EEEFEA / #A3A69E | Text |
| `--basil` | #3F7A3C | #82C277 | nur Status: festgelegt, Erfolg, „lange nicht gegessen“ |
| `--danger` | #B3261E | #F2B8B5 | nur destruktive Aktionen (Löschen, Dropbox trennen) |
| `--logo-ground` | #1F201D | #1F201D | Untergrund des Logos (Willkommen, App-Icons) |

- **Schrift:** Bricolage Grotesque (selbst gehostet über `@fontsource-variable`, funktioniert offline) für Tagesnamen, Gerichtnamen und Überschriften; für alles andere die iOS-Systemschrift.
- **Hell/Dunkel** folgt automatisch dem System über `prefers-color-scheme`.

## Logo und Icons

- Die Quelle ist `public/Dishcovery_Logo_NoBackground.png` (transparent, Marigold und Weiß mit Glow). Das Logo braucht einen dunklen Untergrund, weil die weißen Blätter und der Schriftzug sonst verschwinden.
- **Mit Schriftzug:** `pwa-512x512.png` und `logo.png` (für den Willkommensbildschirm).
- **Nur das Symbol, ohne „Dishcovery“:**
  - transparent: `favicon.ico` (16/32/48), `pwa-64x64.png`, `pwa-192x192.png`; `pwa-512x512.png` (mit Schriftzug) ist ebenfalls transparent
  - deckend auf `--logo-ground`, weil die Plattformen es verlangen:
    - `apple-touch-icon-180x180.png`: iOS füllt Transparenz schwarz auf
    - `maskable-icon-512x512.png`: muss randlos sein, das Symbol nimmt 60 % der Fläche ein
- Bei einem neuen Logo alle Größen neu erzeugen: das Symbol ist der Teil oberhalb des Schriftzugs, dazu sharp mit `extract` und `resize`.
## Bausteine (einheitlich auf allen Bildschirmen)

- **Kopf:** Hauptseiten haben einen großen, linksbündigen Titel (34 px, `TopBar`), rechts die Aktionen und als Letztes das Haushalt-Symbol (`HouseholdLink`, mit Punkt bei Sync-Problemen). Unterseiten (`back`) zeigen Zurück und einen kleinen Titel, ohne Haushalt-Symbol. Die Woche nutzt dasselbe Raster auf Marigold.
- **Seitenrand:** überall `--gutter` (20 px), auch in Sheets.
- **Hauptaktion in Daumenreichweite:**
  - „Neues Gericht“ ist ein runder Marigold-Teller (`.fab`) unten rechts.
  - Beim Bearbeiten bleibt „Speichern“ unten fixiert (`.save-bar`).
  - Mehrstufige Entscheidungen laufen in einem Sheet.
  - Der Assistent (Funken-Icon) ist überall derselbe Baustein (`Assistant` in `SlotSheet.tsx`): im Slot-Sheet der Woche und über den Funken in der Kopfleiste von „Gerichte“, dort öffnet ein Ergebnis das Gericht.
- **Rückmeldung:** Alles Tippbare gibt beim Drücken leicht nach (`:active`). Bestätigungen erscheinen als `toast()` über der Tab-Leiste, z. B. „Eingeladen“ oder „An Bring! übergeben“. Ein Toast kann eine Aktion tragen; Würfeln bietet so „Rückgängig“ an.
- **Zurück** geht im Verlauf zurück, wenn die vorige Seite aus der App kommt (`goBack` in `App.tsx`), sonst zum festen Link. Der Editor fragt vor dem Verlassen mit ungespeicherten Änderungen.
- **Leere Zustände:** immer `EmptyState` (`components.tsx`), bestehend aus gestricheltem leerem Teller, optional mit Icon, einem Titel, einem Satz und einer Aktion.
- **Hinweise:** `.banner.ok` (Basilikum) oder `.banner.warn` (Marigold), mit höchstens einer Aktion.
- **Kräftige Flächen** gibt es nur zweimal: den Marigold-Kopf der Woche und den dunklen Willkommensbildschirm mit dem Logo, der die einzige Lade-Animation hat.

## Prinzipien

- **Das Teller-Prinzip ist die Signatur der App.** Ein Gericht ist immer ein runder Teller (`<Plate>`): mit Foto, sonst mit dem Anfangsbuchstaben. Ein offener Slot ist ein gestrichelter leerer Teller, festgelegt heißt Basilikum-Rand mit Schloss. „Kochfrei“ ist ein sauberer, leerer Teller mit Rand, blass (`<Plate off>`): Hier fehlt nichts, es wurde so entschieden. Keine Karten-Optik, sonst ruhige Listen mit feinen Trennlinien.
- **Kühnheit nur an einer Stelle:** dem Marigold-Kopf der Wochenansicht mit großen Tagesnamen. Alles andere bleibt ruhig.
- **Touch-Ziele mindestens 44 px.** Safe-Areas (`env(safe-area-inset-*)`) beachten.
- **Bewegung nur als Antwort auf eine Aktion** (Sheet fährt hoch). `prefers-reduced-motion` wird respektiert.
- **Keine Großbuchstaben-Labels, keine Mittelpunkte als Trenner.** Metadaten werden mit Komma getrennt.
- **Sheets nutzen natives `<dialog>`** (`Sheet` in `components.tsx`).

## Texte

- Duzen im Haushalts-Ton („ihr“ für gemeinsame Entscheidungen).
- Ein Button sagt, was passiert („Entwurf erstellen“, „An Bring! übergeben“).
- Leere Zustände laden zum Handeln ein, Fehler sagen, was passiert ist und was man tun kann.
- Alle Texte stehen in `src/i18n/de.json`.
