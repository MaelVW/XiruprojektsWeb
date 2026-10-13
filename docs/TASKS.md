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
   `XIRU.islands.forEach(i => XIRU.mech.state().islands[i.id] = 1); XIRU.persist();` (oder Entdecker-Modus: `XIRU.setting('modus','entdecker')`)
   Skill-gesperrte Seiten: Testkonto wie in `docs/NEUE-SEITE.md` simulieren. Testdaten danach wieder entfernen.
9. **Horror-Teil gehört Mael** (`Why.html`, `why/*`, `assets/css/liminal.css`, `assets/js/liminal.js`, `assets/js/liminal-ton.js`): nicht bearbeiten.
   Ebenso unverändert lassen: die drei versteckten Eingänge (`XIRU.riss.bind(…)` in `weltkarte.html`, `404.html`,
   `hardware/netzteil-rechner.html`), `X.riss` und das blutige Tab-Symbol für `data-bare` in `core.js`. Keine Links zu `Why.html`/`why/`.
10. Lieber eine Seite richtig fertig als drei halb. Wenn das Limit naht: aktuellen Stand hier notieren.

---

## L · Welt & Mech – grosser Ausbau (Auftrag von Mael, 8.10. abends) – **aktuelle Hauptaufgabe**

Ziel: Weltkarte und Werft verschmelzen, viel grössere und schönere Karte, Spiel-Inseln mit Gebäuden (Handel, Arena …),
Mech-System ~8× grösser (Inventar, Seltenheiten, Starter-Ausrüstung), Reise-Ladebildschirm auf der echten Karte,
Entdecker-Modus (ohne Werft, alles offen), echter Login-Screen, 1–2 nützliche echte Cookies, Orte grafisch ausbauen.
Riss 1 (unbekanntes Land unten rechts, 5× klicken) MUSS auf der neuen Karte erhalten bleiben (`XIRU.riss.bind(1, land, 5)`).

Entscheidungen (Datenmodell & Regeln):
- Seltenheiten (`XIRU.rarities`): 1 Gewöhnlich ×1 · 2 Ungewöhnlich ×1.25 · 3 Selten ×1.5 · 4 Episch ×1.9 · 5 Legendär ×2.4 · 6 Mythisch ×3.
- Werte: R Reichweite · E Energie · S Sensor · P Panzerung · **A Angriff (neu)**. 8 Bauplätze: rahmen, antrieb, kern, sensor, arm, panzer, **waffe**, **zubehoer**.
- Teile-IDs: r- a- k- s- w- p- wie bisher, Waffen `f-…`, Zubehör `z-…` (nie zwei Bindestriche mit Präfix g/k/x/t/h – check_site!).
- Mech-Daten v2 in `P.data.mech`: `{v:2, inv:[{u,id,q,c,up,at}], eq:{slot:u}, mat:{}, taler, spent, islands, pos, trip, tutorial, testrun, trep, job, arena, wrack, mine, markt, log}`.
  Migration v1 (parts/built/cond) → v2 in core.js (Teile werden Gewöhnlich). Schrott = XP/4 − spent (wie bisher), **Taler** neue Währung.
- Inseln (`XIRU.islands`, Karte 2400×1600): Inhalts-Inseln = Regionen; Spiel-Inseln: markt (Händlerbucht), schmiede (Funkenschmiede),
  wrack (Wrackriff), arena (Schrott-Arena), mine (Nebelmine) mit Seiten `welt/*.html` (Region `meer`, Feld `isle`).
- Mech-Position `pos`: Bauen/Reparieren nur im Heimathafen (konto), Handeln nur in der Händlerbucht usw. Reisen dauert je nach Distanz
  und Reichweite (ca. 4–18 s, ⏩ ×3), unterwegs Ereignisse (Treibgut, Sturm, Flaschenpost …). Notruf-Schlepper, falls fahruntüchtig.
- Entdecker-Modus: `P.settings.modus = 'entdecker'` → alle Inseln/Seiten/Module offen (`X.easy()`), Werft & Spiel-Inseln ausgeblendet/Hinweis, keine Reisen.
- Cookies (nur mit „Alles erlauben“, nur über http/https): `xiru_zuletzt` (letztes Konto + Modus für den Login-Screen),
  `xiru_sicherung_<hash>` (kompakte Notfall-Sicherung: XP, Kristalle/Orte/Module als Bitmasken + Registry-Prüfsumme, Mech-Kern). Wiederherstellen per Toast/Einstellungen.

Phasen (der Reihe nach, jede testen und hier abhaken):
- [x] L1 core.js: Mech v2 + Migration + Taler/Material + Seltenheit + Position/Reisen + Entdecker-Modus + Cookies
- [x] L2 site.js: rarities, materials, neue Teile (~47), islands, Region `meer` + 5 Seiten, neue Kristalle (m-…)
- [x] L3 `assets/js/werft.js` (+ `assets/css/welt.css`): Item-Karten, Inventar-Helfer, Beute, Reise-Overlay auf der Karte, Ereignisse
- [x] L4 `assets/js/weltkarte-art.js`: grosse Karte mit detaillierten Inseln/Gebäuden, Seedrache, Kraken, Wal, Schiffe, Leuchtturm, Kompassrose
- [x] L5 `weltkarte.html` neu: Pan/Zoom, Mech-Figur, Insel-Panel mit Gebäuden & Reisen, Listen
- [x] L6 `konto/skilltree.html` (Werft) neu: Ausrüstung, Inventar, Baupläne, Module, Tutorial mit Starter-Set
- [x] L7 `mech-art.js`: Loadout-Parameter, Waffen/Zubehör, Seltenheits-Glühen
- [x] L8 Spiel-Inseln: `welt/markt.html`, `welt/schmiede.html`, `welt/arena.html`, `welt/wrack.html`, `welt/mine.html`
- [x] L9 Login-Screen (`konto/login.html` neu) + Modus-Wahl; Einstellungen: Modus & Cookie-Sicherung
- [x] L10 Integration: index.html (Mech-Vorschau, Kompass, Kacheln), Sperrbildschirm, profil.html-Import (v2!), dev/testkonto, datenschutz.html, NEUE-SEITE.md
- [x] L11 Gesamttest + check_site (8.10. abends: alle Seiten fehlerfrei, Entdecker-Modus, Reise, Arena, Markt, Schmiede, Wrack, Mine, Cookie-Wiederherstellung und Import-Schutz geprüft)
  Notiz: check_site erkennt jetzt auch `X.egg(…)`. Echte Funde für später (Mael wollte die Kristalle danach ansehen): `x-elf` (mixer/js/studio.js) ist nicht registriert, `p-glossar` und `p-zeitleiste` werden nirgends ausgelöst.
  Testdaten im Vorschau-Browser (Port 1130) zurückgesetzt (Mech, XP, Kristalle). Nebeneffekt: Die Besuchsliste des Vorschau-Gasts ist leer.
  Wichtig (Cookie-Sicherung): Eine Sicherung, die weiter ist als der aktuelle Stand, wird nicht überschrieben (`XIRU.backup.ahead()`), bis man wiederherstellt oder „Nein“ sagt.
  8.10. spät (Wunsch Mael): Karte heisst jetzt **Sektaria**, komplett im 32-Bit-Pixelstil (weltkarte-pixel.js) – Weltkarte, Reise-Ladebildschirm, Insel-Kopfbilder, Login-Hintergrund.
  Alle Emojis in Werft/Inventar/Spiel-Inseln/Login durch Pixel-Icons ersetzt (pixel-icons.js, 90 Icons inkl. Figuren-Porträts). Spiel-Inseln im Pixel-Design `theme-pixel`.
  Diskettenreaktor sitzt in einer Kern-Fassung; Funkeln beim Zubehör sitzt am Teil. Kristalle: x-elf registriert, check_site erkennt dynamische data-egg.
  Ideen für später: Quests im Hafenamt, Gegner-Mechs auf der Karte, Wetter, Tag/Nacht auf der Karte, weitere Spiel-Inseln (Leuchtturm-Insel, Vulkan).

---

## K · Tagesplan mit Mael (ab 8.10. nachmittags) – **immer abwechseln: ein Stück Hauptseite (H), dann ein neuer Bereich (N)**

Mael-Wünsche: Die Suche bleibt wie sie ist (keine Strg+K-Palette). Erst alles Angekündigte aufbauen, die Hauptseite parallel verbessern.
Neuer Bereich **„Code-Bibliothek“** (Software-Gegenstück im Hardware-Archiv, Ordner `hardware/code/`, Design `theme-hardware`, Region `hardware`):
Programmiersprachen lernen (Kurse mit Lektionen + Quiz/Übungen, HTML/CSS/JS mit Live-Vorschau in `iframe sandbox="allow-scripts"` + `srcdoc`)
und **Cheat-Sheets als Word-Datei** zum Herunterladen – im Stil von Maels eigenem Cheat-Sheet: Titel marineblau #1F4E78, Calibri 11,
Überschrift 1 = Sprache, Überschrift 2 = Themengruppe („Basics“ zuerst), Tabelle „Begriff | Code-Beispiel | Beschreibung“ (Kopfzeile
marineblau, weiss, fett; Spalten 3.5/5/7.5 cm; Code in Consolas; der Begriff in jeder Zelle gelb markiert + fett), optional „Vertiefung“-Abschnitte (H3).
.docx wird im Browser erzeugt (eigener ZIP-Schreiber, keine Bibliothek, funktioniert auch über file://). Daten pro Sprache in `hardware/code/data/<id>.js`.

- [x] H1 · Startseite: Suchfeld in der Startregion offener/prominenter → **erledigt**: `#hero-search` im Hero (Sofort-Treffer inkl. Orte „im Nebel“,
      Pfeiltasten, Enter → `suche.html?q=`, wechselnde Beispiele im Platzhalter). Hero hat jetzt `overflow-x: clip` (Liste darf nach unten raus).
- [x] N1 · Code-Bibliothek Grundgerüst (**erledigt**, siehe Notiz): `assets/js/docx.js` (ZIP + WordprocessingML im Cheat-Sheet-Stil), Datenformat, `hardware/code/index.html`,
      Sprachseiten (eine Vorlage, je Sprache eine kleine Datei), Register-Einträge, Link aus `hardware/index.html` + Navigation.
      Erste Sprachen: C# (Maels Schulsprache), Python, HTML – je ~20 Cheat-Sheet-Einträge + 4–5 Lektionen mit Quiz.
- [x] H2 · Willkommens-Tour → **erledigt**: Spotlight-Tour in `index.html` (5 Schritte, auto nur bei ≤2 besuchten Seiten, Flag `tour`,
      Link „Neu hier? Kurze Tour starten“ unter dem Kompass, Kristall `b-tour`).
- [x] N2 · Weitere Sprachen: CSS, JavaScript, SQL, Git → **erledigt** (7 Sprachen, 209 Begriffe, 34 Lektionen; CSS/JS live).
- [x] H3 · Interaktives Gerüst im Hero (**erledigt**: SVG-`<a>` je Teil, Schild `#rig-label`, unter 1000 px deaktiviert): Teile anklickbar (CD → Studio, CPU → Hardware, Diskette → Spielhalle, RAM → Werkzeuge, HDD → Code-Bibliothek).
- [x] N3 · KI-Labor: `ki/code-tutor.html` (**erledigt**) – erklärt Code/Begriffe (KI über `ai.js`, offline mit den Cheat-Sheet-Daten), verlinkt in die Code-Bibliothek.
- [x] H4 · Mech-Vorschau → **erledigt**: Mech-Grafik nach `assets/js/mech-art.js` ausgelagert (`XIRU.mechArt.draw(f, run)`; Werft nutzt sie
      über `const drawMech = …`), Vorschau `.mech-mini` in der Fortschrittskarte (Bauplätze, „Reparatur nötig“ unter 40 %, animiert nur sichtbar).
- [x] N4 · Weitere Sprachen: Java, C++, Lua, PowerShell, Bash → **erledigt** (jetzt 12 Sprachen, 305 Begriffe, 54 Lektionen; Tutor erkennt alle).
- [x] H5 · Lebendige Regionen-Kacheln → **erledigt** (`.rfx--<region>` in `index.html`: Leiterbahnen, Invader, Equalizer, Neuronen, Welle, Zahnräder, Anker; CSS-only, no-anim beachtet).
- [x] N5 · Fehlende Seiten aus B–G → **erledigt (8.10.)**: alle 41 Seiten gebaut und im Browser getestet (check_site: 0 Seiten ohne Datei).
  werkzeuge/ timer, json, klicktest, tastaturtest, bildschirmtest, hz-test, notizen · arcade/ memory, galgen, tippen, gluecksrad, kisten (Level per BFS geprüft), labyrinth, rohre, mitternacht ·
  mixer/ farbe, namen, wesen, synth, beat · ki/ kartenschmiede, bildwerk, hardware-berater, textwerk, orakel · studio/ floppy-hub, pixmag, xiruweb, beta ·
  geheim/ keller, archiv-1999, leuchtturm, serverraum, void, runen, turm, ruhmeshalle, kristallschrein (o-schrein ab 50), katzen, rueckwaerts, ende (o-ende bei allen Modulen).
  Hinweis: XP-Schlüssel von X.once() NICHT mit „g-/k-/x-/t-/h-…-…“ beginnen (check_site hält sie sonst für Kristalle) → z. B. „geheim-…“. Gast-Testdaten in Port 1130 aufgeräumt.
- [x] H6 · Tageszeit-Stimmung → **erledigt** (`.hero__sky` + `data-daytime` morgen/tag/abend/nacht, Gruss in `#greet-time`, Sterne nachts).

## A · Integration & Aufräumen (zuerst!)

- [x] **Kristalle registrieren**: `python tools/check_site.py` listet ~100 benutzte, aber nicht registrierte IDs
      (Spiele, KI, Mixer, Werkzeuge, Terminal). Für jede den Auslöser im Code lesen und einen Eintrag
      `{ id, pg, n, h, x, r, m }` schreiben (Name witzig, Hinweis verrät nicht alles, r meist 1–3, r4 nur für echte Meilensteine).
- [x] **Teilweise fertige Agenten-Seiten prüfen und fertigstellen** (Stand beim Abbruch unklar):
      `arcade/asteroiden`, `arcade/dungeon` (+ `arcade/js/dungeon/*`, Seite war in Arbeit), `arcade/woertle`,
      `arcade/reversi`, `arcade/klicker`, `arcade/schiebepuzzle`, `ki/index`, `ki/abenteuer`, `ki/taverne`,
      `konto/dienste`, `mixer/index`, `mixer/klang`, `werkzeuge/passwort`, `geheim/terminal`, `404.html`.
      Je Seite: lädt ohne Konsolenfehler, Spiel startet/endet, `XIRU.score` wird gemeldet, Texte sprechen von Kristallen.
- [x] Testreste suchen und löschen (z. B. temporäre Kopien wie `*-test.html`, Debug-Hooks `window.__debug…`).
- [x] `grep -ri "diskette" --include=*.html --include=*.js` durchgehen: wo „Diskette" ein **Sammelobjekt** meint → Kristall.
- [x] „Skilltree" in **sichtbaren Texten** durch „Werft" bzw. „Module" ersetzen (z. B. `arcade/index.html`: „…den lüftest du im Skilltree").
      Dateinamen (`konto/skilltree.html`) und Code-Bezeichner bleiben. Kurz, dann weiter.

## A2 · Eigene Designs pro Bereich (Wunsch von Mael, direkt nach A)

Jeder Bereich bekommt ein eigenes Design über eine Body-Klasse, die die Farb-Variablen auf `body` überschreibt
(Vorbild: `body.theme-werft` in `konto/skilltree.html`). Gemeinsame Bereichs-Designs gehören in
`assets/css/themes/<bereich>.css` und werden auf allen Seiten des Bereichs eingebunden. Zentrum („Entdecken") bleibt wie es ist; das KI-Labor hat seit 2026-10-09 `theme-ki`.

- [x] **Spielhalle = 80er-Arcade-Halle – Sichtprüfung & Feinschliff** (Design `assets/css/themes/arcade.css` ist seit Nachtschicht 2 eingebaut):
      jedes `arcade/*.html` kurz öffnen (eigener Tab, Inseln freischalten), Screenshot/Prüfung: Gehäuse + Marquee sitzen, Spielfeld lesbar,
      Spiele mit eigenen Stage-Stilen (`dungeon`, `2048`, `pc-bauer`, `hardware-quiz`, `tower-defense`) nicht zerschossen, 375 px ohne Querscrollen,
      Kontraste ok. Gefundenes direkt beheben, dann abhaken.
- [x] **Hardware = im Inneren eines Cyber-Anime-Computers** (`theme-hardware`, alle `hardware/**`; die Datenblätter erzeugt
      `tools/build_hardware.py` → Vorlage `HEAD` dort anpassen und neu generieren): dunkles Mainboard mit leuchtenden Leiterbahnen
      (Cyan/Magenta), Hologramm-Fenster (Glas, Scanlines, Eck-Klammern), fliessende Datenströme, Reiter/Tabs wie Bauteile auf der Platine
      (Chips mit Pins). Animationen dezent, `prefers-reduced-motion` beachten.
      Achtung: `hardware/netzteil-rechner.html` enthält `XIRU.riss.bind(3, …)` – diese Zeile drin lassen (versteckter Eingang).
- [x] **Studio = Aufnahme- bzw. Mix-Studio** (`theme-studio`, alle `studio/*.html`): Schaumstoff-Akustikwände (CSS-Muster), warmes Licht,
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

- [ ] `studio/floppy-hub` – (alle Studio-Seiten: `themes/studio.css` + `<body class="theme-studio">`, Downloads über `studio/js/laufwerk.js`) Projektseite nach `F:\Code stuff\Floppy\README-FloppyHub.md` (nur lesen): was es tut, game.txt-Beispiele,
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

- [x] **Weltkarte vergrössern, Teil 1** (2026-10-09): Reichweite je Strecke statt je Insel, Routen mit 3-s-Zwischenstopps, schwierige Gewässer,
      Welt rundherum mit Nebelwand, Umriss des Festlands Mnemora im Osten.
- [ ] **Festland Mnemora** (Maels Idee, später): Überfahrt per Schiff, auf dem Festland Landreisen, dort in Zukunft andere Spieler treffen.
      **Erst mit Mael besprechen** – nichts vorab bauen. Hinweis: andere Spieler bräuchten einen Server (heute ist alles lokal) → Datenschutz/Sicherheit klären.

- [ ] Weitere Schadensquellen (z. B. Spiele mit Absturz/Game Over beschädigen kein Teil – nur Expeditionen; Idee: „Sturm"-Ereignisse).
- [ ] Neue Inseln im Nebel (Platzhalter `#unknown` in `weltkarte.html`) – **erst nach Maels Vorgaben**.
- [ ] Mech-Grafik: Animation beim Expeditionsstart auf der Weltkarte.

## J · Sicherheit (in der **letzten Nachtschicht** zuerst!)

Der Liminal-Teil (`Why.html`, `why/*`, `liminal*.js`) wird mitgeprüft, aber **nicht verändert** – Funde dort nur in den Notizen für Mael aufschreiben.

- [x] Gesamte Website auf Code-Injection prüfen und beheben: jede Stelle mit `innerHTML`/`insertAdjacentHTML`, in die
      Nutzereingaben, URL-Parameter (`location.search`, `location.hash`), importierte JSON-Dateien (Profil-Import),
      localStorage-Inhalte (Gästebuch, Notizen, Namen, Spielstände), KI-Antworten (`ai.js`, Textabenteuer, Taverne) oder
      Dateinamen gelangen → immer `XIRU.esc()` bzw. `textContent`. Markdown-Parser in Notizen: nur sichere Tags, Links nur `http(s):`.
      Keine `eval`/`new Function`/`setTimeout(String)`. Weiterleitungen nur auf eigene Seiten (vgl. `konto/login.html` `weiter=`).
      Profil-Import: Typen prüfen, Grössen begrenzen. Ergebnis als kurzer Bericht in die Notizen.
- [x] Entwickler-Zugang: `dev/` bleibt in `.gitignore`; keine Seite darf `dev/` verlinken oder laden (`grep -rn "dev/"`).
      Prüfen, dass sich niemand über manipulierte Eingaben (Profil-Import, URL-Parameter, Konsole-Eastereggs, Terminal-Befehle)
      Entwickler-/Admin-Rechte, Vollfreischaltung oder fremde Konten verschaffen kann; keine versteckten „Cheat"-Parameter in der Live-Seite.

## I · Qualität zum Schluss

- [ ] `python tools/check_site.py` ohne Meldungen (ausser bewusst manuellen Kristallen).
- [ ] Jede Seite: Handybreite (375 px) ohne horizontales Scrollen, Design „Hell" lesbar, Animationen aus (Einstellungen) funktioniert.

---

## Notizen der letzten Sitzung

- 2026-10-11 (mit Mael): **Erster Release – Online ausgebaut und geparkt.** Mael will Online erst viel später. Alles liegt in
  `docs/spaeter/online/` (`online.js`, `online.patch` für core.js/main.css/einstellungen/profil/datenschutz/hilfe, `ONLINE.md` mit
  Anleitung zum Wiedereinbauen, `pocketbase-collections.json`). Die Website ist wieder rein lokal (Datenschutz: „0 Server-Datenbanken“).
  Der PocketBase-Container auf Maels Unraid (`http://mael.local:8090`, Tabellen keys/players/scores/greets, Rate-Limits) läuft unverändert weiter.
  Release-Durchgang: check_site 0 Fehler, keine Testreste/Debug-Hooks gefunden. Nicht auf den Webserver gehören: `dev/`, `docs/`, `tools/`,
  `.claude/`, `.vscode/`, `studio/apps/` (Quellcode; die ZIPs liegen in `downloads/`).
  Danach (später, mit Mael): Mnemora zusammen ausbauen, Download-/Studio-Änderungen (Mael erklärt), Online wieder einbauen (HTTPS-Adresse nötig).

- 2026-10-10 (mit Mael): Golem-Tippfehler (6–16). **Mixer-Design** `themes/mixer.css` (Regie, Pegelbrücke). **10 neue Website-Designs** inkl. Kirschblüte
  mit Blütenblättern/Zweigen (Effekt-Ebene `#theme-fx`). **Kristallhalle** in `konto/sammlung.html`: Kristall-Cluster auf einem Fels – 5 Hauptkristalle (einzeln färbbar, `kristall-farben`), je Fund ein kleiner Kristall (Fundreihenfolge, Mitte → aussen),
  10 Stufen nach Anteil (Keim … Weltkristall), Freischaltungen je Stufe (Anklingen, Farbe, Kristallharfe → Kristall `b-kristallharfe`, Lichtbrechung,
  Chronik, Postkarte als PNG, Klangteppich, Sternenhimmel, Vollendung), Einflug-Animation neuer Funde, Stufen-Aufstieg-Fenster.
  Als Nächstes laut Mael: **Mnemora zusammen** ausbauen → dann letzter Durchgang über die ganze Website (Vollständigkeit, Aufräumen) → **erster Release**.

- 2026-10-09 (Abend, mit Mael – letzte Aufträge des Tages): **Joe-Glücksstreifen, Angeln (Dredge-artig) + Flossie, Mnemora-Geografie, zwei neue
  Landmassen (Norden, Südwesten) als Dreieck, alles im Nebel.** Neue Kristalle: `m-angler`, `m-abart`, `m-leviathan`, `m-fischbuch`.
  Keine Nachtroutine (Mael spart). Nächstes Thema laut Mael: weiter mit **Mnemora** (Schiff, Landreisen, andere Spieler) – erst besprechen.

- 2026-10-09 (später, mit Mael): **Reichweite pro Strecke + Routen + Nebelwand + Festland-Umriss.** Beispiele von Mael stimmen exakt:
  Heimathafen→Zentrum 1, Heimathafen→Studio 3, Zentrum→Studio 2. Starter-Mech (R1) kommt nur ins Zentrum, von dort zur Händlerbucht und weiter zur
  Spielhalle (Route mit Stopps). Tutorial-Text angepasst (Ziel jetzt Zentrum; „fertig“ auch nach der ersten Fahrt zu einer Insel ohne Anforderungen).
  Karte: `max-width: none` für Canvas/SVG in `.pmap` ist wichtig (main.css begrenzt sonst auf 100 % und staucht die breitere Welt).

- 2026-10-09 (mit Mael): **Arcade-Automaten, KI-Design, Crafting, Baupläne, Lucky Joe.**
  - Spielhalle: jedes Spiel steckt jetzt in einem echten Automaten (Marquee, Bezel, Joystick/Knöpfe reagieren auf Tasten, Münztür) – `arcade.js` `cabinet()`,
    `themes/arcade.css`. Geprüft: snake, dungeon, minen.
  - KI-Labor: eigenes Design `assets/css/themes/ki.css` (`theme-ki`, alle 9 `ki/*.html`).
  - Mech: Baupläne müssen gefunden werden (Sonar-Peilung auf Inseln, Beute, Joe), Bauen kostet Schrott **und** Materialien, Schrottpresse in der Werft.
    Bestehende Spielstände kennen die Pläne ihrer vorhandenen Teile (Migration `bpv`). Testkonto kennt alle Pläne ausser denen der Nebelmine.
  - Händlerbucht: **Lucky Joes Glücksbude** (Wunderkisten Holz/Eisen/Gold/Nebel, Jackpot, Gewinnchancen-Aushang). Neue Kristalle:
    `m-bauplan`, `m-bauplaene`, `m-presse`, `m-glueck`, `m-jackpot`. Neue Pixel-Icons: `npc-joe`, `box-holz|eisen|gold|nebel`, `bp`.
  - Offen: Weltkarte vergrössern → **Mael fragen** (er hat eine spezielle Idee).

- 2026-10-08 (Nachmittag, Stand): **Alle H-Punkte (Hauptseite) und N1–N4 erledigt.** Offen aus K: nur noch N5 (fehlende Seiten B–G).
  Neue gemeinsame Dateien: `assets/js/docx.js`, `assets/js/mech-art.js`, `hardware/code/**`, `ki/code-tutor.html`, `tools/build_code.py`.

- 2026-10-08 (N3 fertig): **Code-Tutor** `ki/code-tutor.html` – Modi erklären/frage/fehler/aufgabe; online `XIRU.ai.chat` (Stream), offline: Begriffe aus
  allen Cheat-Sheets (ganze Wörter), Fehler-Heuristik (Klammern, Anführungszeichen, C#-Semikolon, `=` in if, JS `==`, Python `:`/True, HTML-Tags/alt,
  SQL UPDATE/DELETE ohne WHERE), Aufgabenliste je Sprache. Verlauf `code-tutor` (textContent). Register (nav), Kristall `k-code-tutor`,
  Kachel in `ki/index.html`, Knopf „Code-Tutor fragen“ auf jeder Sprachseite. Neue Sprachen auch in `ki/code-tutor.html` als `<script>` einbinden!

- 2026-10-08 (N1 fertig): **Code-Bibliothek** `hardware/code/`: `index.html` (Übersicht, Terminal-Animation, „Alle Cheat-Sheets“),
  Sprachseiten `csharp|python|html.html` (erzeugt von `tools/build_code.py`), Inhalt in `data/<id>.js` (je ~27–45 Begriffe + 5 Lektionen mit Quiz,
  HTML mit Live-Editor im `sandbox`-iframe), Logik `js/code.js`, Stil `css/code.css`, Word-Erzeuger `assets/js/docx.js` (im Browser geprüft: gültige ZIP,
  alle XML-Teile wohlgeformt). Register: 4 Seiten + Kristalle `c-lektion`, `c-cheatsheet`, `c-kurs`. Teaser in `hardware/index.html`.
  Neue Sprache: Datendatei + Eintrag in `tools/build_code.py` (LANGS) + site.js + `<script>` in `hardware/code/index.html`.
  Achtung: in Daten-Strings keine ungeschützten ' (z. B. in SVG-Data-URIs als %27 schreiben).

- 2026-10-08 (Nachmittag, mit Mael): **Startseite responsiv**: Hero + Laufband über die volle Fensterbreite (Inhalt im 1200-px-Raster, Gerüst bündig
  rechts, `--sbw` rechnet die Scrollleiste heraus), Überschrift skaliert, Schreibmaschinen-Zeile bricht nie um; unter 1000 px Gerüst als Hintergrund.
  Handy-Menü (`.nav` in main.css) blendet jetzt ein statt seitlich ausserhalb zu liegen → kein Querscrollen mehr; `body { overflow-x: clip }`.
  Neu: **Kompass** unter der Fortschrittskarte (nächste Insel mit Anforderungen, Weiterspielen/Spiel des Tages, Kristall-Spur – täglich wechselnd).

- 2026-10-08 (Nachmittag, mit Mael) – **Sicherheitsbericht (Abschnitt J)**:
  - Geprüft: alle 246 `innerHTML`/`insertAdjacentHTML`-Stellen, URL-Parameter (`suche ?q=`, `login ?weiter=`, Hashes), Profil-Import,
    KI-Antworten (`AI.md` maskiert zuerst, setzt nur eigene Tags, keine Links), Toasts/Modals mit HTML, Netzwerk, `eval`/`new Function` (keine),
    `javascript:`-Links (keine), Weiterleitungen (nur eigene Seiten; `weiter=` nur Registerseiten), API-Schlüssel (nur an Hugging Face, `credentials: omit`).
  - **Lücke behoben – Profil-Import** (`konto/profil.html`): Eine präparierte Spielstand-Datei konnte über Spielstände HTML einschleusen
    (z. B. Textabenteuer: Zugzahl/Protokoll ungeprüft im HTML). Jetzt: max. 3 MB; Profil streng gefiltert (Kristalle/Module/Seiten/Bauteile/Inseln
    nur mit Registereintrag, Zahlen bleiben Zahlen, Einstellungen nur `theme/anim/sound/visitToasts` mit gültigen Werten, `bonus` ≤ Anzahl r4-Kristalle);
    Spielstände: Schlüssel geprüft, Texte entschärft (`< > " ' \`` → `‹ › ” ’ ˋ`), Tiefe/Grösse begrenzt, kein `__proto__`; `why-*`/`liminal-*` werden nicht übertragen.
    Getestet mit böser Datei (nichts ausgeführt, alles gefiltert) und ehrlicher Datei (vollständig wiederhergestellt).
  - Zusätzlich: `ki/abenteuer.html` zeigt Zugzahlen nur noch als Zahl; Dungeon-Konsolenhilfe `G.debug` nur noch auf localhost/file:.
  - Entwickler-Zugang: `dev/` in `.gitignore`, nirgends verlinkt/geladen. Keine URL-Cheat-Parameter. Konsole (`xiru.*`), Terminal und `xyzzy` (Minesweeper)
    vergeben nur Kristalle/Spielspass, keine Rechte. Konten sind lokal (PBKDF2), fremde Konten nur mit Passwort.
  - Liminal-Teil (nur gelesen): Texte über `textContent`, `innerHTML` nur mit festem Markup – keine Funde.
  - Für später: `werkzeuge/notizen` (Mini-Markdown) und `geheim/archiv-1999` (Gästebuch) beim Bauen konsequent escapen.

- 2026-10-08 (01:55, Nachtschicht 3): **Studio-Design** fertig: `assets/css/themes/studio.css` (`body.theme-studio`, immer dunkel): Keil-Schaumstoff
  (SVG-Muster), warme Spots, zwei hängende Kopfhörer als unscharfe Schatten (`body::before`), „ON AIR“-Lämpchen, Karten als Kanalzüge mit Schrauben,
  Pult-Tasten. `studio/index.html`: klebendes Mischpult mit Deko-Schiebereglern + **Laufwerk XIRU-DRIVE 2000** (Disketten-Schlitz, CD-Schublade, LED,
  LCD). Neu `studio/js/laufwerk.js` (`XIRU.laufwerk(driveEl, getItem)`): Datenträger (`[data-medium]`, Diskette/CD in CSS) per Zeiger ziehen
  (Maus/Touch/Stift) oder Knopf „Einlegen“; Animation + live erzeugte Laufwerksgeräusche (WebAudio, Einstellung „Ton“ beachtet), danach normaler Link
  (GitHub `target=_blank`), „Auswerfen“; Projekt ohne Datei → Fehler-LED „unbespielt“. Kein automatisches Öffnen (Pop-up-Blocker).
  Getestet: Einlegen-Knopf + echtes Ziehen (CD → Laufwerk), keine Konsolenfehler, 375 px ok. Studio-Unterseiten fehlen noch (Abschnitt F) – dort Theme einbinden.

- 2026-10-08 (01:55) – **Zusammenfassung Nachtschicht 3:** 4 Aufgaben erledigt (Skilltree-Texte, Spielhalle-Sichtprüfung, Hardware-Design, Studio-Design).
  **Werft-Minispiele übersprungen** (laut NACHTSCHICHT.md `konto/skilltree.html` diese Nacht nur bei Fehlern anfassen) → bleibt offen für eine Sitzung mit Mael.
  Nächste Schicht: Abschnitt B (`memory`). Im Testkonto „tester“ sind alle Inseln freigeschaltet und einige Besuche/Kristalle durch Tests dazugekommen.
- 2026-10-08 (01:20, Nachtschicht 3): **Hardware-Design** fertig: `assets/css/themes/hardware.css` (`body.theme-hardware`, immer dunkel):
  Mainboard-Hintergrund (SVG-Leiterbahnen Cyan/Magenta, Durchkontaktierungen, Chip mit Pins), fliessende Datenströme als maskierte Ebene
  (`body::before`, aus bei Animationen aus/reduced-motion), Karten/Kacheln als Hologramm-Fenster (Glas, Scanlines, Eck-Klammern),
  Chips/Reiter/Tabs als Bauteile mit Pins (aktiv = goldene Pins), Hologramm-H1, Tabellen/Balken im Datenstrom-Look.
  Eingebunden in alle 93 `hardware/**` (Skript, nicht neu generiert) + Vorlage `HEAD` in `tools/build_hardware.py`. Riss-Zeile im
  Netzteil-Rechner unverändert. Getestet: index, cpu, Datenblatt, netzteil-rechner, zeitleiste, sockel (Screenshots), 15 Seiten bei 375 px ohne Überbreite.
  Achtung CSS-Kommentare: „hardware/**/*.html“ im Kommentar beendet ihn (`*/`) – hat die erste Regel verschluckt, behoben.
- 2026-10-08 (00:55, Nachtschicht 3): **Spielhalle-Sichtprüfung** erledigt: alle registrierten `arcade/*.html` per iframe bei 375 + 1280 px geprüft
  (Gehäuse + Marquee überall ausser `klicker` – Idle-Spiel ohne `.game__stage`, so gewollt), Screenshots von 2048, pc-bauer, hardware-quiz,
  tower-defense, dungeon (Desktop + Handy) sehen sauber aus. **Behoben:** Neon-Schriftzug „Spielhalle“ neben dem Logo schob bei 1100–1400 px
  das Konto-Menü rechts aus dem Bild → erst ab 1400 px sichtbar. (Seiten `kisten`, `labyrinth`, `rohre`, `memory`, `galgen`, `tippen`, `gluecksrad`,
  `mitternacht` sind registriert, aber noch nicht gebaut → 404, siehe Abschnitt B.) Hinweis: Im Browser-Pane ist das Testkonto „tester“ angemeldet;
  dort wurden zum Testen alle Inseln freigeschaltet.
- 2026-10-08 (00:40, Nachtschicht 3): **„Skilltree“ → Werft/Module in sichtbaren Texten** erledigt: arcade/index, mixer/index, hilfe (FAQ umgeschrieben),
  index, konto/login, konto/profil, konto/einstellungen, konto/sammlung, weltkarte, ki/index, datenschutz, hardware/vergleich, geheim/terminal
  (`gehe werft`/`gehe module` neu), core.js (Sperrseite → „Zu den Modulen“, Toast „Modul eingebaut“), site.js (Texte, „Skillpunkt“ → „Modulpunkt“),
  `tools/build_hardware.py` + alle generierten CPU-Datenblätter (per sed, nicht neu generiert). Code-Bezeichner/Dateinamen unverändert.
  Hilfe-Überschrift „Module (früher Skills)“ bewusst behalten. Getestet: hilfe/arcade laden fehlerfrei.

- 2026-10-08 (00:05, mit Mael): Aufgaben für Nachtschicht 3 aktualisiert. Reihenfolge: „Skilltree“-Texte → Spielhalle-Sichtprüfung →
  Hardware-Design → Studio-Design → Werft-Minispiele → B–G (fehlende Seiten). H überspringen. 06:30-Schicht: zuerst J (Sicherheit).

- 2026-10-07 (Abend): **Liminal-Lore** (Mael erlaubt, mehr zu erfinden; Hommage an Dead by Daylight – keine Original-Bilder/-Töne):
  Die Legion (Frank Morrison, Julie Kostenko, Joey Cadogan, Susie Lavoie) sind die **Killer**, man versteckt sich vor ihnen. Vor dem Nebel:
  Ormond, Lodge am Mount Ormond, Einbruch im Laden, der Hauswart, Vergraben hinter der Lodge, Nebel im Wald (Zettel mit Stempel „vor dem Nebel“,
  Seite B = Mitschnitt der Tatnacht, Gästebuch der Lodge). Im Nebel: Welt des Wesens mit Spinnenbeinen, 5 Generatoren, Tore, Haken; die vier
  jagen, weil es sie sonst holt (Stempel „im Nebel“, Franks Zettel). „To be present.“ = das Wesen. Spinnenbeine am Rand (`data-lm-beine`),
  Kritzeleien (`data-lm-spinne`), Verfolgung `.lm-follow`. Seite B ohne Stimmen, nur Radiorauschen. `erlebt.html` = man ist „entkommen“ und wieder da.

- 2026-10-07 (Abend, mit Mael): Liminal-Teil hat jetzt einen Weiter-Knopf mit Zufall je Raum (`data-lm-weiter`), ein blutiges Tab-Symbol
  (core.js, nur `data-bare`) und Geräusche je Raum (`assets/js/liminal-ton.js`, `data-lm-ton`), live erzeugt, ohne Aufnahmen.

- 2026-10-07 (später, mit Mael): Liminal-Illustrationen in `why/liminal-art.js` + `why/liminal-art.css` (`LM_ART.cracks/mark/meter/tallies`):
  wachsende Putzrisse, Blut-Handabdruck mit Messer und verwischten Strichen (Abdrift-Seiten), alte Generator-Anzeige + eingeritzte Striche (Level 5).
  Level 5 scrollt jetzt und ist per Antippen der Anzeige auch auf dem Handy spielbar.

- 2026-10-07 (Nachmittag, mit Mael): **Liminal-Teil = eigene Welt.** `Why.html` + `why/*` aus dem Register genommen, Kristall `h-why-alle` entfernt,
  `data-bare`-Seiten zählen keine Besuche/XP/Kristalle mehr (core.js `boot`). Eingänge nur über drei unsichtbare Risse (`XIRU.riss` in core.js):
  1 Weltkarte unbekanntes Land unten rechts 5× · 2 `404.html` Laufwerksschlitz 4× · 3 `hardware/netzteil-rechner.html` Anzeige 4×.
  Jeder Rauswurf (`why/abdrift2.html` → `XIRU.riss.lock()`) schliesst den benutzten Riss, der nächste öffnet sich; nach 3 ist Schluss.
  `check_site.py` ignoriert `Why.html`/`why/`. Der Code `A7L-3N8` (Level 5) ist für einen späteren Floppy-Hub-Kanal mit Rätsel-Bot reserviert – nicht anderweitig verwenden.
  **Nachtschicht: Liminal-Dateien, die drei Riss-Stellen und `X.riss` nicht anfassen.**

- 2026-10-07 (Nachtschicht 2, abgebrochen – Aufgaben gehen zurück in die normalen Sitzungen):
  **A2 Spielhalle = 80er-Arcade-Halle – umgesetzt, Sichtprüfung offen.**
  - Neu: `assets/css/themes/arcade.css` (`body.theme-arcade`): fast schwarzer Raum mit Arcade-Teppich (SVG-Muster), Neon-Logo +
    „Spielhalle"-Schriftzug als Neonröhre (`.brand::after`, ab < 1100 px ausgeblendet), flackernde Neon-H1, Neon-Karten/Kacheln/Knöpfe,
    Automaten-Gehäuse (`.cabinet`) mit beleuchtetem Marquee (Spielname), Bildschirm-Rahmen mit Glas/Scanlines, runde Automatenknöpfe als Touch-Pad.
    Flackern aus bei „Animationen aus" (`html.no-anim`) und `prefers-reduced-motion`. Design ist immer dunkel (wie Werft), auch bei „Hell".
  - Alle 28 `arcade/*.html`: Stylesheet eingebunden + `<body class="theme-arcade">`.
  - `assets/js/arcade.js`: `cabinet()` macht den Eltern-Block von `.game__stage` zum Gehäuse und setzt `data-marquee` aus der H1;
    `G.css()` liest jetzt vom `body`, damit Canvas-Spiele die Bereichsfarben bekommen.
  - Getestet nur: Snake lädt ohne Konsolenfehler, Gehäuse + Marquee vorhanden, `--rc` = Neon-Cyan. **Offen:** Sichtprüfung aller Spiele
    (bes. `dungeon`, `2048`, `pc-bauer`, `hardware-quiz` mit eigenen Stage-Stilen), Handybreite 375 px, Kontraste. Danach abhaken.
  - `check_site.py`: nur die bekannten „nirgends ausgelöst"-Fehlalarme (u. a. `m-*`, `p-*`).

- 2026-10-07 (00:00): Mech neu im futuristischen, dunklen Stil (Gunmetal-Panzer, Visier-Helm, Cockpit-Glasluke in der Brust,
  Energielinien mit Glow, Akzentfarbe je Rahmen; fehlende Teile als Hologramm). Werkhalle dunkel/kalt (Nebel, Projektor-Ring,
  Arbeiter-Silhouetten mit leuchtendem Visier), Werft-Design auf Cyan/Magenta umgestellt. Mael wünscht: lieber überspitzt als zu brav.
- 2026-10-06 (23:45): Mech ist jetzt eine Roboter-Figur (Kopf mit Cockpit + Pilot, Rumpf mit Brust-Kern, 2 Arme, 2 Beine,
  Antrieb an Beinen/Rücken, Luftfilter mit Schnorchel bei Wasser-Antrieben). Erledigt in `konto/skilltree.html` → `drawMech()`.

- 2026-10-06 (23:40, Nachtschicht 1) – **Zusammenfassung Schicht 1:** 4 Aufgaben aus A erledigt (Kristalle registriert, Agenten-Seiten geprüft +
  PIXMAG-Mini-Oberfläche gebaut, Testreste, Disketten-Begriffe). Nächste Schicht: **A2 · Spielhalle = 80er-Arcade-Halle**.
  - Testreste: keine Kopien/Backup-Dateien, keine verwaisten JS/CSS. Entfernt: Debug-Hook `window.__klang` (mixer/js/klang.js).
    Bewusst behalten: `PXM.G.debug` (Konsolen-Helfer im Dungeon, nur lokal), `why/testen.html` (gehört zu Why), Ordner `dev/`.
    ~~**Für Mael:** `dev/` steht nicht in `.gitignore`~~ → erledigt 2026-10-07: `dev/` ist jetzt in `.gitignore` (Maels Wunsch).
    Auf einem anderen Gerät fehlt `dev/` daher – Mael meldet sich, dann wird es neu angelegt.
  - Diskette: alle Treffer sind Spielobjekte/Lore/Hardware (Diskettenfabrik, Snake-Futter, Terminal leitet `disketten` auf Kristalle um).
    Nur 2 Code-Kommentare angepasst (tower-defense.js, mixer.js).

- 2026-10-06 (23:38, Nachtschicht 1): **Agenten-Seiten geprüft** – alle 15 laden ohne JS-Fehler, Spiele starten, `XIRU.score` vorhanden.
  **PIXMAG Mini (`arcade/dungeon.html`) war unspielbar:** Oberfläche fehlte. Neu: `arcade/js/dungeon.js` (Zeichnen mit Licht/Fackeln, Effekte `PXM.fx`,
  Anzeigen `PXM.ui`, Tastatur/Maus/Touch, Zielen, Panels Rucksack/Buch/Laden/Stufe/Karte/Hilfe, Auto-Erkunden/Rasten/Reisen,
  Speichern `dungeon-lauf`, Statistik `dungeon-stats`, Score `dungeon`) + `arcade/css/dungeon.css`. Getestet: Start, Erkunden, Zauber mit Ziel,
  Buch/Kombinieren, Laden, Stufenaufstieg, Tod + Rekord, Fortsetzen nach Neuladen, 375 px ohne Querscrollen. Testdaten im Testkonto entfernt.
  Offen/Idee: auf dem Handy ist das Spielfeld klein (768×480 skaliert) – evtl. später kleineren Ausschnitt für schmale Bildschirme.

- 2026-10-06 (23:30, Nachtschicht 1): **Kristalle registriert** – 98 Einträge in `assets/js/site.js` (Blöcke `/* Spielhalle */` usw. vor `/* EGGS:ENDE */`),
  jetzt 247 Kristalle, keine Duplikate, alle `pg` gültig, Seite lädt fehlerfrei. Keine r4 vergeben (Spiele max. r3).
  Hinweis: `check_site.py` meldet 9 „nirgends ausgelöst" – Fehlalarme, die werden per `X.egg(…)`/Datenlisten ausgelöst (core.js, liminal.js, glossar.html).
  Achtung: Eine zweite Sitzung (Mael) arbeitete parallel an `konto/skilltree.html` – dort nichts angefasst.

- 2026-10-06 (23:30): Werft ist jetzt eine echte Werkhalle (Pixel-Szene: Wand, Tor, Laufkran, Gerüst, 4 animierte Arbeiter, Funken,
  Modul-Monitor oben links). „Einbauen" startet einen Anbau von 5–10 s (`M.state().job`). Entwickler-Testkonto: `dev/testkonto.html`
  (Zugangsdaten in `dev/testkonto.js`) – **Ordner `dev/` nie veröffentlichen**, nicht im Register, von `check_site.py` ignoriert.

- 2026-10-06 (spät): Cookie-/Speicher-Banner eingebaut (`X.consent`, ohne Einwilligung nur sessionStorage; Einstellungen + Datenschutz angepasst).
  `Why.html` + `why/neugier|testen|unbekannt.html` im Liminal-Stil (`assets/css/liminal.css`, `assets/js/liminal.js`, `<html data-bare>` = ohne Kopf/Fuss, ohne Toasts).
  **Den Horror-Teil hinter Why baut Mael selbst – dort nichts erweitern.** Werft: Pixel-Design (`theme-werft`), Mech wird als Pixel-Raster gezeichnet,
  Reparatur per Kabel-Minispiel; Bug „kreisende Schraube" (falscher Drehpunkt der Schiffsschraube) behoben.

- 2026-10-06: Skilltree → **Werft** umgebaut (`konto/skilltree.html`, Mech-Logik `XIRU.mech` in `core.js`,
  Daten `XIRU.mechSlots/mechParts/islandReq` in `site.js`). Alte Skills = „Module" (API `hasSkill` unverändert).
  Inseln ausser Zentrum/Heimathafen sind bis zur Expedition gesperrt. Logo = isometrisches Gerüst (CD/Diskette/CPU).
  Weltkarte mit Nebelgürtel und unbekannten Landmassen.
