# Neue Seite, neues Spiel, neuer Realitätskristall – so geht's

Die Website ist **reines HTML/CSS/JavaScript**. Kein Build-Schritt, keine Frameworks, keine CDNs.
Sie läuft über VS Code „Live Server" oder `python tools/serve.py` (→ http://localhost:5510).
Einzige Ausnahme: Die Hardware-Datenblätter werden mit `python tools/build_hardware.py` aus
`tools/hardware_data.py` erzeugt. Ebenso erzeugt `python tools/build_preise.py` aus
`tools/preise.csv` die aktuellen CHF-Preise (`hardware/konfigurator-preise.js`) für den
PC-Konfigurator (`hardware/konfigurator.html`) – Preise nur in der CSV pflegen, kein Shop-Scraping.

## Ordner

```
index.html, weltkarte.html, …    Zentrum
konto/      Login, Profil, Skilltree, Sammlung, Rekorde, Einstellungen, Dienste
hardware/   Datenblätter (cpu/, gpu/, chipsatz/, speicher/, laufwerke/, netzteile/ sind generiert)
arcade/     Spiele (HTML) + arcade/js/<spiel>.js (+ optional arcade/css/<spiel>.css)
ki/         KI-Labor (nutzt assets/js/ai.js)
mixer/      Mixer-Studio
werkzeuge/  Werkzeugkasten
studio/     Downloads & Projekte
geheim/     versteckte Orte
assets/css/main.css   ein Stylesheet für alles
assets/js/site.js     REGISTER: Regionen, Seiten, Skills, Designs, Realitätskristalle
assets/js/core.js     Kern: Layout, Konto, XP, Skills, Kristalle, Effekte
assets/js/arcade.js   Baukasten für Spiele
assets/js/ai.js       Hugging-Face- & Co.-Anbindung
```

## Seitengerüst

Kopf, Navigation, Fussbereich und Brotkrumen setzt `core.js` automatisch ein.
Eine Seite enthält nur ihren Inhalt in `<main>`:

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Titel · Xiruprojekts</title>
    <meta name="description" content="Ein Satz, worum es geht.">
    <link rel="stylesheet" href="../assets/css/main.css">
    <script src="../assets/js/site.js"></script>
    <script src="../assets/js/core.js"></script>
    <!-- nur Spiele: --> <script src="../assets/js/arcade.js"></script>
</head>
<body>
<main class="content">
    <header class="page-head">
        <span class="eyebrow">▶ Spielhalle · Puzzle</span>
        <h1>Titel</h1>
        <p class="lead">Kurze Einleitung.</p>
    </header>
    …
</main>
<script>
XIRU.ready(function () {
    // Seitencode. Läuft NICHT, wenn die Seite per Skill gesperrt ist.
});
</script>
</body>
</html>
```

- Pfade zu `assets/` immer **relativ** (`../assets/…` in Unterordnern, `assets/…` in der Wurzel).
- Links auf andere Seiten relativ (`../arcade/snake.html`) oder per `XIRU.url('arcade/snake.html')`.
- Jede neue Seite braucht einen Eintrag in `XIRU.pages` in `assets/js/site.js`.
- Seitenspezifisches CSS: ein `<style>`-Block im `<head>` oder eine eigene Datei neben der Seite.
  `main.css` nur ändern, wenn etwas wirklich überall gebraucht wird.

## Sprache & Stil

- Deutsch, **Du-Form**, Schweizer Schreibweise (**ss statt ß**: „gross", „Spass", „heissen").
- Locker und freundlich, ein bisschen verspielt – wie zwei Freunde, die eine Website bauen.
- Zahlen mit `XIRU.fmt(1234.5)` → `1’234.5` (de-CH).

## Design-Bausteine (main.css)

| Klasse | Zweck |
|---|---|
| `.page-head`, `.eyebrow`, `.lead` | Seitenkopf |
| `.card`, `.card--flat`, `.card--accent` | Kasten |
| `.tile` (+ `.tile__icon/__title/__desc/__meta`) | klickbare Kachel mit 3D-Neigung |
| `.grid`, `.grid--sm`, `.grid--lg`, `.grid-2`, `.grid-3`, `.row`, `.stack` | Layout |
| `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--danger`, `.btn--sm`, `.btn--lg` | Knöpfe |
| `.badge`(`--accent/--success/--warning/--danger`), `.chip` (`.is-active`) | Etiketten, Filter |
| `.field` + `label`/`input`/`select`/`textarea`, `.check`, `.form-msg` | Formulare |
| `.table-wrap` > `table.table` (`data-sortable`, `th[data-sort="num|text"]`) | Tabellen |
| `.callout`, `.callout--warning`, `.callout--danger` | Hinweise |
| `.stat` > `.stat__value` + `.stat__label` | Kennzahl |
| `.bar` > `.bar__fill` (`style="--v:40%"`) | Fortschritt |
| `.tabs` > `button[aria-selected]` | Reiter |
| `.game`, `.game__stage`, `.game__hud`, `.game__overlay`, `.game__side`, `.touch-pad`, `.dpad` | Spielrahmen |
| `[data-reveal]` (+ `style="--d:.1s"`) | beim Scrollen einblenden |
| `[data-count="123"]` | Zahl zählt hoch |

Farben nur über Variablen: `--bg --bg-2 --surface --surface-2 --surface-3 --border --border-strong
--text --text-muted --text-faint --accent --accent-2 --success --warning --danger --rc` (`--rc` = Farbe der Region).
So funktionieren alle Designs (Nacht, Hell, Floppy, Klassik, RGB, Röhrenmonitor, PIXMAG) automatisch.
Im Canvas: `XIRU.Game.css('--rc')` liefert den aktuellen Farbwert.

## Die XIRU-API (core.js)

```js
XIRU.ready(fn)                 // Seitencode starten
XIRU.url('arcade/snake.html')  // absoluter Link zur Seite
XIRU.user                      // Name oder null (Gast)
XIRU.egg('g-snake-30')         // Realitätskristall freischalten (Toast + XP), true wenn neu
XIRU.crystalSVG(r, 32)         // Kristall-Grafik (r = Seltenheit 1–4), für eigene Anzeigen
XIRU.logoSVG                   // das Logo (Gerüst aus CD, Diskette und CPU)
XIRU.hasEgg(id)  XIRU.hasSkill('s4')
XIRU.addXP(25, 'Grund')
XIRU.score('snake', 123)                 // Spielergebnis -> { best, isNew, plays }
XIRU.score('reaktion', 245, { lower: true })  // kleiner = besser
XIRU.best('snake')                       // Bestwert oder null
XIRU.once('dungeon-boss', 50, 'Boss besiegt!')  // einmalige Belohnung
XIRU.load('dungeon') / XIRU.save('dungeon', obj)  // Spielstand pro Nutzer
XIRU.toast('Titel', 'Text', { icon: '★', type: 'egg' | 'level' | 'error' })
XIRU.modal('<h2>Hallo</h2><button class="btn" data-close>OK</button>')
XIRU.beep(440, .1, 'square')   XIRU.confetti()   XIRU.fx('shake')
XIRU.esc(text)  XIRU.fmt(zahl)  XIRU.rand(1, 6)  XIRU.pick(array)  XIRU.$ / XIRU.$$
XIRU.typedEggs = false         // auf Seiten mit viel Tastatureingabe: Wort-Kristalle aus
```

**Spiel-ID** = Dateiname ohne `.html` (z. B. `arcade/vier-gewinnt.html` → `'vier-gewinnt'`).
Die Spielhalle zeigt Rekorde über diese ID an.

## Spiele (arcade.js)

Siehe Kopfkommentar in `assets/js/arcade.js` und das Referenzspiel
`arcade/snake.html` + `arcade/js/snake.js`. Kurzfassung:

```js
XIRU.ready(function () {
    const G = XIRU.Game;
    const { ctx, W, H } = G.canvas('#cv', 480, 480);
    const ov = G.overlay('#ov');
    const loop = G.loop(update, draw);     // update(dt in s), draw()
    G.keys.onPress(k => …); G.keys.isDown('ArrowLeft');
    G.bindTouch('.touch-pad'); G.swipe('#stage', dir => …);
    ov.show({ icon: '🐍', title: 'Snake', text: '…', button: 'Spielen', onClick: start });
    // Spielende: XIRU.score('snake', punkte); Kristalle: XIRU.egg('g-snake-30');
});
```

Jedes Spiel: spielbar mit Tastatur **und** Maus/Touch, Pause beim Tab-Wechsel,
Seitenleiste mit Steuerung + Rekord, sinnvolle Schwierigkeit, deutsche Texte.

**Arcade-Automat:** `arcade.js` baut um die Spielspalte (Elternelement von `.game__stage`) automatisch einen Automaten:
Marquee mit Spielnamen (aus `h1`), Lautsprechergitter, Bildschirm-Bezel (alles **vor** dem Spielfeld – HUD, Statusleisten – wandert mit hinein),
Bedienpult mit Joystick + 4 Knöpfen (folgen Pfeiltasten/WASD, Leertaste, Z/Y/X/C, Enter), Münztür mit Credit-Zähler, Trittblech.
Die Spiel-Knoten bleiben dieselben (nur verschoben), Farbe je Automat aus dem Namen (`--cab-h`). Alles, was nach dem Spielfeld steht,
liegt auf dem Gehäuse. Auf Touch-Geräten ersetzt die `.touch-pad`-Steuerung das Deko-Pult. Stil: `assets/css/themes/arcade.css`.

## Realitätskristalle (Easter Eggs)

Die Sammel-Belohnungen der Website heissen **Realitätskristalle** (kurz: Kristalle) –
Splitter (r1), Kristall (r2), Prisma (r3), Kernkristall (r4). Disketten, CDs, Festplatten & Co.
dürfen als Spielobjekte und Lore vorkommen (Retro trifft Moderne), aber gesammelt werden Kristalle.

Eintrag in `assets/js/site.js` (Block `XIRU.eggs.push(…)` vor `/* EGGS:ENDE */`):

```js
{ id: 'g-snake-30', pg: 'arcade/snake.html', n: 'Anakonda', h: 'Werde in Snake 30 Felder lang.', x: 40, r: 2, m: 'Eine stattliche Schlange!' },
```

| Feld | Bedeutung |
|---|---|
| `id` | eindeutig. Präfixe: `g-` Spiele, `k-` KI-Labor, `x-` Mixer, `t-` Werkzeuge, `h-` geheime Orte, `hw-` Hardware |
| `pg` | Seite, auf der der Kristall liegt (für den Skill „Spürnase") |
| `n` | Name (kurz, witzig) · `h` Hinweis (verrät nicht alles) · `m` Nachricht beim Finden |
| `x` | XP (10–100) · `r` Seltenheit 1 Splitter, 2 Kristall, 3 Prisma, 4 Kernkristall = Meilenstein (+1 Skillpunkt, sparsam!) |
| `w` | optional: Wort, das man irgendwo tippt · `fx` optional: Effekt (`roll flip mirror rainbow shake glitch disco snow bsod cat floppy matrix gravity confetti sparkle`) |

Auslösen: `XIRU.egg('id')` im Seitencode – oder ohne Code mit einem Element
`<span data-egg="id">` (ein Klick) bzw. `data-egg="id" data-egg-clicks="5"`.

## Skills & Sperren

Seiten mit `skill: 'xy'` in `site.js` zeigen automatisch einen Sperrbildschirm,
solange der Skill fehlt (`XIRU.ready` läuft dann nicht). Seiten mit `hidden: true` erscheinen
erst nach dem ersten Besuch in Navigation, Suche und Weltkarte.

## Welt & Mech (Werft, Weltkarte, Spiel-Inseln)

- **Spielmodus:** `XIRU.mode()` → `'abenteuer'` (Standard) oder `'entdecker'`; `XIRU.easy()` = Entdecker-Modus (alles offen, kein Mech,
  `hasSkill` ist dann immer wahr). Umschalten: `XIRU.setting('modus', 'entdecker')`.
- **Inseln:** `XIRU.islands` in `site.js` (Position auf der Karte 2400×1600, Grösse `s`, Zeichnung `art`, Erstreise-Werte `req`, Gebäude `b`).
  Inhalts-Inseln gehören zu einer Region; Spiel-Inseln (`game: true`) haben Seiten unter `welt/` (Region `meer`, Feld `isle` am Seiteneintrag).
- **Mech-Daten (v2)** in `P.data.mech`: Inventar `inv` (Gegenstände `{u, id, q, c, up}`), Ausrüstung `eq`, `mat`, `taler`, `pos` (Insel des Mechs).
  Wichtigste API (`XIRU.mech`): `items() add(id, q) remove(u) equip(u) installed(slot) loadout() stats() ready() value(it)`,
  `scrap() taler() addTaler(n) spendTaler(n) mats() addMat(id, n) spendMats({…})`, `discovered(id) canReach(id) travelSecs(to) arrive(to) pos()`.
- **Seltenheiten:** `XIRU.rarities[q]` (1 Gewöhnlich … 6 Mythisch, Faktor `m`). Werte eines Teils: `XIRU.mech.itemStats(it)`.
- **Reichweite & Routen:** Reichweite hängt an der **Strecke**, nicht an der Insel: `M.legNeed(a, b)` = max(1, ⌈(Entfernung − 160) / 200⌉)
  + `add` jedes schwierigen Gewässers, durch das die Strecke führt (`XIRU.seaZones` in site.js: Sturmsee, Nebelbank, Riffgürtel; `M.legZones(a, b)`).
  `islands[].req` enthält nur noch E/S/P/A für die erste Reise (`{}` = muss entdeckt werden, `null` = von Anfang an bekannt; `M.baseReq(id)`).
  `M.needR(to)` = kleinste Reichweite, mit der man (über bekannte, nicht geheime Inseln) hinkommt; `M.route(to)` = schnellste Route mit der
  aktuellen Reichweite (`[Start, Stopps…, Ziel]` oder `null`); `M.legSecs(a, b)`, `M.travelSecs(to)` = ganze Reise inkl. `M.STOP` (3 s) je Zwischenstopp.
  `M.req(id)` liefert `{ R: needR, …req }` (für Anzeigen), `M.missing(id)`/`canReach(id)`/`islandReqText(id)` beziehen sich auf den aktuellen Standort.
  Reisen mit Zwischenstopps spielt `W.travel()` als eine Fahrt mit mehreren Etappen ab (`runVoyage({ stops })`); an jedem Stopp wird `M.arrive()` aufgerufen.
- **Welt & Nebelwand:** Der Archipel (0…2400 × 0…1600) liegt in einer grösseren Welt `XIRU.mapArt.BOUNDS` (x −900 … 5000, y −800 … 2500).
  Ausserhalb der Ellipse `CLR` (weltkarte-pixel.js) liegt eine Nebelwand (eigene, gröbere Pixel-Ebene `.pm-wall`, `fogWall()`). Im Osten dahinter:
  das Festland **Mnemora** (`XIRU.mapArt.FESTLAND`, Form `tFest(x, y)`, Umriss `festPath()`; auf der Karte `g.wk-festland` mit Infofenster).
  Es ist noch nicht erreichbar – Plan (Mael): später per Schiffsfahrt, dort Landreisen und andere Spieler treffen.
  Seit 2026-10-09: `XIRU.mapArt.LANDS` = drei Landmassen als Dreieck um den Archipel (Mnemora Osten, `nordland`, `suedland` – die beiden noch
  namenlos, `fog: .95` fast ganz verdeckt). `tLand(L, x, y)`, `landPath(L)`. Mnemora hat grobe Geografie (`FESTLAND.PLACES` Orte mit Hover/Infofenster,
  `RIDGE` Speicherberge, `RIVER` Flashfluss, `LAKE` Bitbrunner See, `FOREST` Cachewald) – gerendert in `weltkarte-pixel.js` (Höhe, Stempel `MOUNT`).
  Welt jetzt x −2700 … 5000, y −2600 … 3600. Bei Änderungen an Landformen/Inseln `VERSION` in weltkarte-pixel.js erhöhen (Kartencache).
- **Angeln (wie Dredge):** Daten in site.js: `XIRU.rods` (Stufe 1–5 mit Kosten), `XIRU.fish` (18 Arten, `q`, `v`, `look` = Icon-Form, `abart`),
  `XIRU.fishSpots` (Platz im Meer mit `near`-Insel, Sensor `s`, Angel-Stufe `tier`, Fischliste). API: `M.rod() rodInfo() upgradeRod() fishes() addFish(id, n)
  caught(id) spotSeen(id) spotStock(id) useSpot(id) fishMissing(id)`, Daten `m.rod m.fish m.fishbook m.fishing`. Minispiel `XIRU.werft.fish(spotId)` (Rad mit
  Zeiger, Silhouette bis zum Fang), Karte: `g.wk-spot` + Infofenster; Händlerin **Flossie** in `welt/markt.html#fisch` (Verkauf, Tauschbörse nach Seltenheit,
  Angel-Upgrade, Wunschfisch des Tages, Sammelbuch). Icons: `fish-<id>`, `ic-angel`, `ic-spot`, `npc-flossie`.
- **Lucky Joe – Öffnen:** Kiste wackelt → Glücksstreifen (`.jroll`) mit Silhouetten in Seltenheitsfarben bremst auf dem (vorher feststehenden) Gewinn →
  Seltenheits-Treppe (Leuchten steigt Stufe für Stufe) → Enthüllung. „Überspringen“ springt ans Ende; bei Animationen aus sofort.
- **Baupläne & Crafting:** Bekannt sind am Anfang nur `XIRU.starterBlueprints`; die übrigen liegen auf Inseln (`XIRU.blueprintSpots`, Insel → Teil-IDs)
  und werden per **Sonar-Peilung** gefunden (`XIRU.werft.scan(isle)`, Knopf `W.scanButton(isle)`, Punkte `W.bpDots(isle)`; Pause je Insel 3 min,
  Sensor-Bedarf `M.scanNeed(t)` = Stufe − 2) oder als Beute (`W.loot({ bp: Chance, bpT: Stufe })`, Reise-Ereignis Kartenrolle, Lucky Joe).
  API: `knows(id) learnBp(id) randomBp(maxT) bpLeft(isle) bpSpot(id) bpCount()`. Gespeichert in `m.bp` (+ `m.bpv` Migration, `m.scan`).
  **Rezepte:** `M.recipe(id)` → `{ scrap, mats }` – je Bauplatz zwei typische Materialien (`SIG` in core.js), ab Stufe 3 Chips, ab 4 Kristallsplitter,
  Stufe 5 Nebelkern; eigenes Rezept per `recipe` am Teil. `canBuild(id) build(id)`. **Schrottpresse:** `XIRU.pressRecipes` (Schrott → Kabel, Zahnrad,
  Altöl, Platine, Chip), `M.press(id, n) canPress() pressCost()`. Splitter/Nebelkern gibt es nur in der Welt. Anzeige der Kosten: `W.costChips(c)`.
- **Lucky Joe** (`welt/markt.html#joe`): Wunderkisten (Tabelle `BOXES` dort: Gewicht, Art, Werte), Jackpot `m.joe.pot` (+10 % jedes Preises),
  nach 5 Nieten sicher ein Bauteil (`m.joe.dry`), Gewinnchancen hängen sichtbar aus. Nur Spiel-Taler – nie echtes Geld.
- **Gemeinsame Spiel-Bausteine:** `assets/js/werft.js` (`XIRU.werft`: Item-Karten, Beute `loot()/grant()`, Reise-Ladebildschirm `travel(to)`,
  Notruf `tow()`, Seitengerüst `islePage(id)` für `welt/*.html`) + `assets/css/welt.css`. Karte: `assets/js/weltkarte-art.js` (`XIRU.mapArt.svg()`),
  Mech-Grafik: `assets/js/mech-art.js` (`XIRU.mechArt.draw(f, run, loadout)`, Gegner per `loadoutOf({slot: [id, q, up]})`).
- **Pixel-Stil (32 Bit):** Die Weltkarte heisst **Sektaria** und wird als Pixel-Karte gerendert (`assets/js/weltkarte-pixel.js`, `XIRU.mapPix.mount(host, opts)`;
  Gelände Pixel für Pixel, Wahrzeichen/Drache als gerasterte Sprites, Grundkarte im sessionStorage zwischengespeichert – bei Kartenänderungen `VERSION` erhöhen).
  Icons in Werft, Inventar und Spiel-Inseln sind **Pixel-Icons statt Emojis**: `XIRU.pix.svg(name, px)` aus `assets/js/pixel-icons.js`
  (Namen = Teil-IDs, `mat-…`, `st-…`, `npc-…`, `ev-…`, `ic-…`, `schrott`, `taler`, `inventar`; im HTML als Platzhalter `<i data-px="name">`, ersetzt durch `XIRU.werft.pxify()`).
  Neue Icons: Pixelkarten im Generator (Scratchpad `pix_icons.py`) ergänzen oder direkt im JSON von pixel-icons.js. Spiel-Inseln nutzen `<body class="theme-pixel">` (welt.css), die Werft `theme-werft`.
- Neue Spiel-Insel: Eintrag in `XIRU.islands` (+ `game: true`), Seite in `welt/` mit `#isle-head #here #wallet #game #easy`, Seiteneintrag mit `r: 'meer', isle: '…'`.
- XP-Schlüssel für `XIRU.once()` nicht wie Kristall-IDs benennen (z. B. `geheim-…` statt `g-…-…`), sonst meldet sie `check_site.py`.

## Cookies

Nur mit „Alles erlauben“ und über http/https (`XIRU.cookie.ok()`): `xiru_zuletzt` (letztes Konto + Modus, für den Login-Screen) und
`xiru_sicherung_<hash>` (Notfall-Sicherung, `XIRU.backup.make()/write()/read()/restore()`; Bitmasken über die Register-Reihenfolge mit Prüfsumme).
Weitere Cookies nur nach Rücksprache – sie gehen bei jedem Aufruf an den Server und müssen im Datenschutz stehen.

## Bereichs-Designs & leere Seiten

- Bereiche dürfen ein eigenes Design haben: Klasse auf `<body>` (z. B. `theme-werft`), die die Farb-Variablen überschreibt.
  Vorhanden: `theme-arcade` (Spielhalle), `theme-hardware`, `theme-studio`, `theme-ki` (KI-Labor: Nacht-Labor mit Neuronen-Netz, Laborglas-Karten,
  Probenetiketten; `assets/css/themes/ki.css` nach `ki/ki.css` einbinden), `theme-mixer` (Regie: Holz-Diffusoren, LED-Licht, Kanalzug-Karten,
  Pegelbrücke mit VU-Metern – die Brücke baut `mixer/js/mixer.js`), `theme-werft`, `theme-pixel` (Spiel-Inseln).
- **Website-Designs** (Einstellungen, `XIRU.themes` in site.js, Farben als `:root[data-theme="…"]` in main.css): Nacht, Hell, Floppy, Klassik, RGB, CRT,
  PIXMAG + seit 2026-10-10 Kirschblüte, Notizbuch, Herbstlaub, Tiefsee, Mooswald, Synthwave, Polarnacht, Vulkan, Handheld, Sternwarte.
  Freischalten über `skill`, `egg`, `level`, `eggs` (Anzahl) oder `games` (verschiedene Spiele). Effekt-Ebene `#theme-fx` (Blüten, Schnee, Laub, Blasen,
  Glühwürmchen, Glut, Sterne, Synthwave-Gitter) baut core.js (`THEME_FX`), Stil am Ende von Abschnitt 1 in main.css; aus bei Animationen aus/reduced-motion.
  Vorschaufarben stehen in `konto/einstellungen.html` (`PREVIEW`).
- `<html data-bare>`: Seite ohne Kopf, Fuss, Banner und Toasts – nur für den Liminal-Teil (`Why.html`, `why/`). Diese Seiten sind bewusst
  **nicht im Register**, geben **keine XP, Kristalle oder Besuche**. Hinein kommt man nur durch einen „Riss" (`XIRU.riss`, siehe core.js):
  Riss 1 = Weltkarte, unbekanntes Land ganz unten rechts (`data-u="5"`) 5× klicken · Riss 2 = 404-Seite, Laufwerksschlitz 4× · Riss 3 = Netzteil-Rechner, Anzeige 4×.
  Riss n wirkt nur nach n−1 Rauswürfen (`XIRU.riss.lock()` in `why/abdrift2.html`); nach 3 Rauswürfen ist der Teil zu. Zurücksetzen: `dev/testkonto.html`.
  Pro Raum einstellbar: `<body data-lm-ton="brumm klopfen schritte stimmen schreie band lueftung riss">` (Geräusche, `assets/js/liminal-ton.js`;
  leer = Stille) und am zurück-Link `data-lm-weiter="80 10 10"` (Weiter-Knopf: tiefer / nichts / zurück in %, nur mit `data-lm-next`).
  Illustrationen (Risse, Handabdruck, Generator-Anzeige, Striche): `why/liminal-art.js`.

## Daten & Datenschutz

- Speichern nur über `XIRU.store` / `XIRU.save` / `XIRU.load` – **nie direkt `localStorage`**: Ohne Einwilligung (Banner)
  landet alles im sessionStorage. `XIRU.store.keys(prefix)` listet Einträge, `XIRU.consent.get()/open()` für die Einwilligung.

- Alles liegt im `localStorage` des Browsers. **Keine** Formulare an fremde Server,
  keine Tracker, keine externen Schriftarten oder CDNs.
- Einzige Netzwerkanfragen: das KI-Labor (`assets/js/ai.js`) – und nur, wenn jemand
  einen KI-Dienst aktiv benutzt.
