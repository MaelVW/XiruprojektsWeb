/* ==========================================================================
   Mnemora – das Festland hinter der Nebelwand
   (nach core.js, mech-art.js, weltkarte-art.js, pixel-icons.js und werft.js laden)

   Der Weg dorthin: Im Heimathafen wird die ARCHE gebaut (welt/arche.html) – sehr teuer, mit Händlern
   an Bord. Auf Mnemora (mnemora.html) kommt man mit Seemechs nicht weit: Man braucht GEHÄUSE (Bauarten
   für Land) und STECKKARTEN (Erweiterungskarten, die in die Steckplätze eines Gehäuses kommen).
   Strasse für Strasse wird freigekämpft; jeder neue Ort bringt Baupläne.

   Zustand in XIRU.mech.state().mnemora (wird mit dem Spielstand gesichert und synchronisiert):
     ark { Bauabschnitt: Zeit }, crew { Person: Zeit }, arrived (Zeit), at (Ort), seen { Ort: Zeit },
     roads { Strasse: besiegte Gegner }, bpc / bpk { Gehäuse- bzw. Karten-Bauplan: Zeit },
     casings [ { u, id, c (Zustand 0–100), k: [Karten-u …] } ], cards [ { u, id } ], active (u), intro (0–3), boss (Zeit)
     Online/MMO: party (Trupp-Kennung), wb { key: Woche, last, hits, dmg, claimed }, fx [verarbeitete Nachrichten], tk [abgeschlossene Tausche], dr { Geist: Tag }

   XIRU.mnemora – Daten (TERRAIN, CASINGS, CARDS, PLACES, ROADS, STAGES, CREW) und Logik, siehe unten.
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, M = X.mech, esc = X.esc;
    const PX = (n, s) => X.pix ? X.pix.svg(n, s || 16) : '';

    /* ── Gelände ── */
    const TERRAIN = {
        strand: { n: 'Strand & Dünen', i: 'tr-strand' },
        ebene:  { n: 'Ebene',          i: 'tr-ebene' },
        wald:   { n: 'Wald',           i: 'tr-wald' },
        furt:   { n: 'Fluss & Furt',   i: 'tr-furt' },
        sumpf:  { n: 'Moor',           i: 'tr-sumpf' },
        berg:   { n: 'Gebirge',        i: 'tr-berg' },
        schnee: { n: 'Frost',          i: 'tr-schnee' },
        asche:  { n: 'Aschefeld',      i: 'tr-asche' },
        steppe: { n: 'Steppe',         i: 'tr-steppe' }
    };

    /* ── Gehäuse: Bauarten für das Festland (PC-Gehäuseformen) ──
       slots = Steckplätze für Karten, terr = Gelände, base = Kampfwerte, lo = Aussehen (Teile aus Sektaria) */
    const CASINGS = [
        { id: 'gh-itx', n: 'Mini-ITX-Läufer', t: 1, slots: 2, terr: ['strand', 'ebene', 'wald'], base: { hp: 48, atk: 5, def: 1, spd: 4, en: 4 },
          cost: { scrap: 120, mats: { zahnrad: 8, kabel: 6 } }, d: 'Ein Mini-ITX-Gehäuse auf zwei flinken Beinen. Klein, leicht, neugierig – kommt über Sand, Wiesen und Waldwege.',
          lo: { rahmen: ['r-alu', 2], antrieb: ['a-beine', 1], kern: ['k-solar', 1], sensor: ['s-antenne', 1], waffe: ['f-nagel', 1] } },
        { id: 'gh-tower', n: 'Big-Tower-Raupe', t: 2, slots: 4, terr: ['strand', 'ebene', 'sumpf', 'steppe', 'asche'], base: { hp: 78, atk: 5, def: 4, spd: 1, en: 4 },
          cost: { scrap: 320, mats: { zahnrad: 20, oel: 16, erz: 6 } }, d: 'Ein Big-Tower auf breiten Ketten. Langsam, schwer, unbeirrbar – walzt durch Moor, Steppe und heisse Asche.',
          lo: { rahmen: ['r-titan', 2], antrieb: ['a-raupe', 2], kern: ['k-cd', 1], panzer: ['p-tower', 2], waffe: ['f-bohr', 1] } },
        { id: 'gh-laptop', n: 'Laptop-Gleiter', t: 2, slots: 3, terr: ['strand', 'ebene', 'furt', 'sumpf', 'schnee'], base: { hp: 42, atk: 5, def: 1, spd: 6, en: 6 },
          cost: { scrap: 280, mats: { platine: 12, chip: 4, erz: 6 } }, d: 'Ein aufgeklappter Laptop, der auf seinem Lüfterkissen schwebt. Gleitet über Flüsse, Moor und Schnee.',
          lo: { rahmen: ['r-carbon', 2], antrieb: ['a-hover', 2], kern: ['k-diskette', 2], sensor: ['s-radar', 2], waffe: ['f-laser', 1] } },
        { id: 'gh-rack', n: 'Rack-Spinne', t: 3, slots: 5, terr: ['ebene', 'wald', 'berg', 'schnee'], base: { hp: 62, atk: 6, def: 3, spd: 3, en: 5 },
          cost: { scrap: 460, mats: { zahnrad: 24, chip: 8, erz: 12 } }, d: 'Ein 19-Zoll-Serverrack auf sechs Beinen. Klettert jeden Pass hinauf und hat Platz für viele Karten.',
          lo: { rahmen: ['r-titan', 3], antrieb: ['a-beine', 3], kern: ['k-cd', 3], arm: ['w-greifer', 3], sensor: ['s-hdd', 2], waffe: ['f-tesla', 2] } },
        { id: 'gh-konsole', n: 'Konsolen-Schlitten', t: 3, slots: 3, terr: ['schnee', 'ebene', 'strand', 'asche'], base: { hp: 58, atk: 7, def: 2, spd: 5, en: 5 },
          cost: { scrap: 420, mats: { platine: 16, chip: 8, erz: 10 } }, d: 'Eine Spielkonsole auf Kufen. Schnell auf Eis und Asche, und die Kühlung hat sie schon eingebaut.',
          lo: { rahmen: ['r-kristall', 3], antrieb: ['a-raupe', 3], kern: ['k-kristall', 2], zubehoer: ['z-laterne', 3], waffe: ['f-laser', 3] } },
        { id: 'gh-beige', n: 'Beige-Koloss', t: 4, slots: 6, terr: ['strand', 'ebene', 'wald', 'sumpf', 'steppe', 'asche', 'schnee'], base: { hp: 110, atk: 9, def: 6, spd: 1, en: 6 },
          cost: { scrap: 900, mats: { chip: 20, splitter: 10, nebelkern: 2, erz: 30 } }, d: 'Ein beiger Desktop-Rechner aus der Zeit, als Gehäuse noch für die Ewigkeit gebaut wurden. Riesig. Unzerstörbar. Brummt.',
          lo: { rahmen: ['r-obsidian', 4], antrieb: ['a-raupe', 4], kern: ['k-fusion', 3], panzer: ['p-kristall', 4], arm: ['w-nano', 3], waffe: ['f-klinge', 4], sensor: ['s-prisma', 3] } }
    ];
    /* ── Steckkarten: Erweiterungskarten für die Steckplätze (w = Breite in Plätzen) ──
       fx: hp, atk, def, spd, en, crit, rep (besseres Flicken), regen (Selbstreparatur je Runde); terr: zusätzliches Gelände */
    const CARDS = [
        { id: 'kt-gpu',     n: 'Grafikkarte',              w: 2, t: 1, fx: { atk: 3, crit: 4 },                  cost: { scrap: 60,  mats: { platine: 3, chip: 1 } }, d: 'Berechnet Zielbahnen mit 60 Bildern pro Sekunde.' },
        { id: 'kt-psu',     n: 'Zusatznetzteil',           w: 1, t: 1, fx: { en: 2, hp: 6 },                     cost: { scrap: 40,  mats: { kabel: 4, zahnrad: 2 } }, d: 'Mehr Watt für alles. Summt ein bisschen.' },
        { id: 'kt-raid',    n: 'RAID-Controller',          w: 1, t: 1, fx: { def: 2, hp: 8 },                    cost: { scrap: 50,  mats: { platine: 2, kabel: 3 } }, d: 'Alles doppelt gespeichert – auch die Panzerung.' },
        { id: 'kt-netz',    n: 'Netzwerkkarte',            w: 1, t: 1, fx: { spd: 2, en: 1 },                    cost: { scrap: 50,  mats: { kabel: 5, platine: 1 } }, d: 'Reagiert, bevor der Gegner fertig gedacht hat.' },
        { id: 'kt-sound',   n: 'Soundkarte',               w: 1, t: 2, fx: { crit: 10, atk: 1 },                 cost: { scrap: 80,  mats: { platine: 3, chip: 2 } }, d: 'Hört Schwachstellen knacken, bevor sie brechen.' },
        { id: 'kt-kletter', n: 'Kletterhaken-BIOS',        w: 1, t: 2, fx: {}, terr: ['berg'],                   cost: { scrap: 90,  mats: { zahnrad: 6, chip: 2, erz: 3 } }, d: 'Ein BIOS-Update, das Haken, Seile und Mut freischaltet. Jedes Gehäuse kommt damit ins Gebirge.' },
        { id: 'kt-schwimm', n: 'Schwimmkörper-Firmware',   w: 1, t: 2, fx: {}, terr: ['furt'],                   cost: { scrap: 80,  mats: { oel: 6, platine: 2, erz: 2 } }, d: 'Bläst Luftkissen auf. Jedes Gehäuse kommt damit über Flüsse.' },
        { id: 'kt-ketten',  n: 'Schneeketten-Treiber',     w: 1, t: 2, fx: { def: 1 }, terr: ['schnee'],         cost: { scrap: 80,  mats: { zahnrad: 6, kabel: 4, erz: 2 } }, d: 'Plug & Play für Eis und Schnee.' },
        { id: 'kt-kuehl',   n: 'Wasserkühlung',            w: 2, t: 2, fx: { def: 1, en: 1 }, terr: ['asche'],   cost: { scrap: 110, mats: { oel: 8, platine: 3, erz: 3 } }, d: 'Hält jedes Gehäuse kühl – sogar im Aschefeld.' },
        { id: 'kt-hotfix',  n: 'Hotfix-Karte',             w: 1, t: 3, fx: { regen: .05, rep: .3 },              cost: { scrap: 140, mats: { chip: 4, splitter: 1, erz: 4 } }, d: 'Spielt nach jeder Runde einen kleinen Patch ein und flickt besser.' },
        { id: 'kt-ecc',     n: 'ECC-Speicherwächter',      w: 1, t: 3, fx: { def: 3, hp: 14 },                   cost: { scrap: 160, mats: { chip: 5, platine: 4, erz: 5 } }, d: 'Korrigiert jeden Fehler – auch Dellen im Blech.' },
        { id: 'kt-rtx',     n: 'Raytracing-Beschleuniger', w: 2, t: 3, fx: { atk: 6, crit: 8 },                  cost: { scrap: 220, mats: { chip: 8, splitter: 2, erz: 6 } }, d: 'Verfolgt jeden Lichtstrahl – und jeden Gegner.' },
        { id: 'kt-quanten', n: 'Quantenkarte',             w: 2, t: 4, fx: { atk: 5, spd: 2, en: 3, crit: 6 },   cost: { scrap: 380, mats: { chip: 12, splitter: 4, nebelkern: 1, erz: 10 } }, d: 'Ist gleichzeitig eingesteckt und nicht. Wirkt trotzdem.' }
    ];
    const casingMap = {}, cardMap = {};
    CASINGS.forEach(c => { casingMap[c.id] = c; });
    CARDS.forEach(c => { cardMap[c.id] = c; });

    /* ── Orte (gleiche Lage wie auf der Weltkarte) und Strassen ── */
    const KIND_ICON = { hafen: 'ic-arche', wacht: 'tr-strand', stadt: 'z-kompass', wald: 'tr-wald', berg: 'tr-berg', see: 'tr-furt', steppe: 'tr-steppe', ruine: 'tr-asche', kap: 'tr-schnee', moor: 'tr-sumpf' };
    const EXTRA = {
        port:     { kind: 'hafen', reward: {} },
        duenen:   { n: 'Dünenwacht', x: 3335, y: 1185, kind: 'wacht', d: 'Ein alter Wachturm zwischen den Dünen. Von oben sieht man bis zur Nebelwand.', reward: { cards: ['kt-raid'], erz: 3, taler: 60 } },
        registra: { kind: 'stadt', reward: { casings: ['gh-tower'], cards: ['kt-netz'], erz: 4, taler: 150 } },
        cache:    { kind: 'wald', reward: { casings: ['gh-laptop'], cards: ['kt-sound'], erz: 4 } },
        bitbrunn: { kind: 'see', reward: { cards: ['kt-kletter', 'kt-schwimm'], erz: 5 } },
        moor:     { n: 'Fragmentmoor', x: 3745, y: 1985, kind: 'moor', d: 'Ein Moor aus halb gelöschten Erinnerungen. Wer hier stehen bleibt, vergisst, wohin er wollte.', reward: { cards: ['kt-kuehl', 'kt-hotfix'], erz: 6 } },
        frostkap: { kind: 'kap', reward: { casings: ['gh-konsole'], cards: ['kt-ketten'], erz: 6, splitter: 2 } },
        speicher: { kind: 'berg', reward: { casings: ['gh-rack'], cards: ['kt-ecc'], erz: 10 } },
        kernel:   { kind: 'berg', reward: { cards: ['kt-rtx'], erz: 12, splitter: 4 } },
        cluster:  { kind: 'steppe', reward: { casings: ['gh-beige'], cards: ['kt-quanten'], erz: 10 } },
        altrom:   { kind: 'ruine', reward: { erz: 15, taler: 400 } }
    };
    const FEST = (X.mapArt && X.mapArt.FESTLAND && X.mapArt.FESTLAND.PLACES) || [];
    const PLACES = Object.keys(EXTRA).map(id => Object.assign({ id }, FEST.find(p => p.id === id) || {}, EXTRA[id]));
    const placeMap = {};
    PLACES.forEach(p => { placeMap[p.id] = p; });
    /* lvl = Gefahrenstufe, foes = Anzahl Gegner bis die Strasse frei ist, f = weiblich (die Waldschneise) */
    const ROADS = [
        { id: 's1',  a: 'port',     b: 'duenen',   terr: 'strand', lvl: .7,  foes: 2, n: 'Küstenpfad' },
        { id: 's2',  a: 'duenen',   b: 'registra', terr: 'ebene',  lvl: 1.6, foes: 2, n: 'Weizenweg' },
        { id: 's3',  a: 'duenen',   b: 'cache',    terr: 'wald',   lvl: 2.2, foes: 2, n: 'Waldschneise', f: 1 },
        { id: 's4',  a: 'registra', b: 'bitbrunn', terr: 'furt',   lvl: 3,   foes: 2, n: 'Flashfurt', f: 1 },
        { id: 's5',  a: 'cache',    b: 'frostkap', terr: 'schnee', lvl: 3.6, foes: 3, n: 'Frostweg' },
        { id: 's6',  a: 'bitbrunn', b: 'moor',     terr: 'sumpf',  lvl: 4,   foes: 3, n: 'Moorpfad' },
        { id: 's7',  a: 'registra', b: 'speicher', terr: 'berg',   lvl: 4.8, foes: 3, n: 'Speicherpass' },
        { id: 's8',  a: 'cache',    b: 'kernel',   terr: 'berg',   lvl: 5.2, foes: 3, n: 'Gipfelsteig' },
        { id: 's9',  a: 'frostkap', b: 'kernel',   terr: 'schnee', lvl: 5.6, foes: 2, n: 'Eisgrat' },
        { id: 's10', a: 'speicher', b: 'cluster',  terr: 'steppe', lvl: 6,   foes: 3, n: 'Clusterweg' },
        { id: 's11', a: 'moor',     b: 'altrom',   terr: 'asche',  lvl: 6.8, foes: 3, n: 'Ascheschneise', f: 1 },
        { id: 's12', a: 'cluster',  b: 'altrom',   terr: 'steppe', lvl: 7,   foes: 3, n: 'Steppenpfad' }
    ];
    const roadMap = {};
    ROADS.forEach(r => { roadMap[r.id] = r; });

    /* ── Gegner je Gelände (Aussehen aus Sektaria-Teilen, Stärke aus der Stufe) ── */
    const FOES = {
        strand: [
            { n: 'Dünen-Daemon', d: 'Ein Hintergrundprozess, der sich im Sand eingegraben hat.', p: ['r-schrott', 'a-raupe', 'k-batterie', 'f-nagel'] },
            { n: 'Strandgut-Sammler', d: 'Sammelt alles, was angespült wird – auch Mechs.', p: ['r-alu', 'a-paddel', 'w-greifer', 'f-loet'] },
            { n: 'Sandwurm-Treiber', d: 'Ein Treiber, den niemand installiert hat. Windet sich durch die Dünen.', p: ['r-carbon', 'a-raupe', 'p-blech', 'f-bohr'] }],
        ebene: [
            { n: 'Wegezoll-Bot', d: 'Verlangt für jeden Schritt eine Gebühr in Bytes.', p: ['r-alu', 'a-beine', 'p-blech', 'f-loet', 's-antenne'] },
            { n: 'Vogelscheuchen-Skript', d: 'Steht still. Bis es das nicht mehr tut.', p: ['r-schrott', 'a-beine', 'z-laterne', 'f-nagel'] },
            { n: 'Pflug-Prozess', d: 'Pflügt die Felder um – und alles, was im Weg steht.', p: ['r-titan', 'a-raupe', 'w-bohrer', 'f-bohr'] }],
        wald: [
            { n: 'Cache-Bandit', d: 'Merkt sich jeden Reisenden. Und was er dabeihat.', p: ['r-carbon', 'a-beine', 's-radar', 'f-laser'] },
            { n: 'Moosiger Watchdog', d: 'Bellt bei jeder Bewegung. Beisst auch.', p: ['r-schrott', 'a-raupe', 'p-ram', 'f-bohr'] },
            { n: 'Wurzel-Rootkit', d: 'Hat sich tief in den Waldboden eingenistet.', p: ['r-titan', 'a-beine', 'w-greifer', 'f-tesla'] }],
        furt: [
            { n: 'Fährmann-Bot', d: 'Nimmt dich mit – für einen Preis, den du nicht zahlen willst.', p: ['r-alu', 'a-schraube', 'z-anker', 'f-loet'] },
            { n: 'Strudel-Thread', d: 'Dreht sich endlos im Kreis. Wer ihn stört, wird mitgerissen.', p: ['r-carbon', 'a-hover', 's-sonar', 'f-tesla'] },
            { n: 'Treibholz-Golem', d: 'Zusammengespült aus Ästen, Kabeln und alten Mäusen.', p: ['r-schrott', 'a-paddel', 'p-tower', 'f-bohr'] }],
        sumpf: [
            { n: 'Speicherleck', d: 'Wird mit jeder Minute grösser.', p: ['r-kristall', 'a-hover', 'k-kristall', 'f-tesla'] },
            { n: 'Moor-Zombieprozess', d: 'Längst beendet, aber nie abgeräumt.', p: ['r-schrott', 'a-beine', 'p-ram', 'f-bohr'] },
            { n: 'Irrlicht-Cursor', d: 'Blinkt verlockend und führt dich tiefer ins Moor.', p: ['r-carbon', 'a-duesen', 's-prisma', 'f-laser'] }],
        berg: [
            { n: 'Passwächter', d: 'Lässt nur durch, wer das Passwort kennt. Niemand kennt es.', p: ['r-titan', 'a-beine', 'p-tower', 'f-klinge'] },
            { n: 'Steinschlag-Scheduler', d: 'Plant Felsstürze auf die Millisekunde genau.', p: ['r-obsidian', 'a-raupe', 'w-bohrer', 'f-bohr'] },
            { n: 'Gratfalke', d: 'Ein Drohnenfalke mit Rotoren aus alten Lüftern.', p: ['r-carbon', 'a-duesen', 's-auge', 'f-laser'] }],
        schnee: [
            { n: 'Frostdaemon', d: 'Friert jeden Prozess ein, der ihm zu nahe kommt.', p: ['r-kristall', 'a-hover', 'p-schild', 'f-tesla'] },
            { n: 'Eiszapfen-Index', d: 'Sortiert Eiszapfen nach Grösse. Und Gegner nach Schwäche.', p: ['r-kristall', 'a-beine', 's-prisma', 'f-klinge'] },
            { n: 'Schneeblind-Bot', d: 'Sieht nichts, schlägt trotzdem.', p: ['r-titan', 'a-raupe', 'p-kristall', 'f-bohr'] }],
        asche: [
            { n: 'Brandmauer', d: 'Eine wandelnde Firewall. Lässt nichts durch, schon gar nicht dich.', p: ['r-obsidian', 'a-raupe', 'p-schild', 'f-klinge'] },
            { n: 'Kernel-Panik', d: 'Glüht, zittert und schlägt wild um sich.', p: ['r-obsidian', 'a-duesen', 'k-fusion', 'f-tesla'] },
            { n: 'Russwurm', d: 'Frisst sich durch die Asche und hinterlässt nur Rauch.', p: ['r-schrott', 'a-raupe', 'p-tower', 'f-bohr'] }],
        steppe: [
            { n: 'Botnetz-Reiter', d: 'Reitet in Rudeln. Wo einer ist, sind tausend.', p: ['r-alu', 'a-beine', 's-hdd', 'f-laser'] },
            { n: 'Herde wilder Mäuse', d: 'Computermäuse, verwildert. Sie klicken bedrohlich.', p: ['r-schrott', 'a-raupe', 'w-nano', 'f-nagel'] },
            { n: 'Windhosen-Loop', d: 'Ein Wirbelsturm, der immer wieder von vorn beginnt.', p: ['r-kristall', 'a-hover', 'z-kompass', 'f-tesla'] }]
    };
    const BOSS = { n: 'Der Garbage Collector', d: 'Räumt alles weg, was niemand mehr braucht. Auch dich, wenn du nicht aufpasst.', p: ['r-obsidian', 'a-raupe', 'k-fusion', 'p-kristall', 'w-nano', 'f-klinge', 's-auge'], lvl: 9, boss: true };
    /* ── Weltbosse (Online): jede Woche einer, alle Reisenden kämpfen gemeinsam gegen dieselben Lebenspunkte ── */
    const WORLD = [
        { id: 'titan',  n: 'Bluescreen-Titan', place: 'registra', terr: 'ebene',  d: 'Ein Riese aus blauem Licht. Wo er hintritt, stürzt alles ab.', p: ['r-titan', 'a-beine', 'k-fusion', 'p-tower', 'f-tesla', 's-auge'] },
        { id: 'wal',    n: 'Der Cache-Wal',    place: 'bitbrunn', terr: 'furt',   d: 'Schwimmt durch den Bitbrunn und verschluckt alles, was er sich merken kann.', p: ['r-carbon', 'a-schraube', 'k-kristall', 'p-schild', 'f-bohr', 's-sonar'] },
        { id: 'hydra',  n: 'Die Thread-Hydra', place: 'moor',     terr: 'sumpf',  d: 'Schlägt man einen Thread ab, starten zwei neue.', p: ['r-kristall', 'a-hover', 'k-kristall', 'w-nano', 'f-laser', 's-prisma'] },
        { id: 'yeti',   n: 'Der Kaltstart-Yeti', place: 'frostkap', terr: 'schnee', d: 'Braucht ewig zum Hochfahren. Danach hält ihn nichts mehr auf.', p: ['r-kristall', 'a-raupe', 'k-cd', 'p-kristall', 'f-klinge', 'z-laterne'] },
        { id: 'drache', n: 'Der Defrag-Drache', place: 'speicher', terr: 'berg',  d: 'Sortiert die Speicherberge neu – Block für Block, und dich gleich mit.', p: ['r-obsidian', 'a-duesen', 'k-fusion', 'p-kristall', 'f-klinge', 's-auge'] }
    ];
    const WB_HP = 15000, WB_ROUNDS = 6, WB_COOLDOWN = 2 * 3600e3;

    /* ── Die Arche ── */
    const STAGES = [
        { id: 'kiel',     n: 'Kiel aus Serverschränken', d: 'Zwei liegende 42-HE-Racks, Ende an Ende verschweisst – das Rückgrat der Arche.', cost: { scrap: 350, mats: { zahnrad: 30, oel: 20 }, taler: 0 } },
        { id: 'rumpf',    n: 'Rumpf aus Gehäuseblech',   d: 'Hunderte Seitenteile alter Tower, überlappend genietet wie Fischschuppen.', cost: { scrap: 700, mats: { zahnrad: 40, platine: 20, oel: 30 }, taler: 400 } },
        { id: 'laderaum', n: 'Laderaum',                 d: 'Für alles, was mit soll: Material, Werkzeug, Proviant – und die ganze Feldwerkstatt.', cost: { scrap: 500, mats: { kabel: 60, platine: 15 }, taler: 300 } },
        { id: 'deck',     n: 'Händlerdeck',              d: 'Kajüten mit Schaufenstern für die Händler aus der Bucht. Ein bisschen wie Noahs Arche, nur mit Preisschildern.', cost: { scrap: 600, mats: { platine: 25, chip: 12 }, taler: 1200 } },
        { id: 'schraube', n: 'Doppelte Schiffsschraube', d: 'Zwei riesige Gehäuselüfter, rückwärts eingebaut. Schieben die Arche durch jede Welle.', cost: { scrap: 800, mats: { zahnrad: 50, chip: 20, kabel: 60 }, taler: 800 } },
        { id: 'bug',      n: 'Nebelbrecher am Bug',      d: 'Ein Sporn aus Kristallsplittern, der die Nebelwand teilt. Ohne ihn findet niemand nach Mnemora.', cost: { scrap: 400, mats: { splitter: 20, nebelkern: 5, chip: 10 }, taler: 2500 } }
    ];
    /* Besatzung: Kapitän Otto muss mit, dazu mindestens CREW_MIN weitere. Jede Person bringt auf Mnemora etwas mit (perk). */
    const CREW = [
        { id: 'otto',    n: 'Kapitän Otto',       i: 'npc-otto',    need: { stage: 'kiel' }, perk: 'Steuert die Arche. Ohne ihn legt sie nicht ab.', say: '„Eine Arche? Durch die Nebelwand? Ich hab auf so was gewartet, seit ich denken kann.“' },
        { id: 'basar',   n: 'Händlerin Rubina',   i: 'taler',       need: { taler: 600 }, perk: 'Eröffnet im Lager auf Mnemora einen Basar für Material und Erz.', say: '„600 Taler Standgebühr, und ich bin dabei. Neue Kundschaft!“' },
        { id: 'flossie', n: 'Fischerin Flossie',  i: 'npc-flossie', need: { fish: 10 }, perk: 'Fischsuppe: Nach jedem Sieg flickt sich dein Gehäuse um 8 %.', say: '„Zehn Fische für meine Kühltruhe, dann komm ich mit.“' },
        { id: 'joe',     n: 'Lucky Joe',          i: 'npc-joe',     need: { joe: 10, taler: 300 }, perk: 'Fundkisten mit Steckkarten im Lager.', say: '„Zehn Kisten hast du bei mir geöffnet? Dann zahl noch meine Spielschulden, und wir sind Partner.“' },
        { id: 'kiesel',  n: 'Bergfrau Kiesel',    i: 'npc-kiesel',  need: { mats: { splitter: 10, nebelkern: 2 } }, perk: 'Erzschmelze im Lager: Speichererz aus Schrott.', say: '„Ein Land voller Erz, sagst du? Bring mir Proviant für den Stollen, und ich packe.“' },
        { id: 'bolzen',  n: 'Ringsprecher Bolzen', i: 'npc-bolzen', need: { arena: 4 }, perk: 'Kampftraining: +1 Angriff für alle Gehäuse.', say: '„Ich komme nur mit Leuten mit, die in meinem Ring mindestens Rang 4 geschafft haben.“' },
        { id: 'esse',    n: 'Schmied Esse',       i: 'npc-esse',    need: { mats: { zahnrad: 25, oel: 15 }, taler: 200 }, perk: 'Repariert Gehäuse 30 % günstiger.', say: '„Ohne Werkzeug bin ich nichts. Pack mir Zahnräder und Öl ein.“' }
    ];
    const CREW_MIN = 4;
    const PROVIANT = { fish: 15, oel: 25 };
    const stageMap = {}, crewMap = {};
    STAGES.forEach(s => { stageMap[s.id] = s; });
    CREW.forEach(c => { crewMap[c.id] = c; });

    /* ── Zustand ── */
    let uidSeq = 0;
    const newUid = () => 'm' + Date.now().toString(36).slice(-5) + (uidSeq++).toString(36) + Math.random().toString(36).slice(2, 4);
    function st() {
        const m = M.state();
        let s = m.mnemora;
        if (!s || typeof s !== 'object' || Array.isArray(s)) s = m.mnemora = {};
        ['ark', 'crew', 'seen', 'roads', 'bpc', 'bpk'].forEach(k => { if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {}; });
        if (!Array.isArray(s.casings)) s.casings = [];
        if (!Array.isArray(s.cards)) s.cards = [];
        s.casings = s.casings.filter(c => c && casingMap[c.id]);
        s.cards = s.cards.filter(c => c && cardMap[c.id]);
        s.casings.forEach(c => { if (!Array.isArray(c.k)) c.k = []; c.c = X.clamp(+c.c || 0, 0, 100); });
        if (!placeMap[s.at]) s.at = 'port';
        s.intro = +s.intro || 0;
        return s;
    }
    const save = () => { X.persist(); };
    const fishTotal = () => Object.values(M.fishes()).reduce((a, n) => a + (+n || 0), 0);
    /* Fische abgeben (günstigste zuerst) */
    function takeFish(n) {
        const own = M.fishes(), list = Object.keys(own).sort((a, b) => ((M.fishInfo(a) || {}).v || 0) - ((M.fishInfo(b) || {}).v || 0));
        for (const id of list) { if (n <= 0) break; const k = Math.min(n, own[id]); M.addFish(id, -k); n -= k; }
    }
    const costOk = c => M.scrap() >= (c.scrap || 0) && M.hasMats(c.mats || {}) && M.taler() >= (c.taler || 0);
    function pay(c) {
        if (!costOk(c)) return false;
        if (!M.spendMats(c.mats || {})) return false;
        if (c.scrap) M.spendScrap(c.scrap);
        if (c.taler) M.spendTaler(c.taler);
        return true;
    }

    const MN = X.mnemora = {
        TERRAIN, CASINGS, CARDS, PLACES, ROADS, STAGES, CREW, CREW_MIN, PROVIANT, FOES, BOSS, KIND_ICON,
        state: st,
        casing: id => casingMap[id] || null,
        card: id => cardMap[id] || null,
        place: id => placeMap[id] || null,
        road: id => roadMap[id] || null,
        terrName: t => (TERRAIN[t] || {}).n || t,
        /* Strassenname mit Artikel: der/den/dem Küstenpfad, die/der Waldschneise */
        roadNom: r => (r.f ? 'die ' : 'der ') + r.n, roadAkk: r => (r.f ? 'die ' : 'den ') + r.n, roadDat: r => (r.f ? 'der ' : 'dem ') + r.n,
        terrIcon: (t, s) => PX((TERRAIN[t] || {}).i || '_', s),
        costOk, pay, fishTotal,

        /* ── Arche ── */
        stageDone: id => !!st().ark[id],
        stagesDone: () => STAGES.filter(s => st().ark[s.id]).length,
        arkComplete: () => STAGES.every(s => st().ark[s.id]),
        canBuildStage(id) { const s = stageMap[id], i = STAGES.indexOf(s); return !!s && !st().ark[id] && (i === 0 || !!st().ark[STAGES[i - 1].id]) && costOk(s.cost); },
        buildStage(id) {
            if (!this.canBuildStage(id)) return false;
            if (!pay(stageMap[id].cost)) return false;
            st().ark[id] = Date.now(); save();
            X.egg('m-arche'); X.addXP(30, 'Arche: ' + stageMap[id].n);
            return true;
        },
        aboard: id => !!st().crew[id],
        crewCount: () => CREW.filter(c => c.id !== 'otto' && st().crew[c.id]).length,
        /* Was fehlt noch, damit diese Person mitkommt? (leer = bereit) */
        crewMissing(id) {
            const c = crewMap[id], n = c && c.need, out = []; if (!c) return ['unbekannt'];
            if (n.stage && !st().ark[n.stage]) out.push(stageMap[n.stage].n + ' muss gebaut sein');
            if (n.taler && M.taler() < n.taler) out.push(n.taler + ' Taler (du hast ' + M.taler() + ')');
            if (n.fish && fishTotal() < n.fish) out.push(n.fish + ' Fische (du hast ' + fishTotal() + ')');
            if (n.joe && ((M.state().joe || {}).n || 0) < n.joe) out.push(n.joe + ' geöffnete Kisten bei Lucky Joe (bisher ' + ((M.state().joe || {}).n || 0) + ')');
            if (n.arena && ((M.state().arena || {}).rank || 0) < n.arena) out.push('Arena-Rang ' + n.arena + ' (bisher ' + ((M.state().arena || {}).rank || 0) + ')');
            if (n.mats) Object.keys(n.mats).forEach(k => { const have = M.mats()[k] || 0; if (have < n.mats[k]) out.push(n.mats[k] + '× ' + (M.mat(k) || {}).n + ' (du hast ' + have + ')'); });
            return out;
        },
        needText(id) {
            const n = (crewMap[id] || {}).need || {}, out = [];
            if (n.stage) out.push(stageMap[n.stage].n);
            if (n.taler) out.push(n.taler + ' Taler');
            if (n.fish) out.push(n.fish + ' Fische');
            if (n.joe) out.push(n.joe + ' Joe-Kisten');
            if (n.arena) out.push('Arena-Rang ' + n.arena);
            if (n.mats) Object.keys(n.mats).forEach(k => out.push(n.mats[k] + '× ' + (M.mat(k) || {}).n));
            return out.join(' · ');
        },
        invite(id) {
            const c = crewMap[id]; if (!c || st().crew[id] || this.crewMissing(id).length) return false;
            const n = c.need;
            if (n.mats && !M.spendMats(n.mats)) return false;
            if (n.taler && !M.spendTaler(n.taler)) return false;
            if (n.fish) takeFish(n.fish);
            st().crew[id] = Date.now(); save();
            if (CREW.every(x => st().crew[x.id])) X.egg('m-arche-crew');
            return true;
        },
        /* Was fehlt zum Ablegen? (leer = los) */
        departMissing() {
            const out = [], s = st();
            if (s.arrived) return out;
            const left = STAGES.filter(x => !s.ark[x.id]).length;
            if (left) out.push('Noch ' + left + ' Bauabschnitt' + (left > 1 ? 'e' : '') + ' der Arche');
            if (!s.crew.otto) out.push('Kapitän Otto muss an Bord');
            const cc = this.crewCount(); if (cc < CREW_MIN) out.push('Mindestens ' + CREW_MIN + ' weitere Leute an Bord (bisher ' + cc + ')');
            if (fishTotal() < PROVIANT.fish) out.push('Proviant: ' + PROVIANT.fish + ' Fische (du hast ' + fishTotal() + ')');
            if ((M.mats().oel || 0) < PROVIANT.oel) out.push('Proviant: ' + PROVIANT.oel + '× Altöl (du hast ' + (M.mats().oel || 0) + ')');
            return out;
        },
        /* Erste Überfahrt: Proviant wird verbraucht */
        depart() {
            const s = st(); if (s.arrived) return true;
            if (this.departMissing().length) return false;
            takeFish(PROVIANT.fish); M.addMat('oel', -PROVIANT.oel);
            s.arrived = Date.now(); s.at = 'port'; s.seen.port = s.seen.port || Date.now(); save();
            return true;
        },
        arrived: () => !!st().arrived,

        /* ── Baupläne und Fuhrpark ── */
        knowsCasing: id => !!st().bpc[id],
        knowsCard: id => !!st().bpk[id],
        learnCasing(id) { if (!casingMap[id] || st().bpc[id]) return false; st().bpc[id] = Date.now(); save(); return true; },
        learnCard(id) { if (!cardMap[id] || st().bpk[id]) return false; st().bpk[id] = Date.now(); save(); return true; },
        casings: () => st().casings,
        cards: () => st().cards,
        item: u => st().casings.find(c => c.u === u) || null,
        cardItem: u => st().cards.find(c => c.u === u) || null,
        owns: id => st().casings.some(c => c.id === id),
        addCasing(id) { if (!casingMap[id]) return null; const it = { u: newUid(), id, c: 100, k: [] }; const s = st(); s.casings.push(it); if (!s.active) s.active = it.u; save(); return it; },
        addCard(id) { if (!cardMap[id]) return null; const it = { u: newUid(), id }; st().cards.push(it); save(); return it; },
        canBuildCasing: id => !!casingMap[id] && MN.knowsCasing(id) && !MN.owns(id) && costOk(casingMap[id].cost),
        buildCasing(id) {
            if (!this.canBuildCasing(id) || !pay(casingMap[id].cost)) return null;
            const it = this.addCasing(id); X.egg('m-gehaeuse'); X.addXP(25, 'Gehäuse gebaut'); return it;
        },
        canBuildCard: id => !!cardMap[id] && MN.knowsCard(id) && costOk(cardMap[id].cost),
        buildCard(id) { if (!this.canBuildCard(id) || !pay(cardMap[id].cost)) return null; X.addXP(8, 'Steckkarte gebaut'); return this.addCard(id); },
        /* Karte steckt in welchem Gehäuse? */
        cardHost: u => st().casings.find(c => c.k.includes(u)) || null,
        used: cas => cas.k.reduce((a, u) => a + ((cardMap[(MN.cardItem(u) || {}).id] || {}).w || 0), 0),
        fits(casU, cardU) { const cas = this.item(casU), cd = this.cardItem(cardU); if (!cas || !cd || this.cardHost(cardU)) return false; return this.used(cas) + cardMap[cd.id].w <= casingMap[cas.id].slots; },
        insert(casU, cardU) { if (!this.fits(casU, cardU)) return false; this.item(casU).k.push(cardU); save(); X.egg('m-steckkarte'); return true; },
        eject(cardU) { const cas = this.cardHost(cardU); if (!cas) return false; cas.k = cas.k.filter(u => u !== cardU); save(); return true; },
        /* Karte verschrotten: gibt einen Teil des Schrotts zurück */
        scrapCard(u) {
            const it = this.cardItem(u); if (!it) return null;
            this.eject(u); const s = st(); s.cards = s.cards.filter(c => c.u !== u);
            const cd = cardMap[it.id]; M.state().spent = Math.max(0, M.state().spent - Math.round(cd.cost.scrap * .4)); save(); return cd;
        },
        active() { const s = st(); return s.casings.find(c => c.u === s.active) || s.casings[0] || null; },
        setActive(u) { if (!this.item(u)) return false; st().active = u; save(); return true; },
        /* Gelände eines Gehäuses: eigene + durch Karten freigeschaltete */
        terrains(cas) {
            const out = new Set(((casingMap[cas && cas.id] || {}).terr) || []);
            (cas ? cas.k : []).forEach(u => { const cd = cardMap[(this.cardItem(u) || {}).id]; ((cd && cd.terr) || []).forEach(t => out.add(t)); });
            return out;
        },
        /* Bonus aus dem Seemech (Pilotenerfahrung) und von der Besatzung */
        pilot() {
            const s = M.stats();
            return { atk: Math.floor(Math.max(0, s.A) / 2) + (st().crew.bolzen ? 1 : 0), hp: Math.max(0, s.P) * 2, en: Math.floor(Math.max(0, s.E) / 3), crit: Math.max(0, s.S), spd: Math.floor(Math.max(0, s.R) / 3) };
        },
        /* Kampfwerte eines Gehäuses */
        combat(cas) {
            const b = (casingMap[cas.id] || {}).base || {}, p = this.pilot(), fx = { hp: 0, atk: 0, def: 0, spd: 0, en: 0, crit: 0, rep: 0, regen: 0 };
            cas.k.forEach(u => { const cd = cardMap[(this.cardItem(u) || {}).id]; if (cd) Object.keys(cd.fx || {}).forEach(k => { fx[k] = (fx[k] || 0) + cd.fx[k]; }); });
            const worn = cas.c < 40 ? .75 : 1;
            return {
                hp: Math.round(((b.hp || 30) + fx.hp + p.hp) * worn), atk: (b.atk || 2) + fx.atk + p.atk, def: (b.def || 0) + fx.def, spd: (b.spd || 1) + fx.spd + p.spd,
                en: (b.en || 3) + fx.en + p.en, crit: Math.min(45, 5 + fx.crit + p.crit), rep: Math.min(.8, fx.rep), regen: Math.min(.12, fx.regen)
            };
        },
        /* Aussehen im Kampf und in der Werkstatt */
        loadout(cas) {
            const spec = {}, lo = (casingMap[cas.id] || {}).lo || {};
            Object.keys(lo).forEach(sl => { spec[sl] = [lo[sl][0], lo[sl][1], 0, cas.c]; });
            return X.mechArt.loadoutOf(spec);
        },
        repairCost(cas) { if (!cas || cas.c >= 100) return 0; return Math.max(1, Math.ceil((100 - cas.c) * .5 * (casingMap[cas.id].t || 1) * (st().crew.esse ? .7 : 1))); },
        repair(u) { const cas = this.item(u), n = this.repairCost(cas); if (!n || !M.spendScrap(n)) return false; cas.c = 100; save(); return true; },

        /* ── Karte & Strassen ── */
        at: () => st().at,
        seen: id => !!st().seen[id] || X.easy(),
        roadsAt: id => ROADS.filter(r => r.a === id || r.b === id),
        other: (r, id) => r.a === id ? r.b : r.a,
        cleared: id => Math.min((roadMap[id] || {}).foes || 0, +st().roads[id] || 0),
        free: id => MN.cleared(id) >= ((roadMap[id] || {}).foes || 1) || X.easy(),
        /* Sichtbar: ein Ende ist bekannt */
        roadVisible: r => MN.seen(r.a) || MN.seen(r.b),
        /* Bestes Gehäuse im Fuhrpark für ein Gelände (aktives bevorzugt, sonst das stärkste) */
        bestFor(terr, needHealthy) {
            const ok = st().casings.filter(c => this.terrains(c).has(terr) && (!needHealthy || c.c > 0));
            const act = this.active();
            if (act && ok.includes(act)) return act;
            return ok.sort((a, b) => X.kampf.power(this.combat(b)) - X.kampf.power(this.combat(a)))[0] || null;
        },
        /* Weg über freie Strassen (Liste von Strassen) oder null; any = auch Gelände, das der Fuhrpark nicht schafft */
        path(to, from, any) {
            from = from || this.at(); if (from === to) return [];
            const prev = {}, seen = { [from]: true }, q = [from];
            while (q.length) {
                const cur = q.shift();
                for (const r of this.roadsAt(cur)) {
                    if (!this.free(r.id) || (!any && !X.easy() && !this.bestFor(r.terr))) continue;
                    const nx = this.other(r, cur); if (seen[nx]) continue;
                    seen[nx] = true; prev[nx] = { r, from: cur }; if (nx === to) { const out = []; let c = to; while (c !== from) { out.unshift(prev[c].r); c = prev[c].from; } return out; }
                    q.push(nx);
                }
            }
            return null;
        },
        /* Welches Gelände fehlt dem Fuhrpark auf diesem Weg? */
        pathBlocked(roads) { return roads.map(r => r.terr).filter(t => !this.bestFor(t)); },
        moveTo(id) { const s = st(); if (!placeMap[id]) return false; s.at = id; save(); return true; },

        /* Gegner Nummer k (0-basiert) auf einer Strasse */
        foe(roadId, k) {
            const r = roadMap[roadId]; if (!r) return null;
            const pool = FOES[r.terr], f = pool[(k + ROADS.indexOf(r)) % pool.length];
            return this.makeFoe(f, r.lvl + k * .45, r.terr);
        },
        makeFoe(f, lvl, terr) {
            const q = X.clamp(1 + Math.floor(lvl / 1.7), 1, 6), slots = {};
            f.p.forEach(id => { const pt = M.part(id); if (pt) slots[pt.slot] = [id, q, Math.min(5, Math.floor(lvl / 2.5))]; });
            const L = lvl, boss = !!f.boss;
            const c = {
                hp: Math.round((30 + L * 14) * (boss ? 1.7 : 1)), atk: Math.round(2.5 + L * 1.4), def: Math.floor(L * .6), spd: Math.round(2 + L * .6),
                en: 4 + Math.floor(L / 2), crit: Math.min(40, 5 + Math.round(L * 2)), rep: boss ? .3 : .1, regen: boss ? .03 : 0
            };
            return { n: f.n, d: f.d, lvl: L, terr, boss, c, lo: X.mechArt.loadoutOf(slots) };
        },
        /* Darf das aktive (oder ein passendes) Gehäuse hier kämpfen? */
        fightCheck(roadId) {
            const r = roadMap[roadId], s = st(), here = s.at;
            if (!r) return { ok: false, why: 'Unbekannte Strasse' };
            if (r.a !== here && r.b !== here) return { ok: false, why: 'Du musst an einem Ende der Strasse stehen.' };
            if (this.free(roadId)) return { ok: false, why: 'Diese Strasse ist schon frei.' };
            const cas = this.bestFor(r.terr, true) || this.bestFor(r.terr);
            if (!cas) return { ok: false, why: TERRAIN[r.terr].n + ': Kein Gehäuse in deinem Fuhrpark kommt hier durch.', terr: true };
            if (cas.c <= 0) return { ok: false, why: 'Dein ' + casingMap[cas.id].n + ' ist kaputt. Repariere es in der Feldwerkstatt.', cas };
            return { ok: true, cas };
        },
        /* Ein Gegner auf der Strasse besiegt → Fortschritt; ist sie frei, geht es zum anderen Ende */
        winRoad(roadId) {
            const r = roadMap[roadId], s = st(); if (!r) return null;
            s.roads[roadId] = this.cleared(roadId) + 1; save();
            if (!this.free(roadId)) return { done: false };
            X.egg('m-strasse'); X.addXP(25 + Math.round(r.lvl * 5), 'Strasse frei: ' + r.n);
            if (ROADS.every(x => this.free(x.id))) X.egg('m-alle-strassen');
            const to = this.other(r, s.at), lines = this.arrive(to);
            return { done: true, to, lines };
        },
        /* Ankunft an einem Ort: beim ersten Mal Belohnungen */
        arrive(id) {
            const s = st(), p = placeMap[id]; if (!p) return [];
            s.at = id;
            const first = !s.seen[id], out = [];
            if (first) {
                s.seen[id] = Date.now();
                const rw = p.reward || {}, W = X.werft;
                (rw.casings || []).forEach(cid => { if (this.learnCasing(cid)) out.push(PX('bp') + ' <b class="bp-new">Gehäuse-Bauplan: ' + esc(casingMap[cid].n) + '</b>'); });
                (rw.cards || []).forEach(cid => { if (this.learnCard(cid)) out.push(PX('bp') + ' <b class="bp-new">Steckkarten-Bauplan: ' + esc(cardMap[cid].n) + '</b>'); });
                const g = [];
                if (rw.taler) g.push({ type: 'taler', n: rw.taler });
                ['erz', 'splitter', 'nebelkern'].forEach(k => { if (rw[k]) g.push({ type: 'mat', id: k, n: rw[k] }); });
                if (W) out.push.apply(out, W.grant(g));
                X.addXP(40, 'Neuer Ort: ' + p.n);
            }
            save();
            return out;
        },
        /* Beute nach einem Sieg auf der Strasse */
        loot(lvl, boss) {
            const W = X.werft, L = lvl, list = W.loot({ taler: [Math.round(8 + L * 6), Math.round(14 + L * 9)], mats: 1 + Math.floor(L / 3), rare: L * .03 });
            list.push({ type: 'mat', id: 'erz', n: X.rand(1, 2) + Math.floor(L / 2) });
            const lines = W.grant(list);
            if (boss || Math.random() < .12 + L * .01) {   // manchmal eine fertige Steckkarte
                const pool = CARDS.filter(c => c.t <= Math.min(4, 1 + Math.ceil(L / 2.5)));
                const cd = boss ? cardMap['kt-quanten'] : X.pick(pool), it = this.addCard(cd.id);
                if (it) lines.push(PX(cd.id) + ' <b>Steckkarte: ' + esc(cd.n) + '</b>');
            }
            return lines;
        },
        wear(cas, win, lvl) {
            const n = win ? X.rand(3, 6 + Math.round(lvl)) : X.rand(12, 22);
            cas.c = Math.max(0, cas.c - n);
            if (win && st().crew.flossie) cas.c = Math.min(100, cas.c + 8);
            save(); return n;
        },
        bossDone: () => !!st().boss,
        winBoss() { const s = st(); if (s.boss) return false; s.boss = Date.now(); save(); X.egg('m-gc'); X.addXP(250, 'Garbage Collector besiegt'); return true; },

        /* ── Lager (Besatzung) ── */
        SHOP: [['erz', 30], ['kabel', 8], ['zahnrad', 10], ['oel', 12], ['platine', 22], ['chip', 40]],
        buy(id, n) { const row = this.SHOP.find(x => x[0] === id); if (!row || !st().crew.basar) return false; const cost = row[1] * (n || 1); if (!M.spendTaler(cost)) return false; M.addMat(id, n || 1); return true; },
        JOE_BOX: 150,
        joeBox() {
            if (!st().crew.joe || !M.spendTaler(this.JOE_BOX)) return null;
            if (Math.random() < .7) {
                let r = Math.random() * CARDS.reduce((a, c) => a + 1 / c.t, 0), pick = CARDS[0];
                for (const c of CARDS) { r -= 1 / c.t; if (r <= 0) { pick = c; break; } }
                this.addCard(pick.id); return { card: pick };
            }
            const n = X.rand(5, 10); M.addMat('erz', n); return { erz: n };
        },
        SMELT: 35,
        smelt(n) { n = Math.max(1, Math.floor(n || 1)); if (!st().crew.kiesel || !M.spendScrap(this.SMELT * n)) return false; M.addMat('erz', n); return true; },

        /* ── Mini-MMO: Daten und Regeln (Server: mnemora-net.js, Oberfläche: mnemora-mmo.js) ── */
        WORLD, WB_HP, WB_ROUNDS, WB_COOLDOWN, MEET: ['port', 'registra'],
        /* Kalenderwoche (ISO) → Schlüssel des Weltbosses, z. B. 2026-W42 */
        week(t) {
            const d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);   // Donnerstag dieser Woche bestimmt das Jahr
            const y = d.getFullYear(), w1 = new Date(y, 0, 4);
            const w = 1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7);
            return { y, w, key: y + '-W' + String(w).padStart(2, '0') };
        },
        /* Weltboss dieser Woche: { key, def, place, hp } – jede Woche ein anderer, an seinem Ort */
        worldBoss(t) { const k = this.week(t); const def = WORLD[(k.y * 53 + k.w) % WORLD.length]; return { key: k.key, def, place: def.place, hp: WB_HP }; },
        /* Er passt sich an: Stärke nach deinem Fortschritt (freie Strassen) */
        worldFoe() {
            const b = this.worldBoss(), n = ROADS.filter(r => this.cleared(r.id) >= r.foes).length;
            const f = this.makeFoe({ n: b.def.n, d: b.def.d, p: b.def.p, boss: true }, X.clamp(1.6 + n * .5, 1.6, 8), b.def.terr);
            f.c.hp = WB_HP; return f;
        },
        wbState() { const s = st(); if (!s.wb || typeof s.wb !== 'object' || Array.isArray(s.wb) || s.wb.key !== this.week().key) s.wb = { key: this.week().key, last: 0, hits: 0, dmg: 0, claimed: 0 }; return s.wb; },
        wbReady() { return Date.now() - (+this.wbState().last || 0) >= WB_COOLDOWN; },
        wbHit(dmg) { const w = this.wbState(); w.last = Date.now(); w.hits = (+w.hits || 0) + 1; w.dmg = (+w.dmg || 0) + Math.max(0, Math.round(dmg)); save(); },
        /* Beute, wenn der Weltboss gefallen ist (einmal pro Woche, nur wer mitgekämpft hat); top = unter den ersten drei */
        wbClaim(top) {
            const w = this.wbState(); if (w.claimed || !w.hits) return null;
            w.claimed = Date.now(); save();
            const lines = X.werft.grant([{ type: 'taler', n: 250 + (top ? 150 : 0) }, { type: 'mat', id: 'erz', n: 12 + (top ? 8 : 0) }, { type: 'mat', id: 'splitter', n: top ? 3 : 1 }]);
            const pool = CARDS.filter(c => c.t >= 2 && c.t <= (top ? 4 : 3)), cd = X.pick(pool), it = this.addCard(cd.id);
            if (it) lines.push(PX(cd.id) + ' <b>Steckkarte: ' + esc(cd.n) + '</b>');
            X.addXP(top ? 120 : 80, 'Weltboss besiegt');
            return lines;
        },

        /* Kampfprofil für andere Spieler:innen (Geist im Duell, Truppkamerad:in): aktives Gehäuse mit Werten */
        kit() {
            const cas = this.active(); if (!cas) return null;
            return { id: cas.id, c: this.combat(cas), cc: cas.c, k: cas.k.map(u => (this.cardItem(u) || {}).id).filter(Boolean).slice(0, 6), t: Array.from(this.terrains(cas)) };
        },
        /* Kampfprofil vom Server prüfen (fremde Daten!) → sauberes Profil oder null */
        cleanKit(k) {
            if (!k || typeof k !== 'object' || !casingMap[k.id] || !k.c || typeof k.c !== 'object') return null;
            const n = (v, a, b) => X.clamp(+v || 0, a, b), c = k.c;
            return { id: k.id, cc: n(k.cc, 0, 100), k: (Array.isArray(k.k) ? k.k : []).filter(id => cardMap[id]).slice(0, 6),
                c: { hp: n(c.hp, 10, 400), atk: n(c.atk, 1, 60), def: n(c.def, 0, 40), spd: n(c.spd, 1, 30), en: n(c.en, 2, 30), crit: n(c.crit, 0, 45), rep: n(c.rep, 0, .8), regen: n(c.regen, 0, .12) } };
        },
        kitArt(k) { const spec = {}, lo = (casingMap[k.id] || {}).lo || {}; Object.keys(lo).forEach(sl => { spec[sl] = [lo[sl][0], lo[sl][1], 0, k.cc]; }); return X.mechArt.loadoutOf(spec); },
        /* Fortschritt für die Mnemora-Rangliste */
        progress() {
            const s = st(), r = ROADS.filter(x => this.cleared(x.id) >= x.foes).length, p = Object.keys(s.seen).filter(id => placeMap[id]).length, b = s.boss ? 1 : 0;
            return { r, p, b, c: s.casings.length, k: s.cards.length, v: r * 10 + p * 6 + b * 60 + s.casings.length * 4 };
        },
        /* Trupp: Kennung (Spieler-ID der Gründerin/des Gründers) oder '' */
        party: () => String(st().party || ''),
        setParty(id) { st().party = String(id || '').slice(0, 20); save(); },
        /* Merker: bis wann Nachrichten an mich verarbeitet sind, welche Tauschgeschäfte schon abgeschlossen sind */
        mark(k, v) { const s = st(); if (v === undefined) return s[k]; s[k] = v; save(); return v; },

        /* ── Tauschbörse: { k: 'card' | 'mat' | 'taler', id, n } ── */
        itemName(it) { if (!it) return '?'; if (it.k === 'taler') return it.n + ' Taler'; if (it.k === 'card') return (cardMap[it.id] || {}).n || '?'; const m = M.mat(it.id); return it.n + '× ' + (m ? m.n : '?'); },
        itemIcon(it, s) { return !it ? '' : it.k === 'taler' ? PX('taler', s) : it.k === 'card' ? PX(it.id, s) : PX('mat-' + it.id, s); },
        /* Gültig? (fremde Daten vom Server) */
        itemOk(it) {
            if (!it || typeof it !== 'object') return false;
            const n = +it.n;
            if (it.k === 'card') return !!cardMap[it.id];
            if (it.k === 'mat') return !!M.mat(it.id) && n >= 1 && n <= 999 && Math.floor(n) === n;
            if (it.k === 'taler') return n >= 1 && n <= 99999 && Math.floor(n) === n;
            return false;
        },
        freeCard: id => st().cards.find(c => c.id === id && !MN.cardHost(c.u)) || null,
        hasItem(it) {
            if (!this.itemOk(it)) return false;
            if (it.k === 'card') return !!this.freeCard(it.id);
            if (it.k === 'mat') return (M.mats()[it.id] || 0) >= it.n;
            return M.taler() >= it.n;
        },
        /* Abgeben (beim Anbieten sofort – das Angebot liegt dann „im Treuhandfach“) */
        takeItem(it) {
            if (!this.hasItem(it)) return false;
            if (it.k === 'card') { const c = this.freeCard(it.id), s = st(); s.cards = s.cards.filter(x => x !== c); save(); return true; }
            if (it.k === 'mat') { M.addMat(it.id, -it.n); return true; }
            return M.spendTaler(it.n);
        },
        giveItem(it) {
            if (!this.itemOk(it)) return false;
            if (it.k === 'card') return !!this.addCard(it.id);
            if (it.k === 'mat') { M.addMat(it.id, it.n); return true; }
            const m = M.state(); m.taler = Math.max(0, (+m.taler || 0) + it.n); save(); return true;   // ohne Taler-Bonus: getauscht ist getauscht
        },
        /* Was kann ich anbieten? Freie Karten (gruppiert) und Material */
        tradeables() {
            const out = [], seen = {};
            st().cards.forEach(c => { if (!this.cardHost(c.u) && !seen[c.id]) { seen[c.id] = 1; out.push({ k: 'card', id: c.id, have: st().cards.filter(x => x.id === c.id && !this.cardHost(x.u)).length }); } });
            Object.keys(M.mats()).forEach(id => { if (M.mats()[id] > 0 && M.mat(id)) out.push({ k: 'mat', id, have: M.mats()[id] }); });
            return out;
        },

        /* ── Einführung durch Händlerin Ada ── */
        intro: () => st().intro,
        setIntro(n) { const s = st(); if (n > s.intro) { s.intro = n; save(); } },
        /* Ada schenkt den ersten Läufer, eine Karte und zwei Baupläne */
        adaGift() {
            const s = st(); if (s.intro >= 1) return false;
            this.learnCasing('gh-itx'); this.learnCard('kt-gpu'); this.learnCard('kt-psu');
            if (!this.owns('gh-itx')) this.addCasing('gh-itx');
            this.addCard('kt-psu');
            s.intro = 1; save(); return true;
        }
    };
})();
