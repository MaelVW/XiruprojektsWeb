/* ==========================================================================
   Diskettenfabrik – Idle-/Klickspiel der Xiru-Spielhalle
   Von der Diskette über CD, Festplatte und SSD bis zum Realitätskristall.
   Gezählt wird (aus Tradition) immer in Disketten.
   ========================================================================== */
XIRU.ready(function () {
    'use strict';
    const G = XIRU.Game;
    const $ = id => document.getElementById(id);
    const esc = XIRU.esc;
    const SAVE = 'klicker', OFFLINE_MAX = 8 * 3600, MP_BASE = 1e8, TAU = Math.PI * 2;

    /* ── Farben aus dem aktiven Design ─────────────────────────────────── */
    let C = readPalette();
    function readPalette() {
        const probe = document.createElement('i');
        probe.style.display = 'none';
        document.body.appendChild(probe);
        const t = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        const out = {};
        ['bg', 'surface', 'surface-2', 'surface-3', 'border-strong', 'text', 'text-muted', 'accent', 'accent-2', 'success', 'warning', 'danger', 'rc'].forEach(n => {
            probe.style.color = 'var(--' + n + ')';
            t.clearRect(0, 0, 1, 1); t.fillStyle = '#808080';
            t.fillStyle = getComputedStyle(probe).color; t.fillRect(0, 0, 1, 1);
            const d = t.getImageData(0, 0, 1, 1).data;
            out[n.replace(/-(\w)/g, (m, c) => c.toUpperCase())] = [d[0], d[1], d[2]];
        });
        probe.remove();
        return out;
    }
    const rgb = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
    const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));

    /* ── Grosse Zahlen ─────────────────────────────────────────────────── */
    const SHORT = ['', 'Tsd.', 'Mio.', 'Mrd.', 'Bio.', 'Brd.', 'Trio.', 'Trd.', 'Quadr.', 'Quadrd.', 'Quint.', 'Quintd.', 'Sext.', 'Sextd.', 'Sept.', 'Septd.', 'Okt.', 'Oktd.', 'Non.', 'Nond.', 'Dez.', 'Dezd.'];
    const LONG = ['', 'Tausend', 'Millionen', 'Milliarden', 'Billionen', 'Billiarden', 'Trillionen', 'Trilliarden', 'Quadrillionen', 'Quadrilliarden', 'Quintillionen', 'Quintilliarden', 'Sextillionen', 'Sextilliarden', 'Septillionen', 'Septilliarden', 'Oktillionen', 'Oktilliarden', 'Nonillionen', 'Nonilliarden', 'Dezillionen', 'Dezilliarden'];
    function big(n, dec, long) {
        if (!isFinite(n)) return '∞';
        if (n < 0) return '−' + big(-n, dec, long);
        if (n < 10 && dec && n % 1) return XIRU.fmt(Math.floor(n * 10) / 10, 1);
        if (n < 1e4) return XIRU.fmt(Math.floor(n));
        let e = Math.floor(Math.log10(n) / 3);
        if (e >= SHORT.length) return n.toExponential(2).replace('e+', 'e');
        let v = n / Math.pow(1000, e);
        const d = v < 100 ? 2 : 1;
        v = Math.floor(v * Math.pow(10, d)) / Math.pow(10, d);
        if (v >= 1000 && e + 1 < SHORT.length) { e++; v = Math.floor(v) / 1000; }
        return XIRU.fmt(v, d) + ' ' + (long ? LONG[e] : SHORT[e]);
    }
    function dur(sec) {
        sec = Math.floor(sec);
        const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
        return h ? h + ' Std. ' + m + ' Min.' : m ? m + ' Min. ' + s + ' Sek.' : s + ' Sek.';
    }

    /* ── Gebäude ───────────────────────────────────────────────────────── */
    const BUILDINGS = [
        { id: 'praktikant', n: 'Praktikant', pl: 'Praktikanten', i: '🧑‍🎓', cost: 15, dps: .1, d: 'Brennt Disketten mit viel Motivation und wenig Ahnung.' },
        { id: 'laufwerk', n: 'Diskettenlaufwerk', pl: 'Diskettenlaufwerke', i: '💾', cost: 100, dps: 1, d: 'Rattert fröhlich vor sich hin. Klack, klack, klack.' },
        { id: 'brennstrasse', n: 'Brennstrasse', pl: 'Brennstrassen', i: '🏭', cost: 1100, dps: 8, d: 'Ein Fliessband voller Laufwerke.' },
        { id: 'presswerk', n: 'CD-Presswerk', pl: 'CD-Presswerke', i: '💿', cost: 12000, dps: 47, d: 'Presst Silberlinge – die Buchhaltung rechnet sie in Disketten um.' },
        { id: 'server', n: 'Floppy-Hub-Server', pl: 'Floppy-Hub-Server', i: '🗄️', cost: 130000, dps: 260, d: 'Verwaltet die Spielebibliothek und brennt nebenbei.' },
        { id: 'festplatten', n: 'Festplattenfarm', pl: 'Festplattenfarmen', i: '🧲', cost: 1.4e6, dps: 1400, d: 'Tausende Platten drehen sich im Takt.' },
        { id: 'ssd', n: 'SSD-Fabrik', pl: 'SSD-Fabriken', i: '⚡', cost: 2e7, dps: 7800, d: 'Keine beweglichen Teile, keine Pausen.' },
        { id: 'rechenzentrum', n: 'Rechenzentrum', pl: 'Rechenzentren', i: '🏢', cost: 3.3e8, dps: 44000, d: 'Klimatisiert, redundant und immer beschäftigt.' },
        { id: 'satellit', n: 'Diskettensatellit', pl: 'Diskettensatelliten', i: '🛰️', cost: 5.1e9, dps: 260000, d: 'Brennt im Orbit – mit Sonnenenergie.' },
        { id: 'zeitmaschine', n: 'Zeitmaschine', pl: 'Zeitmaschinen', i: '⏳', cost: 7.5e10, dps: 1.6e6, d: 'Holt die Disketten von morgen schon heute.' },
        { id: 'quanten', n: 'Quanten-Diskette', pl: 'Quanten-Disketten', i: '⚛️', cost: 1e12, dps: 1e7, d: 'Gleichzeitig voll und leer – bis jemand nachschaut.' },
        { id: 'kristall', n: 'Kristallschmiede', pl: 'Kristallschmieden', i: '💎', cost: 1.4e13, dps: 6.5e7, d: 'Züchtet Realitätskristalle aus reinem Speicherplatz.' }
    ];

    /* ── Upgrades ──────────────────────────────────────────────────────── */
    const TIER_N = [1, 5, 25, 50, 100], TIER_F = [10, 50, 500, 5e4, 5e6];
    const TIER_NAMES = {
        praktikant: ['Kaffeemaschine', 'Bürostuhl mit Rollen', 'Mitarbeiter des Monats', 'Unbefristeter Vertrag', 'Praktikanten-Gewerkschaft'],
        laufwerk: ['Staubschutzklappe', 'Turbo-Motor', 'Doppelte Schreibköpfe', 'Goldener Lesekopf', 'Laufwerk mit Kühlrippen'],
        brennstrasse: ['Fliessband 2.0', 'Schichtbetrieb', 'Etikettierautomat', 'Laser-Ausrichtung', 'Vollautomatik'],
        presswerk: ['Silberfolie', 'Hochdruckpresse', 'Kratzschutz', 'Turbo-Kühlung', 'Diamantstempel'],
        server: ['Mehr RAM', 'PowerShell-Skripte', 'Retro-Terminal-Design', 'Datenbank-Index', 'Floppy Hub 2.0'],
        festplatten: ['7200 Umdrehungen', 'Grösserer Cache', 'Schreib-Lese-Tanz', 'Heliumfüllung', 'Petabyte-Platten'],
        ssd: ['NVMe-Anschluss', 'Kühlkörper', 'Mehr Speicherzellen', 'PCIe-Turbo', 'Null Latenz'],
        rechenzentrum: ['Wasserkühlung', 'Redundante Netzteile', 'Glasfaser', 'Eigenes Kraftwerk', 'Serverschrank-Tetris'],
        satellit: ['Solarsegel', 'Orbitale Lieferdrohnen', 'Weltraum-Etiketten', 'Mondbasis', 'Sternenflotte'],
        zeitmaschine: ['Fluxkompensator', 'Paradox-Versicherung', 'Gestern-Lieferung', 'Zeitschleife', 'Ewige Schicht'],
        quanten: ['Superposition', 'Verschränkung', 'Schrödingers Etikett', 'Quantentunnel', 'Beobachter-Effekt'],
        kristall: ['Reinheitsgrad 99 %', 'Facettenschliff', 'Resonanzkammer', 'Prismen-Array', 'Realitätsriss']
    };
    const ERAS = [
        { n: 'Diskette', pl: 'Disketten' },
        { n: 'CD', pl: 'CDs' },
        { n: 'Festplatte', pl: 'Festplatten' },
        { n: 'SSD', pl: 'SSDs' },
        { n: 'Realitätskristall', pl: 'Realitätskristalle' }
    ];
    const UPG = [];
    BUILDINGS.forEach((B, bi) => TIER_N.forEach((need, k) => UPG.push({
        id: B.id + k, n: TIER_NAMES[B.id][k], i: B.i, cost: B.cost * TIER_F[k], b: bi,
        need: () => S.b[bi] >= need, d: B.pl + ' arbeiten doppelt so schnell.'
    })));
    UPG.push(
        { id: 'maus1', n: 'Ergonomische Maus', i: '🖱️', cost: 100, click: 2, need: () => S.clicks >= 15 || S.all >= 60, d: 'Klicks brennen doppelt so viel.' },
        { id: 'maus2', n: 'Gaming-Maus', i: '🖱️', cost: 600, click: 2, need: () => S.clicks >= 80 || S.all >= 400, d: 'Klicks ×2. Jetzt mit 16’000 DPI.' },
        { id: 'maus3', n: 'RGB-Mauspad', i: '🌈', cost: 1.2e4, click: 2, need: () => S.all >= 4000, d: 'Klicks ×2. Und +15 FPS, versprochen.' },
        { id: 'syn1', n: 'Klick-Synergie', i: '👆', cost: 6e4, syn: .01, need: () => S.all >= 2e4, d: 'Jeder Klick bringt zusätzlich 1 % deiner Produktion pro Sekunde.' },
        { id: 'syn2', n: 'Doppelklick-Patent', i: '👆', cost: 6e6, syn: .01, need: () => S.all >= 2e6, d: 'Noch einmal +1 % der Produktion pro Klick.' },
        { id: 'syn3', n: 'Neuronales Klicken', i: '🧠', cost: 6e8, syn: .01, need: () => S.all >= 2e8, d: 'Du denkst ans Klicken – und es klickt. +1 %.' },
        { id: 'syn4', n: 'Quantenfinger', i: '🫰', cost: 6e10, syn: .01, need: () => S.all >= 2e10, d: 'Du klickst und klickst nicht gleichzeitig. +1 %.' },
        { id: 'syn5', n: 'Kristallfinger', i: '💅', cost: 6e12, syn: .01, need: () => S.all >= 2e12, d: 'Funkelnde Fingerkuppen. +1 %.' },
        { id: 'etik', n: 'Bessere Etiketten', i: '🏷️', cost: 5e4, g: 1.1, need: () => S.all >= 1.5e4, d: 'Gesamte Produktion +10 %. Beschriftet ist halb gebrannt.' },
        { id: 'werbung', n: 'Floppy-Hub-Werbung', i: '📣', cost: 5e6, g: 1.15, need: () => S.all >= 1.5e6, d: 'Gesamte Produktion +15 %. Plakate an jeder Bushaltestelle.' },
        { id: 'retro', n: 'Retro-Hype', i: '📼', cost: 5e8, g: 1.2, need: () => S.all >= 1.5e8, d: 'Gesamte Produktion +20 %. Alt ist das neue Neu.' },
        { id: 'nostalgie', n: 'Nostalgie-Welle', i: '🌊', cost: 5e10, g: 1.25, need: () => S.all >= 1.5e10, d: 'Gesamte Produktion +25 %. Früher war alles 1,44 MB.' },
        { id: 'kult', n: 'Kultstatus', i: '🏆', cost: 5e12, g: 1.3, need: () => S.all >= 1.5e12, d: 'Gesamte Produktion +30 %. Ihr seid jetzt Legende.' },
        { id: 'magnet', n: 'Glücksmagnet', i: '🧲', cost: 7.7e4, need: () => S.golden >= 1 || S.all >= 3e4, d: 'Goldene Disketten tauchen doppelt so oft auf und bleiben länger.' },
        { id: 'nacht', n: 'Nachtschicht', i: '🌙', cost: 1e6, need: () => S.all >= 2.5e5, d: 'Im Hintergrund arbeitet die Fabrik mit voller statt halber Kraft.' },
        { id: 'goldrausch', n: 'Goldrausch', i: '✨', cost: 7.7e6, need: () => S.golden >= 3 || S.all >= 3e6, d: 'Effekte goldener Disketten halten doppelt so lange.' },
        { id: 'era1', n: 'CD-Brenner', i: '💿', cost: 2e5, era: 1, em: 2, need: () => S.all >= 5e4, d: 'Neues Zeitalter: Die Fabrik brennt CDs! Gesamte Produktion ×2.' },
        { id: 'era2', n: 'Festplatten-Montage', i: '🧲', cost: 2e8, era: 2, em: 2, need: () => owned('era1') && S.all >= 5e7, d: 'Neues Zeitalter: Festplatten! Gesamte Produktion ×2.' },
        { id: 'era3', n: 'SSD-Revolution', i: '⚡', cost: 2e11, era: 3, em: 2, need: () => owned('era2') && S.all >= 5e10, d: 'Neues Zeitalter: SSDs! Gesamte Produktion ×2.' },
        { id: 'era4', n: 'Realitätskristall-Presse', i: '💎', cost: 2e14, era: 4, em: 3, need: () => owned('era3') && S.all >= 5e13, d: 'Das letzte Zeitalter: Realitätskristalle! Gesamte Produktion ×3.' }
    );
    const UPG_MAP = {};
    UPG.forEach(u => { UPG_MAP[u.id] = u; });

    /* ── Erfolge (je +1 % Produktion) ──────────────────────────────────── */
    const ACH = [
        { id: 'p1', i: '💾', n: 'Erste Diskette', d: 'Brenne deine erste Diskette.', t: () => S.all >= 1 },
        { id: 'p100', i: '📦', n: 'Ein kleiner Stapel', d: 'Produziere 100 Disketten.', t: () => S.all >= 100 },
        { id: 'p1k', i: '📦', n: 'Tausendsassa', d: 'Produziere 1’000 Disketten.', t: () => S.all >= 1e3 },
        { id: 'p100k', i: '🏬', n: 'Lagerhalle', d: 'Produziere 100 Tsd. Disketten.', t: () => S.all >= 1e5 },
        { id: 'p1m', i: '💰', n: 'Millionär', d: 'Produziere 1 Mio. Disketten.', t: () => S.all >= 1e6 },
        { id: 'p1b', i: '🏦', n: 'Milliardär', d: 'Produziere 1 Mrd. Disketten.', t: () => S.all >= 1e9 },
        { id: 'p1t', i: '🌍', n: 'Billionär', d: 'Produziere 1 Bio. Disketten.', t: () => S.all >= 1e12 },
        { id: 'p1q', i: '🌌', n: 'Billiardär', d: 'Produziere 1 Brd. Disketten.', t: () => S.all >= 1e15 },
        { id: 'p1x', i: '♾️', n: 'Speichergottheit', d: 'Produziere 1 Trio. Disketten.', t: () => S.all >= 1e18 },
        { id: 'c100', i: '👆', n: 'Fingerübung', d: 'Klicke 100-mal.', t: () => S.clicks >= 100 },
        { id: 'c1k', i: '✌️', n: 'Klick-Athlet', d: 'Klicke 1’000-mal.', t: () => S.clicks >= 1000 },
        { id: 'c10k', i: '🦾', n: 'Klick-Legende', d: 'Klicke 10’000-mal.', t: () => S.clicks >= 10000 },
        { id: 'krampf', i: '🤯', n: 'Klickkrampf', d: 'Klicke 13-mal innerhalb einer Sekunde.', t: () => S.krampf },
        { id: 'r10', i: '⚙️', n: 'Läuft', d: 'Erreiche 10 Disketten pro Sekunde.', t: () => rate >= 10 },
        { id: 'r1k', i: '⚙️', n: 'Es brummt', d: 'Erreiche 1’000 pro Sekunde.', t: () => rate >= 1e3 },
        { id: 'r1m', i: '🚀', n: 'Hochbetrieb', d: 'Erreiche 1 Mio. pro Sekunde.', t: () => rate >= 1e6 },
        { id: 'r1b', i: '☄️', n: 'Überschall', d: 'Erreiche 1 Mrd. pro Sekunde.', t: () => rate >= 1e9 },
        { id: 'b10', i: '🏠', n: 'Kleinbetrieb', d: 'Besitze 10 Gebäude.', t: () => totalB() >= 10 },
        { id: 'b100', i: '🏘️', n: 'Mittelstand', d: 'Besitze 100 Gebäude.', t: () => totalB() >= 100 },
        { id: 'b500', i: '🏙️', n: 'Konzern', d: 'Besitze 500 Gebäude.', t: () => totalB() >= 500 },
        { id: 'ball', i: '🧩', n: 'Vollsortiment', d: 'Besitze jedes Gebäude mindestens einmal.', t: () => S.b.every(n => n > 0) },
        { id: 'prak', i: '🧑‍🎓', n: 'Praktikantenschwemme', d: 'Stelle 100 Praktikanten ein.', t: () => S.b[0] >= 100 },
        { id: 'g1', i: '🌟', n: 'Goldfinger', d: 'Sammle eine goldene Diskette ein.', t: () => S.golden >= 1 },
        { id: 'g7', i: '🍀', n: 'Glückspilz', d: 'Sammle 7 goldene Disketten ein.', t: () => S.golden >= 7 },
        { id: 'g27', i: '⛏️', n: 'Goldgräber', d: 'Sammle 27 goldene Disketten ein.', t: () => S.golden >= 27 },
        { id: 'u10', i: '🔧', n: 'Aufgerüstet', d: 'Kaufe 10 Upgrades.', t: () => S.u.length >= 10 },
        { id: 'u30', i: '🛠️', n: 'Technikfreak', d: 'Kaufe 30 Upgrades.', t: () => S.u.length >= 30 },
        { id: 'e1', i: '💿', n: 'Silberling', d: 'Starte das CD-Zeitalter.', t: () => era() >= 1 },
        { id: 'e2', i: '🧲', n: 'Plattendreher', d: 'Starte das Festplatten-Zeitalter.', t: () => era() >= 2 },
        { id: 'e3', i: '⚡', n: 'Flashmob', d: 'Starte das SSD-Zeitalter.', t: () => era() >= 3 },
        { id: 'e4', i: '💎', n: 'Jenseits der Realität', d: 'Presse Realitätskristalle.', t: () => era() >= 4 },
        { id: 'f1', i: '🧹', n: 'Formatiert', d: 'Formatiere die Fabrik.', t: () => S.formats >= 1 },
        { id: 'f5', i: '🌀', n: 'Serienformatierer', d: 'Formatiere die Fabrik 5-mal.', t: () => S.formats >= 5 },
        { id: 'off', i: '🌙', n: 'Fabrik läuft auch ohne mich', d: 'Komm nach mindestens einer Stunde Pause zurück.', t: () => S.offlineHour }
    ];

    /* ── Spielstand ────────────────────────────────────────────────────── */
    function fresh() {
        return {
            v: 1, bank: 0, run: 0, all: 0, clicks: 0, clickMade: 0, b: BUILDINGS.map(() => 0), u: [], a: [],
            mp: 0, formats: 0, golden: 0, krampf: false, offlineHour: false,
            started: Date.now(), runStart: Date.now(), t: Date.now(), reportedAt: 0, bulk: 1
        };
    }
    const S = Object.assign(fresh(), XIRU.load(SAVE) || {});
    S.b = BUILDINGS.map((B, i) => Math.max(0, Math.floor(+(S.b || [])[i] || 0)));
    S.u = Array.isArray(S.u) ? S.u.filter(id => UPG_MAP[id]) : [];
    S.a = Array.isArray(S.a) ? S.a.filter(id => ACH.some(a => a.id === id)) : [];
    ['bank', 'run', 'all', 'clicks', 'clickMade', 'mp', 'formats', 'golden'].forEach(k => { S[k] = isFinite(+S[k]) ? Math.max(0, +S[k]) : 0; });
    if (![1, 10, 100].includes(S.bulk)) S.bulk = 1;
    let ownedSet = new Set(S.u);
    const owned = id => ownedSet.has(id);
    const totalB = () => S.b.reduce((a, b) => a + b, 0);
    function era() { let e = 0; for (let k = 1; k <= 4; k++) if (owned('era' + k)) e = k; return e; }

    /* ── Produktion ────────────────────────────────────────────────────── */
    const buff = { rausch: 0, klick: 0 };
    let rate = 0, rateBase = 0, clickVal = 1;
    function bMult(i) { let m = 1; for (let k = 0; k < 5; k++) if (owned(BUILDINGS[i].id + k)) m *= 2; return m; }
    function globalMult() {
        let m = (1 + .05 * S.mp) * (1 + .01 * S.a.length);
        S.u.forEach(id => { const u = UPG_MAP[id]; if (u.g) m *= u.g; if (u.em) m *= u.em; });
        return m;
    }
    function unitRate(i) { return BUILDINGS[i].dps * bMult(i) * globalMult(); }
    function recalc() {
        const gm = globalMult();
        let s = 0;
        BUILDINGS.forEach((B, i) => { s += S.b[i] * B.dps * bMult(i); });
        rateBase = s * gm;
        rate = rateBase * (buff.rausch > 0 ? 7 : 1);
        let c = 1, syn = 0;
        S.u.forEach(id => { const u = UPG_MAP[id]; if (u.click) c *= u.click; if (u.syn) syn += u.syn; });
        clickVal = (c * (1 + .05 * S.mp) + rate * syn) * (buff.klick > 0 ? 77 : 1);
    }
    function produce(n) {
        if (!(n > 0)) return;
        S.bank += n; S.run += n; S.all += n;
        if (S.all >= 1e6) XIRU.egg('g-klicker-million');
    }

    /* ── Kaufen ────────────────────────────────────────────────────────── */
    function costOf(i, n) { const r = 1.15; return Math.ceil(BUILDINGS[i].cost * Math.pow(r, S.b[i]) * (Math.pow(r, n) - 1) / (r - 1)); }
    function buyBuilding(i) {
        const n = S.bulk, c = costOf(i, n);
        if (S.bank < c) { XIRU.beep(160, .08, 'square', .03); return; }
        S.bank -= c; S.b[i] += n;
        recalc();
        G.sfx.coin();
        renderBuildings(true);
        const el = document.querySelector('.kl-b[data-i="' + i + '"]');
        if (el) { el.classList.remove('is-bought'); void el.offsetWidth; el.classList.add('is-bought'); }
        checkAch(); refresh(true);
    }
    function buyUpgrade(id) {
        const u = UPG_MAP[id];
        if (!u || owned(id) || S.bank < u.cost) return;
        S.bank -= u.cost;
        S.u.push(id); ownedSet = new Set(S.u);
        recalc();
        if (u.era) {
            G.sfx.win(); XIRU.confetti(80);
            renderArt();
            XIRU.toast('Neues Zeitalter: ' + ERAS[u.era].n, 'Die Fabrik produziert jetzt ' + ERAS[u.era].pl + '. Gezählt wird weiter in Disketten.', { icon: u.i, time: 6000 });
        } else G.sfx.power();
        renderUpgrades(true); renderBuildings(true);
        checkAch(); refresh(true);
        save();
    }

    /* ── Klicken ───────────────────────────────────────────────────────── */
    const clickTimes = [];
    function doClick(x, y) {
        XIRU.audio();
        const v = clickVal;
        S.clicks++;
        S.clickMade += v;
        produce(v);
        const disk = $('kl-disk');
        disk.classList.remove('is-hit'); void disk.offsetWidth; disk.classList.add('is-hit');
        setTimeout(() => disk.classList.remove('is-hit'), 90);
        XIRU.beep(700 + Math.random() * 300, .03, 'square', .02);
        const now = performance.now();
        clickTimes.push(now);
        while (clickTimes.length && now - clickTimes[0] > 1000) clickTimes.shift();
        if (clickTimes.length >= 13 && !S.krampf) { S.krampf = true; XIRU.egg('g-klicker-krampf'); checkAch(); }
        // Partikel
        const r = stage.getBoundingClientRect();
        const px = x != null ? x - r.left : r.width / 2, py = y != null ? y - r.top : diskCenter().y;
        floats.push({ x: px, y: py - 10, s: '+' + big(v, true), t: 0, T: 1.1, vx: (Math.random() - .5) * 30 });
        const n = Math.min(7, 3 + Math.floor(Math.log10(v + 1)));
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, sp = 140 + Math.random() * 200;
            minis.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * TAU, vr: (Math.random() - .5) * 10, s: 9 + Math.random() * 6, t: 0, T: 1.4, e: era() });
        }
        refresh(false);
    }

    /* ── Goldene Disketten ─────────────────────────────────────────────── */
    let goldNext = 45 + Math.random() * 60, goldLeft = 0;
    const goldEl = $('kl-gold');
    function spawnGold() {
        const r = stage.getBoundingClientRect();
        goldEl.style.left = (8 + Math.random() * Math.max(10, r.width - 74)) + 'px';
        goldEl.style.top = (60 + Math.random() * Math.max(10, r.height - 150)) + 'px';
        goldEl.classList.remove('is-leaving');
        goldEl.hidden = false;
        goldLeft = owned('magnet') ? 20 : 13;
        XIRU.beep(1568, .08, 'triangle', .03);
    }
    function hideGold() {
        goldEl.hidden = true;
        goldLeft = 0;
        goldNext = (owned('magnet') ? .5 : 1) * (60 + Math.random() * 90);
    }
    goldEl.addEventListener('click', e => {
        e.stopPropagation();
        if (goldEl.hidden) return;
        const r = stage.getBoundingClientRect(), gr = goldEl.getBoundingClientRect();
        const x = gr.left - r.left + gr.width / 2, y = gr.top - r.top + gr.height / 2;
        hideGold();
        S.golden++;
        XIRU.egg('g-klicker-gold');
        const len = owned('goldrausch') ? 2 : 1, roll = Math.random();
        let msg;
        if (roll < .5) {
            const gain = Math.max(13, Math.min(S.bank * .15, rateBase * 900)) + 13;
            produce(gain);
            msg = 'Glückstreffer! +' + big(gain);
        } else if (roll < .85) {
            buff.rausch = 77 * len;
            msg = 'Brennrausch! Produktion ×7';
        } else {
            buff.klick = 13 * len;
            msg = 'Klickwahn! Klicks ×77';
        }
        recalc();
        G.sfx.win();
        floats.push({ x, y, s: msg, t: 0, T: 2.2, vx: 0, big: true, gold: true });
        for (let i = 0; i < 26; i++) {
            const a = Math.random() * TAU, sp = 60 + Math.random() * 220;
            sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, T: .9 + Math.random() * .5 });
        }
        checkAch(); refresh(true);
    });

    /* ── Erfolge ───────────────────────────────────────────────────────── */
    function checkAch() {
        let changed = false;
        ACH.forEach(a => {
            if (S.a.includes(a.id) || !a.t()) return;
            S.a.push(a.id); changed = true;
            XIRU.toast('Erfolg: ' + a.n, a.d + ' (+1 % Produktion)', { icon: a.i, time: 4000 });
            newAch.add(a.id);
        });
        if (changed) { recalc(); renderAch(); }
    }
    const newAch = new Set();

    /* ── Formatieren (Prestige) ────────────────────────────────────────── */
    const mpTotalFor = all => Math.floor(Math.sqrt(all / MP_BASE));
    const pendingMP = () => Math.max(0, mpTotalFor(S.all) - S.mp);
    function askFormat() {
        const p = pendingMP();
        if (p < 1) return;
        const m = XIRU.modal('<h2>Fabrik formatieren?</h2>' +
            '<p>Alle Disketten, Gebäude und Upgrades werden gelöscht – auch das aktuelle Zeitalter. Dafür bekommst du <strong>' + XIRU.fmt(p) + ' Magnetpunkte</strong>. ' +
            'Danach produzierst du dauerhaft <strong>+' + XIRU.fmt((S.mp + p) * 5) + ' %</strong>.</p>' +
            '<p class="small muted">Erfolge, Statistik und Magnetpunkte bleiben erhalten.</p>' +
            '<div class="row"><button class="btn btn--danger" type="button" data-format>Formatieren</button><button class="btn" type="button" data-close>Abbrechen</button></div>');
        m.el.querySelector('[data-format]').addEventListener('click', () => { m.close(); doFormat(); });
    }
    function doFormat() {
        const p = pendingMP();
        if (p < 1) return;
        const ov = $('kl-format');
        ov.hidden = false;
        G.sfx.die();
        setTimeout(() => {
            S.mp += p; S.formats++;
            S.bank = 0; S.run = 0; S.b = BUILDINGS.map(() => 0); S.u = []; ownedSet = new Set();
            S.runStart = Date.now();
            buff.rausch = 0; buff.klick = 0;
            hideGold();
            recalc(); renderArt(); renderBuildings(true); renderUpgrades(true);
            checkAch(); save();
            XIRU.egg('g-klicker-format');
            XIRU.confetti();
            G.sfx.win();
            ov.hidden = true;
            XIRU.toast('Formatiert!', '+' + XIRU.fmt(p) + ' Magnetpunkte. Die Fabrik startet neu – magnetischer als je zuvor.', { icon: '🧲' });
            refresh(true);
        }, 1700);
    }

    /* ── Speichern, Offline, Rekord ────────────────────────────────────── */
    function save() {
        S.t = Date.now();
        XIRU.save(SAVE, S);
        maybeReport(false);
    }
    function maybeReport(force) {
        const v = Math.floor(S.all), best = XIRU.best('klicker') || 0, now = Date.now();
        if (v < 1 || v <= best) return;
        // Nicht bei jedem Speichern melden (sonst gäbe es dauernd Rekord-XP)
        if (v >= Math.max(100, best * 1.5) || (now - (S.reportedAt || 0) > 5 * 60000) || (force && now - (S.reportedAt || 0) > 60000)) {
            XIRU.score('klicker', v);
            S.reportedAt = now;
            XIRU.save(SAVE, S);
            renderBest();
        }
    }
    function offline(sec, announce) {
        sec = Math.min(OFFLINE_MAX, Math.max(0, sec));
        if (sec < 1) return 0;
        buff.rausch = Math.max(0, buff.rausch - sec);
        buff.klick = Math.max(0, buff.klick - sec);
        recalc();
        const eff = owned('nacht') ? 1 : .5;
        const gain = rateBase * sec * eff;
        produce(gain);
        if (sec >= 3600) S.offlineHour = true;
        if (announce && gain >= 1 && sec >= 30) {
            const html = '<h2>Willkommen zurück!</h2><p>Du warst <strong>' + dur(sec) + '</strong> weg' + (sec >= OFFLINE_MAX ? ' (gezählt werden höchstens 8 Stunden)' : '') +
                '. In der Zeit hat die Fabrik <strong>' + big(gain) + ' Disketten</strong> gebrannt' + (eff < 1 ? ' – mit halber Kraft. Das Upgrade „Nachtschicht“ ändert das.' : '.') + '</p>' +
                '<button class="btn btn--primary" type="button" data-close>Weiterbrennen</button>';
            if (announce === 'modal') XIRU.modal(html);
            else XIRU.toast('Willkommen zurück', '+' + big(gain) + ' Disketten in ' + dur(sec), { icon: '🏭' });
        }
        checkAch();
        return gain;
    }

    /* ── Grafik: grosses Speichermedium ────────────────────────────────── */
    const stage = $('kl-stage');
    const ART = [
        // Diskette
        '<svg class="kl-art" viewBox="0 0 200 200" aria-hidden="true">' +
        '<path d="M26 14h128l32 32v128a12 12 0 0 1-12 12H26a12 12 0 0 1-12-12V26a12 12 0 0 1 12-12z" style="fill:var(--rc)"/>' +
        '<path d="M186 46v128a12 12 0 0 1-12 12H26a12 12 0 0 1-12-12v-6h150a10 10 0 0 0 10-10V40z" fill="#000" opacity=".14"/>' +
        '<rect x="52" y="14" width="88" height="60" rx="4" style="fill:var(--text-muted)"/>' +
        '<rect x="106" y="24" width="20" height="40" rx="3" style="fill:var(--rc)"/>' +
        '<rect x="60" y="20" width="8" height="48" rx="2" fill="#fff" opacity=".25"/>' +
        '<rect x="38" y="100" width="124" height="74" rx="8" style="fill:var(--surface)"/>' +
        '<text x="100" y="128" text-anchor="middle" font-size="18" font-weight="800" font-family="system-ui, sans-serif" style="fill:var(--rc)">XIRU</text>' +
        '<path d="M54 146h92M54 160h62" style="stroke:var(--border-strong)" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="22" y="160" width="10" height="12" rx="2" style="fill:var(--bg)"/></svg>',
        // CD
        '<svg class="kl-art kl-art--cd" viewBox="0 0 200 200" aria-hidden="true"><defs>' +
        '<linearGradient id="kl-cd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset=".35" style="stop-color:var(--accent-2)"/><stop offset=".7" style="stop-color:var(--rc)"/><stop offset="1" style="stop-color:var(--warning)"/></linearGradient></defs>' +
        '<g class="kl-spin"><circle cx="100" cy="100" r="92" style="fill:var(--surface-3)"/><circle cx="100" cy="100" r="92" fill="url(#kl-cd)" opacity=".6"/>' +
        '<path d="M100 8A92 92 0 0 1 192 100H140A40 40 0 0 0 100 60Z" fill="#fff" opacity=".22"/>' +
        '<path d="M100 192A92 92 0 0 1 8 100H60A40 40 0 0 0 100 140Z" fill="#fff" opacity=".12"/>' +
        '<circle cx="100" cy="100" r="86" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>' +
        '<circle cx="100" cy="100" r="62" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="10"/></g>' +
        '<circle cx="100" cy="100" r="34" style="fill:var(--surface-2);stroke:var(--border-strong)" stroke-width="2"/>' +
        '<circle cx="100" cy="100" r="15" style="fill:var(--bg)"/></svg>',
        // Festplatte
        '<svg class="kl-art" viewBox="0 0 200 200" aria-hidden="true"><defs>' +
        '<radialGradient id="kl-hdd" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient></defs>' +
        '<rect x="26" y="8" width="148" height="184" rx="14" style="fill:var(--surface-3);stroke:var(--border-strong)" stroke-width="3"/>' +
        '<circle cx="100" cy="86" r="64" style="fill:var(--text-muted)"/><circle cx="100" cy="86" r="64" fill="url(#kl-hdd)"/>' +
        '<g class="kl-spin"><circle cx="100" cy="86" r="46" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2" stroke-dasharray="30 12"/></g>' +
        '<circle cx="100" cy="86" r="13" style="fill:var(--surface-2)"/>' +
        '<path d="M150 160L114 98" style="stroke:var(--warning)" stroke-width="9" stroke-linecap="round"/>' +
        '<circle cx="150" cy="160" r="13" style="fill:var(--surface-2);stroke:var(--warning)" stroke-width="4"/>' +
        '<rect x="40" y="160" width="64" height="18" rx="3" style="fill:var(--rc)"/>' +
        '<g style="fill:var(--border-strong)"><circle cx="38" cy="20" r="4"/><circle cx="162" cy="20" r="4"/><circle cx="38" cy="180" r="4"/><circle cx="162" cy="184" r="3"/></g></svg>',
        // SSD
        '<svg class="kl-art" viewBox="0 0 200 200" aria-hidden="true"><g transform="rotate(-24 100 100)">' +
        '<rect x="6" y="64" width="188" height="72" rx="6" style="fill:var(--success)"/><rect x="6" y="64" width="188" height="72" rx="6" fill="#000" opacity=".45"/>' +
        '<g style="fill:var(--warning)"><rect x="8" y="70" width="4" height="60"/></g>' +
        '<g style="fill:var(--bg)"><rect x="18" y="72" width="6" height="56"/></g>' +
        '<rect x="34" y="74" width="46" height="52" rx="3" style="fill:var(--bg)"/><rect x="88" y="74" width="46" height="52" rx="3" style="fill:var(--bg)"/>' +
        '<rect x="144" y="84" width="30" height="32" rx="3" style="fill:var(--surface-3)"/>' +
        '<rect x="40" y="90" width="88" height="20" rx="3" style="fill:var(--surface)"/>' +
        '<text x="84" y="105" text-anchor="middle" font-size="12" font-weight="800" font-family="system-ui, sans-serif" style="fill:var(--rc)">XIRU 4 TB</text>' +
        '<circle cx="190" cy="100" r="7" style="fill:var(--bg)"/>' +
        '<path d="M40 80h30M94 80h30M40 120h30M94 120h30" stroke="#fff" stroke-opacity=".15" stroke-width="2"/></g></svg>',
        // Realitätskristall
        '<svg class="kl-art" viewBox="0 0 200 200" aria-hidden="true"><defs>' +
        '<linearGradient id="kl-kr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" style="stop-color:var(--accent-2)"/><stop offset="1" style="stop-color:var(--rc)"/></linearGradient></defs>' +
        '<polygon points="100,6 168,60 148,160 100,196 52,160 32,60" fill="url(#kl-kr)" style="stroke:var(--accent-2)" stroke-width="3" stroke-linejoin="round"/>' +
        '<polygon points="100,6 126,64 100,186 74,64" fill="#fff" opacity=".22"/>' +
        '<path d="M32 60H168M74 64L52 160M126 64L148 160M100 6L74 64M100 6L126 64" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none"/>' +
        '<circle cx="136" cy="40" r="5" fill="#fff"><animate attributeName="opacity" values="1;.2;1" dur="2.2s" repeatCount="indefinite"/></circle>' +
        '<circle cx="60" cy="120" r="3" fill="#fff"><animate attributeName="opacity" values=".2;1;.2" dur="1.7s" repeatCount="indefinite"/></circle></svg>'
    ];
    const GOLD_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 3h20l5 5v21H4z" style="fill:var(--warning)"/>' +
        '<rect x="9" y="3" width="13" height="9" rx="1" fill="#fff" opacity=".75"/><rect x="17" y="5" width="3" height="5" style="fill:var(--warning)"/>' +
        '<rect x="8" y="17" width="17" height="10" rx="1.5" fill="#fff" opacity=".85"/><path d="M11 21h11M11 24h7" style="stroke:var(--warning)" stroke-width="1.4"/></svg>';
    goldEl.innerHTML = GOLD_SVG;
    let artEra = -1;
    function renderArt() {
        const e = era();
        if (e === artEra) return;
        artEra = e;
        $('kl-disk').innerHTML = ART[e];
        $('kl-disk').setAttribute('aria-label', ERAS[e].n + ' brennen');
        $('kl-era').textContent = 'Zeitalter: ' + ERAS[e].n;
    }
    function diskCenter() {
        const r = stage.getBoundingClientRect(), d = $('kl-disk').getBoundingClientRect();
        return { x: d.left - r.left + d.width / 2, y: d.top - r.top + d.height / 2 };
    }

    /* ── Partikel-Leinwand ─────────────────────────────────────────────── */
    const fx = $('kl-fx'), fctx = fx.getContext('2d');
    let FW = 0, FH = 0, fdpr = 1;
    const floats = [], minis = [], sparks = [], rain = [], belt = [];
    let beltOff = 0, beltSpawn = 0, rainSpawn = 0;
    function resizeFx() {
        const r = stage.getBoundingClientRect();
        fdpr = Math.min(window.devicePixelRatio || 1, 2);
        FW = r.width; FH = r.height;
        fx.width = Math.round(FW * fdpr); fx.height = Math.round(FH * fdpr);
        fctx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
    }
    if ('ResizeObserver' in window) new ResizeObserver(resizeFx).observe(stage);
    else addEventListener('resize', resizeFx);
    resizeFx();

    function drawMini(g, e, x, y, s, rot) {
        g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s / 20, s / 20);
        switch (e) {
            case 0:
                g.fillStyle = rgb(C.rc); g.fillRect(-10, -10, 20, 20);
                g.fillStyle = rgb(C.textMuted); g.fillRect(-5, -10, 10, 7);
                g.fillStyle = rgb(C.surface); g.fillRect(-7, 2, 14, 7);
                break;
            case 1: {
                const gr = g.createLinearGradient(-10, -10, 10, 10);
                gr.addColorStop(0, rgb(C.accent)); gr.addColorStop(.5, rgb(C.accent2)); gr.addColorStop(1, rgb(C.rc));
                g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
                g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 10, -1.4, -.3); g.fill();
                g.fillStyle = rgb(C.bg); g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
                break;
            }
            case 2:
                g.fillStyle = rgb(C.surface3); g.fillRect(-8, -10, 16, 20);
                g.fillStyle = rgb(C.textMuted); g.beginPath(); g.arc(0, -2, 6, 0, TAU); g.fill();
                g.strokeStyle = rgb(C.warning); g.lineWidth = 2; g.beginPath(); g.moveTo(5, 7); g.lineTo(1, 0); g.stroke();
                break;
            case 3:
                g.fillStyle = rgb(mix(C.success, C.bg, .45)); g.fillRect(-11, -5, 22, 10);
                g.fillStyle = rgb(C.bg); g.fillRect(-7, -3.5, 5, 7); g.fillRect(-1, -3.5, 5, 7);
                g.fillStyle = rgb(C.warning); g.fillRect(-11, -4, 1.6, 8);
                break;
            default: {
                const gr = g.createLinearGradient(-8, -10, 8, 10);
                gr.addColorStop(0, '#fff'); gr.addColorStop(.4, rgb(C.accent2)); gr.addColorStop(1, rgb(C.rc));
                g.fillStyle = gr; g.beginPath();
                g.moveTo(0, -11); g.lineTo(8, -4); g.lineTo(6, 7); g.lineTo(0, 11); g.lineTo(-6, 7); g.lineTo(-8, -4); g.closePath(); g.fill();
                g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(0, -11); g.lineTo(3, -3); g.lineTo(0, 10); g.lineTo(-3, -3); g.fill();
            }
        }
        g.restore();
    }

    function stepFx(dt) {
        const e = era();
        // Fliessband: Tempo und Dichte wachsen mit der Produktion (logarithmisch)
        const lg = Math.log10(rate + 1);
        const speed = 20 + lg * 14;
        beltOff = (beltOff + speed * dt) % 16;
        beltSpawn -= dt;
        if (rate > 0 && beltSpawn <= 0) { belt.push({ x: -14, e, r: (Math.random() - .5) * .3 }); beltSpawn = Math.max(.25, 2.2 - lg * .35); }
        belt.forEach(b => { b.x += speed * dt; });
        while (belt.length && belt[0].x > FW + 20) belt.shift();
        // Regen kleiner Medien bei hoher Produktion
        rainSpawn -= dt;
        if (rate >= 10 && rainSpawn <= 0) {
            rain.push({ x: Math.random() * FW, y: -12, vy: 40 + Math.random() * 40, r: Math.random() * TAU, vr: (Math.random() - .5) * 2, e, s: 8 + Math.random() * 5 });
            rainSpawn = Math.max(.12, 1.4 - lg * .15);
        }
        rain.forEach(p => { p.y += p.vy * dt; p.r += p.vr * dt; });
        for (let i = rain.length - 1; i >= 0; i--) if (rain[i].y > FH + 12) rain.splice(i, 1);
        minis.forEach(p => { p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; });
        for (let i = minis.length - 1; i >= 0; i--) if (minis[i].t > minis[i].T) minis.splice(i, 1);
        floats.forEach(f => { f.t += dt; f.y -= (f.big ? 26 : 60) * dt; f.x += f.vx * dt; });
        for (let i = floats.length - 1; i >= 0; i--) if (floats[i].t > floats[i].T) floats.splice(i, 1);
        sparks.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt; });
        for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > sparks[i].T) sparks.splice(i, 1);
        if (minis.length > 160) minis.splice(0, minis.length - 160);
        if (floats.length > 40) floats.splice(0, floats.length - 40);
    }
    function drawFx() {
        const g = fctx;
        g.clearRect(0, 0, FW, FH);
        // Regen im Hintergrund
        g.globalAlpha = .28;
        rain.forEach(p => drawMini(g, p.e, p.x, p.y, p.s, p.r));
        g.globalAlpha = 1;
        // Fliessband
        const by = FH - 30;
        g.fillStyle = rgb(C.surface3); g.fillRect(0, by, FW, 14);
        g.fillStyle = rgb(C.borderStrong);
        for (let x = -16 + beltOff; x < FW; x += 16) g.fillRect(x, by + 5, 8, 3);
        g.fillStyle = rgb(C.surface2); g.fillRect(0, by + 14, FW, 4);
        for (let x = 10; x < FW; x += 44) { g.fillStyle = rgb(C.borderStrong); g.beginPath(); g.arc(x, by + 22, 5, 0, TAU); g.fill(); }
        belt.forEach(b => drawMini(g, b.e, b.x, by - 7, 14, b.r));
        // Klick-Medien
        minis.forEach(p => { g.globalAlpha = Math.max(0, 1 - p.t / p.T); drawMini(g, p.e, p.x, p.y, p.s, p.r); });
        g.globalAlpha = 1;
        // Funken
        sparks.forEach(p => { g.fillStyle = rgb(C.warning, 1 - p.t / p.T); g.fillRect(p.x - 2, p.y - 2, 4, 4); });
        // Zahlen
        g.textAlign = 'center'; g.textBaseline = 'middle';
        floats.forEach(f => {
            const a = Math.min(1, (f.T - f.t) * 2.5);
            g.font = (f.big ? '800 17px ' : '800 16px ') + 'system-ui, sans-serif';
            g.fillStyle = rgb(C.bg, a * .6); g.fillText(f.s, f.x + 1, f.y + 1.5);
            g.fillStyle = rgb(f.gold ? C.warning : C.text, a); g.fillText(f.s, f.x, f.y);
        });
    }

    /* ── Oberfläche ────────────────────────────────────────────────────── */
    function buildingVisible(i) { return i === 0 || S.b[i] > 0 || S.b[i - 1] > 0 || S.all >= BUILDINGS[i].cost * .5; }
    let bSig = '';
    function renderBuildings(force) {
        const vis = BUILDINGS.map((B, i) => buildingVisible(i));
        const lastVis = vis.lastIndexOf(true);
        const sig = S.bulk + '|' + S.b.join(',') + '|' + vis.join('') + '|' + S.u.length + '|' + S.mp + '|' + S.a.length;
        if (force || sig !== bSig) {
            bSig = sig;
            let html = '';
            BUILDINGS.forEach((B, i) => {
                if (vis[i]) {
                    const each = unitRate(i);
                    html += '<button type="button" class="kl-b" data-i="' + i + '" title="' + esc(B.d + ' · Jedes Stück: ' + big(each, true) + '/s · Alle: ' + big(each * S.b[i], true) + '/s') + '">' +
                        '<span class="kl-b__icon" aria-hidden="true">' + B.i + '</span><span class="kl-b__main"><b>' + esc(B.n) + '</b>' +
                        '<small><span class="kl-b__cost" data-cost="' + i + '">' + big(costOf(i, S.bulk)) + '</span>' + (S.bulk > 1 ? ' für ' + S.bulk : '') + ' · +' + big(each, true) + '/s</small></span>' +
                        '<span class="kl-b__count">' + XIRU.fmt(S.b[i]) + '</span></button>';
                } else if (i === lastVis + 1) {
                    html += '<div class="kl-b is-unknown" aria-hidden="true"><span class="kl-b__icon">❔</span><span class="kl-b__main"><b>???</b><small>' + big(B.cost) + '</small></span><span class="kl-b__count"></span></div>';
                }
            });
            $('kl-buildings').innerHTML = html;
        }
        document.querySelectorAll('.kl-b[data-i]').forEach(el => el.classList.toggle('is-poor', S.bank < costOf(+el.dataset.i, S.bulk)));
    }
    let uSig = '';
    function renderUpgrades(force) {
        const avail = UPG.filter(u => !owned(u.id) && u.need()).sort((a, b) => a.cost - b.cost);
        const sig = avail.map(u => u.id).join(',');
        if (force || sig !== uSig) {
            uSig = sig;
            $('kl-upgrades').innerHTML = avail.length ? avail.slice(0, 18).map(u =>
                '<button type="button" class="kl-up' + (u.era ? ' is-era' : '') + '" data-u="' + u.id + '" title="' + esc(u.d) + '">' +
                '<span class="kl-up__icon" aria-hidden="true">' + u.i + '</span><b>' + esc(u.n) + '</b>' +
                '<small><span class="kl-b__cost">' + big(u.cost) + '</span> · ' + esc(u.d) + '</small></button>').join('')
                : '<p class="kl-up-empty">Gerade gibt es nichts Neues. Bau weiter – neue Upgrades tauchen auf, sobald die Fabrik wächst.</p>';
            $('kl-up-count').textContent = S.u.length + ' gekauft';
        }
        document.querySelectorAll('.kl-up[data-u]').forEach(el => el.classList.toggle('is-poor', S.bank < UPG_MAP[el.dataset.u].cost));
    }
    function renderAch() {
        $('kl-ach').innerHTML = ACH.map(a => {
            const got = S.a.includes(a.id);
            return '<button type="button" class="kl-ach' + (got ? '' : ' is-locked') + (newAch.has(a.id) ? ' is-new' : '') + '" data-a="' + a.id + '" title="' + esc(got ? a.n + ' – ' + a.d : 'Noch nicht freigeschaltet') + '">' + (got ? a.i : '?') + '</button>';
        }).join('');
        newAch.clear();
        $('kl-ach-count').textContent = S.a.length + '/' + ACH.length;
    }
    function renderBest() {
        const b = XIRU.best('klicker');
        $('best').textContent = b == null ? '–' : big(b);
        $('best').title = b == null ? '' : XIRU.fmt(b) + ' Disketten';
    }
    function renderStats() {
        const rows = [
            ['Insgesamt produziert', big(S.all)],
            ['Seit dem Formatieren', big(S.run)],
            ['Durch Klicks', big(S.clickMade)],
            ['Klicks', XIRU.fmt(S.clicks)],
            ['Gebäude', XIRU.fmt(totalB())],
            ['Upgrades', XIRU.fmt(S.u.length)],
            ['Goldene Disketten', XIRU.fmt(S.golden)],
            ['Formatiert', S.formats + '×'],
            ['Laufzeit seit Start', dur((Date.now() - S.runStart) / 1000)]
        ];
        $('kl-stats').innerHTML = rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
    }
    function renderPrestige() {
        const p = pendingMP(), total = mpTotalFor(S.all);
        $('kl-mp').textContent = XIRU.fmt(S.mp);
        $('kl-mp-bonus').textContent = '+' + XIRU.fmt(S.mp * 5) + ' %';
        $('kl-mp-new').textContent = '+' + XIRU.fmt(p);
        const cur = Math.pow(total, 2) * MP_BASE, next = Math.pow(total + 1, 2) * MP_BASE;
        const k = Math.max(0, Math.min(1, (S.all - cur) / (next - cur)));
        $('kl-mp-bar').style.setProperty('--v', (k * 100).toFixed(1) + '%');
        $('kl-mp-next').textContent = 'Nächster Magnetpunkt bei ' + big(next) + ' Disketten insgesamt.';
        const btn = $('kl-format-btn');
        btn.disabled = p < 1;
        btn.textContent = p < 1 ? 'Fabrik formatieren' : 'Formatieren (+' + XIRU.fmt(p) + ' Magnetpunkte)';
    }
    function renderBuffs() {
        const out = [];
        if (buff.rausch > 0) out.push('🔥 Brennrausch ×7 · ' + Math.ceil(buff.rausch) + ' s');
        if (buff.klick > 0) out.push('👆 Klickwahn ×77 · ' + Math.ceil(buff.klick) + ' s');
        $('kl-buffs').innerHTML = out.map(s => '<span class="kl-buff">' + s + '</span>').join('');
    }
    let uiT = 0, slowT = 0;
    function refresh(all) {
        $('kl-num').textContent = big(S.bank);
        $('kl-num').parentElement.title = big(S.bank, false, true) + ' Disketten';
        $('kl-rate').textContent = big(rate, true);
        $('kl-cp').textContent = '+' + big(clickVal, true);
        if (all) { renderBuildings(); renderUpgrades(); renderPrestige(); renderBuffs(); renderStats(); }
    }

    /* ── Nachrichtenticker ─────────────────────────────────────────────── */
    const NEWS = [
        [() => true, 'Ein Praktikant fragt, wofür man Disketten eigentlich braucht. Man zeigt ihm das Speichern-Symbol.'],
        [() => true, 'Die Buchhaltung rechnet weiterhin in Disketten. Aus Prinzip.'],
        [() => true, 'Studie: 1,44 MB reichen für genau ein halbes Handyfoto. Die Fabrik bleibt optimistisch.'],
        [() => true, 'Wetter: heiter, Laufwerke warm, Leseköpfe gut gelaunt.'],
        [() => true, 'Tipp: Ab und zu blitzt eine goldene Diskette auf. Schnell sein lohnt sich.'],
        [() => S.b[0] >= 5, 'Praktikanten fordern mehr Kaffee. Die Kaffeemaschine fordert mehr Praktikanten.'],
        [() => S.b[1] >= 1, 'Klack, klack, klack: Die Nachbarn beschweren sich über das Rattern der Laufwerke.'],
        [() => S.b[2] >= 1, 'Brennstrasse meldet Rekord: 0 Staus, 3 Kaffeepausen, 1 verirrte Taube.'],
        [() => S.b[4] >= 1, 'Der Floppy-Hub-Server sortiert die Spielebibliothek – zum 47. Mal heute.'],
        [() => S.b[7] >= 1, 'Das Rechenzentrum heizt im Winter gleich das ganze Quartier.'],
        [() => S.b[9] >= 1, 'Zeitmaschine geliefert. Gestern.'],
        [() => S.b[10] >= 1, 'Quanten-Diskette gesichtet. Oder auch nicht.'],
        [() => era() >= 1, 'CDs im Sortiment! Ein Mitarbeiter benutzt eine als Untersetzer und wird befördert.'],
        [() => era() >= 2, 'Festplatten surren. Jemand hat «Nicht schütteln!» auf jede einzelne geschrieben.'],
        [() => era() >= 3, 'Die SSDs sind so schnell, dass die Etiketten kaum hinterherkommen.'],
        [() => era() >= 4, 'Realitätskristalle im Lager. Niemand weiss genau, wie sie da reingekommen sind.'],
        [() => S.formats >= 1, 'Formatieren ist kein Weltuntergang. Nur ein kleiner. Mit Bonus.'],
        [() => S.golden >= 1, 'Augenzeugen berichten von goldenen Disketten. Die Versicherung ist skeptisch.'],
        [() => S.all >= 1e6, 'Eine Million Disketten! Übereinander gestapelt reichen sie bis … ziemlich hoch.'],
        [() => S.all >= 1e9, 'Die Nationalbank fragt vorsichtig an, ob Disketten als Währung taugen.'],
        [() => new Date().getHours() < 5, 'Nachtschicht: Die Laufwerke summen ein leises Schlaflied.']
    ];
    let newsIdx = -1;
    function nextNews() {
        const pool = NEWS.filter(n => n[0]());
        let i;
        do { i = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && pool[i][1] === newsIdx);
        newsIdx = pool[i][1];
        const el = $('kl-news');
        el.classList.add('is-fading');
        setTimeout(() => { el.textContent = '📰 ' + newsIdx; el.classList.remove('is-fading'); }, 400);
    }

    /* ── Schleife ──────────────────────────────────────────────────────── */
    let lastWall = Date.now(), achT = 0, saveT = 0, newsT = 9;
    function update(dt) {
        const now = Date.now();
        const d = (now - lastWall) / 1000;
        lastWall = now;
        if (d > 0) {
            if (d > 5) offline(d, 'toast');     // Lücke (z. B. Tab im Hintergrund) → Offline-Regel
            else {
                produce(rate * d);
                if (buff.rausch > 0 || buff.klick > 0) {
                    const was = buff.rausch > 0 || buff.klick > 0;
                    buff.rausch = Math.max(0, buff.rausch - d); buff.klick = Math.max(0, buff.klick - d);
                    if (was && !(buff.rausch > 0) && !(buff.klick > 0)) recalc();
                    else if (buff.rausch <= 0 || buff.klick <= 0) recalc();
                }
                if (!document.hidden) {
                    if (goldLeft > 0) {
                        goldLeft -= d;
                        if (goldLeft < 1.2) goldEl.classList.add('is-leaving');
                        if (goldLeft <= 0) hideGold();
                    } else { goldNext -= d; if (goldNext <= 0) spawnGold(); }
                }
            }
        }
        stepFx(dt);
        uiT -= dt; slowT -= dt; achT -= dt; saveT -= dt; newsT -= dt;
        if (uiT <= 0) { uiT = .1; refresh(false); }
        if (slowT <= 0) { slowT = .5; refresh(true); }
        if (achT <= 0) { achT = 1; checkAch(); }
        if (newsT <= 0) { newsT = 11; nextNews(); }
        if (saveT <= 0) { saveT = 15; save(); }
    }
    const loop = G.loop(update, drawFx);

    /* ── Eingaben ──────────────────────────────────────────────────────── */
    $('kl-disk').addEventListener('click', e => doClick(e.detail ? e.clientX : null, e.detail ? e.clientY : null));
    document.addEventListener('keydown', e => {
        if (e.key !== ' ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t && t !== document.body && t !== document.documentElement) return;
        e.preventDefault();
        doClick(null, null);
    });
    $('kl-buildings').addEventListener('click', e => { const b = e.target.closest('.kl-b[data-i]'); if (b) buyBuilding(+b.dataset.i); });
    $('kl-upgrades').addEventListener('click', e => { const b = e.target.closest('.kl-up[data-u]'); if (b) buyUpgrade(b.dataset.u); });
    $('kl-bulk').addEventListener('click', e => {
        const b = e.target.closest('[data-bulk]');
        if (!b) return;
        S.bulk = +b.dataset.bulk;
        document.querySelectorAll('#kl-bulk .chip').forEach(c => c.classList.toggle('is-active', c === b));
        G.sfx.click(); renderBuildings(true);
    });
    $('kl-ach').addEventListener('click', e => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        const a = ACH.find(x => x.id === b.dataset.a), got = S.a.includes(a.id);
        $('kl-ach-info').innerHTML = got ? '<strong>' + esc(a.i + ' ' + a.n) + '</strong> – ' + esc(a.d) : '<strong>???</strong> – ' + esc(a.d);
    });
    $('kl-format-btn').addEventListener('click', askFormat);
    // Im Hintergrund pausiert die Schleife; die Zeitlücke rechnet update() danach als Offline-Zeit ab.
    document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); maybeReport(true); } });
    addEventListener('pagehide', () => { save(); maybeReport(true); });
    XIRU.on('setting', () => { C = readPalette(); });

    /* ── Start ─────────────────────────────────────────────────────────── */
    document.querySelectorAll('#kl-bulk .chip').forEach(c => c.classList.toggle('is-active', +c.dataset.bulk === S.bulk));
    recalc();
    const away = (Date.now() - (S.t || Date.now())) / 1000;
    if (S.all > 0 && away > 5) offline(away, 'modal');
    lastWall = Date.now();
    renderArt(); renderBuildings(true); renderUpgrades(true); renderAch(); renderBest(); refresh(true);
    nextNews();
    checkAch();
    if (S.all >= 1e6) XIRU.egg('g-klicker-million');
    loop.start();
});
