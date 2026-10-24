# Wochenplaner und Assistent

Die Logik liegt in `src/logic/planner.ts` und ist in `logic.test.ts` getestet.

## Vergangene Tage

Nur heute und spätere Tage sind planbar (`openDays` in `week.ts`). Vergangene Tage sind Historie:
- Sie erscheinen blass, ohne Würfel und ohne „+ Mittag“.
- Ein Gericht dort öffnet nur sein Rezept.
- „Woche würfeln“ und der Assistent füllen ausschließlich offene Tage. Die letzte Woche ist komplett schreibgeschützt.

## Würfeln (`reroll`)

Es gibt drei Varianten: die ganze Woche (alle sichtbaren Slots), einen Tag (sichtbare Slots des Tages) und einen einzelnen Slot (über das Slot-Sheet).

- **Festgelegte Slots (`locked`) bleiben unverändert.** Ein von Hand oder über den Assistenten gewähltes Gericht wird automatisch festgelegt.
- **Gemieden werden:**
  - jedes Gericht, das schon in der Woche steht, auch das bisherige des Slots, damit Würfeln immer etwas Neues bringt
  - die Gerichte der Vorwoche (`recent`)
- **Gewichtung:** Favoriten zählen doppelt.
- **Zu wenige Gerichte:** Die Regeln werden stufenweise gelockert. Erst entfällt „Vorwoche meiden“, dann „keine Dopplung“.

## Assistent (`suggest`)

Er öffnet sich über „Was essen wir?“ (für den nächsten offenen Slot ab heute) oder im Slot-Sheet unter dem Tab „Assistent“.

| Frage | Wirkung |
|---|---|
| Was ist im Haus? (Zutaten antippen) | Score + 3 × Anteil der vorhandenen Zutaten |
| Wie viel Zeit? (20 oder 40 Min.) | harter Filter; Gerichte ohne Zeitangabe bleiben drin |
| Leicht oder deftig? | + 1, wenn das Schlagwort `leicht` bzw. `deftig` gesetzt ist |
| Vegetarisch oder mit Fleisch? | harter Filter über die Schlagwörter `vegetarisch` und `vegan` |
| Lange nicht gegessen oder Favoriten? | + 1 für nie oder vor über 4 Wochen gegessen bzw. für Favoriten |

Bei gleichem Score wird alphabetisch sortiert, angezeigt werden die besten 6. Die Bedeutung hängt an den Schlagwörtern. Deshalb schlägt der Editor `vegetarisch`, `vegan`, `leicht`, `deftig`, `schnell` usw. vor.

## „Zuletzt gegessen“

Es gilt das Maximum aus `dish.lastEaten` (gesetzt beim Löschen alter Wochen) und den vergangenen Tagen der noch gespeicherten Wochen (`useLastEaten` in `ui/data.ts`).
