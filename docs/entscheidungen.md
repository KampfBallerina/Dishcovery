# Entscheidungen (Interview mit dem Nutzer, 24.10.2026)

| Thema | Entscheidung | Warum |
|---|---|---|
| Plattform | PWA, „Zum Home-Bildschirm“ auf dem iPhone, kein App Store | genügt, kostet nichts |
| Hosting | GitHub Pages aus öffentlichem Repo `Dishcovery` | kostenlos; im Repo liegen keine Daten |
| Sync | geteilter Dropbox-Ordner, jede Person mit eigenem Konto; kein eigener Server | Nutzer kennt Dropbox und hat es schon genutzt |
| Haushalte | ein Haushalt pro Ordner, alle sind gleichberechtigt | keine Rollen nötig |
| Konflikte | spätere Änderung gewinnt, pro Feld per Zeitstempel | einfach zu verstehen, Konflikte sind selten |
| Offline | alles geht offline, Sync sobald online | Kernanforderung |
| Gericht | Name, 1 Foto, Videolink, Quelle, Zutaten (strukturiert), Schritte, Portionen, Zeit, freie Schlagwörter, Notizen, Favorit | **keine Bewertung** (ausdrücklich nicht gewünscht) |
| Zutaten | Menge und Einheit optional, Name mit Autovervollständigung; auf der Einkaufsliste nur Menge mit Einheit („1 Becher Schmand“, aber „Apfel“) | Assistent und Einkauf brauchen auswertbare Zutaten |
| Wochenplan | Slots Mittag und Abend pro Tag; standardmäßig nur Abend, „+ Mittag“ blendet den Mittag pro Tag ein | so plant der Haushalt |
| Wochen | letzte, aktuelle und nächste Woche werden gespeichert, ältere gelöscht | Datenmenge klein halten (Wunsch des Nutzers) |
| Würfeln | ganze Woche, ein Tag oder ein Slot; festgelegte Slots bleiben; keine Dopplung pro Woche; Gerichte der Vorwoche meiden; Favoriten doppelt so oft | |
| Manuelle Wahl | ein von Hand gewähltes Gericht wird automatisch festgelegt | „bestimmte Gerichte vorher festlegen“ |
| Assistent | regelbasiert, offline, direkt in der Wochenansicht (kein eigener Tab) | KI-Variante (Claude-API) wäre ein späterer optionaler Zusatz |
| Vorrat | wird nicht gepflegt; Zutaten werden im Assistenten jedes Mal angetippt | einen Vorrat hält erfahrungsgemäß niemand aktuell |
| Einkauf | Liste folgt live dem Wochenplan (Tage wählbar, Standard: nächste 7 Tage); abwählen, eigene Artikel; ein Tipp schickt an Bring!; Geschicktes steht unter „Schon bei Bring!“. Kein Rückgängig, kein manueller Entwurf | Wunsch des Nutzers: immer aktuell, so wenige Klicks wie möglich |
| Bring! | offizieller JSON-Import von Bring!: Liste als JSON in Dropbox, öffentlicher Link, Bring!-Deeplink öffnet die App; ohne Dropbox: Kopieren und Einfügen. Details in docs/bring.md | kein Passwort, keine inoffizielle API; das Teilen-Menü nimmt nur Rezept-Links an (getestet am 24.10.2026) |
| Sprache | Deutsch, alle Texte in `de.json`, vorbereitet für weitere Sprachen | |
| Navigation | Tabs Woche, Gerichte, Einkauf; „Haushalt“ über das Personen-Symbol oben rechts | |
| Haushaltsordner | wird automatisch als `/Dishcovery` angelegt, ohne Ordnerauswahl | so einfach wie möglich, keine Bedienfehler (Wunsch des Nutzers) |
| Einladen | per E-Mail im Haushalt; Eingeladene melden sich nur an und tippen im Fenster auf „Beitreten“ | Wunsch des Nutzers |
| Look | Fog als Fläche, Marigold als Akzent, Hell/Dunkel automatisch; Logo `Dishcovery_Logo_NoBackground.png` | Vorgabe des Nutzers (ersetzt das anfängliche Tomatenrot) |

## Bewusst weggelassen (Ideen für später)

- Rezept-Import aus einer URL (Schema.org); braucht einen Proxy wegen CORS
- KI-Assistent mit freiem Text
- mehrere Fotos pro Gericht
- echte Bring!-Anbindung
- Abstimmung pro Person beim Einkauf
