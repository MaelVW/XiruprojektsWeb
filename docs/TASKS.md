# Aufgabenliste (Taskleiste) – XiruprojektsWeb

Arbeitsliste für alle weiteren Sitzungen (auch automatische Nachtschichten).
**Immer die oberste offene Aufgabe nehmen**, erledigen, testen, abhaken (`[x]`) und kurz notieren.

## Spielregeln für jede Sitzung

1. Zuerst lesen: `docs/NEUE-SEITE.md` (Konventionen & API), diese Datei, dann die betroffenen Dateien.
2. **Keine Subagenten** – sie verbrauchen zu viel vom Nutzungslimit. Alles selbst und sparsam erledigen.
3. **Nie committen**, keine Release-Texte. Mael committet und sichert selbst.
4. Keine Nutzerdaten an Server, keine CDNs, keine externen Schriften. Netzwerk nur in `assets/js/ai.js`.
5. Deutsch, Du-Form, Schweizer Schreibweise (ss statt ß). Sammelobjekte heissen **Realitätskristalle**
   (Splitter/Kristall/Prisma/Kernkristall), nicht Disketten. Retro trifft Moderne: Disketten, CDs, HDDs, RAM, CPUs gemischt.
6. Testen: Server mit `python tools/serve.py` (Port 5510) bzw. Browser-Pane-Konfiguration „xiru".
   Im Browser-Pane immer einen **eigenen Tab** öffnen (`tabs_create`) und `tabId` mitgeben. Prüfen per
   `javascript_tool` + `read_console_messages` (Konsole vorher durch Neuladen leeren; alte Meldungen ignorieren).
7. Nach jeder Aufgabe: `python tools/check_site.py` laufen lassen. Neue Kristalle in `assets/js/site.js`
   im Block `XIRU.eggs.push(…)` vor `/* EGGS:ENDE */` eintragen (Komma hinter dem vorherigen Eintrag nicht vergessen!).
8. Seiten auf Inseln sind erst nach einer Werft-Expedition offen. Zum Testen im eigenen Tab per Konsole:
   `XIRU.mech.state().islands = {werkzeuge:1,studio:1,arcade:1,hardware:1,mixer:1,ki:1}; XIRU.persist();`
   Skill-gesperrte Seiten: Testkonto wie in `docs/NEUE-SEITE.md` simulieren. Testdaten danach wieder entfernen.
9. Lieber eine Seite richtig fertig als drei halb. Wenn das Limit naht: aktuellen Stand hier notieren.

---

## A · Integration & Aufräumen (zuerst!)

- [ ] **Kristalle registrieren**: `python tools/check_site.py` listet ~100 benutzte, aber nicht registrierte IDs
      (Spiele, KI, Mixer, Werkzeuge, Terminal). Für jede den Auslöser im Code lesen und einen Eintrag
      `{ id, pg, n, h, x, r, m }` schreiben (Name witzig, Hinweis verrät nicht alles, r meist 1–3, r4 nur für echte Meilensteine).
- [ ] **Teilweise fertige Agenten-Seiten prüfen und fertigstellen** (Stand beim Abbruch unklar):
      `arcade/asteroiden`, `arcade/dungeon` (+ `arcade/js/dungeon/*`, Seite war in Arbeit), `arcade/woertle`,
      `arcade/reversi`, `arcade/klicker`, `arcade/schiebepuzzle`, `ki/index`, `ki/abenteuer`, `ki/taverne`,
      `konto/dienste`, `mixer/index`, `mixer/klang`, `werkzeuge/passwort`, `geheim/terminal`, `404.html`.
      Je Seite: lädt ohne Konsolenfehler, Spiel startet/endet, `XIRU.score` wird gemeldet, Texte sprechen von Kristallen.
- [ ] Testreste suchen und löschen (z. B. temporäre Kopien wie `*-test.html`, Debug-Hooks `window.__debug…`).
- [ ] `grep -ri "diskette" --include=*.html --include=*.js` durchgehen: wo „Diskette" ein **Sammelobjekt** meint → Kristall.

## A2 · Eigene Designs pro Bereich (Wunsch von Mael, direkt nach A)

Jeder Bereich bekommt ein eigenes Design über eine Body-Klasse, die die Farb-Variablen auf `body` überschreibt
(Vorbild: `body.theme-werft` in `konto/skilltree.html`). Gemeinsame Bereichs-Designs gehören in
`assets/css/themes/<bereich>.css` und werden auf allen Seiten des Bereichs eingebunden. KI-Labor und Zentrum („Entdecken") bleiben wie sie sind.

- [ ] **Spielhalle = 80er-Arcade-Halle** (`theme-arcade`, alle `arcade/*.html`): fast schwarzer Raum, Arcade-Teppichmuster (CSS),
      Neonschilder mit Flackern (Text-Shadow-Glow in Pink/Cyan/Gelb), **Logo und „Spielhalle"-Schriftzug wie aus Neonröhren**
      (auf Arcade-Seiten `.brand` mit Neon-Glow), Spiele stehen in Automaten-Gehäusen (Stage mit Gehäuserahmen + Marquee oben).
      Lesbarkeit und Kontraste prüfen.
- [ ] **Hardware = im Inneren eines Cyber-Anime-Computers** (`theme-hardware`, alle `hardware/**`; die Datenblätter erzeugt
      `tools/build_hardware.py` → Vorlage `HEAD` dort anpassen und neu generieren): dunkles Mainboard mit leuchtenden Leiterbahnen
      (Cyan/Magenta), Hologramm-Fenster (Glas, Scanlines, Eck-Klammern), fliessende Datenströme, Reiter/Tabs wie Bauteile auf der Platine
      (Chips mit Pins). Animationen dezent, `prefers-reduced-motion` beachten.
- [ ] **Studio = Aufnahme- bzw. Mix-Studio** (`theme-studio`, alle `studio/*.html`): Schaumstoff-Akustikwände (CSS-Muster), warmes Licht,
      an der Seite hängende Kopfhörer nur als Schatten/Silhouetten (SVG, unscharf), Mischpult-Optik mit Schiebereglern.
      **Downloads: Man zieht den Datenträger (Diskette/CD) in ein Laufwerk** (Drag & Drop mit Laufwerk-Animation und Geräusch),
      Klick/Enter auf „Einlegen" als barrierefreie Alternative. Externe Links (GitHub) danach normal öffnen.
- [ ] Werft: weitere kleine Reparatur-Minispiele neben „Kabel verbinden" (z. B. Schrauben in Reihenfolge festziehen, Lötpunkte treffen),
      zufällig gewählt. `cableGame()` in `konto/skilltree.html` als Vorbild.

## B · Spielhalle (fehlende Spiele, Muster: `arcade/snake.html` + `arcade/js/snake.js`)

- [ ] `memory` – Paare mit Tech-Motiven (Diskette, CD, HDD, RAM, CPU, GPU …), 3 Grössen, 3D-Flip, 2-Spieler-Modus.
- [ ] `galgen` – Galgenmännchen, Kategorien (Hardware, Gaming, Tiere, Schweiz, Essen; je ≥30 Begriffe), SVG-Figur, Bildschirmtastatur, `XIRU.typedEggs = false`.
- [ ] `tippen` – Tipp-Trainer: WPM + Genauigkeit, 15/30/60 s + Textmodus mit eigenen Texten, `XIRU.typedEggs = false`.
- [ ] `kisten` – Sokoban, ≥20 lösbare Level (Text-Arrays), Undo (Z), Neustart (R), Levelauswahl, Touch-Steuerkreuz.
- [ ] `labyrinth` – Generator (Recursive Backtracker), Grössen, Nebelmodus, Lösung anzeigen, Zeit als Score (`lower: true`).
- [ ] `rohre` – Pipes-Puzzle: Teile drehen bis alle Ausgänge versorgt, generiert + garantiert lösbar, Wasserfluss animiert.
- [ ] `gluecksrad` (Skill s2) – 1× pro Kalendertag drehen, Canvas-Rad mit Abbremsen, XP-Preise, seltener Jackpot, Tages-Serie.
- [ ] `mitternacht` (Skill s5, versteckt) – Pac-Man-artiges Labyrinth mit gemischten Tech-Motiven, 4 Viren-Geister mit
      verschiedenem Verhalten, Power-Kristall macht sie fressbar, 0–1 Uhr Doppelpunkte. Kristall `o-mitternacht` kommt automatisch.

## C · KI-Labor (nutzt `assets/js/ai.js` – erst dessen API lesen)

- [ ] `ki/kartenschmiede` – Weltkarten-Generator (Rauschen → Biome, Flüsse, Städte, PNG-Export) + Dungeon-Generator.
      KI/Offline erzeugt Namen & Lore. **Export nach PIXMAG Mini** nur mit Skill m4:
      `XIRU.save('kartenschmiede-dungeon', { name, lore, seed, w, h, tiles: [Strings] })`
      Zeichen: `#` Wand `.` Boden `+` Tür `<` Start (genau 1) `>` Ausgang `E` Gegner `T` Schatz `~` Wasser `B` Boss.
- [ ] `ki/bildwerk` – Text-zu-Bild mit Stilvorlagen, Seed, Galerie (≤12 lokal), Download; offline generative Kunst.
- [ ] `ki/hardware-berater` – lädt `../assets/js/hardware-data.js` (`XIRU.hw`), Formular (Budget, Zweck, Auflösung) → regelbasierte Vorschläge mit Links + optionale KI-Begründung.
- [ ] `ki/textwerk` – Zusammenfassen, Übersetzen (DE/EN/FR/IT), Umformulieren; offline: Wörter zählen, Lesezeit.
- [ ] `ki/orakel` (Skill m3) – Frage → Antwort in Rätselform, animierte Kristallkugel, grosse Offline-Spruchsammlung.

## D · Mixer-Studio (`mixer/js/` hat evtl. gemeinsame Helfer – erst ansehen)

- [ ] `mixer/farbe` – additiv + subtraktiv mischen, Harmonien, Paletten-Generator (Leertaste), WCAG-Kontrast, CSS-Export.
- [ ] `mixer/namen` – Generatoren (Spieltitel, Helden, Orte, Studios, Schweizer Dörfer, Roboter, Zauber), Kofferwort-Mixer, Favoriten.
- [ ] `mixer/wesen` – Kreatur aus Teilen (Kopf, Körper, Beine, Schwanz, Element) zeichnen, Werte + Beschreibung, Bestiarium, PNG.
- [ ] `mixer/synth` (Skill m1) – Keyboard (Maus/Touch/QWERTZ), 2 Oszillatoren, ADSR, Filter, Delay, Presets, Oszilloskop.
- [ ] `mixer/beat` (Skill m2) – 16-Schritt-Sequencer, synthetische Drums, Tempo/Swing, Muster A–D, Teilen-Code, Lookahead-Scheduler.

## E · Werkzeugkasten (`werkzeuge/js/`, `werkzeuge/css/` vorhanden)

- [ ] `timer` – Stoppuhr mit Runden, Countdown, Pomodoro mit SVG-Ring, Ton, Restzeit im Tab-Titel, übersteht Neuladen.
- [ ] `json` – formatieren, minimieren, Fehlerposition, Baumansicht, Schlüssel sortieren, JSON ↔ CSV.
- [ ] `bildschirmtest` – Vollbild-Farbflächen, Verläufe, Gamma, Schärfe, Ausleuchtung, Auflösungsinfos.
- [ ] `tastaturtest` – CH-DE- und DE-Layout, gedrückte/getestete Tasten, key/code, Rollover-Test, `XIRU.typedEggs = false`.
- [ ] `hz-test` – Bildwiederholrate (rAF, Median, Histogramm) + Bewegungstest mit Tech-Motiven.
- [ ] `klicktest` – CPS 1/5/10/60 s, Rechts-/Doppelklick, Mausrad; Score-IDs `klicktest-5` usw.
- [ ] `notizen` – mehrere Notizen, sicherer Mini-Markdown-Parser (HTML escapen!), Suche, Anheften, Export, `XIRU.save/load`.

## F · Studio

- [ ] `studio/floppy-hub` – Projektseite nach `F:\Code stuff\Floppy\README-FloppyHub.md` (nur lesen): was es tut, game.txt-Beispiele,
      Installation (Setup von GitHub Releases, SmartScreen-Hinweis), Sicherheitsregeln (pcrun mit J/N-Rückfrage), animierte Terminal-Demo,
      Link `https://github.com/MaelVW/Floppy/releases/latest`.
- [ ] `studio/pixmag` – nach `F:\Code stuff\pixmag\README.md`: Story, Features, Steuerung, Status Alpha, Link zu PIXMAG Mini.
- [ ] `studio/xiruweb` – über diese Website: Technik, Zahlen live aus `XIRU.pages/eggs`, Liste der Animationen (≥10), Datenschutz, Links zu `docs/`.
- [ ] `studio/beta` – Beta-Programm **ohne Datenversand**: Formular erzeugt nur einen Bewerbungstext zum Kopieren für den Chat.

## G · Geheime Orte (Region `geheim`, alle `hidden`, viele per Skill gesperrt – siehe site.js)

- [ ] `geheim/keller` – dunkel, Taschenlampen-Cursor, versteckte Gegenstände, Tür zu `rueckwaerts`. Einstieg: Fusszeilen-Tür (Skill e4 oder Wort „sesam").
- [ ] `geheim/archiv-1999` (e5) – Geocities-Stil, Besucherzähler, lokales Gästebuch (escapen!), Webring „← zurück" zu `rueckwaerts`.
- [ ] `geheim/leuchtturm` – Konami-Belohnung: Sternenhimmel, Leuchtturm-Lichtkegel, Sternbild-Rätsel.
- [ ] `geheim/serverraum` (t6) – blinkende Racks, Logs mit echten Zahlen, „NICHT DRÜCKEN"-Knopf, Kabel-Rätsel.
- [ ] `geheim/void` (e6) – fast schwarz, Text nur nahe am Cursor; Portal auf der Weltkarte führt hierher.
- [ ] `geheim/runen` (m5) – Runen-Chiffre-Rätsel mit PIXMAG-Lore.
- [ ] `geheim/turm` (m6) – Stockwerke mit Rätseln, oben der Erzmagier.
- [ ] `geheim/ruhmeshalle` (s6) – Pokale aus `XIRU.profile().scores`.
- [ ] `geheim/kristallschrein` – aktiv ab 50 Kristallen (`XIRU.eggCount()`), Kristallhöhle mit `XIRU.crystalSVG(r)`; ruft `XIRU.egg('o-schrein')` selbst auf.
- [ ] `geheim/katzen` – Katzen, die auf Klick miauen; Einstieg über versteckte Katze in `404.html`.
- [ ] `geheim/rueckwaerts` – alles gespiegelt/rückwärts, versteckter Vorwärts-Satz.
- [ ] `geheim/ende` – prüft Module e6, t6, s6, m6; dann Abspann + `XIRU.egg('o-ende')`.

## H · Werft & Weltkarte (Ausbau – auf Maels Input warten, nur kleine Verbesserungen)

- [ ] Weitere Schadensquellen (z. B. Spiele mit Absturz/Game Over beschädigen kein Teil – nur Expeditionen; Idee: „Sturm"-Ereignisse).
- [ ] Neue Inseln im Nebel (Platzhalter `#unknown` in `weltkarte.html`) – **erst nach Maels Vorgaben**.
- [ ] Mech-Grafik: Animation beim Expeditionsstart auf der Weltkarte.

## J · Sicherheit (in der **letzten Nachtschicht** zuerst!)

- [ ] Gesamte Website auf Code-Injection prüfen und beheben: jede Stelle mit `innerHTML`/`insertAdjacentHTML`, in die
      Nutzereingaben, URL-Parameter (`location.search`, `location.hash`), importierte JSON-Dateien (Profil-Import),
      localStorage-Inhalte (Gästebuch, Notizen, Namen, Spielstände), KI-Antworten (`ai.js`, Textabenteuer, Taverne) oder
      Dateinamen gelangen → immer `XIRU.esc()` bzw. `textContent`. Markdown-Parser in Notizen: nur sichere Tags, Links nur `http(s):`.
      Keine `eval`/`new Function`/`setTimeout(String)`. Weiterleitungen nur auf eigene Seiten (vgl. `konto/login.html` `weiter=`).
      Profil-Import: Typen prüfen, Grössen begrenzen. Ergebnis als kurzer Bericht in die Notizen.

## I · Qualität zum Schluss

- [ ] `python tools/check_site.py` ohne Meldungen (ausser bewusst manuellen Kristallen).
- [ ] Jede Seite: Handybreite (375 px) ohne horizontales Scrollen, Design „Hell" lesbar, Animationen aus (Einstellungen) funktioniert.

---

## Notizen der letzten Sitzung

- 2026-10-06 (spät): Cookie-/Speicher-Banner eingebaut (`X.consent`, ohne Einwilligung nur sessionStorage; Einstellungen + Datenschutz angepasst).
  `Why.html` + `why/neugier|testen|unbekannt.html` im Liminal-Stil (`assets/css/liminal.css`, `assets/js/liminal.js`, `<html data-bare>` = ohne Kopf/Fuss, ohne Toasts).
  **Den Horror-Teil hinter Why baut Mael selbst – dort nichts erweitern.** Werft: Pixel-Design (`theme-werft`), Mech wird als Pixel-Raster gezeichnet,
  Reparatur per Kabel-Minispiel; Bug „kreisende Schraube" (falscher Drehpunkt der Schiffsschraube) behoben.

- 2026-10-06: Skilltree → **Werft** umgebaut (`konto/skilltree.html`, Mech-Logik `XIRU.mech` in `core.js`,
  Daten `XIRU.mechSlots/mechParts/islandReq` in `site.js`). Alte Skills = „Module" (API `hasSkill` unverändert).
  Inseln ausser Zentrum/Heimathafen sind bis zur Expedition gesperrt. Logo = isometrisches Gerüst (CD/Diskette/CPU).
  Weltkarte mit Nebelgürtel und unbekannten Landmassen.
