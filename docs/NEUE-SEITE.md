# Neue Seite, neues Spiel, neuer Realitätskristall – so geht's

Die Website ist **reines HTML/CSS/JavaScript**. Kein Build-Schritt, keine Frameworks, keine CDNs.
Sie läuft über VS Code „Live Server" oder `python tools/serve.py` (→ http://localhost:5510).
Einzige Ausnahme: Die Hardware-Datenblätter werden mit `python tools/build_hardware.py` aus
`tools/hardware_data.py` erzeugt.

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

## Bereichs-Designs & leere Seiten

- Bereiche dürfen ein eigenes Design haben: Klasse auf `<body>` (z. B. `theme-werft`), die die Farb-Variablen überschreibt.
- `<html data-bare>`: Seite ohne Kopf, Fuss, Banner und Toasts (für leere/unheimliche Seiten wie `Why.html`), zählt aber als Ort.

## Daten & Datenschutz

- Speichern nur über `XIRU.store` / `XIRU.save` / `XIRU.load` – **nie direkt `localStorage`**: Ohne Einwilligung (Banner)
  landet alles im sessionStorage. `XIRU.store.keys(prefix)` listet Einträge, `XIRU.consent.get()/open()` für die Einwilligung.

- Alles liegt im `localStorage` des Browsers. **Keine** Formulare an fremde Server,
  keine Tracker, keine externen Schriftarten oder CDNs.
- Einzige Netzwerkanfragen: das KI-Labor (`assets/js/ai.js`) – und nur, wenn jemand
  einen KI-Dienst aktiv benutzt.
