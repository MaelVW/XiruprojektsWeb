# Nachtschicht-Auftrag (für automatische Läufe)


Du arbeitest selbstständig (Nachtschicht, Mael schläft) an der statischen Website „Xiruprojekts" im Ordner `F:\Code stuff\XiruprojektsWeb` (reines HTML/CSS/JS, Deutsch, Schweizer Schreibweise). Es gibt keinen Menschen, der Fragen beantwortet – triff vernünftige Entscheidungen selbst und halte dich an die Regeln.

## Ablauf
1. **Sperre prüfen:** Gibt es die Datei `F:\Code stuff\XiruprojektsWeb\docs\.nachtschicht-lauf` und ist sie jünger als 100 Minuten (Änderungszeit), läuft schon eine andere Schicht → sofort beenden, nichts ändern. Sonst die Datei anlegen bzw. überschreiben mit der aktuellen Uhrzeit.
2. Lies vollständig: `docs/TASKS.md` (Aufgabenliste + Spielregeln), `docs/NEUE-SEITE.md` (Konventionen, XIRU-API), danach nur die Dateien, die du für die nächste Aufgabe brauchst.
3. Nimm die **oberste offene Aufgabe** (`- [ ]`) aus `docs/TASKS.md` und erledige sie vollständig und poliert. Danach die nächste. Höchstens etwa 90 Minuten bzw. 3–4 Aufgaben pro Schicht, dann sauber aufhören.
4. Nach jeder Aufgabe: testen (siehe unten), `python tools/check_site.py` ausführen, in `docs/TASKS.md` abhaken (`- [x]`) und unter „Notizen der letzten Sitzung" eine Zeile mit Datum/Uhrzeit und dem Ergebnis ergänzen. So kann die nächste Schicht nahtlos weitermachen, auch wenn du mittendrin abbrichst.
5. Zum Schluss: kurze Zusammenfassung der Schicht in den Notizen von `docs/TASKS.md` und die Sperrdatei `docs/.nachtschicht-lauf` löschen.

## Komprimierung einplanen (sehr wahrscheinlich!)
Diese Sitzung wird unterwegs sehr wahrscheinlich komprimiert – danach erinnerst du dich nur noch grob. Darum:
- Bevor du eine Aufgabe beginnst, schreibe in `docs/TASKS.md` ganz oben unter „Notizen der letzten Sitzung" eine Zeile
  `**IN ARBEIT (Uhrzeit):** <Aufgabe> – Stand: <was fertig ist, was als Nächstes kommt, betroffene Dateien>`.
- Aktualisiere diese Zeile nach jedem Teilschritt (z. B. nach jeder fertigen Datei). Behalte nichts Wichtiges nur „im Kopf".
- Nach einer Komprimierung (oder wenn du unsicher bist, wo du stehst): zuerst `docs/NACHTSCHICHT.md` und `docs/TASKS.md`
  (Notizen + „IN ARBEIT") erneut lesen und genau dort weitermachen. Nichts doppelt bauen – vorher prüfen, ob die Datei schon existiert.
- Ist eine Aufgabe fertig: abhaken, die „IN ARBEIT"-Zeile in eine normale Notiz umwandeln.
- `konto/skilltree.html` (Werft) in dieser Nacht nur anfassen, wenn dort ein Fehler die Seite unbenutzbar macht.
- **Horror-Teil gehört Mael:** `Why.html`, `why/*`, `assets/css/liminal.css`, `assets/js/liminal.js` nie bearbeiten – er arbeitet ab dem 7.10. selbst daran, teils gleichzeitig.

## Regeln (strikt)
- **Keine Subagenten** (zu teuer). **Niemals committen**, keine Release-Texte, nichts pushen.
- Keine Nutzerdaten an Server, keine CDNs/externen Schriften. Netzwerk nur in `assets/js/ai.js`.
- Sammelobjekte heissen **Realitätskristalle** (nicht Disketten). Retro trifft Moderne: Disketten, CDs, Festplatten, RAM, CPUs mischen.
- Die Werft (`konto/skilltree.html`, `XIRU.mech`) und neue Inseln auf der Weltkarte **nicht konzeptionell umbauen** – dafür gibt Mael später Input. Nur Fehler beheben.
- Andere Projekte unter `F:\Code stuff\` nur lesen (z. B. `Floppy\README-FloppyHub.md`, `pixmag\README.md` für die Studio-Seiten). Keine Dateien mit Zugangsdaten öffnen.
- Keine Konten bei externen Diensten anlegen, keine Zugangsdaten eingeben.

## Testen
- Dev-Server: Browser-Pane-Konfiguration „xiru" aus `.claude/launch.json` starten (`preview_start` mit name „xiru", Port 5510) oder `python tools/serve.py` im Hintergrund.
- Im Browser-Pane immer einen **eigenen Tab** öffnen (`tabs_create`) und bei jedem Aufruf `tabId` angeben. Prüfen mit `javascript_tool` (Elemente da, Spiel startet/endet, keine Exceptions) und `read_console_messages` (nach frischem Laden; alte Meldungen ignorieren). Screenshots sind optional.
- Inseln sind erst nach Werft-Expedition offen; zum Testen im eigenen Tab: `XIRU.mech.state().islands = {werkzeuge:1,studio:1,arcade:1,hardware:1,mixer:1,ki:1}; XIRU.persist();` – Skill-Seiten per Testkonto (siehe `docs/NEUE-SEITE.md`). Testdaten danach wieder entfernen.

Wenn etwas unklar ist: die einfachste Lösung wählen, die zu den bestehenden Seiten passt, und die Annahme in den Notizen festhalten.
