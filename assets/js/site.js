/* ==========================================================================
   Xiruprojekts – Seitenregister
   --------------------------------------------------------------------------
   Eine Datei, die alles beschreibt, was es auf der Website gibt:
   Regionen, Seiten, Skills und Realitätskristalle (Easter Eggs).
   Navigation, Weltkarte, Suche, Fortschritt und Sperren lesen von hier.

   Neue Seite?  -> Eintrag in XIRU.pages ergänzen (siehe docs/NEUE-SEITE.md)
   ========================================================================== */
window.XIRU = window.XIRU || {};

/* ── Regionen ─────────────────────────────────────────────────────────────── */
XIRU.regions = [
    { id: 'zentrum',   name: 'Zentrum',          icon: '◆', color: '#5eead4', desc: 'Der Platz, an dem alle Wege beginnen.' },
    { id: 'hardware',  name: 'Hardware-Archiv',  icon: '▣', color: '#fb923c', desc: 'Datenblätter, Vergleiche und Rechner für PC-Teile.' },
    { id: 'arcade',    name: 'Spielhalle',       icon: '▶', color: '#f472b6', desc: 'Dutzende Minispiele – vom Klassiker bis zum Dungeon.' },
    { id: 'ki',        name: 'KI-Labor',         icon: '✦', color: '#a78bfa', desc: 'Textabenteuer, Kartenschmiede und Bildwerk mit Hugging Face.' },
    { id: 'mixer',     name: 'Mixer-Studio',     icon: '≋', color: '#60a5fa', desc: 'Klänge, Beats, Farben und Namen mischen.' },
    { id: 'werkzeuge', name: 'Werkzeugkasten',   icon: '⚒', color: '#facc15', desc: 'Kleine Helfer für den Alltag am PC.' },
    { id: 'studio',    name: 'Studio',           icon: '⬇', color: '#4ade80', desc: 'Software und Spiele von Xiruprojekts.' },
    { id: 'konto',     name: 'Heimathafen',      icon: '⚓', color: '#38bdf8', desc: 'Dein Konto, deine Werft, deine Sammlung.' },
    { id: 'meer',      name: 'Offenes Meer',     icon: '⛵', color: '#22d3ee', desc: 'Spiel-Inseln: Handel, Schmiede, Arena, Wracks und Minen.' },
    { id: 'geheim',    name: '???',              icon: '?', color: '#f87171', desc: 'Niemand weiss genau, was hier liegt.' }
];

/* ── Seiten ───────────────────────────────────────────────────────────────
   p: Pfad ab Website-Wurzel      t: Titel        r: Region
   d: Kurzbeschreibung            skill: benötigter Skill (sonst Sperrbildschirm)
   hidden: taucht erst nach Entdeckung in Navigation/Suche/Karte auf
   nav: erscheint im Hauptmenü der Region
   ------------------------------------------------------------------------- */
XIRU.pages = [
    // Zentrum
    { p: 'index.html',               t: 'Startseite',          r: 'zentrum', d: 'Willkommen bei Xiruprojekts.', nav: true },
    { p: 'weltkarte.html',           t: 'Weltkarte',           r: 'zentrum', d: 'Alle Regionen und was du schon entdeckt hast.', nav: true },
    { p: 'suche.html',               t: 'Suche',               r: 'zentrum', d: 'Durchsuche die ganze Website.', nav: true },
    { p: 'hilfe.html',               t: 'Hilfe & FAQ',         r: 'zentrum', d: 'Wie XP, Werft, Module und Realitätskristalle funktionieren.', nav: true },
    { p: 'ueber-uns.html',           t: 'Über uns',            r: 'zentrum', d: 'Zwei Freunde, ein Hobby-Gamestudio.', nav: true },
    { p: 'datenschutz.html',         t: 'Datenschutz',         r: 'zentrum', d: 'Was gespeichert wird (Spoiler: nur bei dir).' },
    { p: 'nutzungsbedingungen.html', t: 'Nutzungsbedingungen', r: 'zentrum', d: 'Die Regeln dieser Website.' },
    { p: '404.html',                 t: 'Verirrt',             r: 'zentrum', d: 'Diese Seite gibt es nicht. Oder doch?', hidden: true },

    // Konto
    { p: 'konto/login.html',         t: 'Anmelden',            r: 'konto', d: 'Konto erstellen oder anmelden – mit Online auf all deinen Geräten.', nav: true },
    { p: 'konto/profil.html',        t: 'Profil',              r: 'konto', d: 'Level, XP und Fortschritt.', nav: true },
    { p: 'konto/skilltree.html',     t: 'Werft',               r: 'konto', d: 'Mech bauen, reparieren und zu neuen Inseln aufbrechen.', nav: true },
    { p: 'konto/sammlung.html',      t: 'Kristallsammlung',    r: 'konto', d: 'Alle gefundenen Realitätskristalle.', nav: true },
    { p: 'konto/erfolge.html',       t: 'Rekorde',             r: 'konto', d: 'Deine Bestwerte in der Spielhalle.', nav: true },
    { p: 'konto/einstellungen.html', t: 'Einstellungen',       r: 'konto', d: 'Design, Animationen, Ton und Daten.', nav: true },
    { p: 'konto/dienste.html',       t: 'Dienste & Schlüssel', r: 'konto', d: 'API-Schlüssel für Hugging Face und Co. verwalten.', nav: true },
    { p: 'konto/admin.html',         t: 'Admin',               r: 'konto', d: 'Moderation für Xiru-Admins (Server prüft die Rolle).', hidden: true },
    { p: 'welt/markt.html',          t: 'Händlerbucht',        r: 'meer', isle: 'markt',    d: 'Bauteile und Materialien kaufen, verkaufen und tauschen.' },
    { p: 'welt/schmiede.html',       t: 'Funkenschmiede',      r: 'meer', isle: 'schmiede', d: 'Teile aufwerten, zerlegen und verschmelzen.' },
    { p: 'welt/arena.html',          t: 'Schrott-Arena',       r: 'meer', isle: 'arena',    d: 'Mech gegen Mech – steig in der Rangliste auf.' },
    { p: 'welt/wrack.html',          t: 'Wrackriff',           r: 'meer', isle: 'wrack',    d: 'Mit dem Sonar nach versunkenen Schätzen tauchen.' },
    { p: 'welt/mine.html',           t: 'Nebelmine',           r: 'meer', isle: 'mine',     d: 'Kristallsplitter und Nebelkerne abbauen.' },
    { p: 'welt/arche.html',          t: 'Arche-Dock',          r: 'meer', isle: 'konto',    d: 'Die Arche für die Überfahrt nach Mnemora bauen – mit Händlern an Bord.' },
    { p: 'mnemora.html',             t: 'Mnemora',             r: 'meer', d: 'Das Festland hinter der Nebelwand: Strassen freikämpfen, Gehäuse bauen, Steckkarten stecken.', hidden: true },

    // Hardware
    { p: 'hardware/index.html',            t: 'Hardware-Archiv',     r: 'hardware', d: 'Übersicht über alle Datenblätter.', nav: true },
    { p: 'hardware/cpu.html',              t: 'Prozessoren',         r: 'hardware', d: 'CPUs von AMD und Intel im Überblick.', nav: true },
    { p: 'hardware/gpu.html',              t: 'Grafikkarten',        r: 'hardware', d: 'GPUs von NVIDIA, AMD und Intel.', nav: true },
    { p: 'hardware/chipsatz.html',         t: 'Chipsätze',           r: 'hardware', d: 'Welcher Mainboard-Chipsatz kann was?', nav: true },
    { p: 'hardware/speicher.html',         t: 'Speicherstandards',   r: 'hardware', d: 'DDR3 bis GDDR7 und HBM.', nav: true },
    { p: 'hardware/laufwerke.html',        t: 'Datenträger',         r: 'hardware', d: 'Von der Diskette bis PCIe 5.0.', nav: true },
    { p: 'hardware/netzteile.html',        t: 'Netzteile',           r: 'hardware', d: '80 PLUS und ATX 3.1 erklärt.', nav: true },
    { p: 'hardware/vergleich.html',        t: 'Vergleich',           r: 'hardware', d: 'Bis zu drei Teile nebeneinander.', nav: true },
    { p: 'hardware/glossar.html',          t: 'Glossar',             r: 'hardware', d: 'Fachbegriffe verständlich erklärt.', nav: true },
    { p: 'hardware/netzteil-rechner.html', t: 'Netzteil-Rechner',    r: 'hardware', d: 'Wie viel Watt brauchst du?', nav: true },
    { p: 'hardware/balance.html',          t: 'Balance-Check',       r: 'hardware', d: 'Passen CPU und GPU zusammen?', nav: true },
    { p: 'hardware/builds.html',           t: 'Beispiel-Builds',     r: 'hardware', d: 'Zusammenstellungen für jedes Budget.', nav: true },
    { p: 'hardware/konfigurator.html',     t: 'PC-Konfigurator',     r: 'hardware', d: 'Bau dir einen PC zusammen – mit Preisen und Beispiel-Vergleich.', nav: true },
    { p: 'hardware/zeitleiste.html',       t: 'Zeitleiste',          r: 'hardware', d: 'Hardware-Geschichte zum Durchscrollen.', nav: true },
    { p: 'hardware/sockel.html',           t: 'Sockel-Kompatibilität', r: 'hardware', d: 'Welche CPU passt auf welches Board?', nav: true },
    { p: 'hardware/code/index.html',       t: 'Code-Bibliothek',     r: 'hardware', d: 'Programmiersprachen lernen – Kurse und Cheat-Sheets als Word.', nav: true },
    { p: 'hardware/code/csharp.html',      t: 'C# lernen',           r: 'hardware', d: 'Kurs und Cheat-Sheet: die Sprache für Spiele und die Schule.' },
    { p: 'hardware/code/python.html',      t: 'Python lernen',       r: 'hardware', d: 'Kurs und Cheat-Sheet: leicht lesbar, stark bei KI und Skripten.' },
    { p: 'hardware/code/html.html',        t: 'HTML lernen',         r: 'hardware', d: 'Kurs mit Live-Vorschau: das Skelett jeder Website.' },
    { p: 'hardware/code/css.html',         t: 'CSS lernen',          r: 'hardware', d: 'Kurs mit Live-Vorschau: Farben, Abstände, Flexbox und Grid.' },
    { p: 'hardware/code/javascript.html',  t: 'JavaScript lernen',   r: 'hardware', d: 'Kurs mit Live-Ausführung: so werden Websites lebendig.' },
    { p: 'hardware/code/sql.html',         t: 'SQL lernen',          r: 'hardware', d: 'Kurs und Cheat-Sheet: Datenbanken abfragen und ändern.' },
    { p: 'hardware/code/git.html',         t: 'Git lernen',          r: 'hardware', d: 'Kurs und Cheat-Sheet: Versionen speichern, Branches, GitHub.' },
    { p: 'hardware/code/java.html', t: 'Java lernen', r: 'hardware', d: 'Kurs und Cheat-Sheet: Android, Minecraft-Mods und Server.' },
    { p: 'hardware/code/cpp.html', t: 'C++ lernen', r: 'hardware', d: 'Kurs und Cheat-Sheet: schnell und hardwarenah.' },
    { p: 'hardware/code/lua.html', t: 'Lua lernen', r: 'hardware', d: 'Kurs und Cheat-Sheet: die Skriptsprache von Roblox.' },
    { p: 'hardware/code/powershell.html', t: 'PowerShell lernen', r: 'hardware', d: 'Kurs und Cheat-Sheet: Windows automatisieren wie Floppy Hub.' },
    { p: 'hardware/code/bash.html', t: 'Bash lernen', r: 'hardware', d: 'Kurs und Cheat-Sheet: Linux, macOS und Raspberry Pi steuern.' },
    /* GEN:HW START – automatisch erzeugt von tools/build_hardware.py, nicht von Hand ändern */
    { p: 'hardware/cpu/ryzen-7-1800x.html', t: "Ryzen 7 1800X", r: 'hardware', d: "Prozessor · 8 Kerne · 2017", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-5-3600.html', t: "Ryzen 5 3600", r: 'hardware', d: "Prozessor · 6 Kerne · 2019", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-5-5600x.html', t: "Ryzen 5 5600X", r: 'hardware', d: "Prozessor · 6 Kerne · 2020", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-5-5600.html', t: "Ryzen 5 5600", r: 'hardware', d: "Prozessor · 6 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-5800x3d.html', t: "Ryzen 7 5800X3D", r: 'hardware', d: "Prozessor · 8 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-5-7600x.html', t: "Ryzen 5 7600X", r: 'hardware', d: "Prozessor · 6 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-7700x.html', t: "Ryzen 7 7700X", r: 'hardware', d: "Prozessor · 8 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-9-7900x.html', t: "Ryzen 9 7900X", r: 'hardware', d: "Prozessor · 12 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-9-7950x.html', t: "Ryzen 9 7950X", r: 'hardware', d: "Prozessor · 16 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-9-7950x3d.html', t: "Ryzen 9 7950X3D", r: 'hardware', d: "Prozessor · 16 Kerne · 2023", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-7800x3d.html', t: "Ryzen 7 7800X3D", r: 'hardware', d: "Prozessor · 8 Kerne · 2023", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-5700x3d.html', t: "Ryzen 7 5700X3D", r: 'hardware', d: "Prozessor · 8 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-8700g.html', t: "Ryzen 7 8700G", r: 'hardware', d: "Prozessor · 8 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-5-9600x.html', t: "Ryzen 5 9600X", r: 'hardware', d: "Prozessor · 6 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-9700x.html', t: "Ryzen 7 9700X", r: 'hardware', d: "Prozessor · 8 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-9-9950x.html', t: "Ryzen 9 9950X", r: 'hardware', d: "Prozessor · 16 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-7-9800x3d.html', t: "Ryzen 7 9800X3D", r: 'hardware', d: "Prozessor · 8 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/ryzen-9-9950x3d.html', t: "Ryzen 9 9950X3D", r: 'hardware', d: "Prozessor · 16 Kerne · 2025", hw: 'cpu' },
    { p: 'hardware/cpu/core-i7-2600k.html', t: "Core i7-2600K", r: 'hardware', d: "Prozessor · 4 Kerne · 2011", hw: 'cpu' },
    { p: 'hardware/cpu/core-i5-12600k.html', t: "Core i5-12600K", r: 'hardware', d: "Prozessor · 10 Kerne · 2021", hw: 'cpu' },
    { p: 'hardware/cpu/core-i9-12900k.html', t: "Core i9-12900K", r: 'hardware', d: "Prozessor · 16 Kerne · 2021", hw: 'cpu' },
    { p: 'hardware/cpu/core-i5-12400f.html', t: "Core i5-12400F", r: 'hardware', d: "Prozessor · 6 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/core-i5-13600k.html', t: "Core i5-13600K", r: 'hardware', d: "Prozessor · 14 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/core-i7-13700k.html', t: "Core i7-13700K", r: 'hardware', d: "Prozessor · 16 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/core-i9-13900k.html', t: "Core i9-13900K", r: 'hardware', d: "Prozessor · 24 Kerne · 2022", hw: 'cpu' },
    { p: 'hardware/cpu/core-i5-13400f.html', t: "Core i5-13400F", r: 'hardware', d: "Prozessor · 10 Kerne · 2023", hw: 'cpu' },
    { p: 'hardware/cpu/core-i5-14600k.html', t: "Core i5-14600K", r: 'hardware', d: "Prozessor · 14 Kerne · 2023", hw: 'cpu' },
    { p: 'hardware/cpu/core-i7-14700k.html', t: "Core i7-14700K", r: 'hardware', d: "Prozessor · 20 Kerne · 2023", hw: 'cpu' },
    { p: 'hardware/cpu/core-i9-14900k.html', t: "Core i9-14900K", r: 'hardware', d: "Prozessor · 24 Kerne · 2023", hw: 'cpu' },
    { p: 'hardware/cpu/core-ultra-5-245k.html', t: "Core Ultra 5 245K", r: 'hardware', d: "Prozessor · 14 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/core-ultra-7-265k.html', t: "Core Ultra 7 265K", r: 'hardware', d: "Prozessor · 20 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/cpu/core-ultra-9-285k.html', t: "Core Ultra 9 285K", r: 'hardware', d: "Prozessor · 24 Kerne · 2024", hw: 'cpu' },
    { p: 'hardware/gpu/rx-580.html', t: "Radeon RX 580 (8 GB)", r: 'hardware', d: "Grafikkarte · 8 GB · 2017", hw: 'gpu' },
    { p: 'hardware/gpu/rx-6800-xt.html', t: "Radeon RX 6800 XT", r: 'hardware', d: "Grafikkarte · 16 GB · 2020", hw: 'gpu' },
    { p: 'hardware/gpu/rx-6700-xt.html', t: "Radeon RX 6700 XT", r: 'hardware', d: "Grafikkarte · 12 GB · 2021", hw: 'gpu' },
    { p: 'hardware/gpu/rx-6600.html', t: "Radeon RX 6600", r: 'hardware', d: "Grafikkarte · 8 GB · 2021", hw: 'gpu' },
    { p: 'hardware/gpu/rx-7900-xt.html', t: "Radeon RX 7900 XT", r: 'hardware', d: "Grafikkarte · 20 GB · 2022", hw: 'gpu' },
    { p: 'hardware/gpu/rx-7900-xtx.html', t: "Radeon RX 7900 XTX", r: 'hardware', d: "Grafikkarte · 24 GB · 2022", hw: 'gpu' },
    { p: 'hardware/gpu/rx-7600.html', t: "Radeon RX 7600", r: 'hardware', d: "Grafikkarte · 8 GB · 2023", hw: 'gpu' },
    { p: 'hardware/gpu/rx-7700-xt.html', t: "Radeon RX 7700 XT", r: 'hardware', d: "Grafikkarte · 12 GB · 2023", hw: 'gpu' },
    { p: 'hardware/gpu/rx-7800-xt.html', t: "Radeon RX 7800 XT", r: 'hardware', d: "Grafikkarte · 16 GB · 2023", hw: 'gpu' },
    { p: 'hardware/gpu/rx-9070.html', t: "Radeon RX 9070", r: 'hardware', d: "Grafikkarte · 16 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/rx-9070-xt.html', t: "Radeon RX 9070 XT", r: 'hardware', d: "Grafikkarte · 16 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/arc-a770.html', t: "Arc A770 (16 GB)", r: 'hardware', d: "Grafikkarte · 16 GB · 2022", hw: 'gpu' },
    { p: 'hardware/gpu/arc-b580.html', t: "Arc B580", r: 'hardware', d: "Grafikkarte · 12 GB · 2024", hw: 'gpu' },
    { p: 'hardware/gpu/gtx-1080-ti.html', t: "GeForce GTX 1080 Ti", r: 'hardware', d: "Grafikkarte · 11 GB · 2017", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-2080-ti.html', t: "GeForce RTX 2080 Ti", r: 'hardware', d: "Grafikkarte · 11 GB · 2018", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-2060.html', t: "GeForce RTX 2060", r: 'hardware', d: "Grafikkarte · 6 GB · 2019", hw: 'gpu' },
    { p: 'hardware/gpu/gtx-1660-super.html', t: "GeForce GTX 1660 Super", r: 'hardware', d: "Grafikkarte · 6 GB · 2019", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-3080.html', t: "GeForce RTX 3080 (10 GB)", r: 'hardware', d: "Grafikkarte · 10 GB · 2020", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-3090.html', t: "GeForce RTX 3090", r: 'hardware', d: "Grafikkarte · 24 GB · 2020", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-3070.html', t: "GeForce RTX 3070", r: 'hardware', d: "Grafikkarte · 8 GB · 2020", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-3060-ti.html', t: "GeForce RTX 3060 Ti", r: 'hardware', d: "Grafikkarte · 8 GB · 2020", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-3060.html', t: "GeForce RTX 3060 (12 GB)", r: 'hardware', d: "Grafikkarte · 12 GB · 2021", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4090.html', t: "GeForce RTX 4090", r: 'hardware', d: "Grafikkarte · 24 GB · 2022", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4080.html', t: "GeForce RTX 4080 (16 GB)", r: 'hardware', d: "Grafikkarte · 16 GB · 2022", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4070.html', t: "GeForce RTX 4070", r: 'hardware', d: "Grafikkarte · 12 GB · 2023", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4060-ti.html', t: "GeForce RTX 4060 Ti (8 GB)", r: 'hardware', d: "Grafikkarte · 8 GB · 2023", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4060.html', t: "GeForce RTX 4060", r: 'hardware', d: "Grafikkarte · 8 GB · 2023", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4070-super.html', t: "GeForce RTX 4070 Super", r: 'hardware', d: "Grafikkarte · 12 GB · 2024", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-4080-super.html', t: "GeForce RTX 4080 Super", r: 'hardware', d: "Grafikkarte · 16 GB · 2024", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-5080.html', t: "GeForce RTX 5080", r: 'hardware', d: "Grafikkarte · 16 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-5090.html', t: "GeForce RTX 5090", r: 'hardware', d: "Grafikkarte · 32 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-5070-ti.html', t: "GeForce RTX 5070 Ti", r: 'hardware', d: "Grafikkarte · 16 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-5070.html', t: "GeForce RTX 5070", r: 'hardware', d: "Grafikkarte · 12 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-5060-ti-16gb.html', t: "GeForce RTX 5060 Ti (16 GB)", r: 'hardware', d: "Grafikkarte · 16 GB · 2025", hw: 'gpu' },
    { p: 'hardware/gpu/rtx-5060.html', t: "GeForce RTX 5060 (8 GB)", r: 'hardware', d: "Grafikkarte · 8 GB · 2025", hw: 'gpu' },
    { p: 'hardware/chipsatz/amd-x570.html', t: "AMD X570", r: 'hardware', d: "Chipsatz · AM4 · 2019", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-b550.html', t: "AMD B550", r: 'hardware', d: "Chipsatz · AM4 · 2020", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-b650.html', t: "AMD B650", r: 'hardware', d: "Chipsatz · AM5 · 2022", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-b650e.html', t: "AMD B650E", r: 'hardware', d: "Chipsatz · AM5 · 2022", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-x670e.html', t: "AMD X670E", r: 'hardware', d: "Chipsatz · AM5 · 2022", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-a620.html', t: "AMD A620", r: 'hardware', d: "Chipsatz · AM5 · 2023", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-x870.html', t: "AMD X870", r: 'hardware', d: "Chipsatz · AM5 · 2024", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-x870e.html', t: "AMD X870E", r: 'hardware', d: "Chipsatz · AM5 · 2024", hw: 'chipset' },
    { p: 'hardware/chipsatz/amd-b850.html', t: "AMD B850", r: 'hardware', d: "Chipsatz · AM5 · 2025", hw: 'chipset' },
    { p: 'hardware/chipsatz/intel-z790.html', t: "Intel Z790", r: 'hardware', d: "Chipsatz · LGA1700 · 2022", hw: 'chipset' },
    { p: 'hardware/chipsatz/intel-b760.html', t: "Intel B760", r: 'hardware', d: "Chipsatz · LGA1700 · 2023", hw: 'chipset' },
    { p: 'hardware/chipsatz/intel-z890.html', t: "Intel Z890", r: 'hardware', d: "Chipsatz · LGA1851 · 2024", hw: 'chipset' },
    { p: 'hardware/chipsatz/intel-b860.html', t: "Intel B860", r: 'hardware', d: "Chipsatz · LGA1851 · 2025", hw: 'chipset' },
    { p: 'hardware/speicher/ddr3.html', t: "DDR3", r: 'hardware', d: "Arbeitsspeicher · 2007", hw: 'memory' },
    { p: 'hardware/speicher/ddr4.html', t: "DDR4", r: 'hardware', d: "Arbeitsspeicher · 2014", hw: 'memory' },
    { p: 'hardware/speicher/ddr5.html', t: "DDR5", r: 'hardware', d: "Arbeitsspeicher · 2020", hw: 'memory' },
    { p: 'hardware/speicher/gddr6.html', t: "GDDR6", r: 'hardware', d: "Grafikspeicher · 2018", hw: 'memory' },
    { p: 'hardware/speicher/gddr7.html', t: "GDDR7", r: 'hardware', d: "Grafikspeicher · 2024", hw: 'memory' },
    { p: 'hardware/speicher/lpddr5x.html', t: "LPDDR5X", r: 'hardware', d: "Mobiler Speicher · 2021", hw: 'memory' },
    { p: 'hardware/speicher/hbm3.html', t: "HBM3", r: 'hardware', d: "Stapelspeicher · 2022", hw: 'memory' },
    { p: 'hardware/laufwerke/diskette-3-5.html', t: "3,5-Zoll-Diskette (HD)", r: 'hardware', d: "Datenträger · Magnetisch", hw: 'storage' },
    { p: 'hardware/laufwerke/cd-rom.html', t: "CD-ROM", r: 'hardware', d: "Datenträger · Optisch", hw: 'storage' },
    { p: 'hardware/laufwerke/hdd-7200.html', t: "Festplatte (3,5 Zoll, 7200 U/min)", r: 'hardware', d: "Datenträger · Magnetisch", hw: 'storage' },
    { p: 'hardware/laufwerke/sata-ssd.html', t: "SATA-SSD", r: 'hardware', d: "Datenträger · Flash", hw: 'storage' },
    { p: 'hardware/laufwerke/nvme-gen3.html', t: "NVMe-SSD (PCIe 3.0 x4)", r: 'hardware', d: "Datenträger · Flash", hw: 'storage' },
    { p: 'hardware/laufwerke/nvme-gen4.html', t: "NVMe-SSD (PCIe 4.0 x4)", r: 'hardware', d: "Datenträger · Flash", hw: 'storage' },
    { p: 'hardware/laufwerke/nvme-gen5.html', t: "NVMe-SSD (PCIe 5.0 x4)", r: 'hardware', d: "Datenträger · Flash", hw: 'storage' },
    { p: 'hardware/netzteile/80-plus-bronze.html', t: "80 PLUS Bronze", r: 'hardware', d: "Netzteil · Effizienz", hw: 'psu' },
    { p: 'hardware/netzteile/80-plus-silver.html', t: "80 PLUS Silver", r: 'hardware', d: "Netzteil · Effizienz", hw: 'psu' },
    { p: 'hardware/netzteile/80-plus-gold.html', t: "80 PLUS Gold", r: 'hardware', d: "Netzteil · Effizienz", hw: 'psu' },
    { p: 'hardware/netzteile/80-plus-platinum.html', t: "80 PLUS Platinum", r: 'hardware', d: "Netzteil · Effizienz", hw: 'psu' },
    { p: 'hardware/netzteile/80-plus-titanium.html', t: "80 PLUS Titanium", r: 'hardware', d: "Netzteil · Effizienz", hw: 'psu' },
    { p: 'hardware/netzteile/atx-3-1.html', t: "ATX 3.1 & 12V-2x6", r: 'hardware', d: "Netzteil · Standard", hw: 'psu' },
    /* GEN:HW END */

    // Spielhalle
    { p: 'arcade/index.html',         t: 'Spielhalle',        r: 'arcade', d: 'Alle Spiele auf einen Blick.', nav: true },
    { p: 'arcade/dungeon.html',       t: 'PIXMAG Mini',       r: 'arcade', d: 'Roguelike-Dungeon mit Zauber-Kombinationen.', game: 'Abenteuer' },
    { p: 'arcade/snake.html',         t: 'Snake',             r: 'arcade', d: 'Der Klassiker – friss, wachse, überlebe.', game: 'Action' },
    { p: 'arcade/bloecke.html',       t: 'Blöcke',            r: 'arcade', d: 'Fallende Blöcke zu vollen Reihen stapeln.', game: 'Action' },
    { p: 'arcade/ziegel.html',        t: 'Ziegelbrecher',     r: 'arcade', d: 'Ball, Schläger, viele Ziegel.', game: 'Action' },
    { p: 'arcade/floppy-flug.html',   t: 'Floppy Flug',       r: 'arcade', d: 'Eine Diskette lernt fliegen.', game: 'Action' },
    { p: 'arcade/pong.html',          t: 'Pong',              r: 'arcade', d: 'Gegen die CPU oder zu zweit.', game: 'Action' },
    { p: 'arcade/stapel.html',        t: 'Stapelturm',        r: 'arcade', d: 'Timing ist alles.', game: 'Action' },
    { p: 'arcade/2048.html',          t: '2048',              r: 'arcade', d: 'Kacheln verschieben und verschmelzen.', game: 'Puzzle' },
    { p: 'arcade/minen.html',         t: 'Minensucher',       r: 'arcade', d: 'Logik unter Druck.', game: 'Puzzle' },
    { p: 'arcade/sudoku.html',        t: 'Sudoku',            r: 'arcade', d: 'Zahlenrätsel in drei Stufen.', game: 'Puzzle' },
    { p: 'arcade/nonogramm.html',     t: 'Nonogramm',         r: 'arcade', d: 'Pixelbilder aus Zahlenhinweisen.', game: 'Puzzle' },
    { p: 'arcade/lichter.html',       t: 'Lichter aus',       r: 'arcade', d: 'Schalte alle Lampen aus.', game: 'Puzzle' },
    { p: 'arcade/schiebepuzzle.html', t: 'Schiebepuzzle',     r: 'arcade', d: 'Die 15 Kacheln in Ordnung bringen.', game: 'Puzzle' },
    { p: 'arcade/kisten.html',        t: 'Kistenschieber',    r: 'arcade', d: 'Sokoban-Level im Lagerhaus.', game: 'Puzzle' },
    { p: 'arcade/labyrinth.html',     t: 'Labyrinth',         r: 'arcade', d: 'Jedes Mal ein neuer Irrgarten.', game: 'Puzzle' },
    { p: 'arcade/rohre.html',         t: 'Rohrleitung',       r: 'arcade', d: 'Verbinde die Leitungen.', game: 'Puzzle' },
    { p: 'arcade/tictactoe.html',     t: 'Tic-Tac-Toe+',      r: 'arcade', d: 'Klassisch und als Ultimate-Variante.', game: 'Brett' },
    { p: 'arcade/vier-gewinnt.html',  t: 'Vier gewinnt',      r: 'arcade', d: 'Gegen eine KI mit drei Stärken.', game: 'Brett' },
    { p: 'arcade/codeknacker.html',   t: 'Codeknacker',       r: 'arcade', d: 'Finde den geheimen Farbcode.', game: 'Brett' },
    { p: 'arcade/memory.html',        t: 'Memory',            r: 'arcade', d: 'Paare finden mit Hardware-Motiven.', game: 'Brett' },
    { p: 'arcade/woertle.html',       t: 'Wörtle',            r: 'arcade', d: 'Errate das Wort mit fünf Buchstaben.', game: 'Wort' },
    { p: 'arcade/galgen.html',        t: 'Galgenmännchen',    r: 'arcade', d: 'Buchstabe für Buchstabe.', game: 'Wort' },
    { p: 'arcade/tippen.html',        t: 'Tipp-Trainer',      r: 'arcade', d: 'Wie schnell tippst du?', game: 'Geschick' },
    { p: 'arcade/reaktion.html',      t: 'Reaktionstest',     r: 'arcade', d: 'Klick, sobald es grün wird.', game: 'Geschick' },
    { p: 'arcade/farbfolge.html',     t: 'Farbfolge',         r: 'arcade', d: 'Merke dir die Sequenz.', game: 'Geschick' },
    { p: 'arcade/klicker.html',       t: 'Diskettenfabrik',   r: 'arcade', d: 'Ein Idle-Spiel über Disketten.', game: 'Idle' },
    { p: 'arcade/invaders.html',      t: 'Invasoren',         r: 'arcade', d: 'Verteidige die Erde.', game: 'Action', skill: 's1' },
    { p: 'arcade/frosch.html',        t: 'Froschsprung',      r: 'arcade', d: 'Über Strasse und Fluss.', game: 'Action', skill: 's1' },
    { p: 'arcade/asteroiden.html',    t: 'Asteroiden',        r: 'arcade', d: 'Schiessen und ausweichen im All.', game: 'Action', skill: 's1' },
    { p: 'arcade/tower-defense.html', t: 'Turmwacht',         r: 'arcade', d: 'Türme bauen, Wellen aufhalten.', game: 'Strategie', skill: 's3' },
    { p: 'arcade/reversi.html',       t: 'Reversi',           r: 'arcade', d: 'Steine umdrehen gegen die KI.', game: 'Brett', skill: 's3' },
    { p: 'arcade/hardware-quiz.html', t: 'Höher oder Tiefer', r: 'arcade', d: 'Welche Hardware ist schneller?', game: 'Wissen', skill: 't2' },
    { p: 'arcade/pc-bauer.html',      t: 'PC-Bauer',          r: 'arcade', d: 'Baue den besten PC fürs Budget.', game: 'Wissen', skill: 't3' },
    { p: 'arcade/gluecksrad.html',    t: 'Glücksrad',         r: 'arcade', d: 'Einmal am Tag drehen.', game: 'Bonus', skill: 's2' },
    { p: 'arcade/mitternacht.html',   t: 'Mitternachts-Arcade', r: 'arcade', d: 'Ein Spiel, das nur Eingeweihte kennen.', game: 'Bonus', skill: 's5', hidden: true },

    // KI-Labor
    { p: 'ki/index.html',            t: 'KI-Labor',          r: 'ki', d: 'Übersicht und Verbindungsstatus.', nav: true },
    { p: 'ki/abenteuer.html',        t: 'Textabenteuer',     r: 'ki', d: 'Eine KI erzählt deine Geschichte.', nav: true },
    { p: 'ki/kartenschmiede.html',   t: 'Kartenschmiede',    r: 'ki', d: 'Welten und Dungeons generieren.', nav: true },
    { p: 'ki/bildwerk.html',         t: 'Bildwerk',          r: 'ki', d: 'Bilder aus Text erzeugen.', nav: true },
    { p: 'ki/taverne.html',          t: 'Taverne',           r: 'ki', d: 'Plaudere mit Figuren aus dem Dungeon.', nav: true },
    { p: 'ki/code-tutor.html',           t: 'Code-Tutor',          r: 'ki', d: 'Erklärt Code, findet Fehler, stellt Übungen – mit KI oder offline.', nav: true },
    { p: 'ki/hardware-berater.html', t: 'Hardware-Berater',  r: 'ki', d: 'Kaufberatung mit dem Archiv als Wissen.', nav: true },
    { p: 'ki/textwerk.html',         t: 'Textwerk',          r: 'ki', d: 'Zusammenfassen, übersetzen, umformulieren.', nav: true },
    { p: 'ki/orakel.html',           t: 'Orakel',            r: 'ki', d: 'Stelle eine Frage. Erhalte ein Rätsel.', skill: 'm3' },

    // Mixer
    { p: 'mixer/index.html',  t: 'Mixer-Studio',   r: 'mixer', d: 'Alle Mixer auf einen Blick.', nav: true },
    { p: 'mixer/klang.html',  t: 'Klangmixer',     r: 'mixer', d: 'Regen, Wind, Feuer – dein Hintergrundklang.', nav: true },
    { p: 'mixer/farbe.html',  t: 'Farbmixer',      r: 'mixer', d: 'Farben mischen und Paletten bauen.', nav: true },
    { p: 'mixer/namen.html',  t: 'Namensmixer',    r: 'mixer', d: 'Namen für Spiele, Helden und Studios.', nav: true },
    { p: 'mixer/wesen.html',  t: 'Kreaturenmixer', r: 'mixer', d: 'Bau dir ein Monster.', nav: true },
    { p: 'mixer/synth.html',  t: 'Synthesizer',    r: 'mixer', d: 'Ein Keyboard im Browser.', skill: 'm1' },
    { p: 'mixer/beat.html',   t: 'Beatmaschine',   r: 'mixer', d: 'Step-Sequencer mit 16 bis 64 Schritten.', skill: 'm2' },
    { p: 'mixer/musik.html',  t: 'Musik-Studio',   r: 'mixer', d: 'Songs bauen: Drums, Bass, Synth und Ambiente – als WAV exportieren.', skill: 'm2' },

    // Werkzeuge
    { p: 'werkzeuge/index.html',          t: 'Werkzeugkasten',     r: 'werkzeuge', d: 'Alle Werkzeuge.', nav: true },
    { p: 'werkzeuge/einheiten.html',      t: 'Einheitenrechner',   r: 'werkzeuge', d: 'GB oder GiB? Watt, Hertz und mehr.', nav: true },
    { p: 'werkzeuge/passwort.html',       t: 'Passwort-Generator', r: 'werkzeuge', d: 'Sichere Passwörter, lokal erzeugt.', nav: true },
    { p: 'werkzeuge/zufall.html',         t: 'Zufallsentscheider', r: 'werkzeuge', d: 'Würfel, Münze und „Wer zahlt?".', nav: true },
    { p: 'werkzeuge/timer.html',          t: 'Timer & Pomodoro',   r: 'werkzeuge', d: 'Konzentriert arbeiten.', nav: true },
    { p: 'werkzeuge/json.html',           t: 'JSON-Werkstatt',     r: 'werkzeuge', d: 'Formatieren, prüfen, verkleinern.', nav: true },
    { p: 'werkzeuge/bildschirmtest.html', t: 'Bildschirmtest',     r: 'werkzeuge', d: 'Pixelfehler und Farbverläufe prüfen.', nav: true },
    { p: 'werkzeuge/tastaturtest.html',   t: 'Tastaturtest',       r: 'werkzeuge', d: 'Funktioniert jede Taste?', nav: true },
    { p: 'werkzeuge/hz-test.html',        t: 'Hz-Test',            r: 'werkzeuge', d: 'Wie viele Bilder pro Sekunde schafft dein Bildschirm?', nav: true },
    { p: 'werkzeuge/klicktest.html',      t: 'Klicktest',          r: 'werkzeuge', d: 'Klicks pro Sekunde messen.', nav: true },
    { p: 'werkzeuge/notizen.html',        t: 'Notizblock',         r: 'werkzeuge', d: 'Notizen, die nur in deinem Browser bleiben.', nav: true },

    // Studio
    { p: 'studio/index.html',      t: 'Downloads',       r: 'studio', d: 'Alle Projekte von Xiruprojekts.', nav: true },
    { p: 'studio/floppy-hub.html', t: 'Floppy Hub',      r: 'studio', d: 'Aus Disketten wird eine Spielebibliothek.', nav: true },
    { p: 'studio/pixmag.html',     t: 'PIXMAG',          r: 'studio', d: 'Düsteres Dungeon-RPG mit Zauber-Kombinationen.', nav: true },
    { p: 'studio/xiruweb.html',    t: 'Diese Website',   r: 'studio', d: 'Wie diese Website gebaut ist.', nav: true },
    { p: 'studio/beta.html',       t: 'Beta-Programm',   r: 'studio', d: 'Neue Projekte vor allen anderen testen.', nav: true },

    // Geheim
    { p: 'geheim/terminal.html',         t: 'Floppy-Terminal',   r: 'geheim', d: 'A:\\> _', hidden: true, skill: 't5' },
    { p: 'geheim/keller.html',           t: 'Der Keller',        r: 'geheim', d: 'Hier unten ist es feucht.', hidden: true },
    { p: 'geheim/archiv-1999.html',      t: 'Archiv 1999',       r: 'geheim', d: 'Diese Seite ist im Aufbau.', hidden: true, skill: 'e5' },
    { p: 'geheim/leuchtturm.html',       t: 'Der Leuchtturm',    r: 'geheim', d: 'Ein Licht im Sternenmeer.', hidden: true },
    { p: 'geheim/serverraum.html',       t: 'Serverraum',        r: 'geheim', d: 'Bitte nichts anfassen.', hidden: true, skill: 't6' },
    { p: 'geheim/void.html',             t: 'Die Leere',         r: 'geheim', d: '…', hidden: true, skill: 'e6' },
    { p: 'geheim/runen.html',            t: 'Runenkammer',       r: 'geheim', d: 'Uralte Zeichen warten auf einen Leser.', hidden: true, skill: 'm5' },
    { p: 'geheim/turm.html',             t: 'Der Magierturm',    r: 'geheim', d: 'Ganz oben wohnt jemand.', hidden: true, skill: 'm6' },
    { p: 'geheim/ruhmeshalle.html',      t: 'Ruhmeshalle',       r: 'geheim', d: 'Für die Legenden der Spielhalle.', hidden: true, skill: 's6' },
    { p: 'geheim/kristallschrein.html',  t: 'Kristallschrein',   r: 'geheim', d: 'Ein Altar für Sammler.', hidden: true },
    { p: 'geheim/katzen.html',           t: 'Katzenzimmer',      r: 'geheim', d: 'Miau.', hidden: true },
    { p: 'geheim/rueckwaerts.html',      t: 'sträwkcüR',         r: 'geheim', d: '.tlerhekmu tsi seilA', hidden: true },
    { p: 'geheim/ende.html',             t: 'Das Ende?',         r: 'geheim', d: 'Nur wer alles gemeistert hat.', hidden: true }
];

/* ── Skilltree ────────────────────────────────────────────────────────────
   4 Äste à 6 Skills. x/y = Position im Baum (Raster 0–6 / 0–4).
   ------------------------------------------------------------------------- */
XIRU.branches = [
    { id: 'e', name: 'Entdecker', color: '#5eead4', desc: 'Sieh mehr von der Welt.' },
    { id: 't', name: 'Techniker', color: '#fb923c', desc: 'Schraube an allem, was Strom hat.' },
    { id: 's', name: 'Spieler',   color: '#f472b6', desc: 'Schalte neue Spiele frei.' },
    { id: 'm', name: 'Magier',    color: '#a78bfa', desc: 'Klang, Runen und KI-Zauber.' }
];

XIRU.skills = [
    { id: 'e1', b: 'e', n: 'Kompass',          c: 1, req: [],           d: 'Die Weltkarte zeigt, wie viele Orte pro Region noch unentdeckt sind.' },
    { id: 'e2', b: 'e', n: 'Spürnase',         c: 1, req: ['e1'],       d: 'Unten auf jeder Seite siehst du, ob hier noch Realitätskristalle versteckt sind.' },
    { id: 'e3', b: 'e', n: 'Kartograph',       c: 2, req: ['e1'],       d: 'Versteckte Orte erscheinen als „???" auf der Weltkarte – mit Hinweis.' },
    { id: 'e4', b: 'e', n: 'Schlüsselmeister', c: 2, req: ['e3'],       d: 'Im Fussbereich jeder Seite erscheint eine kleine Tür.' },
    { id: 'e5', b: 'e', n: 'Zeitreisender',    c: 2, req: ['e2'],       d: 'Öffnet das Archiv 1999 und das Design „Klassik".' },
    { id: 'e6', b: 'e', n: 'Weltenwanderer',   c: 3, req: ['e4', 'e5'], d: 'Öffnet ein Portal in die Leere.' },

    { id: 't1', b: 't', n: 'Schraubenzieher',  c: 1, req: [],           d: 'Expertenmodus: Datenblätter zeigen Leistungsindex und Fun Facts.' },
    { id: 't2', b: 't', n: 'Benchmarker',      c: 1, req: ['t1'],       d: 'Schaltet „Höher oder Tiefer" in der Spielhalle frei.' },
    { id: 't3', b: 't', n: 'Schrauber',        c: 2, req: ['t1'],       d: 'Schaltet den „PC-Bauer" in der Spielhalle frei.' },
    { id: 't4', b: 't', n: 'Übertakter',       c: 2, req: ['t2'],       d: 'Schaltet das Design „RGB" frei. Mehr Leuchten = mehr Leistung.' },
    { id: 't5', b: 't', n: 'Terminal-Zugang',  c: 2, req: ['t3'],       d: 'Öffnet das Floppy-Terminal.' },
    { id: 't6', b: 't', n: 'Systemarchitekt',  c: 3, req: ['t4', 't5'], d: 'Öffnet den Serverraum.' },

    { id: 's1', b: 's', n: 'Münzeinwurf',      c: 1, req: [],           d: 'Retro-Paket: Invasoren, Froschsprung und Asteroiden.' },
    { id: 's2', b: 's', n: 'Glückspilz',       c: 1, req: ['s1'],       d: 'Das tägliche Glücksrad wird freigeschaltet.' },
    { id: 's3', b: 's', n: 'Taktiker',         c: 2, req: ['s1'],       d: 'Strategie-Paket: Turmwacht und Reversi.' },
    { id: 's4', b: 's', n: 'Dungeon-Veteran',  c: 2, req: ['s3'],       d: 'PIXMAG Mini: neue Klasse „Erzmagier" und ein Startbonus.' },
    { id: 's5', b: 's', n: 'Highscore-Jäger',  c: 2, req: ['s2'],       d: 'Öffnet die Mitternachts-Arcade.' },
    { id: 's6', b: 's', n: 'Arcade-Legende',   c: 3, req: ['s4', 's5'], d: 'Öffnet die Ruhmeshalle und das Design „Röhrenmonitor".' },

    { id: 'm1', b: 'm', n: 'Funke',            c: 1, req: [],           d: 'Schaltet den Synthesizer im Mixer-Studio frei.' },
    { id: 'm2', b: 'm', n: 'Klangweber',       c: 1, req: ['m1'],       d: 'Schaltet die Beatmaschine frei.' },
    { id: 'm3', b: 'm', n: 'Orakelstimme',     c: 2, req: ['m1'],       d: 'Öffnet das Orakel im KI-Labor.' },
    { id: 'm4', b: 'm', n: 'Weltenschmied',    c: 2, req: ['m3'],       d: 'Kartenschmiede-Dungeons lassen sich in PIXMAG Mini spielen.' },
    { id: 'm5', b: 'm', n: 'Runenleser',       c: 2, req: ['m2'],       d: 'Öffnet die Runenkammer.' },
    { id: 'm6', b: 'm', n: 'Erzmagier',        c: 3, req: ['m4', 'm5'], d: 'Öffnet den Magierturm und das Design „PIXMAG".' }
];

/* ── Werft: der Erkundungs-Mech ───────────────────────────────────────────
   Baupläne findet man auf den Inseln der Weltkarte (XIRU.blueprintSpots, Sonar-
   Peilung vor Ort) oder als Beute. Gebaut wird in der Werft aus Schrott (1 Schrott
   pro 4 XP) und Materialien (Rezept je Bauplatz und Stufe, siehe XIRU.mech.recipe).
   req ist nur noch historisch (Version 1) und wird nicht mehr geprüft.
   Jedes gebaute oder gefundene Teil ist ein Gegenstand im Inventar – mit
   Seltenheit (q 1–6), Zustand (0–100 %) und Aufwertung (+0 bis +5).
   Werte: R Reichweite · E Energie · S Sensor · P Panzerung · A Angriff
   rep: Rabatt auf Reparaturen (Werkzeugarm)
   fx:  Sondereffekte (Zubehör): speed Reisetempo · storm Sturmschutz ·
        events mehr Reise-Ereignisse · luck bessere Beute · taler mehr Taler
   i:   Symbol im Inventar
   ------------------------------------------------------------------------- */
XIRU.rarities = [
    null,
    { n: 'Gewöhnlich',   c: '#9ca3af', m: 1 },
    { n: 'Ungewöhnlich', c: '#4ade80', m: 1.25 },
    { n: 'Selten',       c: '#60a5fa', m: 1.5 },
    { n: 'Episch',       c: '#c084fc', m: 1.9 },
    { n: 'Legendär',     c: '#fbbf24', m: 2.4 },
    { n: 'Mythisch',     c: '#f472b6', m: 3 }
];
XIRU.mechSlots = [
    { id: 'rahmen',   n: 'Rahmen',      icon: '▣' },
    { id: 'antrieb',  n: 'Antrieb',     icon: '⚙' },
    { id: 'kern',     n: 'Energiekern', icon: '◆' },
    { id: 'sensor',   n: 'Sensor',      icon: '📡' },
    { id: 'arm',      n: 'Werkzeugarm', icon: '🔧' },
    { id: 'panzer',   n: 'Panzerung',   icon: '🛡' },
    { id: 'waffe',    n: 'Waffe',       icon: '⚔' },
    { id: 'zubehoer', n: 'Zubehör',     icon: '🎒' }
];
XIRU.mechParts = [
    /* Rahmen */
    { id: 'r-schrott',    slot: 'rahmen',   t: 1, i: '🧱', n: 'Schrottrahmen',        s: { P: 1 },                       req: {},                     cost: 0,   d: 'Zusammengeschweisst aus alten PC-Gehäusen. Hält. Meistens.' },
    { id: 'r-alu',        slot: 'rahmen',   t: 2, i: '🥫', n: 'Aluminiumrahmen',      s: { P: 1, R: 1 },                 req: { level: 3 },           cost: 40,  d: 'Leichter, also kommt der Antrieb weiter.' },
    { id: 'r-carbon',     slot: 'rahmen',   t: 3, i: '🕸', n: 'Carbonrahmen',         s: { P: 1, R: 2, E: 1 },           req: { pages: 40 },          cost: 140, d: 'Gewebt aus den Fasern alter Mauspads.' },
    { id: 'r-titan',      slot: 'rahmen',   t: 3, i: '🗼', n: 'Titanrahmen',          s: { P: 2, R: 1, E: 1 },           req: { level: 7 },           cost: 120, d: 'Mit Kabelkanälen für zusätzliche Energie.' },
    { id: 'r-kristall',   slot: 'rahmen',   t: 4, i: '💎', n: 'Kristallgerüst',       s: { P: 3, R: 2, E: 2, S: 1 },     req: { eggs: 30 },           cost: 300, d: 'Ein Gerüst aus gewachsenen Realitätskristallen.' },
    { id: 'r-obsidian',   slot: 'rahmen',   t: 5, i: '🌋', n: 'Obsidianrahmen',       s: { P: 4, R: 2, E: 2, S: 1, A: 1 }, req: { level: 15 },        cost: 500, d: 'Aus dem Glas eines erloschenen Vulkans. Schwarz wie ein ausgeschalteter Monitor.' },
    /* Antrieb */
    { id: 'a-paddel',     slot: 'antrieb',  t: 1, i: '🛶', n: 'Paddelrad',            s: { R: 1 },                       req: {},                     cost: 0,   d: 'Ein Lüfterrad mit angeschraubten Schaufeln.' },
    { id: 'a-segel',      slot: 'antrieb',  t: 2, i: '⛵', n: 'Datensegel',           s: { R: 2 },                       req: { games: 3 },           cost: 50,  d: 'Fängt Wind und, wenn man Glück hat, WLAN.' },
    { id: 'a-raupe',      slot: 'antrieb',  t: 2, i: '🚜', n: 'Raupenkette',          s: { R: 2, P: 1 },                 req: { pages: 15 },          cost: 60,  d: 'Aus Druckerbändern geflochten. Kommt über jeden Strand.' },
    { id: 'a-schraube',   slot: 'antrieb',  t: 3, i: '🌀', n: 'Schiffsschraube',      s: { R: 3 },                       req: { level: 5 },           cost: 120, d: 'Gedreht aus drei Festplatten-Scheiben.' },
    { id: 'a-duesen',     slot: 'antrieb',  t: 4, i: '🚀', n: 'Kristalldüsen',        s: { R: 4, E: -1 },                req: { eggs: 20 },           cost: 250, d: 'Schnell, aber durstig.' },
    { id: 'a-beine',      slot: 'antrieb',  t: 5, i: '🦿', n: 'Mech-Beine',           s: { R: 4, P: 2 },                 req: { level: 12 },          cost: 400, d: 'Läuft über Wasser? Nein – durch. Ganz unten.' },
    { id: 'a-hover',      slot: 'antrieb',  t: 5, i: '🛸', n: 'Schwebeplatten',       s: { R: 5, P: 1, E: -1 },          req: { eggs: 50 },           cost: 520, d: 'Magnetplatten aus alten Festplatten. Der Mech schwebt eine Handbreit über dem Wasser.' },
    /* Energiekern */
    { id: 'k-batterie',   slot: 'kern',     t: 1, i: '🔋', n: 'Autobatterie',         s: { E: 1 },                       req: {},                     cost: 0,   d: '12 Volt Zuversicht.' },
    { id: 'k-solar',      slot: 'kern',     t: 2, i: '☀', n: 'Solarzellen',          s: { E: 2 },                       req: { pages: 20 },          cost: 45,  d: 'Aus Taschenrechnern geklaubt. Nachts etwas müde.' },
    { id: 'k-diskette',   slot: 'kern',     t: 2, i: '💾', n: 'Diskettenreaktor',     s: { E: 2, S: 1 },                 req: { eggs: 5 },            cost: 50,  d: 'Liefert stabile 1,44 Megawatt.' },
    { id: 'k-cd',         slot: 'kern',     t: 3, i: '💿', n: 'CD-Dynamo',            s: { E: 3 },                       req: { level: 6 },           cost: 140, d: 'Dreht mit 52-facher Geschwindigkeit.' },
    { id: 'k-kristall',   slot: 'kern',     t: 4, i: '🔮', n: 'Realitätskern',        s: { E: 5, S: 1 },                 req: { eggs: 40 },           cost: 350, d: 'Ein Kernkristall, der in alle Richtungen leuchtet.' },
    { id: 'k-fusion',     slot: 'kern',     t: 5, i: '⚛', n: 'Taschen-Fusion',       s: { E: 6, A: 1 },                 req: { level: 16 },          cost: 560, d: 'Eine kleine Sonne im Brustkorb. Bitte nicht schütteln.' },
    /* Sensor */
    { id: 's-antenne',    slot: 'sensor',   t: 1, i: '📶', n: 'Drahtantenne',         s: { S: 1 },                       req: { pages: 8 },           cost: 20,  d: 'Ein gebogener Kleiderbügel. Empfang: ok.' },
    { id: 's-radar',      slot: 'sensor',   t: 2, i: '📡', n: 'Radarschüssel',        s: { S: 2 },                       req: { level: 4 },           cost: 80,  d: 'Dreht sich. Piept. Findet Dinge.' },
    { id: 's-sonar',      slot: 'sensor',   t: 3, i: '🔊', n: 'Lautsprecher-Sonar',   s: { S: 2, R: 1 },                 req: { pages: 25 },          cost: 110, d: 'Ein Subwoofer, der unter Wasser „Hallo?" ruft und auf Antwort wartet.' },
    { id: 's-hdd',        slot: 'sensor',   t: 3, i: '💽', n: 'Festplatten-Kompass',  s: { S: 3, R: 1 },                 req: { eggs: 15 },           cost: 180, d: 'Der Lesekopf zeigt immer zum nächsten Geheimnis.' },
    { id: 's-prisma',     slot: 'sensor',   t: 4, i: '🔺', n: 'Nebelprisma',          s: { S: 4 },                       req: { eggs: 35, level: 10 }, cost: 300, d: 'Bricht den Nebel wie Licht.' },
    { id: 's-auge',       slot: 'sensor',   t: 5, i: '👁', n: 'Allsehendes Auge',     s: { S: 5, A: 1 },                 req: { eggs: 60 },           cost: 520, d: 'Es blinzelt nie. Man gewöhnt sich daran. Irgendwann.' },
    /* Werkzeugarm */
    { id: 'w-schluessel', slot: 'arm',      t: 1, i: '🔧', n: 'Schraubenschlüssel',   s: {}, rep: .25,                   req: { games: 1 },           cost: 30,  d: 'Reparaturen kosten 25 % weniger.' },
    { id: 'w-schweiss',   slot: 'arm',      t: 2, i: '🔥', n: 'Schweissarm',          s: { A: 1 }, rep: .35,             req: { level: 4 },           cost: 70,  d: 'Flickt Löcher – und brennt welche. −35 % Reparaturkosten.' },
    { id: 'w-greifer',    slot: 'arm',      t: 2, i: '🦾', n: 'Greifarm',             s: { P: 1 }, rep: .4,              req: { games: 5 },           cost: 90,  d: 'Hält Teile fest, während man schraubt. −40 % Reparaturkosten.' },
    { id: 'w-bohrer',     slot: 'arm',      t: 3, i: '🪛', n: 'Kristallbohrer',       s: { E: 1, S: 1 }, rep: .5,        req: { level: 9 },           cost: 200, d: 'Bohrt sich durch alles. −50 % Reparaturkosten.' },
    { id: 'w-nano',       slot: 'arm',      t: 5, i: '🐝', n: 'Nanoschwarm',          s: { P: 1 }, rep: .7,              req: { eggs: 45 },           cost: 450, d: 'Tausende winzige Helfer, die summend alles zusammenflicken. −70 % Reparaturkosten.' },
    /* Panzerung */
    { id: 'p-blech',      slot: 'panzer',   t: 1, i: '🛡', n: 'Blechplatten',         s: { P: 1 },                       req: { level: 2 },           cost: 30,  d: 'Seitenteile alter Gehäuse.' },
    { id: 'p-ram',        slot: 'panzer',   t: 2, i: '🎞', n: 'RAM-Lamellen',         s: { P: 2 },                       req: { pages: 30 },          cost: 110, d: 'Dutzende RAM-Riegel, schuppenartig vernietet.' },
    { id: 'p-tower',      slot: 'panzer',   t: 3, i: '🏢', n: 'Tower-Panzer',         s: { P: 3 },                       req: { level: 10 },          cost: 220, d: 'Aus einem Big-Tower von 2008. Unzerstörbar.' },
    { id: 'p-schild',     slot: 'panzer',   t: 4, i: '🔰', n: 'Energieschild',        s: { P: 4, E: -1 },                req: { eggs: 25 },           cost: 320, d: 'Ein flimmerndes Feld, das nach heissem Staub riecht.' },
    { id: 'p-kristall',   slot: 'panzer',   t: 5, i: '💠', n: 'Kristallschuppen',     s: { P: 5, S: 1 },                 req: { level: 18 },          cost: 520, d: 'Jede Schuppe ein kleiner Realitätskristall.' },
    /* Waffen (für die Arena) */
    { id: 'f-nagel',      slot: 'waffe',    t: 1, i: '📌', n: 'Nagelpistole',         s: { A: 2 },                       req: {},                     cost: 0,   d: 'Aus dem Baumarkt. Klackert beruhigend.' },
    { id: 'f-loet',       slot: 'waffe',    t: 2, i: '🖊', n: 'Lötlanze',             s: { A: 3 },                       req: { games: 3 },           cost: 50,  d: 'Ein Lötkolben auf einer Besenstange. 450 Grad Überzeugungskraft.' },
    { id: 'f-laser',      slot: 'waffe',    t: 3, i: '🔦', n: 'Laserpointer-Kanone',  s: { A: 4, S: 1 },                 req: { level: 6 },           cost: 140, d: 'Zweihundert Laserpointer, gebündelt. Katzen lieben sie.' },
    { id: 'f-bohr',       slot: 'waffe',    t: 3, i: '👊', n: 'Bohrfaust',            s: { A: 5, P: 1 },                 req: { pages: 35 },          cost: 170, d: 'Ein Akkuschrauber in Faustgrösse.' },
    { id: 'f-tesla',      slot: 'waffe',    t: 4, i: '⚡', n: 'Tesla-Spule',          s: { A: 7, E: -1 },                req: { eggs: 25 },           cost: 300, d: 'Blitze in Dosenform. Haare stehen zu Berge.' },
    { id: 'f-klinge',     slot: 'waffe',    t: 5, i: '🗡', n: 'Kristallklinge',       s: { A: 9, S: 1 },                 req: { level: 14 },          cost: 480, d: 'Geschliffen aus einem einzigen Prisma. Schneidet Nebel.' },
    /* Zubehör */
    { id: 'z-laterne',    slot: 'zubehoer', t: 1, i: '🏮', n: 'Sturmlaterne',         s: { S: 1 }, fx: { events: .15 },  req: { level: 2 },           cost: 25,  d: 'Im Laternenlicht entdeckt man unterwegs mehr.' },
    { id: 'z-kompass',    slot: 'zubehoer', t: 2, i: '🧭', n: 'Messingkompass',       s: { R: 1 }, fx: { speed: .15 },   req: { pages: 12 },          cost: 60,  d: 'Zeigt immer nach Norden. Reisen gehen 15 % schneller.' },
    { id: 'z-anker',      slot: 'zubehoer', t: 2, i: '⚓', n: 'Treibanker',           s: { P: 1 }, fx: { storm: .5 },    req: { level: 4 },           cost: 60,  d: 'Hält den Mech im Sturm ruhig. Halber Sturmschaden.' },
    { id: 'z-sparschwein', slot: 'zubehoer', t: 3, i: '🐷', n: 'Sparschwein',         s: {}, fx: { taler: .2 },          req: { games: 6 },           cost: 120, d: 'Grunzt bei jedem Taler. +20 % Taler.' },
    { id: 'z-funk',       slot: 'zubehoer', t: 3, i: '📻', n: 'Funkgerät',            s: { S: 1 }, fx: { events: .3 },   req: { eggs: 12 },           cost: 130, d: 'Fängt Hilferufe, Wetterberichte und Händlergeplauder auf.' },
    { id: 'z-kleeblatt',  slot: 'zubehoer', t: 4, i: '🍀', n: 'Vierblättriges Kleeblatt', s: {}, fx: { luck: .25 },      req: { eggs: 30 },           cost: 260, d: 'In Harz gegossen. Beute fällt öfter seltener aus.' }
];
/* Startausrüstung (Tutorial): klar erkennbares Anfänger-Set, alles Gewöhnlich */
XIRU.starterSet = ['r-schrott', 'a-paddel', 'k-batterie', 'f-nagel'];
/* Baupläne, die man von Anfang an kennt: das Starter-Set + je ein Stufe-1-Teil für die übrigen Plätze */
XIRU.starterBlueprints = ['r-schrott', 'a-paddel', 'k-batterie', 'f-nagel', 's-antenne', 'w-schluessel', 'p-blech', 'z-laterne'];
/* Wo liegen die übrigen Baupläne? Je weiter weg die Insel, desto besser die Pläne.
   Gefunden werden sie mit der Sonar-Peilung, wenn der Mech dort vor Anker liegt. */
XIRU.blueprintSpots = {
    zentrum:   ['a-segel', 'k-solar', 'z-kompass'],
    werkzeuge: ['r-alu', 'w-schweiss', 'w-greifer', 'w-bohrer'],
    studio:    ['k-diskette', 's-radar', 'k-cd'],
    arcade:    ['f-loet', 'f-laser', 'z-sparschwein'],
    hardware:  ['p-ram', 'r-titan', 's-hdd', 'a-schraube'],
    markt:     ['a-raupe', 'z-anker', 'z-funk'],
    schmiede:  ['r-carbon', 'p-tower', 'f-bohr'],
    mixer:     ['s-sonar', 'p-schild', 'f-tesla'],
    ki:        ['a-duesen', 'k-kristall', 's-prisma'],
    wrack:     ['z-kleeblatt', 'a-beine', 'w-nano'],
    arena:     ['r-kristall', 'f-klinge', 'p-kristall'],
    mine:      ['a-hover', 's-auge', 'k-fusion', 'r-obsidian']
};

/* Materialien (Beute, Handel, Schmiede) – v = Wert in Talern */
XIRU.materials = [
    { id: 'kabel',     n: 'Kupferkabel',      i: '🔌', v: 3,  d: 'Aus alten Ladegeräten.' },
    { id: 'zahnrad',   n: 'Zahnrad',          i: '⚙', v: 4,  d: 'Messing, leicht verbogen.' },
    { id: 'oel',       n: 'Altöl',            i: '🛢', v: 5,  d: 'Riecht nach Garage.' },
    { id: 'platine',   n: 'Platine',          i: '🟩', v: 8,  d: 'Grün, mit vielen Lötpunkten.' },
    { id: 'chip',      n: 'Mikrochip',        i: '🔲', v: 14, d: 'Winzig. Wertvoll. Leicht zu verlieren.' },
    { id: 'splitter',  n: 'Kristallsplitter', i: '💠', v: 25, d: 'Ein Bruchstück eines Realitätskristalls.' },
    { id: 'nebelkern', n: 'Nebelkern',        i: '🌀', v: 80, d: 'Verdichteter Nebel. Kalt und schwer.' },
    { id: 'erz',       n: 'Speichererz',      i: '🪨', v: 18, d: 'Gestein aus Mnemora mit blauen Adern. Daraus baut man Gehäuse und Steckkarten.' }
];
/* Schrottpresse in der Werft: Schrott (und einfache Materialien) zu Bauteil-Materialien verarbeiten.
   Kristallsplitter und Nebelkerne lassen sich nicht pressen – die gibt es nur draussen in der Welt. */
XIRU.pressRecipes = [
    { id: 'kabel',   scrap: 6,  d: 'Altes Gerät ausweiden, Kupfer ziehen.' },
    { id: 'zahnrad', scrap: 8,  d: 'Blech stanzen, Zähne feilen.' },
    { id: 'oel',     scrap: 10, d: 'Lager auspressen. Riecht.' },
    { id: 'platine', scrap: 14, mats: { kabel: 2 }, d: 'Leiterbahnen ätzen, Kabel anlöten.' },
    { id: 'chip',    scrap: 24, mats: { platine: 1, kabel: 2 }, d: 'Feinarbeit unter der Lupe.' }
];

/* ── Inseln der Weltkarte (Archipel 2400 × 1600, rundherum Nebel) ─────────
   Inhalts-Inseln gehören zu einer Region (r). Spiel-Inseln (game: true) haben
   eine eigene Seite unter welt/.
   req = weitere Mech-Werte (E, S, P, A) für die erste Reise dorthin; null = von Anfang an bekannt.
   Die nötige REICHWEITE hängt nicht an der Insel, sondern an der Strecke: je weiter
   vom aktuellen Standort des Mechs, desto mehr (XIRU.mech.legNeed). Reicht sie nicht,
   plant der Mech eine Route mit Zwischenstopps über bekannte Inseln.
   b = Gebäude: [Name, Seite, Pixel-Icon aus assets/js/pixel-icons.js]
   ------------------------------------------------------------------------- */
XIRU.islands = [
    { id: 'konto',     r: 'konto',     n: 'Heimathafen',     x: 1010, y: 1030, s: 118, art: 'hafen',    req: null,
      b: [['Werft', 'konto/skilltree.html', 'z-anker'], ['Kapitänshaus', 'konto/profil.html', 'npc-otto'], ['Kristallsammlung', 'konto/sammlung.html', 'k-kristall'], ['Hafenamt', 'konto/einstellungen.html', 'mat-zahnrad'], ['Arche-Dock', 'welt/arche.html', 'ic-arche']] },
    { id: 'zentrum',   r: 'zentrum',   n: 'Zentrum',         x: 1190, y: 720,  s: 122, art: 'zentrum',  req: null,
      b: [['Marktplatz', 'index.html', 'z-kompass'], ['Kartenturm', 'weltkarte.html', 'st-R'], ['Bibliothek', 'suche.html', 's-hdd'], ['Rathaus', 'hilfe.html', 'npc-frieda']] },
    { id: 'werkzeuge', r: 'werkzeuge', n: 'Werkzeugkasten',  x: 640,  y: 1110, s: 104, art: 'werkstatt', req: {},
      b: [['Werkzeugschuppen', 'werkzeuge/index.html', 'w-schluessel']] },
    { id: 'studio',    r: 'studio',    n: 'Studio',          x: 985,  y: 385,  s: 110, art: 'studio',   req: {},
      b: [['Filmstudio', 'studio/index.html', 'k-cd'], ['Floppy-Hub-Halle', 'studio/floppy-hub.html', 'k-diskette']] },
    { id: 'arcade',    r: 'arcade',    n: 'Spielhalle',      x: 1560, y: 470,  s: 126, art: 'arcade',   req: {},
      b: [['Neon-Halle', 'arcade/index.html', 'ic-joystick'], ['PIXMAG-Verlies', 'arcade/dungeon.html', 'f-klinge']] },
    { id: 'hardware',  r: 'hardware',  n: 'Hardware-Archiv', x: 560,  y: 650,  s: 126, art: 'archiv',   req: { S: 1 },
      b: [['Archivturm', 'hardware/index.html', 'mat-chip'], ['Code-Bibliothek', 'hardware/code/index.html', 'mat-platine']] },
    { id: 'mixer',     r: 'mixer',     n: 'Mixer-Studio',    x: 1430, y: 1170, s: 108, art: 'mixer',    req: { E: 2 },
      b: [['Klangturm', 'mixer/index.html', 'ic-note']] },
    { id: 'ki',        r: 'ki',        n: 'KI-Labor',        x: 1880, y: 900,  s: 120, art: 'labor',    req: { E: 3, S: 2 },
      b: [['Observatorium', 'ki/index.html', 'k-fusion'], ['Taverne', 'ki/taverne.html', 'ic-krug']] },
    { id: 'geheim',    r: 'geheim',    n: '???',             x: 250,  y: 1390, s: 92,  art: 'ruinen',   req: null, secret: true, b: [] },
    { id: 'markt',     r: 'meer', game: true, n: 'Händlerbucht',   x: 1520, y: 790,  s: 86, art: 'markt',    req: {},
      b: [['Basar', 'welt/markt.html', 'taler'], ['Lucky Joes Glücksbude', 'welt/markt.html#joe', 'npc-joe'], ['Flossies Fischstand', 'welt/markt.html#fisch', 'npc-flossie']], d: 'Händler aus allen Ecken von Sektaria: Bauteile kaufen, verkaufen, tauschen – und bei Lucky Joe das Glück herausfordern.' },
    { id: 'schmiede',  r: 'meer', game: true, n: 'Funkenschmiede', x: 800,  y: 1390, s: 82, art: 'schmiede', req: { E: 2 },
      b: [['Esse', 'welt/schmiede.html', 'ic-amboss']], d: 'Hier werden Teile aufgewertet, zerlegt und verschmolzen.' },
    { id: 'wrack',     r: 'meer', game: true, n: 'Wrackriff',      x: 1930, y: 1370, s: 84, art: 'wrack',    req: { S: 2 },
      b: [['Tauchplatz', 'welt/wrack.html', 'npc-muschel']], d: 'Ein Riff voller gesunkener Frachter. Mit Sonar findet man Schätze.' },
    { id: 'arena',     r: 'meer', game: true, n: 'Schrott-Arena',  x: 2080, y: 560,  s: 98, art: 'arena',    req: { P: 2, A: 3 },
      b: [['Kampfring', 'welt/arena.html', 'st-A']], d: 'Mechs aus ganz Sektaria treten hier gegeneinander an.' },
    { id: 'mine',      r: 'meer', game: true, n: 'Nebelmine',      x: 330,  y: 300,  s: 100, art: 'mine',     req: { E: 3, S: 3 },
      b: [['Stollen', 'welt/mine.html', 'npc-kiesel']], d: 'Tief im Berg wachsen Kristallsplitter und Nebelkerne.' }
];
/* Schwierige Gewässer: Strecken, die hindurchführen (oder dort enden), brauchen mehr Reichweite */
XIRU.seaZones = [
    { id: 'sturmsee',  n: 'Sturmsee',   x: 2150, y: 470,  r: 300, add: 1, d: 'Peitschende Wellen rund um die Schrott-Arena.' },
    { id: 'nebelbank', n: 'Nebelbank',  x: 330,  y: 280,  r: 310, add: 1, d: 'Dichter, kalter Nebel vor der Nebelmine.' },
    { id: 'riffe',     n: 'Riffgürtel', x: 1960, y: 1400, r: 250, add: 1, d: 'Scharfe Riffe und Wracks unter der Oberfläche.' }
];
/* ── Angeln (wie in Dredge) ──────────────────────────────────────────────
   Angelplätze liegen im Meer nahe einer Insel (near). Man sieht sie erst ab einem
   Sensor-Wert (s) und angelt dort, wenn der Mech auf der Nachbarinsel vor Anker liegt
   und die Angel stark genug ist (tier). Jeder Platz hat einen kleinen Vorrat, der
   langsam nachwächst. Fische (q = Seltenheit, v = Wert in Talern) kauft und tauscht
   Fischerin Flossie in der Händlerbucht; sie verbessert auch die Angel.
   look: Pixel-Form des Fisch-Icons (fish-<id>), abart: mutierter Fisch aus dem Nebel
   ------------------------------------------------------------------------- */
XIRU.rods = [
    null,
    { n: 'Bambusrute',    d: 'Biegt sich bei jedem Hering, als ginge es um ihr Leben.' },
    { n: 'Teleskoprute',  d: 'Ausziehbar aus einer alten Zimmerantenne. Reicht bis ins Mittelwasser.', taler: 120,  mats: { kabel: 4, zahnrad: 2 } },
    { n: 'Karbonrute',    d: 'Leicht, steif und mit Festplatten-Rolle. Für tiefe Gräben.',             taler: 380,  mats: { platine: 3, oel: 3 } },
    { n: 'Tiefseewinde',  d: 'Eine Winde mit Seilzug und Druckausgleich. Holt alles hoch.',          taler: 900,  mats: { chip: 3, splitter: 2 } },
    { n: 'Nebelharpune',  d: 'Sie trifft, was im Nebel schwimmt – auch Dinge, die es nicht geben dürfte.', taler: 2200, mats: { splitter: 6, nebelkern: 1 } }
];
XIRU.fish = [
    { id: 'hering',          n: 'Hering',            q: 1, v: 4,   look: 'fisch',   d: 'Silbrig, häufig, zuverlässig. Das Rückgrat jeder Fischsuppe.' },
    { id: 'sardine',         n: 'Sardine',           q: 1, v: 3,   look: 'fisch',   d: 'Kommt nie allein und mag es eng.' },
    { id: 'makrele',         n: 'Makrele',           q: 1, v: 5,   look: 'fisch',   d: 'Schnell, gestreift und immer hungrig.' },
    { id: 'dorsch',          n: 'Dorsch',            q: 2, v: 8,   look: 'fisch',   d: 'Brummt am Grund vor sich hin.' },
    { id: 'aal',             n: 'Aal',               q: 2, v: 9,   look: 'aal',     d: 'Glitschig. Will nicht auf das Foto.' },
    { id: 'diskettenbarsch', n: 'Diskettenbarsch',   q: 2, v: 12,  look: 'fisch',   d: 'Eckig, blau, speichert genau 1,44 MB Fischgedanken.' },
    { id: 'pixelkarpfen',    n: 'Pixelkarpfen',      q: 3, v: 20,  look: 'fisch',   d: 'Bei genauem Hinsehen besteht er aus lauter kleinen Quadraten.' },
    { id: 'kugelfisch',      n: 'Kugelfisch',        q: 3, v: 18,  look: 'rund',    d: 'Bläst sich auf, wenn er sich ärgert. Also immer.' },
    { id: 'rochen',          n: 'Rochen',            q: 3, v: 22,  look: 'rochen',  d: 'Gleitet wie ein Drachen durchs Wasser.' },
    { id: 'laternenfisch',   n: 'Laternenfisch',     q: 3, v: 24,  look: 'tief',    d: 'Trägt seine eigene Nachttischlampe mit sich herum.' },
    { id: 'thun',            n: 'Blauflossen-Thun',  q: 4, v: 42,  look: 'fisch',   d: 'Ein Muskelpaket mit Flossen. Zieht wie ein Schlepper.' },
    { id: 'kabelaal',        n: 'Kabelaal',          q: 4, v: 46,  look: 'aal',     d: 'Lebt in alten Seekabeln. Leicht elektrisch. Nicht ablecken.' },
    { id: 'schwertfisch',    n: 'Schwertfisch',      q: 4, v: 50,  look: 'schwert', d: 'Ficht mit jeder Welle.' },
    { id: 'seeteufel',       n: 'Seeteufel',         q: 4, v: 54,  look: 'tief',    d: 'Mehr Maul als Fisch.' },
    { id: 'nebelhai',        n: 'Nebelhai',          q: 5, v: 120, look: 'hai',     d: 'Taucht aus dem Nebel auf und verschwindet wieder darin.' },
    { id: 'kristallkarpfen', n: 'Kristallkarpfen',   q: 5, v: 160, look: 'fisch',   d: 'Seine Schuppen sind winzige Realitätskristalle.' },
    { id: 'glitchforelle',   n: 'Glitchforelle',     q: 5, v: 150, look: 'fisch',   abart: true, d: 'Eine Abart aus dem Nebel. Flimmert, als würde sie gleich abstürzen.' },
    { id: 'leviathan',       n: 'Leviathan-Larve',   q: 6, v: 480, look: 'aal',     abart: true, d: 'Noch klein. Noch.' }
];
XIRU.fishSpots = [
    { id: 'hafenbecken',  n: 'Hafenbecken',     x: 1185, y: 1135, near: 'konto',     s: 0, tier: 1, fish: ['hering', 'sardine', 'makrele'],                     d: 'Ruhiges Wasser gleich vor der Werft. Hier fängt jeder an.' },
    { id: 'kelpwald',     n: 'Kelpwald',        x: 455,  y: 975,  near: 'werkzeuge', s: 1, tier: 1, fish: ['makrele', 'dorsch', 'aal', 'kugelfisch'],           d: 'Ein Wald aus Seetang, in dem sich alte Werkzeuge verfangen.' },
    { id: 'spiegelsee',   n: 'Spiegelbucht',    x: 790,  y: 300,  near: 'studio',    s: 1, tier: 2, fish: ['diskettenbarsch', 'pixelkarpfen', 'aal'],           d: 'So glatt, dass sich das Studio darin spiegelt.' },
    { id: 'neonriff',     n: 'Neonriff',        x: 1745, y: 400,  near: 'arcade',    s: 2, tier: 2, fish: ['pixelkarpfen', 'kugelfisch', 'rochen', 'laternenfisch'], d: 'Die Lichter der Spielhalle färben das Riff bunt.' },
    { id: 'kabelgraben',  n: 'Kabelgraben',     x: 1690, y: 1035, near: 'ki',        s: 2, tier: 3, fish: ['kabelaal', 'laternenfisch', 'schwertfisch', 'thun'], d: 'Ein Graben voller Seekabel. Es knistert im Wasser.' },
    { id: 'wrackfeld',    n: 'Wrackfeld',       x: 1700, y: 1430, near: 'wrack',     s: 3, tier: 3, fish: ['seeteufel', 'rochen', 'thun', 'kabelaal'],          d: 'Zwischen den Wracks verstecken sich Fische – und Bauteile.' },
    { id: 'drachengrund', n: 'Drachengrund',    x: 520,  y: 1300, near: 'schmiede',  s: 3, tier: 4, fish: ['seeteufel', 'nebelhai', 'schwertfisch', 'glitchforelle'], d: 'Hier soll der Seedrache schlafen. Das Wasser ist warm.' },
    { id: 'sturmtiefe',   n: 'Sturmtiefe',      x: 2210, y: 780,  near: 'arena',     s: 4, tier: 4, fish: ['thun', 'schwertfisch', 'nebelhai', 'kristallkarpfen'], d: 'Unter der Sturmsee liegt ein tiefer, stiller Schlund.' },
    { id: 'nebelstrudel', n: 'Nebelstrudel',    x: 565,  y: 235,  near: 'mine',      s: 4, tier: 5, fish: ['nebelhai', 'glitchforelle', 'kristallkarpfen', 'leviathan'], d: 'Ein Strudel aus Nebel und Wasser. Was hier anbeisst, kennt kein Buch.' }
];

/* Kompatibilität: Mech-Werte für die erste Reise je Insel/Region */
XIRU.islandReq = {};
XIRU.islands.forEach(i => { XIRU.islandReq[i.id] = i.req; });

/* ── Designs (Themes) ─────────────────────────────────────────────────── */
XIRU.themes = [
    { id: 'nacht',   n: 'Nacht',            d: 'Standard, dunkel.' },
    { id: 'hell',    n: 'Hell',             d: 'Für sonnige Tage.' },
    { id: 'floppy',  n: 'Floppy-Terminal',  d: 'Grüner Phosphor wie im Floppy Hub.', egg: 'b-floppy' },
    { id: 'klassik', n: 'Klassik',          d: 'Die Farben der allerersten Xiru-Website.', skill: 'e5' },
    { id: 'rgb',     n: 'RGB',              d: 'Es leuchtet. Alles.', skill: 't4' },
    { id: 'crt',     n: 'Röhrenmonitor',    d: 'Scanlines und Flimmern.', skill: 's6' },
    { id: 'pixmag',  n: 'PIXMAG',           d: 'Düster wie ein Dungeon.', skill: 'm6' },
    { id: 'sakura',     n: 'Kirschblüte',  d: 'Zartes Rosa, fallende Blütenblätter und blühende Zweige in den Ecken.' },
    { id: 'notizbuch',  n: 'Notizbuch',    d: 'Liniertes Papier, blaue Tinte, handgeschriebene Überschriften.' },
    { id: 'herbstlaub', n: 'Herbstlaub',   d: 'Kürbisorange und Rostrot, dazu tanzendes Laub.' },
    { id: 'tiefsee',    n: 'Tiefsee',      d: 'Leuchtendes Türkis im dunklen Wasser, aufsteigende Blasen.', level: 3 },
    { id: 'mooswald',   n: 'Mooswald',     d: 'Moos, warmes Licht und Glühwürmchen.', eggs: 10 },
    { id: 'synthwave',  n: 'Synthwave',    d: 'Neon-Sonnenuntergang mit Gitter bis zum Horizont.', level: 6 },
    { id: 'polarnacht', n: 'Polarnacht',   d: 'Eisblau, Nordlicht und leiser Schnee.', eggs: 25 },
    { id: 'vulkan',     n: 'Vulkan',       d: 'Glühende Lava und aufsteigende Funken.', level: 10 },
    { id: 'handheld',   n: 'Handheld',     d: 'Vier Grüntöne wie auf einem alten Taschen-Spielecomputer.', games: 10 },
    { id: 'sternwarte', n: 'Sternwarte',   d: 'Mitternachtsblau mit funkelnden Sternen und Gold.', eggs: 50 }
];

/* ── Realitätskristalle (Easter Eggs) ──────────────────────────────────────────────
   id   eindeutig        n  Name           h  Hinweis (sichtbar, solange nicht gefunden)
   x    XP               r  Seltenheit 1–4 (4 = Meilenstein, gibt +1 Modulpunkt)
   w    getipptes Wort (irgendwo auf der Seite, nicht in Eingabefeldern)
   m    Nachricht beim Finden          pg Seite, auf der es versteckt ist (für „Spürnase")
   fx   Effekt, den core.js abspielt
   manual  o-Kristall wird NICHT automatisch beim Besuch vergeben (die Seite ruft XIRU.egg selbst auf)
   ------------------------------------------------------------------------- */
XIRU.eggs = [
    // ── Getippte Wörter ──
    { id: 'w-xiru',      w: 'xiru',        n: 'Selbstbewusst',      h: 'Tippe den Namen des Studios.', x: 20, r: 1, m: 'Ja, das sind wir. Hallo!' },
    { id: 'w-floppy',    w: 'floppy',      n: 'Diskettenflüsterer', h: 'Tippe den Namen unseres Launchers.', x: 25, r: 1, m: '1,44 MB pure Nostalgie.', fx: 'floppy' },
    { id: 'w-pixmag',    w: 'pixmag',      n: 'Verbannter Magier',  h: 'Tippe den Namen unseres Dungeon-RPGs.', x: 25, r: 1, m: 'Die Gilde hat dich nicht vergessen.' },
    { id: 'w-hallo',     w: 'hallo',       n: 'Höflich',            h: 'Sag einfach mal Hallo.', x: 10, r: 1, m: 'Hallo zurück! 👋' },
    { id: 'w-gruezi',    w: 'grüezi',      n: 'Eidgenosse',         h: 'Grüss die Website auf Schweizerdeutsch.', x: 20, r: 1, m: 'Grüezi mitenand!' },
    { id: 'w-sudo',      w: 'sudo',        n: 'Möchtegern-Admin',   h: 'Verlange mehr Rechte.', x: 20, r: 1, m: 'Netter Versuch. Dieser Vorfall wird gemeldet. (Nicht wirklich.)' },
    { id: 'w-matrix',    w: 'matrix',      n: 'Die rote Pille',     h: 'Wach auf, Neo.', x: 30, r: 2, m: 'Folge dem weissen Kaninchen.', fx: 'matrix' },
    { id: 'w-kaffee',    w: 'kaffee',      n: 'Koffeinhaltig',      h: 'Was trinken Entwickler?', x: 15, r: 1, m: '☕ Kaffee wird gebrüht … 100 %.' },
    { id: 'w-pizza',     w: 'pizza',       n: 'Entwickler-Nahrung', h: 'Was essen Entwickler um 2 Uhr nachts?', x: 15, r: 1, m: '🍕 Lieferung in 30 Minuten oder sie ist gratis.' },
    { id: 'w-42',        w: '42',          n: 'Die Antwort',        h: 'Die Antwort auf alles.', x: 42, r: 2, m: 'Aber was war nochmal die Frage?' },
    { id: 'w-1337',      w: '1337',        n: 'Elite',              h: 'Sprich wie ein Hacker aus den 90ern.', x: 37, r: 2, m: 'Du bist jetzt offiziell 1337.' },
    { id: 'w-ping',      w: 'ping',        n: 'Netzwerker',         h: 'Prüfe die Verbindung.', x: 10, r: 1, m: 'Pong! (1 ms)' },
    { id: 'w-marco',     w: 'marco',       n: 'Poolspiel',          h: 'Rufe im Schwimmbad.', x: 10, r: 1, m: 'Polo!' },
    { id: 'w-barrel',    w: 'fassrolle',   n: 'Fassrolle',          h: 'Mach eine Fassrolle!', x: 30, r: 2, m: 'Wiiiiiee!', fx: 'roll' },
    { id: 'w-kopf',      w: 'kopfstand',   n: 'Akrobat',            h: 'Stell die Welt auf den Kopf.', x: 30, r: 2, m: 'Die Welt steht kopf.', fx: 'flip' },
    { id: 'w-regen',     w: 'regenbogen',  n: 'Farbenfroh',         h: 'Nach dem Regen kommt …', x: 25, r: 1, m: '🌈', fx: 'rainbow' },
    { id: 'w-disco',     w: 'disco',       n: 'Party!',             h: 'Zeit zu tanzen.', x: 25, r: 1, m: '🪩 Saturday Night Fever!', fx: 'disco' },
    { id: 'w-schnee',    w: 'schnee',      n: 'Winterkind',         h: 'Lass es schneien.', x: 25, r: 1, m: '❄ Es schneit!', fx: 'snow' },
    { id: 'w-beben',     w: 'erdbeben',    n: 'Erschütternd',       h: 'Bring die Seite zum Wackeln.', x: 25, r: 1, m: 'Bitte Ruhe bewahren.', fx: 'shake' },
    { id: 'w-glitch',    w: 'glitch',      n: 'Fehler im System',   h: 'Etwas stimmt mit der Darstellung nicht.', x: 30, r: 2, m: 'Ẃ̷̢a̴̛s̶ ̵w̷a̶r̴ ̶d̷a̵s̴?', fx: 'glitch' },
    { id: 'w-bsod',      w: 'bluescreen',  n: 'Absturz',            h: 'Der gefürchtetste Bildschirm.', x: 30, r: 2, m: 'Keine Sorge, alles noch da.', fx: 'bsod' },
    { id: 'w-katze',     w: 'katze',       n: 'Katzenfreund',       h: 'Das Internet liebt sie.', x: 20, r: 1, m: '/ᐠ｡ꞈ｡ᐟ\\  Miau!', fx: 'cat' },
    { id: 'w-hund',      w: 'hund',        n: 'Hundefreund',        h: 'Der beste Freund des Menschen.', x: 20, r: 1, m: '🐕 Wuff!' },
    { id: 'w-hunter2',   w: 'hunter2',     n: '*******',            h: 'Ein berühmtes Passwort aus dem Internet.', x: 30, r: 2, m: 'Ich sehe nur Sterne: *******' },
    { id: 'w-admin',     w: 'admin',       n: 'Zugang verweigert',  h: 'Versuch es mit dem Standard-Benutzernamen.', x: 15, r: 1, m: 'Admin-Bereich? Den gibt es hier nicht mehr. Oder?' },
    { id: 'w-vim',       w: ':q!',         n: 'Gefangen in Vim',    h: 'Wie verlässt man diesen Editor?', x: 30, r: 2, m: 'Du kommst hier nicht raus. Niemand kommt hier raus.' },
    { id: 'w-xyzzy',     w: 'xyzzy',       n: 'Zauberwort',         h: 'Ein Zauberwort aus einem uralten Textabenteuer.', x: 40, r: 2, m: 'Nichts passiert.' },
    { id: 'w-abra',      w: 'abrakadabra', n: 'Zauberlehrling',     h: 'Das bekannteste Zauberwort.', x: 20, r: 1, m: '✨ Puff! … nichts verschwunden.', fx: 'sparkle' },
    { id: 'w-sesam',     w: 'sesam',       n: 'Sesam, öffne dich',  h: 'Wie öffnet man eine Räuberhöhle?', x: 35, r: 2, m: 'Irgendwo hat sich eine Tür geöffnet … schau ganz nach unten.', fx: 'door' },
    { id: 'w-mael',      w: 'mael',        n: 'Der Chef',           h: 'Tippe den Namen eines Gründers.', x: 20, r: 1, m: 'Chef erkannt. Bitte weiterarbeiten.' },
    { id: 'w-luka',      w: 'luka',        n: 'Der Co-Chef',        h: 'Tippe den Namen des anderen Gründers.', x: 20, r: 1, m: 'Co-Chef erkannt. Die ZIP-Dateien warten.' },
    { id: 'w-ram',       w: 'mehrram',     n: 'RAM-Download',       h: 'Kann man Arbeitsspeicher herunterladen?', x: 25, r: 1, m: 'Lade 16 GB RAM herunter … ███████░░ 87 % … Fehler: RAM ist Hardware.' },
    { id: 'w-fps',       w: 'fps',         n: 'Bildratenfanatiker', h: 'Drei Buchstaben, die Gamer lieben.', x: 15, r: 1, m: 'Das menschliche Auge sieht angeblich nur 24 FPS. Angeblich.' },
    { id: 'w-rgb',       w: 'rgb',         n: 'Leuchtfeuer',        h: 'Mehr Licht = mehr Leistung.', x: 15, r: 1, m: '+15 FPS durch RGB.', fx: 'rainbow' },
    { id: 'w-kekse',     w: 'kekse',       n: 'Keksmonster',        h: 'Jede Website will sie.', x: 20, r: 1, m: 'Wir haben keine Cookies. Nur Krümel im localStorage. 🍪' },
    { id: 'w-418',       w: '418',         n: 'Teekanne',           h: 'Ein HTTP-Statuscode für Teekannen.', x: 30, r: 2, m: '418: Ich bin eine Teekanne. Kaffee gibt es woanders.' },
    { id: 'w-404',       w: '404',         n: 'Nicht gefunden',     h: 'Der bekannteste Fehlercode.', x: 15, r: 1, m: 'Kristall nicht gefunden. Moment … doch!' },
    { id: 'w-007',       w: '007',         n: 'Geheimagent',        h: 'Geschüttelt, nicht gerührt.', x: 20, r: 1, m: 'Diese Nachricht zerstört sich in 5 Sekunden selbst.' },
    { id: 'w-pi',        w: '3141',        n: 'Kreiszahl',          h: 'Die ersten Ziffern einer berühmten Zahl.', x: 31, r: 2, m: 'π ≈ 3,14159 26535 89793 …' },
    { id: 'w-fibo',      w: '112358',      n: 'Fibonacci',          h: 'Jede Zahl ist die Summe der zwei davor.', x: 35, r: 2, m: '1, 1, 2, 3, 5, 8, 13, 21 …' },
    { id: 'w-osterei',   w: 'osterei',     n: 'Meta',               h: 'Suche nach dem, wonach du suchst.', x: 40, r: 2, m: 'Du hast einen Kristall gefunden, indem du „Osterei" getippt hast. Sehr meta.' },
    { id: 'w-fondue',    w: 'fondue',      n: 'Käsekenner',         h: 'Geschmolzener Käse in einem Topf.', x: 15, r: 1, m: '🧀 Wer sein Brot verliert, muss eine Runde zahlen.' },
    { id: 'w-schoggi',   w: 'schoggi',     n: 'Naschkatze',         h: 'Schweizerdeutsch für etwas Süsses.', x: 15, r: 1, m: '🍫 Mmmh.' },
    { id: 'w-dir',       w: 'dir',         n: 'DOS-Veteran',        h: 'Zeig den Inhalt des Verzeichnisses (DOS).', x: 20, r: 1, m: 'A:\\> 1 Datei(en)  1.457.664 Bytes frei' },
    { id: 'w-cls',       w: 'cls',         n: 'Aufräumer',          h: 'Bildschirm leeren (DOS).', x: 20, r: 1, m: 'Bildschirm geleert. Fast.', fx: 'blank' },
    { id: 'w-gg',        w: 'gg',          n: 'Sportsmann',         h: 'Was sagt man nach einem guten Spiel?', x: 10, r: 1, m: 'GG WP!' },
    { id: 'w-warum',     w: 'warum',       n: 'Philosoph',          h: 'Die wichtigste Frage von allen.', x: 15, r: 1, m: 'Warum nicht?' },
    { id: 'w-zeit',      w: 'zeitreise',   n: 'Zeitreisender',      h: 'Reise in die Vergangenheit des Webs.', x: 30, r: 2, m: 'Willkommen im Jahr 1999!', fx: 'retro' },
    { id: 'w-gravity',   w: 'schwerkraft', n: 'Newton',             h: 'Was hält uns am Boden?', x: 35, r: 2, m: 'Alles fällt herunter!', fx: 'gravity' },
    { id: 'w-rueck',     w: 'rückwärts',   n: 'Rückwärtsgang',      h: 'Tippe das Gegenteil von vorwärts.', x: 30, r: 2, m: '!tdnufeg segniD sad tsah uD', fx: 'mirror' },

    // ── Verhalten, Zeit und Ausdauer ──
    { id: 'b-konami',    n: 'Der Code',            h: '↑ ↑ ↓ ↓ ← → ← → B A', x: 75, r: 3, m: 'Ein Licht geht am Horizont an …' },
    { id: 'b-logo',      n: 'Logo-Klicker',        h: 'Klicke oft genug auf das Logo.', x: 20, r: 1, m: 'Hör auf, mich zu drücken!' },
    { id: 'b-floppy',    n: 'Phosphorgrün',        h: 'Halte die Taste F gedrückt und klicke auf das Logo.', x: 40, r: 2, m: 'Design „Floppy-Terminal" freigeschaltet.' },
    { id: 'b-nacht',     n: 'Nachteule',           h: 'Besuche die Website zwischen 0 und 4 Uhr.', x: 40, r: 2, m: 'Solltest du nicht schlafen?' },
    { id: 'b-frueh',     n: 'Frühaufsteher',       h: 'Besuche die Website zwischen 5 und 7 Uhr.', x: 40, r: 2, m: 'Der frühe Vogel fängt den Kristall.' },
    { id: 'b-1337',      n: 'Exakt 13:37',         h: 'Komm um eine sehr elitäre Uhrzeit vorbei.', x: 60, r: 3, m: 'Perfektes Timing.' },
    { id: 'b-mitternacht', n: 'Geisterstunde',     h: 'Sei genau um Mitternacht hier.', x: 60, r: 3, m: '👻 Buh!' },
    { id: 'b-freitag13', n: 'Unglückstag',         h: 'An einem bestimmten Freitag vorbeischauen.', x: 50, r: 3, m: '🐈‍⬛ Eine schwarze Katze läuft über die Seite.' },
    { id: 'b-weihnacht', n: 'Frohe Weihnachten',   h: 'Komm an Weihnachten vorbei.', x: 50, r: 3, m: '🎄 Frohe Weihnachten!', fx: 'snow' },
    { id: 'b-silvester', n: 'Guten Rutsch',        h: 'Zum Jahreswechsel vorbeischauen.', x: 50, r: 3, m: '🎆 Prost Neujahr!', fx: 'confetti' },
    { id: 'b-halloween', n: 'Süsses oder Saures',  h: 'Ende Oktober wird es gruselig.', x: 50, r: 3, m: '🎃 Süsses oder Saures!' },
    { id: 'b-april',     n: 'April, April',        h: 'Am 1. April ist nichts, wie es scheint.', x: 50, r: 3, m: 'April, April!', fx: 'mirror' },
    { id: 'b-geburtstag', n: 'Geburtstagsgast',    h: 'Die Website hat am 5. Oktober Geburtstag.', x: 50, r: 3, m: '🎂 Happy Birthday, Xiruprojekts!', fx: 'confetti' },
    { id: 'b-treue',     n: 'Stammgast',           h: 'Besuche die Website an 7 verschiedenen Tagen.', x: 70, r: 3, m: 'Schön, dass du immer wieder kommst.' },
    { id: 'b-treue30',   n: 'Inventar',            h: 'Besuche die Website an 30 verschiedenen Tagen.', x: 150, r: 4, m: 'Du gehörst praktisch zur Einrichtung.' },
    { id: 'b-marathon',  n: 'Marathon',            h: 'Bleib 30 Minuten am Stück.', x: 50, r: 2, m: 'Vergiss nicht zu trinken!' },
    { id: 'b-idle',      n: 'Eingeschlafen?',      h: 'Tu einfach mal drei Minuten gar nichts.', x: 30, r: 2, m: 'Bist du noch da? 💤' },
    { id: 'b-zurueck',   n: 'Willkommen zurück',   h: 'Wechsle den Tab und komm nach einer Weile wieder.', x: 20, r: 1, m: 'Da bist du ja wieder!' },
    { id: 'b-scroll',    n: 'Scroll-Sturm',        h: 'Scrolle wie ein Wirbelwind.', x: 25, r: 1, m: 'Langsam, langsam!' },
    { id: 'b-rechts',    n: 'Rechtsklicker',       h: 'Klicke zehnmal mit rechts.', x: 20, r: 1, m: 'Hier gibt es nichts zu kopieren. Oder doch?' },
    { id: 'b-titel',     n: 'Überschriftenfan',    h: 'Doppelklicke mehrmals auf eine Hauptüberschrift.', x: 20, r: 1, m: 'Die Überschrift fühlt sich geschmeichelt.' },
    { id: 'b-klein',     n: 'Taschenformat',       h: 'Mach das Fenster richtig schmal.', x: 20, r: 1, m: 'Passt auch in die Hosentasche.' },
    { id: 'b-gross',     n: 'Breitbild',           h: 'Ein sehr, sehr breiter Bildschirm.', x: 30, r: 2, m: 'Wow, wie viele Monitore hast du?' },
    { id: 'b-offline',   n: 'Funkloch',            h: 'Trenne die Internetverbindung.', x: 30, r: 2, m: 'Offline? Kein Problem – fast alles hier läuft lokal.' },
    { id: 'b-drucken',   n: 'Papierfreund',        h: 'Versuche, eine Seite zu drucken.', x: 25, r: 1, m: 'Denk an die Bäume! 🌳' },
    { id: 'b-kopieren',  n: 'Kopierer',            h: 'Kopiere Text von einer Seite.', x: 10, r: 1, m: 'Strg+C, Strg+V – die Grundlage jedes Programmierers.' },
    { id: 'b-konsole',   n: 'Entwickler',          h: 'Öffne die Browser-Konsole und folge den Anweisungen.', x: 40, r: 2, m: 'Ein echter Entwickler!' },
    { id: 'b-konsole2',  n: 'Konsolenflüsterer',   h: 'Die Konsole kennt ein Geheimnis.', x: 60, r: 3, m: 'Du sprichst die Sprache der Maschinen.' },
    { id: 'b-hash',      n: 'URL-Bastler',         h: 'Häng #geheim an eine Adresse.', x: 25, r: 1, m: 'Gute Idee, aber das Geheimnis liegt woanders.' },
    { id: 'b-footer',    n: 'Kleingedrucktes',     h: 'Klicke mehrmals auf das Jahr im Fussbereich.', x: 20, r: 1, m: 'Seit 2026. Für immer jung.' },
    { id: 'b-theme',     n: 'Modeexperte',         h: 'Probiere jedes freigeschaltete Design aus.', x: 30, r: 2, m: 'Du hast Stil.' },
    { id: 'b-regionen',  n: 'Weltenbummler',       h: 'Besuche jede (bekannte) Region mindestens einmal.', x: 50, r: 2, m: 'Du warst schon überall. Fast.' },
    { id: 'b-seiten10',  n: 'Neugierig',           h: 'Entdecke 10 Seiten.', x: 30, r: 1, m: '10 Seiten entdeckt!' },
    { id: 'b-seiten50',  n: 'Forscher',            h: 'Entdecke 50 Seiten.', x: 100, r: 4, m: '50 Seiten entdeckt! +1 Modulpunkt' },
    { id: 'b-seiten100', n: 'Pionier',             h: 'Entdecke 100 Seiten.', x: 200, r: 4, m: '100 Seiten entdeckt! +1 Modulpunkt' },
    { id: 'b-seiten-alle', n: 'Allwissend',        h: 'Entdecke wirklich jede Seite.', x: 500, r: 4, m: 'Es gibt nichts mehr zu entdecken. Wirklich nicht. Glaube ich.' },
    { id: 'b-eier10',    n: 'Sammler',             h: 'Finde 10 Realitätskristalle.', x: 50, r: 2, m: '10 Kristalle funkeln in deiner Sammlung!' },
    { id: 'b-eier50',    n: 'Archivar',            h: 'Finde 50 Realitätskristalle.', x: 150, r: 4, m: '50 Kristalle! Irgendwo beginnt ein Schrein zu leuchten. +1 Modulpunkt' },
    { id: 'b-eier100',   n: 'Bibliothekar',        h: 'Finde 100 Realitätskristalle.', x: 300, r: 4, m: '100 Kristalle! Die Realität bekommt Risse. +1 Modulpunkt' },
    { id: 'b-level5',    n: 'Aufsteiger',          h: 'Erreiche Level 5.', x: 50, r: 2, m: 'Level 5!' },
    { id: 'b-level10',   n: 'Veteran',             h: 'Erreiche Level 10.', x: 100, r: 4, m: 'Level 10! +1 Modulpunkt' },
    { id: 'b-level20',   n: 'Legende',             h: 'Erreiche Level 20.', x: 200, r: 4, m: 'Level 20! +1 Modulpunkt' },
    { id: 'b-konto',     n: 'Angekommen',          h: 'Erstelle ein Konto.', x: 50, r: 1, m: 'Willkommen im Heimathafen!' },
    { id: 'b-skill',     n: 'Erste Fähigkeit',     h: 'Baue dein erstes Modul ein.', x: 30, r: 1, m: 'Der Anfang einer langen Reise.' },
    { id: 'b-ast',       n: 'Meister eines Astes', h: 'Baue alle Module eines Astes ein.', x: 150, r: 4, m: 'Ein ganzer Ast gemeistert! +1 Modulpunkt' },
    { id: 'b-export',    n: 'Datensicherung',      h: 'Exportiere deinen Spielstand.', x: 20, r: 1, m: 'Backup gemacht. Vorbildlich!' },
    { id: 'b-suche-leer', n: 'Nichts gefunden',    h: 'Suche nach etwas, das es nicht gibt.', x: 15, r: 1, m: 'Nichts gefunden – ausser diesem Kristall.' },
    { id: 'b-suche-sinn', n: 'Tiefgründig',        h: 'Suche nach dem Sinn des Lebens.', x: 42, r: 2, m: '42.' },
    { id: 'b-404',       n: 'Verlaufen',           h: 'Verirre dich auf eine Seite, die es nicht gibt.', x: 25, r: 1, m: 'Auch Umwege erweitern die Ortskenntnis.' },

    // ── Auf Seiten versteckt (data-egg) ──
    { id: 'p-hero-pixel',  pg: 'index.html',               n: 'Ein Pixel zu viel',   h: 'Auf der Startseite stimmt ein Pixel nicht.', x: 40, r: 2, m: 'Gut gesehen, Adlerauge!' },
    { id: 'p-ticker',      pg: 'index.html',               n: 'Breaking News',       h: 'Lies die Laufschrift aufmerksam.', x: 25, r: 1, m: 'Eilmeldung: Jemand liest tatsächlich Laufschriften.' },
    { id: 'p-foto',        pg: 'ueber-uns.html',           n: 'Kamerascheu',         h: 'Auf „Über uns" fehlt ein Foto.', x: 20, r: 1, m: 'Das Foto kommt … irgendwann.' },
    { id: 'p-kleingedruckt', pg: 'nutzungsbedingungen.html', n: 'Wer liest das schon?', h: 'Die Nutzungsbedingungen haben einen § 0.', x: 50, r: 3, m: 'Du hast tatsächlich die Nutzungsbedingungen gelesen. Respekt.' },
    { id: 'p-krumen',      pg: 'datenschutz.html',         n: 'Krümelmonster',       h: 'Auf der Datenschutzseite liegen Krümel.', x: 20, r: 1, m: 'Mmmh, localStorage-Krümel.' },
    { id: 'p-seemonster',  pg: 'weltkarte.html',           n: 'Hier sind Drachen',   h: 'Auf der Weltkarte lauert etwas im Meer.', x: 40, r: 2, m: 'Hic sunt dracones!' },
    { id: 'p-wurzel',      pg: 'konto/skilltree.html',     n: 'Wurzelbehandlung',    h: 'Klopf mehrmals an die Wurzel des Baums.', x: 30, r: 2, m: 'Der Baum kichert.' },
    { id: 'p-hilfe',       pg: 'hilfe.html',               n: 'Hilfe zur Hilfe',     h: 'Auch die Hilfe braucht manchmal Hilfe.', x: 20, r: 1, m: 'Hilfe-ception.' },
    { id: 'p-glossar',     pg: 'hardware/glossar.html',    n: 'Fachbegriff',         h: 'Ein Begriff im Glossar ist ein Osterei.', x: 30, r: 2, m: 'Easter Egg (n.): Das, was du gerade gefunden hast.' },
    { id: 'p-diskette',    pg: 'hardware/laufwerke/diskette-3-5.html', n: '1,44 MB',  h: 'Das Datenblatt des wichtigsten Datenträgers der Geschichte.', x: 40, r: 2, m: 'Die Diskette ist das Speichern-Symbol. Respekt.' },
    { id: 'p-1080ti',      pg: 'hardware/gpu/gtx-1080-ti.html', n: 'Legende',        h: 'Eine Grafikkarte, die nie sterben will.', x: 30, r: 2, m: 'Die 1080 Ti läuft und läuft und läuft …' },
    { id: 'p-2600k',       pg: 'hardware/cpu/core-i7-2600k.html', n: 'Sandy forever', h: 'Ein Prozessor von 2011, der Kultstatus hat.', x: 30, r: 2, m: 'Sandy Bridge: übertaktet bis heute im Einsatz.' },
    { id: 'p-rx580',       pg: 'hardware/gpu/rx-580.html', n: 'Budget-König',        h: 'Die beliebteste Budget-Karte ihrer Zeit.', x: 30, r: 2, m: 'Polaris – unkaputtbar.' },
    { id: 'p-zeitleiste',  pg: 'hardware/zeitleiste.html', n: 'Ganz am Anfang',      h: 'Scroll in der Zeitleiste ganz zurück.', x: 30, r: 2, m: '1971: Der Intel 4004 hatte 2300 Transistoren.' },
    { id: 'p-studio',      pg: 'studio/index.html',        n: 'Lieferung',           h: 'Im Studio liegt eine Datei, die keiner herunterlädt.', x: 30, r: 2, m: 'nichts.zip (0 Bytes) – genau so wenig wie erwartet.' },
    { id: 'p-dienste',     pg: 'konto/dienste.html',       n: 'Schlüsselbund',       h: 'Ein Schlüssel passt in kein Schloss.', x: 25, r: 1, m: 'Dieser Schlüssel öffnet … dein Herz. 🗝' },

    // ── Geheime Orte (beim ersten Besuch) ──
    { id: 'o-terminal',   pg: 'geheim/terminal.html',         n: 'A:\\>',             h: 'Ein Techniker findet ein Terminal.', x: 60, r: 3, m: 'Willkommen im Floppy-Terminal.' },
    { id: 'o-keller',     pg: 'geheim/keller.html',           n: 'Kellerkind',        h: 'Unter der Website gibt es einen Keller.', x: 60, r: 3, m: 'Es riecht nach altem Staub und Kabeln.' },
    { id: 'o-archiv',     pg: 'geheim/archiv-1999.html',      n: 'Under Construction', h: 'Ein Zeitreisender findet ein altes Archiv.', x: 60, r: 3, m: 'Willkommen im Jahr 1999!' },
    { id: 'o-leuchtturm', pg: 'geheim/leuchtturm.html',       n: 'Leuchtfeuer',       h: 'Der Code führt zu einem Licht.', x: 80, r: 3, m: 'Das Licht hat dich gefunden.' },
    { id: 'o-server',     pg: 'geheim/serverraum.html',       n: 'Systemadministrator', h: 'Ein Architekt kennt den Serverraum.', x: 80, r: 3, m: 'Pssst. Die Server schlafen.' },
    { id: 'o-void',       pg: 'geheim/void.html',             n: 'Ins Nichts',        h: 'Ein Weltenwanderer kann die Leere betreten.', x: 80, r: 3, m: '…' },
    { id: 'o-runen',      pg: 'geheim/runen.html',            n: 'Runenkundig',       h: 'Ein Runenleser findet eine Kammer.', x: 70, r: 3, m: 'Die Runen leuchten auf.' },
    { id: 'o-turm',       pg: 'geheim/turm.html',             n: 'Turmbesteigung',    h: 'Ganz oben wohnt ein Erzmagier.', x: 100, r: 3, m: 'Die Aussicht ist fantastisch.' },
    { id: 'o-ruhm',       pg: 'geheim/ruhmeshalle.html',      n: 'Verewigt',          h: 'Legenden werden in einer Halle geehrt.', x: 100, r: 3, m: 'Dein Name glänzt in Gold.' },
    { id: 'o-schrein',    pg: 'geheim/kristallschrein.html', manual: true, n: 'Pilgerreise',       h: 'Wer genug Kristalle hat, findet einen Schrein.', x: 100, r: 3, m: 'Der Schrein leuchtet für dich.' },
    { id: 'o-katzen',     pg: 'geheim/katzen.html',           n: 'Katzenzimmer',      h: 'Verirrte finden manchmal Katzen.', x: 50, r: 2, m: 'Du bist umzingelt. Von Katzen.' },
    { id: 'o-rueck',      pg: 'geheim/rueckwaerts.html',      n: 'gnagsgnälkcüR',     h: 'Eine Seite steht spiegelverkehrt.', x: 60, r: 3, m: '.tgiehcsed nehesegfua ednE muz tsah uD' },
    { id: 'o-ende',       pg: 'geheim/ende.html', manual: true, n: 'Das Ende',          h: 'Wer alle Äste meistert, findet das Ende.', x: 500, r: 4, m: 'Das Ende ist erst der Anfang. +1 Modulpunkt' },
    { id: 'o-mitternacht', pg: 'arcade/mitternacht.html',     n: 'Insider',           h: 'Ein Highscore-Jäger kennt ein besonderes Spiel.', x: 60, r: 3, m: 'Willkommen in der Mitternachts-Arcade.' }
];

/* ── Kristalle aus Spielhalle, KI-Labor, Mixer-Studio und Werkzeugen ──────
   Ausgelöst im jeweiligen Seitencode mit XIRU.egg('id').
   ------------------------------------------------------------------------- */
XIRU.eggs.push(
    { id: 'g-snake-30',   pg: 'arcade/snake.html', n: 'Anakonda',      h: 'Werde in Snake 30 Felder lang.', x: 40, r: 2, m: 'Eine stattliche Schlange!' },
    { id: 'g-snake-gold', pg: 'arcade/snake.html', n: 'Goldader',      h: 'Friss in Snake einen goldenen Realitätskristall.', x: 20, r: 1, m: 'Knusprig und funkelnd.' },
    { id: 'g-snake-null', pg: 'arcade/snake.html', n: 'Kurzes Leben',  h: 'Verliere in Snake, ohne etwas gefressen zu haben.', x: 15, r: 1, m: 'Das ging schnell.' },
    { id: 'g-hardware-quiz-gleich', pg: 'arcade/hardware-quiz.html', n: 'Unentschieden', h: 'Erwische in „Höher oder Tiefer" zwei gleiche Werte.', x: 25, r: 2, m: 'Gleich ist auch richtig!' },
    { id: 'g-hardware-quiz-10', pg: 'arcade/hardware-quiz.html', n: 'Datenblatt-Kenner', h: 'Schaffe eine Serie von 10.', x: 40, r: 2, m: 'Du kennst dich aus!' },
    { id: 'g-hardware-quiz-25', pg: 'arcade/hardware-quiz.html', n: 'Wandelndes Archiv', h: 'Schaffe eine Serie von 25.', x: 80, r: 3, m: 'Hast du das Archiv auswendig gelernt?' },
    { id: 'hw-generationen', pg: 'hardware/vergleich.html', n: 'Generationenvertrag', h: 'Vergleiche die älteste mit der neuesten NVIDIA-Legende.', x: 30, r: 2, m: '1080 Ti gegen 5090 – acht Jahre in einer Tabelle.' },
    { id: 'hw-kraftwerk', pg: 'hardware/netzteil-rechner.html', n: 'Kraftwerk', h: 'Bau im Netzteil-Rechner ein System mit über 1000 W.', x: 30, r: 2, m: 'Bitte den Energieversorger informieren.' },
    { id: 'hw-balance', pg: 'hardware/balance.html', n: 'Gleichgewicht', h: 'Finde eine ausgewogene Kombination im Balance-Check.', x: 20, r: 1, m: 'Perfekte Harmonie.' },
    { id: 'hw-zeitkapsel', pg: 'hardware/balance.html', n: 'Zeitkapsel', h: 'Kombiniere den ältesten Prozessor mit der neuesten Grafikkarte.', x: 35, r: 2, m: 'Die 5090 langweilt sich ein bisschen.' },
    { id: 'hw-zeitreise-pc', pg: 'hardware/builds.html', n: 'Museumskurator', h: 'Schau dir den nostalgischsten Beispiel-Build an.', x: 25, r: 1, m: 'Mit Diskettenlaufwerk, selbstverständlich.' },
    { id: 'hw-traumbau', pg: 'hardware/konfigurator.html', n: 'Traumbau', h: 'Stell im Konfigurator einen PC für über 4000 CHF zusammen – und zwar einen, bei dem alles zusammenpasst.', x: 30, r: 2, m: 'Dafür müsste das Sparschwein ganz schön bluten.' },
    { id: 'hw-gewalt', pg: 'hardware/sockel.html', n: 'Mit Gewalt', h: 'Versuche, einen Oldtimer auf ein modernes Board zu setzen.', x: 20, r: 1, m: 'Mit genug Kraft passt alles. Nicht.' },
    { id: 'm-tutorial',    pg: 'konto/skilltree.html', n: 'Stapellauf',      h: 'Bau deinen ersten Mech in der Werft.', x: 50, r: 2, m: 'Er bewegt sich! Mehr oder weniger.' },
    { id: 'm-erste-reise', pg: 'konto/skilltree.html', n: 'Leinen los',      h: 'Erreiche mit dem Mech eine neue Insel.', x: 30, r: 1, m: 'Land in Sicht!' },
    { id: 'm-reparatur',   pg: 'konto/skilltree.html', n: 'Schrauberherz',   h: 'Repariere ein beschädigtes Bauteil.', x: 20, r: 1, m: 'Wie neu. Fast.' },
    { id: 'm-kaputt',      pg: 'konto/skilltree.html', n: 'Totalschaden',    h: 'Fahr ein Bauteil komplett zu Schrott.', x: 25, r: 2, m: 'Das war mal ein Antrieb.' },
    { id: 'm-vollausbau',  pg: 'konto/skilltree.html', n: 'Vollausstattung', h: 'Belege alle acht Bauplätze des Mechs.', x: 60, r: 3, m: 'Ein richtiger Mech!' },
    { id: 'm-beine',       pg: 'konto/skilltree.html', n: 'Mech-Pilot',      h: 'Gib deinem Mech echte Beine.', x: 80, r: 3, m: 'STAMPF. STAMPF. STAMPF.' },
    { id: 'm-alle-inseln', pg: 'weltkarte.html',       n: 'Kartenmacher',    h: 'Erreiche jede Insel der bekannten Welt.', x: 200, r: 4, m: 'Die bekannte Welt gehört dir. Aber was liegt im Nebel? +1 Modulpunkt' }
    ,
    /* Spielhalle */
    { id: 'g-2048-kilobyte',   pg: 'arcade/2048.html', n: 'Ein Kilobyte', h: 'Bau in 2048 eine Kachel mit 1024.', x: 30, r: 2, m: '1024 – ein echtes Kilobyte. Fast.' },
    { id: 'g-2048-2048',       pg: 'arcade/2048.html', n: 'Namensgeber', h: 'Erreiche in 2048 die namensgebende Kachel.', x: 60, r: 3, m: 'Jetzt darfst du das Spiel offiziell so nennen.' },
    { id: 'g-2048-zeitreise',  pg: 'arcade/2048.html', n: 'Zeitreisender', h: 'Game Over in 2048? Vielleicht lässt sich die Zeit zurückdrehen …', x: 15, r: 1, m: 'Nichts passiert. Niemand hat es gesehen.' },
    { id: 'g-asteroiden-10k',  pg: 'arcade/asteroiden.html', n: 'Steinbrecher', h: 'Hol in Asteroiden 10’000 Punkte.', x: 40, r: 2, m: 'Der Gürtel ist ein bisschen leerer.' },
    { id: 'g-asteroiden-hyper', pg: 'arcade/asteroiden.html', n: 'Notausgang', h: 'Rette dich in Asteroiden im allerletzten Moment.', x: 25, r: 1, m: 'Puh. Das war knapp.' },
    { id: 'g-asteroiden-eigen', pg: 'arcade/asteroiden.html', n: 'Das All ist rund', h: 'Was passiert, wenn ein Schuss einmal ganz herumfliegt?', x: 30, r: 2, m: 'Friendly Fire, aber friendly.' },
    { id: 'g-bloecke-pirouette', pg: 'arcade/bloecke.html', n: 'Pirouette', h: 'Dreh einen Block in Blöcke ungewöhnlich oft.', x: 15, r: 1, m: 'Ihm ist jetzt schwindlig.' },
    { id: 'g-bloecke-vier',    pg: 'arcade/bloecke.html', n: 'Vierfach', h: 'Räume in Blöcke vier Reihen auf einmal ab.', x: 30, r: 2, m: 'Der klassische Volltreffer.' },
    { id: 'g-bloecke-leer',    pg: 'arcade/bloecke.html', n: 'Tabula rasa', h: 'Hinterlasse in Blöcke ein komplett leeres Feld.', x: 60, r: 3, m: 'Alles weg. Wunderschön.' },
    { id: 'g-codeknacker-1234', pg: 'arcade/codeknacker.html', n: 'Sicherheitsexperte', h: 'Probier in Codeknacker den beliebtesten Code der Welt.', x: 10, r: 1, m: '1-2-3-4? Das hat bestimmt noch nie jemand versucht.' },
    { id: 'g-codeknacker-vier', pg: 'arcade/codeknacker.html', n: 'Gedankenleser', h: 'Knack einen Code in höchstens vier Versuchen.', x: 35, r: 2, m: 'Hast du gespickt?' },
    { id: 'g-codeknacker-profi', pg: 'arcade/codeknacker.html', n: 'Panzerknacker', h: 'Gewinne Codeknacker im schwersten Modus.', x: 50, r: 3, m: 'Kein Tresor ist vor dir sicher.' },
    { id: 'g-dungeon-geheim',  pg: 'arcade/dungeon.html', n: 'Verbotene Seite', h: 'Kombiniere im Dungeon zwei Elemente, die eigentlich nicht zusammengehören.', x: 40, r: 2, m: 'Das stand so in keinem Lehrbuch.' },
    { id: 'g-dungeon-buch',    pg: 'arcade/dungeon.html', n: 'Vollständiges Zauberbuch', h: 'Finde im Dungeon jede Zauber-Kombination.', x: 80, r: 3, m: 'Kein Kapitel fehlt mehr.' },
    { id: 'g-dungeon-archiv',  pg: 'arcade/dungeon.html', n: 'Tief im Archiv', h: 'Zwischen alten Datenträgern im Dungeon pulsiert etwas …', x: 50, r: 3, m: 'Er war die ganze Zeit hier unten.' },
    { id: 'g-dungeon-drache',  pg: 'arcade/dungeon.html', n: 'Drachentöter', h: 'Besiege den Drachen tief unten im Dungeon.', x: 100, r: 3, m: 'Ignifax ist gefallen. Die Glut verlischt.' },
    { id: 'g-dungeon-knapp',   pg: 'arcade/dungeon.html', n: 'Am seidenen Faden', h: 'Überlebe im Dungeon mit genau einem Lebenspunkt.', x: 20, r: 1, m: 'Ein Punkt reicht völlig.' },
    { id: 'g-dungeon-ausverkauf', pg: 'arcade/dungeon.html', n: 'Ausverkauf', h: 'Bring einen gewissen Händler im Dungeon um sein ganzes Geld.', x: 30, r: 2, m: 'Krummfinger wird das nie vergessen.' },
    { id: 'g-farbfolge-12',    pg: 'arcade/farbfolge.html', n: 'Elefantengedächtnis', h: 'Merk dir in Farbfolge zwölf Töne am Stück.', x: 30, r: 2, m: 'Zwölf! Ohne Notizzettel!' },
    { id: 'g-farbfolge-profi', pg: 'arcade/farbfolge.html', n: 'Dirigent', h: 'Schaffe zehn Töne im Profi-Modus von Farbfolge.', x: 45, r: 2, m: 'Bravo, Maestro.' },
    { id: 'g-farbfolge-entchen', pg: 'arcade/farbfolge.html', n: 'Alle meine …', h: 'Spiel im Profi-Modus von Farbfolge ein bekanntes Kinderlied an.', x: 30, r: 2, m: '… Entchen schwimmen auf dem See!' },
    { id: 'g-floppy-flug-25',  pg: 'arcade/floppy-flug.html', n: 'Langstreckenflug', h: 'Fliege in Floppy-Flug durch 25 Hindernisse.', x: 35, r: 2, m: 'Diese Diskette hat Flügel.' },
    { id: 'g-floppy-flug-byte', pg: 'arcade/floppy-flug.html', n: 'Ein ganzes Byte', h: 'Sammle in Floppy-Flug acht Bits.', x: 15, r: 1, m: '8 Bit = 1 Byte. Jetzt passt ein Buchstabe drauf.' },
    { id: 'g-floppy-flug-schutz', pg: 'arcade/floppy-flug.html', n: 'Schreibschutz', h: 'Jede Diskette hat so einen kleinen Schieber … auch in Floppy-Flug.', x: 15, r: 1, m: 'Klick. Jetzt ist sie sicher.' },
    { id: 'g-frosch-fliege',   pg: 'arcade/frosch.html', n: 'Leckerbissen', h: 'Schnapp dir in Frosch die Fliege in einer Bucht.', x: 20, r: 1, m: 'Mjam. Knusprig.' },
    { id: 'g-frosch-knapp',    pg: 'arcade/frosch.html', n: 'Last Minute', h: 'Komm in Frosch mit fast abgelaufener Zeit nach Hause.', x: 20, r: 1, m: 'Knapper geht nicht.' },
    { id: 'g-frosch-level3',   pg: 'arcade/frosch.html', n: 'Strassenprofi', h: 'Erreiche in Frosch das dritte Level.', x: 35, r: 2, m: 'Die Autos haben Respekt vor dir.' },
    { id: 'g-invaders-welle5', pg: 'arcade/invaders.html', n: 'Fünfte Welle', h: 'Halte in Invaders bis zur fünften Welle durch.', x: 35, r: 2, m: 'Sie hören einfach nicht auf.' },
    { id: 'g-invaders-ufo300', pg: 'arcade/invaders.html', n: 'Jackpot-UFO', h: 'Hol aus dem UFO in Invaders die Höchstpunktzahl.', x: 30, r: 2, m: '300! Wer hat da gezählt?' },
    { id: 'g-invaders-eigentor', pg: 'arcade/invaders.html', n: 'Eigentor', h: 'Zerleg in Invaders deinen eigenen Schutzbunker.', x: 15, r: 1, m: 'Die Invasoren bedanken sich.' },
    { id: 'g-klicker-million', pg: 'arcade/klicker.html', n: 'Kristallmillionär', h: 'Erzeuge im Klicker insgesamt eine Million.', x: 60, r: 3, m: 'Eine Million! Und alles von Hand. Fast.' },
    { id: 'g-klicker-krampf',  pg: 'arcade/klicker.html', n: 'Fingerkrampf', h: 'Klick im Klicker unmenschlich schnell.', x: 20, r: 1, m: 'Bitte die Hand kurz ausschütteln.' },
    { id: 'g-klicker-gold',    pg: 'arcade/klicker.html', n: 'Goldrausch', h: 'Erwische im Klicker etwas Goldenes.', x: 20, r: 1, m: 'Glänzt. Sehr gut.' },
    { id: 'g-klicker-format',  pg: 'arcade/klicker.html', n: 'Neu formatiert', h: 'Fang im Klicker freiwillig wieder von vorne an.', x: 40, r: 2, m: 'Alles weg – aber stärker als vorher.' },
    { id: 'g-lichter-stromrechnung', pg: 'arcade/lichter.html', n: 'Stromrechnung', h: 'Schalte in Lichter wirklich jedes Licht an.', x: 15, r: 1, m: 'Das Ziel war eigentlich das Gegenteil.' },
    { id: 'g-lichter-perfekt', pg: 'arcade/lichter.html', n: 'Lichtgestalt', h: 'Löse in Lichter zehn Level mit drei Sternen.', x: 45, r: 2, m: 'So effizient wie eine LED.' },
    { id: 'g-lichter-alle',    pg: 'arcade/lichter.html', n: 'Lichterkette', h: 'Löse jedes Level in Lichter.', x: 70, r: 3, m: 'Alles dunkel. Endlich.' },
    { id: 'g-minen-profi',     pg: 'arcade/minen.html', n: 'Minenräumer', h: 'Gewinne Minen auf der Profi-Stufe.', x: 60, r: 3, m: 'Ruhige Hände, klarer Kopf.' },
    { id: 'g-minen-flaggenlos', pg: 'arcade/minen.html', n: 'Ohne Fahne', h: 'Gewinne Minen ohne eine einzige Flagge – aber nicht auf der leichtesten Stufe.', x: 40, r: 2, m: 'Wer braucht schon Flaggen?' },
    { id: 'g-minen-xyzzy',     pg: 'arcade/minen.html', n: 'Alter Trick', h: 'Ein uraltes Zauberwort verrät in Minen mehr, als es sollte.', x: 25, r: 2, m: 'Ein Pixel in der Ecke weiss Bescheid.' },
    { id: 'g-nonogramm-kreuz', pg: 'arcade/nonogramm.html', n: 'Kreuzweise', h: 'Kreuze in Nonogramm einfach jedes Feld an.', x: 10, r: 1, m: 'Auch eine Lösung. Keine richtige.' },
    { id: 'g-nonogramm-kristall', pg: 'arcade/nonogramm.html', n: 'Selbstporträt', h: 'Eines der Bilder in Nonogramm kommt dir bekannt vor.', x: 25, r: 1, m: 'Ein Kristall, der einen Kristall malt.' },
    { id: 'g-nonogramm-alle',  pg: 'arcade/nonogramm.html', n: 'Pixel-Archivar', h: 'Löse jedes Bild in Nonogramm.', x: 80, r: 3, m: 'Die ganze Galerie ist aufgedeckt.' },
    { id: 'g-pc-bauer-museum', pg: 'arcade/pc-bauer.html', n: 'Sandy Bridge forever', h: 'Bau im PC-Bauer mit einer ganz bestimmten alten Legende von Prozessor.', x: 15, r: 1, m: 'Der 2600K läuft und läuft und läuft.' },
    { id: 'g-pc-bauer-punktlandung', pg: 'arcade/pc-bauer.html', n: 'Punktlandung', h: 'Schöpf im PC-Bauer das Budget fast vollständig aus.', x: 30, r: 2, m: 'Kein Rappen verschwendet.' },
    { id: 'g-pc-bauer-sparfuchs', pg: 'arcade/pc-bauer.html', n: 'Sparfuchs', h: 'Erfülle einen Auftrag im PC-Bauer mit höchstens halbem Budget.', x: 30, r: 2, m: 'Der Kunde wundert sich. Positiv.' },
    { id: 'g-pc-bauer-meister', pg: 'arcade/pc-bauer.html', n: 'Werkstattmeister', h: 'Hol im PC-Bauer in einer Schicht 3000 Punkte.', x: 60, r: 3, m: 'Deine Werkstatt hat jetzt einen Ruf.' },
    { id: 'g-pong-rally',      pg: 'arcade/pong.html', n: 'Endlos-Ballwechsel', h: 'Spiel in Pong einen Ballwechsel mit 30 Treffern.', x: 30, r: 2, m: 'Ping. Pong. Ping. Pong …' },
    { id: 'g-pong-schwer',     pg: 'arcade/pong.html', n: 'CPU-Bezwinger', h: 'Schlag in Pong die stärkste CPU.', x: 50, r: 3, m: 'Die CPU läuft jetzt heiss.' },
    { id: 'g-pong-perfekt',    pg: 'arcade/pong.html', n: 'Zu null', h: 'Gewinne in Pong ohne Gegenpunkt – nicht gegen die leichteste CPU.', x: 40, r: 2, m: 'Die CPU hat den Ball kaum gesehen.' },
    { id: 'g-reaktion-ungeduld', pg: 'arcade/reaktion.html', n: 'Ungeduld', h: 'Im Reaktionstest kann man auch zu schnell sein. Mehrmals.', x: 10, r: 1, m: 'Abwarten und Tee trinken.' },
    { id: 'g-reaktion-schnecke', pg: 'arcade/reaktion.html', n: 'Schnecke', h: 'Lass dir im Reaktionstest richtig viel Zeit.', x: 10, r: 1, m: 'Über eine Sekunde? Alles gut bei dir?' },
    { id: 'g-reaktion-blitz',  pg: 'arcade/reaktion.html', n: 'Blitzreflex', h: 'Schaffe im Reaktionstest einen Schnitt unter 220 ms.', x: 45, r: 2, m: 'Schneller als dein Monitor.' },
    { id: 'g-reversi-ecken',   pg: 'arcade/reversi.html', n: 'Eckensteher', h: 'Besetze in Reversi alle vier Ecken.', x: 30, r: 2, m: 'Ecken sind Gold wert.' },
    { id: 'g-reversi-schwer',  pg: 'arcade/reversi.html', n: 'Grossmeister', h: 'Gewinne Reversi auf der schwersten Stufe.', x: 50, r: 3, m: 'Schwarz auf Weiss: du bist besser.' },
    { id: 'g-reversi-knapp',   pg: 'arcade/reversi.html', n: 'Fotofinish', h: 'Gewinne Reversi mit dem kleinstmöglichen Vorsprung.', x: 25, r: 1, m: 'Zwei Steine. Mehr braucht es nicht.' },
    { id: 'g-schiebepuzzle-5x5', pg: 'arcade/schiebepuzzle.html', n: 'Grossformat', h: 'Löse das grösste Schiebepuzzle.', x: 45, r: 2, m: '24 Teile, alle am richtigen Platz.' },
    { id: 'g-schiebepuzzle-blitz', pg: 'arcade/schiebepuzzle.html', n: 'Schnellschieber', h: 'Löse das kleine Schiebepuzzle in unter 30 Sekunden.', x: 30, r: 2, m: 'Wusch, wusch, fertig.' },
    { id: 'g-schiebepuzzle-loyd', pg: 'arcade/schiebepuzzle.html', n: 'Sam Loyds Streich', h: 'Ein historischer Modus im Schiebepuzzle hat einen Haken. Bleib lange genug dran.', x: 30, r: 2, m: '14 und 15 vertauschen? Unmöglich. Seit 1880.' },
    { id: 'g-stapel-perfekt',  pg: 'arcade/stapel.html', n: 'Millimeterarbeit', h: 'Setze in Stapel fünf Blöcke hintereinander perfekt.', x: 30, r: 2, m: 'Kein Millimeter daneben.' },
    { id: 'g-stapel-25',       pg: 'arcade/stapel.html', n: 'Hochhaus', h: 'Stapel 25 Blöcke aufeinander.', x: 40, r: 2, m: 'Die Aussicht ist fantastisch.' },
    { id: 'g-stapel-pisa',     pg: 'arcade/stapel.html', n: 'Pisa', h: 'Bau in Stapel einen hohen, aber auffällig schiefen Turm.', x: 30, r: 2, m: 'Steht trotzdem. Irgendwie.' },
    { id: 'g-sudoku-chaos',    pg: 'arcade/sudoku.html', n: 'Kreatives Chaos', h: 'Produziere im Sudoku ganz viele Konflikte auf einmal.', x: 10, r: 1, m: 'So rot war das Raster noch nie.' },
    { id: 'g-sudoku-schwer',   pg: 'arcade/sudoku.html', n: 'Zahlenmagier', h: 'Löse ein schweres Sudoku ganz ohne Hinweise.', x: 60, r: 3, m: 'Kein einziger Tipp. Respekt.' },
    { id: 'g-sudoku-blitz',    pg: 'arcade/sudoku.html', n: 'Fingerübung', h: 'Löse ein leichtes Sudoku ohne Hinweise in unter fünf Minuten.', x: 30, r: 2, m: 'Das war ja fast zu einfach.' },
    { id: 'g-tictactoe-doppel', pg: 'arcade/tictactoe.html', n: 'Doppelschlag', h: 'Gewinne Tic-Tac-Toe mit zwei Linien gleichzeitig.', x: 20, r: 1, m: 'Zwei Fliegen, eine Klappe.' },
    { id: 'g-tictactoe-ultimate', pg: 'arcade/tictactoe.html', n: 'Ultimativ', h: 'Schlag die schwere CPU im grossen Tic-Tac-Toe.', x: 50, r: 3, m: 'Neun Bretter, ein Sieger: du.' },
    { id: 'g-tictactoe-patt',  pg: 'arcade/tictactoe.html', n: 'Ewiges Patt', h: 'Spiel gegen die schwere CPU dreimal hintereinander unentschieden.', x: 25, r: 1, m: 'Seltsames Spiel. Der einzige Gewinnzug ist, nicht zu spielen.' },
    { id: 'g-tower-defense-mutig', pg: 'arcade/tower-defense.html', n: 'Tollkühn', h: 'Überstehe die erste Welle in Tower Defense ganz ohne Türme.', x: 25, r: 2, m: 'Mutig. Oder einfach vergessen?' },
    { id: 'g-tower-defense-voll', pg: 'arcade/tower-defense.html', n: 'Voll ausgebaut', h: 'Rüste in Tower Defense einen Turm auf die höchste Stufe.', x: 20, r: 1, m: 'Maximale Feuerkraft.' },
    { id: 'g-tower-defense-kette', pg: 'arcade/tower-defense.html', n: 'Kettenreaktion', h: 'Triff in Tower Defense mit einem einzigen Blitz sehr viele Gegner.', x: 35, r: 2, m: 'Zzzzzap!' },
    { id: 'g-tower-defense-sieg', pg: 'arcade/tower-defense.html', n: 'Festung', h: 'Überstehe in Tower Defense alle Wellen.', x: 60, r: 3, m: 'Nichts kommt durch.' },
    { id: 'g-vier-gewinnt-fuenf', pg: 'arcade/vier-gewinnt.html', n: 'Fünf gewinnt', h: 'Vier sind gut. Schaffst du mehr in einer Reihe?', x: 30, r: 2, m: 'Fünf in einer Reihe! Angeberei.' },
    { id: 'g-vier-gewinnt-voll', pg: 'arcade/vier-gewinnt.html', n: 'Volles Haus', h: 'Füll bei Vier gewinnt das ganze Brett, ohne dass jemand gewinnt.', x: 20, r: 1, m: '42 Steine und kein Sieger.' },
    { id: 'g-vier-gewinnt-schwer', pg: 'arcade/vier-gewinnt.html', n: 'Taktiker', h: 'Schlag die schwere CPU in Vier gewinnt.', x: 50, r: 3, m: 'Die CPU rechnet noch nach.' },
    { id: 'g-woertle-hilfe',   pg: 'arcade/woertle.html', n: 'Hilferuf', h: 'Wenn du in Wörtle nicht weiterweisst, sag es doch einfach.', x: 10, r: 1, m: 'Hilfe gibt’s leider nicht. Aber einen Kristall.' },
    { id: 'g-woertle-zwei',    pg: 'arcade/woertle.html', n: 'Hellseher', h: 'Errate das Wörtle in höchstens zwei Versuchen.', x: 40, r: 2, m: 'Wie hast du das gemacht?' },
    { id: 'g-woertle-serie',   pg: 'arcade/woertle.html', n: 'Wortserie', h: 'Gewinne Wörtle fünfmal hintereinander.', x: 45, r: 2, m: 'Fünf Wörter, fünf Treffer.' },
    { id: 'g-ziegel-abriss',   pg: 'arcade/ziegel.html', n: 'Abrissunternehmen', h: 'Erreiche in Ziegel das fünfte Level.', x: 35, r: 2, m: 'Keine Mauer hält dich auf.' },
    { id: 'g-ziegel-durchbruch', pg: 'arcade/ziegel.html', n: 'Durchbruch', h: 'Triff in Ziegel zehn Steine, ohne dass der Ball den Schläger berührt.', x: 30, r: 2, m: 'Der Ball hat sich selbstständig gemacht.' },
    { id: 'g-ziegel-flut',     pg: 'arcade/ziegel.html', n: 'Ballflut', h: 'Hab in Ziegel ganz viele Bälle gleichzeitig im Spiel.', x: 30, r: 2, m: 'Wer soll da noch den Überblick behalten?' },
    /* Geheim: Terminal */
    { id: 'h-terminal-format', pg: 'geheim/terminal.html', n: 'Treue Diskette', h: 'Versuch im Terminal, eine Diskette zu formatieren.', x: 25, r: 1, m: 'Sie hängt an dir.' },
    { id: 'h-terminal-raten',  pg: 'geheim/terminal.html', n: 'Glückstreffer', h: 'Das Terminal hat ein kleines Ratespiel eingebaut.', x: 20, r: 1, m: 'RICHTIG!' },
    { id: 'h-terminal-versteckt', pg: 'geheim/terminal.html', n: 'Sektor null', h: 'Nicht jede Datei im Terminal zeigt sich beim normalen Auflisten.', x: 40, r: 2, m: 'Versteckte Dateien sind die besten.' },
    /* KI-Labor */
    { id: 'k-labor-ueberkocht', pg: 'ki/index.html', n: 'Übergekocht', h: 'Schüttle im KI-Labor etwas zu heftig.', x: 15, r: 1, m: 'Bumm. Das Labor braucht einen Lappen.' },
    { id: 'k-abenteuer-xyzzy', pg: 'ki/abenteuer.html', n: 'Magisches Wort', h: 'Textabenteuer kennen seit 1976 ein bestimmtes Zauberwort.', x: 25, r: 1, m: 'Nichts passiert. Wie damals.' },
    { id: 'k-abenteuer-sieg',  pg: 'ki/abenteuer.html', n: 'Held der Geschichte', h: 'Bring ein Textabenteuer zu einem guten Ende.', x: 50, r: 3, m: 'Und wenn sie nicht gestorben sind …' },
    { id: 'k-taverne-prost',   pg: 'ki/taverne.html', n: 'Prost!', h: 'In der Taverne gehört es sich, anzustossen.', x: 15, r: 1, m: 'Zum Wohl!' },
    { id: 'k-taverne-runde',   pg: 'ki/taverne.html', n: 'Stammgast', h: 'Sprich in der Taverne mit allen Gästen.', x: 40, r: 2, m: 'Jetzt kennt dich hier jeder.' },
    /* Mixer */
    { id: 'x-elf',             pg: 'mixer/index.html', n: 'Eins lauter', h: 'Im Mixer-Studio geht ein Regler weiter als bis zehn.', x: 30, r: 2, m: 'Diese hier gehen bis elf.' },
    { id: 'x-klang-alle',      pg: 'mixer/klang.html', n: 'Klangteppich', h: 'Lass im Klangmixer wirklich jeden Kanal gleichzeitig laufen.', x: 25, r: 1, m: 'Ein ganzer Wald voller Geräusche.' },
    { id: 'x-klang-schlaf',    pg: 'mixer/klang.html', n: 'Eingeschlafen', h: 'Lass den Schlaf-Timer im Klangmixer ablaufen.', x: 30, r: 2, m: 'Gute Nacht!' },
    { id: 'x-klang-blitz',     pg: 'mixer/klang.html', n: 'Blitzfänger', h: 'Wenn es im Klangmixer gewittert: schnell sein!', x: 30, r: 2, m: 'Gefangen! Und kein bisschen elektrisiert.' },
    { id: 'x-produzent',       pg: 'mixer/musik.html', n: 'Produzent', h: 'Exportiere im Musik-Studio deinen ersten eigenen Song als Datei.', x: 35, r: 2, m: 'Dein erster Track ist im Kasten!' },
    /* Werkzeuge */
    { id: 't-einheiten-floppy', pg: 'werkzeuge/einheiten.html', n: '1,44 „MB“', h: 'Rechne im Einheiten-Umrechner die Kapazität eines bekannten Datenträgers um.', x: 20, r: 1, m: 'Weder MB noch MiB – ein Mischwesen.' },
    { id: 't-einheiten-nullpunkt', pg: 'werkzeuge/einheiten.html', n: 'Absoluter Nullpunkt', h: 'Wie kalt geht es eigentlich im Einheiten-Umrechner?', x: 20, r: 1, m: 'Kälter geht nicht.' },
    { id: 't-passwort-256',    pg: 'werkzeuge/passwort.html', n: 'Quantensicher', h: 'Erzeuge ein Passwort mit mindestens 256 Bit Stärke.', x: 25, r: 1, m: 'Das knackt niemand. Auch nicht in 1000 Jahren.' },
    { id: 't-passwort-klassiker', pg: 'werkzeuge/passwort.html', n: 'Ein Klassiker', h: 'Prüf ein Passwort, das du besser nie benutzen solltest.', x: 15, r: 1, m: 'Das steht auf jeder Liste der schlechtesten Passwörter.' },
    { id: 't-werkzeuge-hammer', pg: 'werkzeuge/index.html', n: 'Der Hammer', h: 'Such im Werkzeugkasten nach dem einfachsten Werkzeug von allen.', x: 15, r: 1, m: 'Wenn du einen Hammer hast, sieht alles aus wie ein Nagel.' },
    { id: 't-werkzeuge-alle',  pg: 'werkzeuge/index.html', n: 'Werkzeugmeister', h: 'Probier jedes Werkzeug im Werkzeugkasten aus.', x: 50, r: 3, m: 'Der Kasten ist komplett.' },
    { id: 'b-tour',       pg: 'index.html',  n: 'Fremdenführer',   h: 'Lass dir von der Startseite die Welt zeigen.', x: 15, r: 1, m: 'Jetzt kennst du dich aus. Fast.' },
    /* Code-Bibliothek */
    { id: 'k-code-tutor', pg: 'ki/code-tutor.html',       n: 'Nachhilfe',        h: 'Lass dir vom Code-Tutor etwas erklären.', x: 20, r: 1, m: 'Fragen ist der schnellste Weg zum Können.' },
    { id: 'c-lektion',    pg: 'hardware/code/index.html', n: 'Hallo Welt',       h: 'Schliess in der Code-Bibliothek eine Lektion ab.', x: 20, r: 1, m: 'Jede Programmiererin, jeder Programmierer hat so angefangen.' },
    { id: 'c-cheatsheet', pg: 'hardware/code/index.html', n: 'Spickzettel',      h: 'Nimm dir ein Cheat-Sheet mit nach Hause.', x: 25, r: 1, m: 'Erlaubter Spickzettel. Der beste.' },
    { id: 'c-kurs',       pg: 'hardware/code/index.html', n: 'Absolvent',        h: 'Bring einen ganzen Kurs zu Ende.', x: 80, r: 2, m: 'Zertifikat? Gibt es nicht. Aber Respekt.' },
    /* Welt & Mech */
    { id: 'm-handel',     pg: 'welt/markt.html',    n: 'Pfeffersack',      h: 'Schliess in der Händlerbucht einen Handel ab.', x: 20, r: 1, m: 'Die Händler kennen jetzt dein Gesicht.' },
    { id: 'm-schmied',    pg: 'welt/schmiede.html', n: 'Funkenflug',       h: 'Werte in der Funkenschmiede ein Teil auf.', x: 25, r: 1, m: 'Klonk. Klonk. Besser.' },
    { id: 'm-arena',      pg: 'welt/arena.html',    n: 'Erster Sieg',      h: 'Gewinne einen Kampf in der Schrott-Arena.', x: 40, r: 2, m: 'Die Menge tobt (alle drei Zuschauer).' },
    { id: 'm-champion',   pg: 'welt/arena.html',    n: 'Arena-Champion',   h: 'Besiege den Champion der Schrott-Arena.', x: 200, r: 4, m: 'Dein Name steht jetzt auf dem Pokal.' },
    { id: 'm-taucher',    pg: 'welt/wrack.html',    n: 'Schatztaucher',    h: 'Hol im Wrackriff einen Schatz an die Oberfläche.', x: 25, r: 1, m: 'Blubb.' },
    { id: 'm-bergbau',    pg: 'welt/mine.html',     n: 'Glück auf!',       h: 'Bring eine Schicht in der Nebelmine zu Ende.', x: 25, r: 1, m: 'Die Lore ist voll.' },
    { id: 'm-legendaer',  pg: 'konto/skilltree.html', n: 'Goldglanz',      h: 'Besitze ein legendäres Bauteil.', x: 60, r: 3, m: 'Es leuchtet golden in der Werft.' },
    { id: 'm-mythisch',   pg: 'konto/skilltree.html', n: 'Mythos',         h: 'Besitze ein mythisches Bauteil.', x: 120, r: 3, m: 'Manche sagen, es sei nur eine Legende.' },
    { id: 'm-weltreise',  pg: 'weltkarte.html',     n: 'Weltreisende:r',   h: 'Besuche mit dem Mech jede Insel – auch die Spiel-Inseln.', x: 100, r: 3, m: 'Sektaria hat keine Geheimnisse mehr vor dir. Fast.' },
    { id: 'm-flaschenpost', pg: 'weltkarte.html',   n: 'Flaschenpost',     h: 'Fisch unterwegs eine Flaschenpost aus dem Meer.', x: 20, r: 1, m: 'Jemand da draussen denkt an dich.' },
    { id: 'm-bauplan',    pg: 'weltkarte.html',     n: 'Blaupause',        h: 'Finde auf einer Insel einen verschollenen Bauplan.', x: 30, r: 1, m: 'Vergilbt, voller Kaffeeflecken – und unbezahlbar.' },
    { id: 'm-bauplaene',  pg: 'konto/skilltree.html', n: 'Chefkonstrukteur:in', h: 'Sammle jeden Bauplan von Sektaria.', x: 200, r: 4, m: 'Die Werft hat jetzt ein Archiv, um das sie jede Insel beneidet.' },
    { id: 'm-presse',     pg: 'konto/skilltree.html', n: 'Unter Druck',    h: 'Press in der Werft Schrott zu Material.', x: 15, r: 1, m: 'Krrrrk. Ein Zahnrad. Schön.' },
    { id: 'm-glueck',     pg: 'welt/markt.html',    n: 'Glückspilz?',      h: 'Öffne bei Lucky Joe eine Wunderkiste.', x: 20, r: 1, m: 'Joe zwinkert. Das Haus gewinnt immer. Meistens.' },
    { id: 'm-jackpot',    pg: 'welt/markt.html',    n: 'Jackpot!',         h: 'Knack bei Lucky Joe den Jackpot.', x: 80, r: 3, m: 'Joe wird blass. Dann lacht er. Dann wird er wieder blass.' },
    { id: 'm-angler',     pg: 'weltkarte.html',     n: 'Petri Heil',       h: 'Fang deinen ersten Fisch.', x: 20, r: 1, m: 'Er zappelt. Du jubelst. Alle sind glücklich (ausser dem Fisch).' },
    { id: 'm-abart',      pg: 'weltkarte.html',     n: 'Das ist kein Fisch', h: 'Zieh eine Abart aus dem Nebel an Land.', x: 60, r: 3, m: 'Er flimmert. Er blinzelt. Mit zu vielen Augen.' },
    { id: 'm-leviathan',  pg: 'weltkarte.html',     n: 'Ein sehr kleiner Gott', h: 'Fang die Leviathan-Larve.', x: 150, r: 4, m: 'Flossie wird sie nicht kaufen wollen. Oder doch?' },
    { id: 'b-kristallharfe', pg: 'konto/sammlung.html', n: 'Kristallharfe', h: 'Spiel auf deinem Weltkristall eine kleine Melodie.', x: 30, r: 2, m: 'Die Splitter singen mit.' },
    { id: 'm-fischbuch',  pg: 'welt/markt.html',    n: 'Ichthyologe',      h: 'Füll Flossies Sammelbuch mit allen Fischarten.', x: 120, r: 3, m: 'Flossie schenkt dir ein feuchtes Händeschütteln.' },
    // ── Mnemora: Arche, Gehäuse, Strassen ──
    { id: 'm-arche',         pg: 'welt/arche.html', n: 'Kiel gelegt',      h: 'Bau den ersten Abschnitt der Arche.', x: 40, r: 2, m: 'Zwei Serverschränke, ein Plan und sehr viele Schweissnähte.' },
    { id: 'm-arche-crew',    pg: 'welt/arche.html', n: 'Alle an Bord',     h: 'Hol die ganze Besatzung auf die Arche.', x: 80, r: 3, m: 'Von jedem Händler einer. Noah wäre stolz.' },
    { id: 'm-mnemora',       pg: 'mnemora.html',    n: 'Land in Sicht',    h: 'Setz mit der Arche nach Mnemora über.', x: 150, r: 3, m: 'Hinter der Nebelwand gibt es also doch noch etwas.' },
    { id: 'm-gehaeuse',      pg: 'mnemora.html',    n: 'Neues Gehäuse',    h: 'Bau in der Feldwerkstatt ein eigenes Gehäuse.', x: 40, r: 2, m: 'Passt nicht rein? Dann eben ein grösseres Gehäuse.' },
    { id: 'm-steckkarte',    pg: 'mnemora.html',    n: 'Plug & Play',      h: 'Steck eine Karte in ein Gehäuse.', x: 20, r: 1, m: 'Klick. Neue Hardware gefunden.' },
    { id: 'm-strasse',       pg: 'mnemora.html',    n: 'Freie Fahrt',      h: 'Kämpfe auf Mnemora eine Strasse frei.', x: 50, r: 2, m: 'Die Strasse ist frei. Die Gegner sind es nicht mehr.' },
    { id: 'm-alle-strassen', pg: 'mnemora.html',    n: 'Alle Wege führen nach Registra', h: 'Mach jede Strasse auf Mnemora frei.', x: 150, r: 3, m: 'Jetzt kennst du jeden Schleichweg.' },
    { id: 'm-gc',            pg: 'mnemora.html',    n: 'Speicher freigegeben', h: 'Besiege den Endgegner in den Ruinen von Alt-ROM.', x: 300, r: 4, m: 'Was niemand mehr braucht, darf jetzt trotzdem bleiben.' }
    /* EGGS:ENDE */
);
