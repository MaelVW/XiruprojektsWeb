/* ==========================================================================
   Turmwacht – Tower Defense der Xiru-Spielhalle
   Türme an die Datenleitung bauen, aufrüsten und 25 Wellen Viren aufhalten.
   ========================================================================== */
XIRU.ready(function () {
    'use strict';
    const G = XIRU.Game;
    XIRU.typedEggs = false;              // viele Tastenkürzel → hier keine getippten Wort-Kristalle

    const COLS = 20, ROWS = 13, CS = 32, LAST = 25, TAU = Math.PI * 2;
    const { cv, ctx, W, H, dpr } = G.canvas('#cv', COLS * CS, ROWS * CS);
    const ov = G.overlay('#ov');
    const $ = id => document.getElementById(id);
    const fmt = n => XIRU.fmt(Math.round(n));
    const esc = XIRU.esc;

    /* ── Farben aus dem aktiven Design ─────────────────────────────────── */
    let C = readPalette();
    function readPalette() {
        const probe = document.createElement('i');
        probe.style.display = 'none';
        document.body.appendChild(probe);
        const t = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        const out = {};
        ['bg', 'bg-2', 'surface', 'surface-2', 'surface-3', 'border', 'border-strong', 'text', 'text-muted', 'text-faint',
            'accent', 'accent-2', 'success', 'warning', 'danger', 'rc'].forEach(n => {
            probe.style.color = 'var(--' + n + ')';
            t.clearRect(0, 0, 1, 1);
            t.fillStyle = '#808080';
            t.fillStyle = getComputedStyle(probe).color;
            t.fillRect(0, 0, 1, 1);
            const d = t.getImageData(0, 0, 1, 1).data;
            out[n.replace(/-(\w)/g, (m, c) => c.toUpperCase())] = [d[0], d[1], d[2]];
        });
        probe.remove();
        return out;
    }
    const rgb = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
    const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
    const WHITE = [255, 255, 255];

    /* ── Türme ─────────────────────────────────────────────────────────── */
    const TOWERS = {
        pfeil: {
            n: 'Pfeilturm', key: '1', col: 'success', cost: 50, air: true,
            desc: 'Schnelle Einzelschüsse. Trifft auch Flieger.',
            lv: [{ dmg: 12, rate: 1.6, range: 3.0 }, { dmg: 19, rate: 1.9, range: 3.3, cost: 40 },
                { dmg: 30, rate: 2.2, range: 3.6, cost: 85 }, { dmg: 46, rate: 2.6, range: 4.0, cost: 160, multi: 2 }]
        },
        kanone: {
            n: 'Kanone', key: '2', col: 'danger', cost: 90, air: false,
            desc: 'Explodiert mit Flächenschaden und knackt Panzer. Trifft keine Flieger.',
            lv: [{ dmg: 28, rate: .6, range: 2.6, splash: .95 }, { dmg: 45, rate: .65, range: 2.8, splash: 1.05, cost: 70 },
                { dmg: 70, rate: .7, range: 3.0, splash: 1.2, cost: 135 }, { dmg: 115, rate: .8, range: 3.3, splash: 1.45, cost: 240 }]
        },
        frost: {
            n: 'Frostturm', key: '3', col: 'accent', cost: 70, air: true,
            desc: 'Eisige Welle: verlangsamt alle Gegner in Reichweite.',
            lv: [{ dmg: 4, rate: .9, range: 2.3, slow: .35, dur: 1.6 }, { dmg: 7, rate: 1, range: 2.5, slow: .45, dur: 1.8, cost: 55 },
                { dmg: 11, rate: 1.1, range: 2.7, slow: .55, dur: 2, cost: 100 }, { dmg: 18, rate: 1.25, range: 3, slow: .62, dur: 2.2, freeze: .12, cost: 175 }]
        },
        blitz: {
            n: 'Blitzturm', key: '4', col: 'warning', cost: 120, air: true,
            desc: 'Ein Blitz springt von Gegner zu Gegner.',
            lv: [{ dmg: 24, rate: .75, range: 2.8, chain: 3 }, { dmg: 34, rate: .85, range: 3, chain: 4, cost: 90 },
                { dmg: 50, rate: .95, range: 3.3, chain: 5, cost: 165 }, { dmg: 76, rate: 1.1, range: 3.6, chain: 7, cost: 275 }]
        },
        laser: {
            n: 'Laser', key: '5', col: 'rc', cost: 150, air: true,
            desc: 'Dauerstrahl, wird auf dasselbe Ziel bis ×3,5 stärker. Ignoriert Panzerung.',
            lv: [{ dps: 18, range: 3.2 }, { dps: 28, range: 3.4, cost: 110 }, { dps: 42, range: 3.7, cost: 195 }, { dps: 66, range: 4, cost: 320 }]
        }
    };
    const TKEYS = Object.keys(TOWERS);
    const MODES = [{ id: 'erster', n: 'Erster' }, { id: 'letzter', n: 'Letzter' }, { id: 'staerkster', n: 'Stärkster' }, { id: 'naechster', n: 'Nächster' }];

    /* ── Gegner ────────────────────────────────────────────────────────── */
    const FOES = {
        kaefer: { n: 'Käfer', col: 'danger', hp: 36, spd: 38, bounty: 4, r: 7, d: 'Ein ganz gewöhnlicher Bug. Davon gibt es viele.' },
        flitzer: { n: 'Flitzer', col: 'warning', hp: 22, spd: 72, bounty: 4, r: 5.5, d: 'Schwach, aber doppelt so schnell.' },
        panzer: { n: 'Panzerkäfer', col: 'textMuted', hp: 95, spd: 27, bounty: 8, r: 9, armor: 5, lives: 2, d: 'Panzerung schluckt 5 Schaden pro Treffer. Laser und Kanone helfen.' },
        flieger: { n: 'Flugwurm', col: 'accent2', hp: 40, spd: 46, bounty: 6, r: 8, fly: true, d: 'Fliegt direkt zum Hub. Kanonen treffen ihn nicht.' },
        heiler: { n: 'Patch-Bot', col: 'success', hp: 70, spd: 32, bounty: 10, r: 8, heal: true, d: 'Flickt alle zwei Sekunden die Gegner in seiner Nähe.' },
        teiler: { n: 'Fork-Bombe', col: 'rc', hp: 75, spd: 33, bounty: 6, r: 8.5, split: 3, lives: 2, d: 'Zerfällt beim Platzen in drei flinke Prozesse.' },
        prozess: { n: 'Prozess', col: 'rc', hp: 16, spd: 58, bounty: 1, r: 4.5, d: 'Kleiner Ableger einer Fork-Bombe.' },
        boss: { n: 'Megavirus', col: 'danger', hp: 1400, spd: 20, bounty: 150, r: 15, armor: 6, lives: 10, boss: true, d: 'Riesig, gepanzert, halb immun gegen Frost. Kostet 10 Leben.' }
    };
    const CODES = { k: 'kaefer', f: 'flitzer', p: 'panzer', l: 'flieger', h: 'heiler', t: 'teiler', b: 'boss' };
    const GAPS = { kaefer: .8, flitzer: .45, panzer: 1.1, flieger: .8, heiler: 1.2, teiler: 1, boss: 3 };
    // Leerzeichen = nacheinander, + = gemischt
    const WAVES = ['k8', 'k12', 'k8 f6', 'f12+k6', 'k6 p4', 'l8 k6', 'k10+h3', 't6 f8', 'p6+h2 l6', 'k10 b1',
        'f16+h4', 'p10+h3', 'l12 t6', 'k20+f10', 'l20', 't10+h4 p4', 'f24 l8', 'p14+h5', 'k16+t8 l8', 'p8+h4 b1',
        'f30 t8', 'l16 p10', 'p16+h6 l8', 't14+f20+h6', 'p10+l10 b2'];

    /* ── Karten ────────────────────────────────────────────────────────── */
    const MAPS = [
        { id: 'wiese', n: 'Platinenwiese', diff: 'Leicht', mult: 1, hp: 1, gold: 180, lives: 20,
            paths: [[[-1, 2], [4, 2], [4, 10], [8, 10], [8, 2], [12, 2], [12, 10], [16, 10], [16, 5], [19, 5]]] },
        { id: 'kern', n: 'Prozessorkern', diff: 'Mittel', mult: 1.3, hp: 1.15, gold: 170, lives: 20,
            paths: [[[-1, 1], [18, 1], [18, 11], [1, 11], [1, 4], [15, 4], [15, 8], [6, 8]]] },
        { id: 'schlucht', n: 'Kabelschlucht', diff: 'Schwer', mult: 1.6, hp: 1.1, gold: 190, lives: 20,
            paths: [[[-1, 6], [4, 6], [4, 2], [10, 2], [10, 10], [15, 10], [15, 5], [19, 5]]] },
        { id: 'gabel', n: 'Datengabelung', diff: 'Experte', mult: 1.9, hp: 1.15, gold: 230, lives: 15,
            paths: [[[-1, 2], [5, 2], [5, 6], [10, 6], [10, 10], [15, 10], [15, 3], [19, 3]],
                [[-1, 10], [7, 10], [7, 6], [10, 6], [10, 10], [15, 10], [15, 3], [19, 3]]] }
    ];
    const DIFF_BADGE = { Leicht: 'badge--success', Mittel: 'badge--accent', Schwer: 'badge--warning', Experte: 'badge--danger' };

    /* ── Zustand ───────────────────────────────────────────────────────── */
    let map = MAPS[0], routes = [], pathSet = new Set(), base = { x: 0, y: 0 };
    let towers = [], foes = [], shots = [], parts = [], texts = [], bolts = [], rings = [];
    let gold = 0, lives = 0, wave = 0, score = 0, kills = 0, state = 'menu', paused = false, speed = 1, endless = false;
    let queue = [], qi = 0, qClock = 0, autoT = -1;
    let selType = null, sel = null, hover = null, kb = null, touchCell = null;
    let time = 0, shake = 0, baseFlash = 0, banner = null, builtTotal = 0, nopeT = 0, nopeCell = null;
    let bg = null, hudT = 0, infoSig = '';
    const icons = { foe: {}, tower: {} };

    /* ── Wege ──────────────────────────────────────────────────────────── */
    function makeRoute(pts) {
        const P = pts.map(p => ({ x: p[0] * CS + CS / 2, y: p[1] * CS + CS / 2 }));
        const segs = [];
        let len = 0;
        for (let i = 0; i < P.length - 1; i++) {
            const a = P[i], b = P[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
            segs.push({ a, b, l, s: len, ang: Math.atan2(b.y - a.y, b.x - a.x) });
            len += l;
        }
        return { pts: P, segs, len };
    }
    function posAt(rt, d) {
        d = Math.max(0, Math.min(rt.len, d));
        for (const s of rt.segs) {
            if (d <= s.s + s.l) {
                const k = s.l ? (d - s.s) / s.l : 0;
                return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, ang: s.ang };
            }
        }
        const s = rt.segs[rt.segs.length - 1];
        return { x: s.b.x, y: s.b.y, ang: s.ang };
    }
    function prepareMap(m) {
        map = m;
        routes = m.paths.map(p => ({ ground: makeRoute(p), air: makeRoute([p[0], p[p.length - 1]]) }));
        pathSet = new Set();
        m.paths.forEach(p => {
            for (let i = 0; i < p.length - 1; i++) {
                let x = p[i][0], y = p[i][1];
                const x2 = p[i + 1][0], y2 = p[i + 1][1], dx = Math.sign(x2 - x), dy = Math.sign(y2 - y);
                for (;;) {
                    if (x >= 0 && y >= 0 && x < COLS && y < ROWS) pathSet.add(x + ',' + y);
                    if (x === x2 && y === y2) break;
                    x += dx; y += dy;
                }
            }
        });
        const e = m.paths[0][m.paths[0].length - 1];
        base = { x: e[0] * CS + CS / 2, y: e[1] * CS + CS / 2 };
        buildBackground();
    }
    const towerAt = (x, y) => towers.find(t => t.x === x && t.y === y) || null;
    const buildable = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !pathSet.has(x + ',' + y) && !towerAt(x, y);

    /* ── Wellen ────────────────────────────────────────────────────────── */
    function hpMul(n) { return (1 + .15 * (n - 1) + .012 * (n - 1) * (n - 1)) * map.hp; }
    function waveSource(n) {
        if (n <= LAST) return { src: WAVES[n - 1], scale: 1 };
        let src = WAVES[15 + (n - LAST - 1) % 10];
        if (n % 5 === 0) src += ' b' + (1 + Math.floor((n - LAST) / 10));
        return { src, scale: 1 + (n - LAST) * .1 };
    }
    function waveSpec(n) {
        const { src, scale } = waveSource(n);
        const out = [];
        let t = 0, k = 0;
        src.split(' ').forEach(block => {
            const items = [];
            block.split('+').forEach(g => {
                const type = CODES[g[0]];
                const c = Math.max(1, Math.round(+g.slice(1) * (type === 'boss' ? 1 : scale)));
                for (let i = 0; i < c; i++) items.push({ type, pos: (i + .5) / c + Math.random() * 1e-3 });
            });
            items.sort((a, b) => a.pos - b.pos);
            items.forEach((it, i) => {
                if (i) t += GAPS[it.type] * (items.length > 14 ? .85 : 1);
                out.push({ type: it.type, at: t, route: k++ % routes.length });
            });
            t += 1.8;
        });
        return out;
    }
    function waveCounts(n) {
        const c = {};
        waveSpec(n).forEach(q => { c[q.type] = (c[q.type] || 0) + 1; });
        return c;
    }

    /* ── Töne (gedrosselt, damit es bei vielen Treffern nicht knattert) ── */
    const lastSnd = {};
    const SND_GAP = { arrow: 70, kill: 55, zap: 90, frost: 140, cannon: 90, boom: 120 };
    function sfx(name) {
        const now = performance.now();
        if (lastSnd[name] && now - lastSnd[name] < (SND_GAP[name] || 40)) return;
        lastSnd[name] = now;
        switch (name) {
            case 'arrow': XIRU.beep(1500, .025, 'triangle', .015); break;
            case 'cannon': XIRU.beep(130, .1, 'sawtooth', .035); break;
            case 'boom': XIRU.beep(70, .22, 'sawtooth', .05); break;
            case 'frost': XIRU.beep(1900, .09, 'sine', .02); break;
            case 'zap': XIRU.beep(2400, .04, 'square', .015); setTimeout(() => XIRU.beep(1100, .05, 'square', .015), 35); break;
            case 'kill': XIRU.beep(640 + Math.random() * 220, .04, 'square', .018); break;
            case 'leak': G.sfx.hit(); break;
            case 'build': XIRU.beep(330, .06, 'square', .04); setTimeout(() => XIRU.beep(495, .08, 'square', .04), 60); break;
            case 'up': G.sfx.power(); break;
            case 'sell': G.sfx.coin(); break;
            case 'nope': XIRU.beep(150, .1, 'square', .04); break;
            case 'click': G.sfx.click(); break;
            case 'wave': [392, 523].forEach((f, i) => setTimeout(() => XIRU.beep(f, .1, 'triangle', .05), i * 110)); break;
            case 'clear': G.sfx.coin(); break;
            case 'boss': [110, 104, 98].forEach((f, i) => setTimeout(() => XIRU.beep(f, .3, 'sawtooth', .05), i * 280)); break;
        }
    }

    /* ── Effekte ───────────────────────────────────────────────────────── */
    function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU, v = (30 + Math.random() * 110) * (sp || 1);
            parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .5, t: 0, col, s: 1.5 + Math.random() * 2.5 });
        }
        if (parts.length > 600) parts.splice(0, parts.length - 600);
    }
    function addText(x, y, s, col, small) {
        texts.push({ x, y, s, col: col || 'text', t: 0, T: small ? .8 : 1.3, small: !!small });
        if (texts.length > 60) texts.shift();
    }
    function showBanner(txt, sub, col) { banner = { txt, sub: sub || '', col: col || 'rc', t: 0, T: 2.6 }; }

    /* ── Spielablauf ───────────────────────────────────────────────────── */
    function startGame(m) {
        prepareMap(m);
        towers = []; foes = []; shots = []; parts = []; texts = []; bolts = []; rings = [];
        gold = m.gold; lives = m.lives; wave = 0; score = 0; kills = 0;
        state = 'build'; paused = false; endless = false; speed = 1;
        queue = []; qi = 0; qClock = 0; autoT = -1;
        selType = null; sel = null; kb = null; touchCell = null; builtTotal = 0; banner = null;
        $('btn-speed').textContent = '×1';
        ov.hide();
        showBanner(m.n, 'Baue Türme und starte Welle 1 mit der Leertaste.', 'rc');
        infoSig = ''; refreshUI(true); updateNext();
        loop.start();
    }

    function startWave() {
        if (paused) return;
        const spawning = state === 'wave' && qi < queue.length;
        if ((state !== 'build' && state !== 'wave') || spawning) return;
        const early = state === 'wave' && foes.length > 0;
        wave++;
        queue = waveSpec(wave); qi = 0; qClock = 0;
        state = 'wave'; autoT = -1;
        towers.forEach(t => { t.fresh = false; });
        if (early) {
            const b = Math.round(8 + wave * 1.5);
            gold += b;
            addText(W / 2, H - 40, 'Früh gestartet: +' + b + ' Gold', 'warning');
        }
        if (queue.some(q => q.type === 'boss')) { showBanner('⚠ Megavirus im Anmarsch!', 'Welle ' + wave, 'danger'); sfx('boss'); }
        else { showBanner('Welle ' + wave, wavePreviewText(wave), 'rc'); sfx('wave'); }
        refreshUI(true); updateNext();
    }

    function spawn(type, ri, d0) {
        const def = FOES[type], m = hpMul(Math.max(1, wave));
        const rt = def.fly ? routes[ri].air : routes[ri].ground;
        const hp = def.hp * m;
        const f = {
            type, def, ri, rt, d: Math.max(0, d0 || 0), hp, max: hp, x: 0, y: 0, ang: 0,
            slowT: 0, slowF: 0, freezeT: 0, healT: 1 + Math.random(), hitT: 0, ph: Math.random() * TAU, alive: true,
            bounty: Math.max(1, Math.round(def.bounty * (1 + .03 * (wave - 1))))
        };
        const p = posAt(rt, f.d);
        f.x = p.x; f.y = p.y; f.ang = p.ang;
        foes.push(f);
        if (def.boss) shake = Math.max(shake, 8);
        return f;
    }

    function hurt(f, dmg, pierce, src) {
        if (!f.alive) return;
        const armor = (f.def.armor || 0) * (1 - pierce);
        const real = Math.max(dmg * .2, dmg - armor);
        f.hp -= real;
        f.hitT = .08;
        if (src) src.dmg += Math.min(real, f.hp + real);
        if (f.hp <= 0) { if (src) src.kills++; kill(f); }
    }
    function kill(f) {
        if (!f.alive) return;
        f.alive = false;
        kills++;
        gold += f.bounty;
        score += Math.round(f.def.bounty * 10 * map.mult);
        burst(f.x, f.y, C[f.def.col], f.def.boss ? 70 : 12, f.def.boss ? 1.8 : 1);
        addText(f.x, f.y - 10, '+' + f.bounty, 'warning', true);
        if (f.def.split) for (let i = 0; i < f.def.split; i++) spawn('prozess', f.ri, f.d - 4 - i * 9);
        if (f.def.boss) { sfx('boom'); shake = 14; rings.push({ x: f.x, y: f.y, r0: 10, r1: 90, t: 0, T: .7, col: 'danger' }); }
        else sfx('kill');
    }
    function leak(f) {
        f.alive = false;
        const l = f.def.lives || 1;
        lives = Math.max(0, lives - l);
        baseFlash = 1;
        shake = Math.max(shake, f.def.boss ? 12 : 4);
        sfx('leak');
        addText(base.x, base.y - 20, '−' + l + ' ♥', 'danger');
        if (lives <= 0) gameOver();
    }
    function healAround(h) {
        const R = 2.2 * CS, cap = 50 * hpMul(wave);
        for (const f of foes) {
            if (!f.alive || f.hp >= f.max) continue;
            if ((f.x - h.x) ** 2 + (f.y - h.y) ** 2 > R * R) continue;
            f.hp = Math.min(f.max, f.hp + Math.min(f.max * .08, cap));
            parts.push({ x: f.x, y: f.y - 6, vx: 0, vy: -30, life: .6, t: 0, col: C.success, s: 3, plus: true });
        }
        rings.push({ x: h.x, y: h.y, r0: 4, r1: R, t: 0, T: .6, col: 'success' });
    }
    function applySlow(f, slow, dur, freeze) {
        const s = f.def.boss ? slow * .5 : slow;
        f.slowF = Math.max(f.slowF, s);
        f.slowT = Math.max(f.slowT, dur);
        if (freeze && !f.def.boss && Math.random() < freeze) f.freezeT = .8;
    }

    function waveCleared() {
        const bonus = 20 + wave * 3;
        gold += bonus;
        score += Math.round(50 * wave * map.mult);
        sfx('clear');
        if (wave === 1 && builtTotal === 0) XIRU.egg('g-tower-defense-mutig');
        saveProgress(false);
        if (wave >= LAST && !endless) { victory(); return; }
        state = 'build';
        showBanner('Welle ' + wave + ' geschafft!', '+' + bonus + ' Gold Wellenbonus', 'success');
        if ($('auto-wave').checked) autoT = 3.5;
        refreshUI(true); updateNext();
    }

    function victory() {
        state = 'won';
        score += Math.round(lives * 100 * map.mult);
        G.sfx.win(); XIRU.confetti();
        XIRU.egg('g-tower-defense-sieg');
        saveProgress(true);
        const r = XIRU.score('tower-defense', score);
        refreshUI(true);
        setTimeout(() => panel({
            icon: '🏆', title: 'Der Hub ist gerettet!',
            html: '<p>Alle ' + LAST + ' Wellen auf „' + esc(map.n) + '“ abgewehrt – mit ' + lives + ' Leben übrig. <strong>' + fmt(score) + ' Punkte</strong>' + (r.isNew ? ' – neuer Rekord!' : '.') + '</p>',
            buttons: [
                { label: 'Endlos weiterspielen', onClick: () => { endless = true; state = 'build'; ov.hide(); showBanner('Endlosmodus', 'Wie lange hältst du durch?', 'warning'); refreshUI(true); updateNext(); } },
                { label: 'Andere Karte', onClick: showMenu }
            ]
        }), 900);
    }

    function gameOver() {
        if (state === 'over') return;
        state = 'over';
        G.sfx.die();
        shake = 16;
        saveProgress(false);
        const r = XIRU.score('tower-defense', score);
        refreshUI(true);
        setTimeout(() => panel({
            icon: '💥', title: 'Der Floppy Hub ist gefallen',
            html: '<p>Du hast bis Welle ' + wave + ' durchgehalten. <strong>' + fmt(score) + ' Punkte</strong>' + (r.isNew && score > 0 ? ' – neuer Rekord!' : '.') + '</p>',
            buttons: [{ label: 'Nochmal', onClick: () => startGame(map) }, { label: 'Andere Karte', onClick: showMenu }]
        }), 900);
    }

    function saveProgress(won) {
        const prog = XIRU.load('tower-defense', {}) || {};
        prog.maps = prog.maps || {};
        const p = prog.maps[map.id] || (prog.maps[map.id] = { best: 0, won: false });
        const cleared = state === 'over' ? wave - 1 : wave;
        p.best = Math.max(p.best || 0, cleared);
        if (won) p.won = true;
        XIRU.save('tower-defense', prog);
    }

    /* ── Bauen, Aufrüsten, Verkaufen ───────────────────────────────────── */
    function nope(c, msg) {
        sfx('nope');
        nopeT = .35; nopeCell = c;
        if (msg && c) addText(c.x * CS + CS / 2, c.y * CS, msg, 'danger', true);
    }
    function build(type, x, y) {
        const D = TOWERS[type];
        if (gold < D.cost) { nope({ x, y }, 'Zu wenig Gold'); return; }
        gold -= D.cost;
        const t = {
            type, D, lv: 0, x, y, px: x * CS + CS / 2, py: y * CS + CS / 2, cd: 0, ang: -Math.PI / 2,
            mode: 'erster', invested: D.cost, fresh: state === 'build', dmg: 0, kills: 0, recoil: 0, ramp: 0, lt: null, firing: false, pop: 1
        };
        towers.push(t);
        builtTotal++;
        burst(t.px, t.py, C.borderStrong, 10, .6);
        sfx('build');
        if (gold < D.cost) selType = null;
        touchCell = null;
        refreshUI(true);
    }
    function upgrade(t) {
        if (!t || t.lv >= 3) return;
        const c = t.D.lv[t.lv + 1].cost;
        if (gold < c) { nope({ x: t.x, y: t.y }, 'Zu wenig Gold'); return; }
        gold -= c;
        t.lv++;
        t.invested += c;
        t.pop = 1;
        burst(t.px, t.py, C[t.D.col], 18, .8);
        rings.push({ x: t.px, y: t.py, r0: 6, r1: 30, t: 0, T: .45, col: t.D.col });
        sfx('up');
        if (t.lv === 3) XIRU.egg('g-tower-defense-voll');
        refreshUI(true);
    }
    const refund = t => t.fresh ? t.invested : Math.floor(t.invested * .7);
    function sell(t) {
        if (!t) return;
        const r = refund(t);
        gold += r;
        towers.splice(towers.indexOf(t), 1);
        burst(t.px, t.py, C.warning, 14, .7);
        addText(t.px, t.py - 10, '+' + r + ' Gold', 'warning', true);
        if (sel === t) sel = null;
        sfx('sell');
        refreshUI(true);
    }
    function cycleMode(t) {
        if (!t) return;
        const i = MODES.findIndex(m => m.id === t.mode);
        t.mode = MODES[(i + 1) % MODES.length].id;
        t.lt = null;
        addText(t.px, t.py - 18, MODES[(i + 1) % MODES.length].n, 'text', true);
        sfx('click');
        refreshUI(true);
    }
    function chooseType(k) {
        selType = selType === k ? null : k;
        sel = null; touchCell = null;
        sfx('click');
        refreshUI(true);
    }
    function cancelSel() { selType = null; sel = null; touchCell = null; refreshUI(true); }

    function act(c, touch) {
        if (!c || (state !== 'build' && state !== 'wave') || paused) return;
        const t = towerAt(c.x, c.y);
        if (t) { sel = t; selType = null; touchCell = null; sfx('click'); refreshUI(true); return; }
        if (selType) {
            if (!buildable(c.x, c.y)) { nope(c, pathSet.has(c.x + ',' + c.y) ? 'Nicht auf die Leitung' : ''); return; }
            if (touch && (!touchCell || touchCell.x !== c.x || touchCell.y !== c.y)) { touchCell = c; return; }
            build(selType, c.x, c.y);
            return;
        }
        if (sel) { sel = null; refreshUI(true); }
    }

    /* ── Simulation ────────────────────────────────────────────────────── */
    function pickTarget(t, R, air, exclude) {
        let best = null, bv = -Infinity;
        for (const f of foes) {
            if (!f.alive || (f.def.fly && !air) || f === exclude) continue;
            const dx = f.x - t.px, dy = f.y - t.py, d2 = dx * dx + dy * dy;
            if (d2 > R * R) continue;
            let v;
            switch (t.mode) {
                case 'letzter': v = f.rt.len - f.d; break;
                case 'staerkster': v = f.hp; break;
                case 'naechster': v = -d2; break;
                default: v = -(f.rt.len - f.d);
            }
            if (v > bv) { bv = v; best = f; }
        }
        return best;
    }
    const inRange = (t, f, R) => (f.x - t.px) ** 2 + (f.y - t.py) ** 2 <= R * R;
    function turn(t, ang, dt) {
        let d = ang - t.ang;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        t.ang += d * Math.min(1, dt * 14);
    }
    function jag(pts) {
        const out = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i], n = 4, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
            for (let k = 1; k < n; k++) {
                const off = (Math.random() - .5) * Math.min(14, len * .3);
                out.push({ x: a.x + (b.x - a.x) * k / n + nx * off, y: a.y + (b.y - a.y) * k / n + ny * off });
            }
            out.push(b);
        }
        return out;
    }

    function towerStep(t, dt) {
        const L = t.D.lv[t.lv], R = L.range * CS;
        t.recoil = Math.max(0, t.recoil - dt * 5);
        t.pop = Math.max(0, t.pop - dt * 3);
        if (t.cd > 0) t.cd -= dt;
        switch (t.type) {
            case 'pfeil': {
                const tg = pickTarget(t, R, true);
                if (!tg) break;
                turn(t, Math.atan2(tg.y - t.py, tg.x - t.px), dt);
                if (t.cd <= 0) {
                    t.cd = 1 / L.rate;
                    fireArrow(t, tg, L.dmg);
                    if (L.multi) { const t2 = pickTarget(t, R, true, tg); if (t2) fireArrow(t, t2, L.dmg); }
                    t.recoil = 1;
                    sfx('arrow');
                }
                break;
            }
            case 'kanone': {
                const tg = pickTarget(t, R, false);
                if (!tg) break;
                turn(t, Math.atan2(tg.y - t.py, tg.x - t.px), dt);
                if (t.cd <= 0) {
                    t.cd = 1 / L.rate;
                    const dist = Math.hypot(tg.x - t.px, tg.y - t.py);
                    const T = Math.min(.9, .25 + dist / 320);
                    const v = tg.freezeT > 0 ? 0 : tg.def.spd * (1 - tg.slowF);
                    const p = posAt(tg.rt, tg.d + v * T);
                    const ca = Math.cos(t.ang), sa = Math.sin(t.ang);
                    shots.push({ k: 's', sx: t.px + ca * 14, sy: t.py + sa * 14, tx: p.x, ty: p.y, t: 0, T, dmg: L.dmg, R: L.splash * CS, src: t });
                    t.recoil = 1;
                    sfx('cannon');
                }
                break;
            }
            case 'frost': {
                if (t.cd > 0) break;
                let any = false;
                for (const f of foes) if (f.alive && inRange(t, f, R)) { any = true; break; }
                if (!any) break;
                t.cd = 1 / L.rate;
                for (const f of foes) {
                    if (!f.alive || !inRange(t, f, R)) continue;
                    applySlow(f, L.slow, L.dur, L.freeze);
                    hurt(f, L.dmg, 0, t);
                }
                rings.push({ x: t.px, y: t.py, r0: 8, r1: R, t: 0, T: .5, col: 'accent', fill: true });
                sfx('frost');
                break;
            }
            case 'blitz': {
                const tg = pickTarget(t, R, true);
                if (!tg || t.cd > 0) break;
                t.cd = 1 / L.rate;
                const hits = [tg];
                let last = tg;
                const J = (1.9 * CS) ** 2;
                while (hits.length < L.chain) {
                    let nb = null, nd = J;
                    for (const f of foes) {
                        if (!f.alive || hits.includes(f)) continue;
                        const d2 = (f.x - last.x) ** 2 + (f.y - last.y) ** 2;
                        if (d2 < nd) { nd = d2; nb = f; }
                    }
                    if (!nb) break;
                    hits.push(nb);
                    last = nb;
                }
                const pts = [{ x: t.px, y: t.py - 10 }].concat(hits.map(f => ({ x: f.x, y: f.y })));
                bolts.push({ pts: jag(pts), t: 0, T: .22 });
                hits.forEach((f, i) => { hurt(f, L.dmg * Math.pow(.82, i), .5, t); burst(f.x, f.y, C.warning, 3, .6); });
                if (hits.length >= 7) XIRU.egg('g-tower-defense-kette');
                sfx('zap');
                break;
            }
            case 'laser': {
                let tg = t.lt;
                if (!tg || !tg.alive || !inRange(t, tg, R)) tg = pickTarget(t, R, true);
                if (!tg) { t.lt = null; t.ramp = 0; t.firing = false; break; }
                if (tg !== t.lt) { t.lt = tg; t.ramp = 0; }
                t.ramp = Math.min(3, t.ramp + dt);
                t.firing = true;
                turn(t, Math.atan2(tg.y - t.py, tg.x - t.px), dt * 2);
                hurt(tg, L.dps * (1 + t.ramp / 3 * 2.5) * dt, 1, t);
                if (Math.random() < dt * 25 && tg.alive) parts.push({ x: tg.x, y: tg.y, vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 90, life: .25, t: 0, col: C.rc, s: 2 });
                break;
            }
        }
    }
    function fireArrow(t, tg, dmg) {
        shots.push({ k: 'a', x: t.px + Math.cos(t.ang) * 10, y: t.py + Math.sin(t.ang) * 10, tg, lx: tg.x, ly: tg.y, dmg, src: t, ang: t.ang });
    }

    function step(dt) {
        // Gegner erscheinen lassen
        if (state === 'wave' && qi < queue.length) {
            qClock += dt;
            while (qi < queue.length && queue[qi].at <= qClock) { const q = queue[qi++]; spawn(q.type, q.route, 0); }
            if (qi >= queue.length) refreshUI(true);
        }
        if (state === 'build' && autoT > 0) { autoT -= dt; if (autoT <= 0) startWave(); }

        // Gegner bewegen
        for (const f of foes) {
            if (!f.alive) continue;
            if (f.hitT > 0) f.hitT -= dt;
            if (f.freezeT > 0) f.freezeT -= dt;
            if (f.slowT > 0) { f.slowT -= dt; if (f.slowT <= 0) f.slowF = 0; }
            const k = f.freezeT > 0 ? 0 : 1 - f.slowF;
            f.d += f.def.spd * k * dt;
            if (f.d >= f.rt.len) { leak(f); if (state === 'over') return; continue; }
            const p = posAt(f.rt, f.d);
            f.x = p.x; f.y = p.y; f.ang = p.ang;
            if (f.def.heal) { f.healT -= dt; if (f.healT <= 0) { f.healT = 2; healAround(f); } }
        }

        // Türme
        for (const t of towers) towerStep(t, dt);

        // Geschosse
        for (const s of shots) {
            if (s.k === 'a') {
                if (s.tg.alive) { s.lx = s.tg.x; s.ly = s.tg.y; }
                const dx = s.lx - s.x, dy = s.ly - s.y, d = Math.hypot(dx, dy), v = 560 * dt;
                s.ang = Math.atan2(dy, dx);
                if (d <= v + 4) {
                    s.dead = true;
                    if (s.tg.alive) { hurt(s.tg, s.dmg, 0, s.src); burst(s.lx, s.ly, C.success, 3, .5); }
                } else { s.x += dx / d * v; s.y += dy / d * v; }
            } else {
                s.t += dt;
                if (s.t >= s.T) {
                    s.dead = true;
                    for (const f of foes) {
                        if (!f.alive || f.def.fly) continue;
                        const d = Math.hypot(f.x - s.tx, f.y - s.ty);
                        if (d <= s.R + f.def.r * .5) hurt(f, s.dmg * (1 - .5 * Math.min(1, d / s.R)), .5, s.src);
                    }
                    rings.push({ x: s.tx, y: s.ty, r0: 4, r1: s.R, t: 0, T: .35, col: 'danger', fill: true });
                    burst(s.tx, s.ty, C.warning, 10, .9);
                    sfx('boom');
                }
            }
        }
        shots = shots.filter(s => !s.dead);
        foes = foes.filter(f => f.alive);

        // Effekte
        for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
        parts = parts.filter(p => p.t < p.life);
        rings.forEach(r => { r.t += dt; }); rings = rings.filter(r => r.t < r.T);
        bolts.forEach(b => { b.t += dt; }); bolts = bolts.filter(b => b.t < b.T);

        if (state === 'wave' && qi >= queue.length && foes.length === 0) waveCleared();
    }

    function update(dt) {
        if (state === 'menu') return;
        time += dt;
        texts.forEach(t => { t.t += dt; t.y -= (t.small ? 26 : 18) * dt; });
        texts = texts.filter(t => t.t < t.T);
        if (banner) { banner.t += dt; if (banner.t > banner.T) banner = null; }
        shake *= .88; if (shake < .2) shake = 0;
        baseFlash = Math.max(0, baseFlash - dt * 2);
        nopeT = Math.max(0, nopeT - dt);
        if (paused || (state !== 'build' && state !== 'wave')) {
            if (state === 'over' || state === 'won') {
                for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
                parts = parts.filter(p => p.t < p.life);
                rings.forEach(r => { r.t += dt; }); rings = rings.filter(r => r.t < r.T);
            }
            return;
        }
        for (let i = 0; i < speed; i++) {
            step(dt);
            if (state !== 'build' && state !== 'wave') break;
        }
        hudT -= dt;
        if (hudT <= 0) { hudT = .15; refreshUI(false); }
    }

    /* ── Zeichnen ──────────────────────────────────────────────────────── */
    function strokeRoute(g, rt, w, col) {
        g.lineWidth = w; g.strokeStyle = col;
        g.beginPath();
        rt.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
        g.stroke();
    }
    function buildBackground() {
        bg = document.createElement('canvas');
        bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
        const b = bg.getContext('2d');
        b.setTransform(dpr, 0, 0, dpr, 0, 0);
        const rnd = G.rng('turmwacht-' + map.id);
        b.fillStyle = rgb(C.bg2); b.fillRect(0, 0, W, H);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            b.fillStyle = rgb(mix(C.surface, C.bg2, (x + y) % 2 ? .3 : .6));
            b.fillRect(x * CS, y * CS, CS, CS);
        }
        // Leiterbahnen und Lötpunkte
        b.lineCap = 'round'; b.lineJoin = 'round';
        for (let i = 0; i < 30; i++) {
            let x = Math.floor(rnd() * COLS), y = Math.floor(rnd() * ROWS);
            if (pathSet.has(x + ',' + y)) continue;
            b.strokeStyle = rgb(C.border); b.lineWidth = 1.6;
            b.beginPath(); b.moveTo(x * CS + CS / 2, y * CS + CS / 2);
            let steps = 2 + Math.floor(rnd() * 4);
            while (steps--) {
                const d = Math.floor(rnd() * 4), nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
                if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || pathSet.has(nx + ',' + ny)) break;
                x = nx; y = ny;
                b.lineTo(x * CS + CS / 2, y * CS + CS / 2);
            }
            b.stroke();
            b.fillStyle = rgb(C.border); b.beginPath(); b.arc(x * CS + CS / 2, y * CS + CS / 2, 3.2, 0, TAU); b.fill();
            b.fillStyle = rgb(C.bg2); b.beginPath(); b.arc(x * CS + CS / 2, y * CS + CS / 2, 1.3, 0, TAU); b.fill();
        }
        // kleine Chips
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(rnd() * COLS), y = Math.floor(rnd() * ROWS);
            if (pathSet.has(x + ',' + y)) continue;
            const cx = x * CS + 8, cy = y * CS + 10;
            b.fillStyle = rgb(C.border);
            for (let k = 0; k < 4; k++) { b.fillRect(cx + 2 + k * 4, cy - 3, 1.5, 3); b.fillRect(cx + 2 + k * 4, cy + 12, 1.5, 3); }
            b.fillStyle = rgb(mix(C.surface3, C.bg, .3)); b.fillRect(cx, cy, 16, 12);
            b.fillStyle = rgb(C.border); b.beginPath(); b.arc(cx + 3, cy + 3, 1.2, 0, TAU); b.fill();
        }
        // Raster
        b.strokeStyle = rgb(C.border, .35); b.lineWidth = 1;
        for (let x = 1; x < COLS; x++) { b.beginPath(); b.moveTo(x * CS + .5, 0); b.lineTo(x * CS + .5, H); b.stroke(); }
        for (let y = 1; y < ROWS; y++) { b.beginPath(); b.moveTo(0, y * CS + .5); b.lineTo(W, y * CS + .5); b.stroke(); }
        // Datenleitung
        b.lineJoin = 'miter'; b.lineCap = 'square';
        routes.forEach(r => strokeRoute(b, r.ground, CS + 2, rgb(C.borderStrong)));
        routes.forEach(r => strokeRoute(b, r.ground, CS - 6, rgb(mix(C.surface3, C.bg, .3))));
        b.setLineDash([4, 6]); b.lineCap = 'butt';
        routes.forEach(r => strokeRoute(b, r.ground, 2, rgb(C.borderStrong, .7)));
        b.setLineDash([]);
        // Eingänge
        map.paths.forEach(p => {
            const y = p[0][1] * CS + CS / 2;
            b.strokeStyle = rgb(C.danger, .75); b.lineWidth = 2.5; b.lineCap = 'round'; b.lineJoin = 'round';
            for (let k = 0; k < 2; k++) { const x = 6 + k * 8; b.beginPath(); b.moveTo(x, y - 6); b.lineTo(x + 5, y); b.lineTo(x, y + 6); b.stroke(); }
        });
    }

    function drawDisk(g, x, y, s, body, ink) {
        g.save(); g.translate(x, y); g.scale(s / 32, s / 32); g.translate(-16, -16);
        g.fillStyle = body;
        g.beginPath(); g.moveTo(4, 3); g.lineTo(24, 3); g.lineTo(29, 8); g.lineTo(29, 29); g.lineTo(4, 29); g.closePath(); g.fill();
        g.fillStyle = ink; g.fillRect(9, 3, 13, 9);
        g.fillStyle = body; g.fillRect(17, 5, 3, 5);
        g.globalAlpha *= .85; g.fillStyle = ink; G.roundRect(g, 8, 17, 17, 10, 1.5); g.fill();
        g.restore();
    }

    function drawTower(g, t, x, y, tm, alpha) {
        const D = TOWERS[t.type], col = C[D.col], lv = t.lv || 0;
        const c = rgb(col), dark = rgb(mix(col, C.bg, .5)), lite = rgb(mix(col, WHITE, .5));
        g.save();
        g.translate(x, y);
        if (alpha != null) g.globalAlpha = alpha;
        const pop = 1 + (t.pop || 0) * .18;
        g.scale(pop, pop);
        if (lv === 3) {
            g.strokeStyle = rgb(C.warning, .4 + .25 * Math.sin(tm * 4));
            g.lineWidth = 1.5; g.setLineDash([4, 4]); g.lineDashOffset = -tm * 10;
            g.beginPath(); g.arc(0, 0, 17.5, 0, TAU); g.stroke(); g.setLineDash([]);
        }
        g.fillStyle = rgb(C.surface2);
        g.strokeStyle = lv ? rgb(col, .45 + lv * .15) : rgb(C.borderStrong);
        g.lineWidth = 1.5;
        G.roundRect(g, -13, -13, 26, 26, 6); g.fill(); g.stroke();
        g.fillStyle = rgb(C.borderStrong);
        g.fillRect(-10, -10, 2, 2); g.fillRect(8, -10, 2, 2);
        for (let i = 0; i <= lv; i++) { g.fillStyle = c; g.fillRect(-10 + i * 5.5, 9, 3.5, 2.2); }
        g.lineCap = 'round';
        switch (t.type) {
            case 'pfeil': {
                g.fillStyle = dark; g.beginPath(); g.arc(0, 0, 7.5, 0, TAU); g.fill();
                g.rotate(t.ang); g.translate(-(t.recoil || 0) * 2, 0);
                g.fillStyle = c; g.fillRect(-6, -2, 13, 4);
                g.strokeStyle = c; g.lineWidth = 2.4; g.beginPath(); g.arc(-1, 0, 9, -1.15, 1.15); g.stroke();
                const ex = -1 + 9 * Math.cos(1.15), ey = 9 * Math.sin(1.15), pull = (t.recoil || 0) > .5 ? -1 : -5;
                g.strokeStyle = lite; g.lineWidth = 1; g.beginPath(); g.moveTo(ex, -ey); g.lineTo(pull, 0); g.lineTo(ex, ey); g.stroke();
                g.fillStyle = lite; g.beginPath(); g.moveTo(11, 0); g.lineTo(6.5, -2.6); g.lineTo(6.5, 2.6); g.fill();
                if (lv === 3) { g.fillStyle = c; g.beginPath(); g.moveTo(9, -4); g.lineTo(5.5, -6); g.lineTo(5.5, -2.5); g.fill(); g.beginPath(); g.moveTo(9, 4); g.lineTo(5.5, 6); g.lineTo(5.5, 2.5); g.fill(); }
                break;
            }
            case 'kanone': {
                g.fillStyle = dark; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
                g.strokeStyle = c; g.lineWidth = 1.5; g.stroke();
                g.rotate(t.ang);
                const rc = (t.recoil || 0) * 3.5;
                g.fillStyle = c;
                if (lv >= 2) { g.fillRect(-2 - rc, -5.5, 15, 4); g.fillRect(-2 - rc, 1.5, 15, 4); g.fillStyle = lite; g.fillRect(11 - rc, -6, 3, 12); }
                else { g.fillRect(-2 - rc, -3.5, 15, 7); g.fillStyle = lite; g.fillRect(11 - rc, -4.5, 3, 9); }
                g.fillStyle = c; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
                if ((t.recoil || 0) > .6) { g.fillStyle = rgb(C.warning, .8); g.beginPath(); g.arc(17 - rc, 0, 4 * t.recoil, 0, TAU); g.fill(); }
                break;
            }
            case 'frost': {
                g.fillStyle = dark; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
                g.rotate(tm * .7);
                g.strokeStyle = c; g.lineWidth = 2;
                const arm = 6 + lv * 1.3;
                for (let i = 0; i < 6; i++) {
                    g.rotate(TAU / 6);
                    g.beginPath(); g.moveTo(0, 0); g.lineTo(arm, 0);
                    g.moveTo(arm * .6, 0); g.lineTo(arm * .85, -2.5); g.moveTo(arm * .6, 0); g.lineTo(arm * .85, 2.5);
                    g.stroke();
                }
                g.fillStyle = lite; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
                break;
            }
            case 'blitz': {
                g.fillStyle = dark; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
                g.strokeStyle = c; g.lineWidth = 1.6;
                const coils = 3 + (lv >= 2 ? 1 : 0);
                for (let i = 0; i < coils; i++) { g.beginPath(); g.ellipse(0, 4 - i * 3, 6 - i * .8, 2, 0, 0, TAU); g.stroke(); }
                const top = 4 - coils * 3 - 1, ready = (t.cd || 0) <= 0;
                g.fillStyle = lite; g.shadowColor = c; g.shadowBlur = ready ? 10 : 3;
                g.beginPath(); g.arc(0, top, 3.5, 0, TAU); g.fill(); g.shadowBlur = 0;
                if (ready && Math.random() < .35) {
                    g.strokeStyle = lite; g.lineWidth = 1;
                    const a = Math.random() * TAU;
                    g.beginPath(); g.moveTo(Math.cos(a) * 4, top + Math.sin(a) * 4); g.lineTo(Math.cos(a) * 8 + 2, top + Math.sin(a) * 8 - 1); g.stroke();
                }
                break;
            }
            case 'laser': {
                g.fillStyle = dark; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill();
                g.strokeStyle = c; g.lineWidth = 1.5; g.stroke();
                g.rotate(t.ang);
                g.fillStyle = c; g.fillRect(0, -3, 12, 6);
                g.fillStyle = dark; g.fillRect(9, -2, 3, 4);
                if (lv >= 2) { g.fillStyle = c; g.fillRect(2, -5, 6, 1.5); g.fillRect(2, 3.5, 6, 1.5); }
                g.fillStyle = lite; g.shadowColor = c; g.shadowBlur = t.firing ? 10 : 0;
                g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); g.shadowBlur = 0;
                break;
            }
        }
        g.restore();
    }

    function drawFoe(g, f, x, y, tm) {
        const D = f.def, r = D.r, col = C[D.col];
        const c = rgb(col), dark = rgb(mix(col, C.bg, .55)), lite = rgb(mix(col, WHITE, .45));
        const ang = f.ang || 0;
        g.save();
        g.translate(x, y);
        if (D.fly) {
            g.fillStyle = 'rgba(0,0,0,.28)';
            g.beginPath(); g.ellipse(3, 8, r * .9, r * .4, 0, 0, TAU); g.fill();
            g.translate(0, -5 + Math.sin(tm * 5 + f.ph) * 1.5);
        }
        g.save();
        g.lineCap = 'round';
        switch (f.type) {
            case 'kaefer': {
                g.rotate(ang);
                const lg = Math.sin(tm * 16 + f.ph) * 2;
                g.strokeStyle = dark; g.lineWidth = 1.4; g.beginPath();
                for (let i = -1; i <= 1; i++) {
                    const o = i === 0 ? -lg : lg;
                    g.moveTo(i * 3.2, -3); g.lineTo(i * 3.2 + o, -r - 2.5);
                    g.moveTo(i * 3.2, 3); g.lineTo(i * 3.2 - o, r + 2.5);
                }
                g.stroke();
                g.fillStyle = c; g.beginPath(); g.ellipse(-1, 0, r, r * .78, 0, 0, TAU); g.fill();
                g.strokeStyle = dark; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-r - 1, 0); g.lineTo(r - 3, 0); g.stroke();
                g.fillStyle = lite; g.beginPath(); g.arc(-3.5, -2.6, 1.5, 0, TAU); g.fill(); g.beginPath(); g.arc(-3.5, 2.6, 1.5, 0, TAU); g.fill();
                g.fillStyle = dark; g.beginPath(); g.arc(r - 1.5, 0, r * .45, 0, TAU); g.fill();
                g.fillStyle = '#fff'; g.fillRect(r - .3, -2.1, 1.5, 1.5); g.fillRect(r - .3, .6, 1.5, 1.5);
                break;
            }
            case 'flitzer': {
                g.rotate(ang);
                g.strokeStyle = rgb(col, .45); g.lineWidth = 1.2; g.beginPath();
                for (let i = -1; i <= 1; i++) { const l = 4 + ((tm * 40 + i * 7 + f.ph * 3) % 6); g.moveTo(-r - 2, i * 2.5); g.lineTo(-r - 2 - l, i * 2.5); }
                g.stroke();
                g.fillStyle = c; g.beginPath();
                g.moveTo(r + 3, 0); g.bezierCurveTo(r, -r * 1.1, -r, -r, -r, 0); g.bezierCurveTo(-r, r, r, r * 1.1, r + 3, 0); g.fill();
                g.fillStyle = '#fff'; g.beginPath(); g.arc(r * .35, -1.2, 1.8, 0, TAU); g.fill();
                g.fillStyle = dark; g.beginPath(); g.arc(r * .35 + .7, -1.2, .9, 0, TAU); g.fill();
                break;
            }
            case 'panzer': {
                g.rotate(ang);
                g.fillStyle = dark;
                G.roundRect(g, -r, -r, r * 2, r * .55, 2); g.fill();
                G.roundRect(g, -r, r * .45, r * 2, r * .55, 2); g.fill();
                g.strokeStyle = rgb(col, .7); g.lineWidth = 1;
                const off = (tm * 22) % 4;
                g.beginPath();
                for (let k = -r + off; k < r; k += 4) { g.moveTo(k, -r); g.lineTo(k, -r * .45); g.moveTo(k, r * .45); g.lineTo(k, r); }
                g.stroke();
                g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, r * .85, r * .62, 0, 0, TAU); g.fill();
                g.strokeStyle = dark; g.lineWidth = 1.2; g.beginPath();
                g.moveTo(-r * .3, -r * .58); g.lineTo(-r * .3, r * .58); g.moveTo(r * .2, -r * .6); g.lineTo(r * .2, r * .6); g.stroke();
                g.fillStyle = dark; g.beginPath(); g.arc(r * .75, 0, r * .32, 0, TAU); g.fill();
                g.fillStyle = rgb(C.danger); g.fillRect(r * .85, -1.9, 1.6, 1.3); g.fillRect(r * .85, .6, 1.6, 1.3);
                break;
            }
            case 'flieger': {
                g.rotate(ang);
                const fl = .35 + Math.abs(Math.sin(tm * 14 + f.ph)) * .65;
                g.fillStyle = rgb(mix(col, WHITE, .5), .6);
                g.beginPath(); g.ellipse(-1, -r * .55, r * .55, r * .9 * fl, -.3, 0, TAU); g.fill();
                g.beginPath(); g.ellipse(-1, r * .55, r * .55, r * .9 * fl, .3, 0, TAU); g.fill();
                g.fillStyle = c;
                [[-r * .65, r * .38], [-r * .1, r * .48], [r * .5, r * .44]].forEach(s => { g.beginPath(); g.arc(s[0], 0, s[1], 0, TAU); g.fill(); });
                g.fillStyle = '#fff'; g.beginPath(); g.arc(r * .7, -1.5, 1.3, 0, TAU); g.fill(); g.beginPath(); g.arc(r * .7, 1.5, 1.3, 0, TAU); g.fill();
                break;
            }
            case 'heiler': {
                g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
                g.strokeStyle = dark; g.lineWidth = 1.5; g.stroke();
                g.fillStyle = '#fff'; g.fillRect(-1.6, -r * .6, 3.2, r * 1.2); g.fillRect(-r * .6, -1.6, r * 1.2, 3.2);
                g.strokeStyle = dark; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -r); g.lineTo(2, -r - 4); g.stroke();
                g.fillStyle = Math.sin(tm * 8 + f.ph) > 0 ? lite : dark; g.beginPath(); g.arc(2, -r - 4.5, 1.7, 0, TAU); g.fill();
                if (f.healT != null && f.healT < .35) { g.strokeStyle = rgb(col, f.healT * 2); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r + 4, 0, TAU); g.stroke(); }
                break;
            }
            case 'teiler': {
                g.fillStyle = dark; g.beginPath(); g.arc(0, 1, r, 0, TAU); g.fill();
                g.strokeStyle = c; g.lineWidth = 1.6; g.stroke();
                for (let i = 0; i < 3; i++) {
                    const a = tm * 2 + f.ph + i * TAU / 3;
                    g.fillStyle = c; g.beginPath(); g.arc(Math.cos(a) * r * .42, 1 + Math.sin(a) * r * .42, r * .3, 0, TAU); g.fill();
                }
                g.strokeStyle = rgb(C.textMuted); g.lineWidth = 1.5;
                g.beginPath(); g.moveTo(r * .5, -r * .7); g.quadraticCurveTo(r * .9, -r * 1.3, r * 1.2, -r * 1.1); g.stroke();
                g.fillStyle = rgb(C.warning, .6 + .4 * Math.random());
                g.beginPath(); g.arc(r * 1.2, -r * 1.1, 1.8 + Math.random(), 0, TAU); g.fill();
                break;
            }
            case 'prozess': {
                g.rotate(ang);
                g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
                g.fillStyle = lite; g.beginPath(); g.arc(-1, -1, r * .45, 0, TAU); g.fill();
                g.fillStyle = '#fff'; g.fillRect(r * .3, -1.6, 1.4, 1.4); g.fillRect(r * .3, .3, 1.4, 1.4);
                break;
            }
            case 'boss': {
                g.save(); g.rotate(tm * .7);
                g.strokeStyle = dark; g.fillStyle = c; g.lineWidth = 2.2;
                for (let i = 0; i < 12; i++) {
                    const a = i * TAU / 12, L = r + 4 + Math.sin(tm * 6 + i) * 1.2;
                    g.beginPath(); g.moveTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke();
                    g.beginPath(); g.arc(Math.cos(a) * L, Math.sin(a) * L, 2.2, 0, TAU); g.fill();
                }
                g.restore();
                const grd = g.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r);
                grd.addColorStop(0, lite); grd.addColorStop(.6, c); grd.addColorStop(1, dark);
                g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
                g.strokeStyle = rgb(C.textMuted); g.lineWidth = 2; g.setLineDash([5, 3]);
                g.beginPath(); g.arc(0, 0, r - 2, 0, TAU); g.stroke(); g.setLineDash([]);
                g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, r * .42, r * .3, 0, 0, TAU); g.fill();
                g.fillStyle = dark; g.beginPath(); g.arc(Math.cos(ang) * r * .18, Math.sin(ang) * r * .1, r * .17, 0, TAU); g.fill();
                break;
            }
        }
        g.restore();
        // Zustände
        if (f.hitT > 0) { g.fillStyle = 'rgba(255,255,255,' + Math.min(.5, f.hitT * 6) + ')'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
        if (f.freezeT > 0) {
            g.fillStyle = rgb(C.accent, .4); g.strokeStyle = rgb(C.accent); g.lineWidth = 1.5;
            G.roundRect(g, -r - 2, -r - 2, r * 2 + 4, r * 2 + 4, 3); g.fill(); g.stroke();
        } else if (f.slowT > 0) {
            g.strokeStyle = rgb(C.accent, .85); g.lineWidth = 1.5; g.setLineDash([3, 3]); g.lineDashOffset = tm * 8;
            g.beginPath(); g.arc(0, 0, r + 3, 0, TAU); g.stroke(); g.setLineDash([]);
        }
        g.restore();
    }

    function drawRange(x, y, R, col, ok, dashed) {
        const cc = ok ? col : C.danger;
        ctx.fillStyle = rgb(cc, dashed ? 0 : .1);
        ctx.strokeStyle = rgb(cc, dashed ? .4 : .6);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        ctx.setLineDash([5, 5]); ctx.lineDashOffset = -time * 12; ctx.stroke(); ctx.setLineDash([]);
    }

    function draw() {
        ctx.save();
        if (shake) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        if (bg) ctx.drawImage(bg, 0, 0, W, H);

        // Datenpakete auf der Leitung
        ctx.fillStyle = rgb(C.rc, .35);
        routes.forEach(r => {
            const L = r.ground.len;
            for (let d = (time * 36) % 48; d < L; d += 48) { const p = posAt(r.ground, d); ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
        });

        // Floppy Hub
        const pulse = .5 + .5 * Math.sin(time * 3);
        const hubCol = baseFlash > 0 ? mix(C.rc, C.danger, baseFlash) : C.rc;
        const grd = ctx.createRadialGradient(base.x, base.y, 4, base.x, base.y, 30);
        grd.addColorStop(0, rgb(hubCol, .45 + pulse * .2)); grd.addColorStop(1, rgb(hubCol, 0));
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(base.x, base.y, 30, 0, TAU); ctx.fill();
        drawDisk(ctx, base.x, base.y, 28 + baseFlash * 6, rgb(hubCol), rgb(C.bg));

        // Auswahl-Reichweite
        if (sel) {
            const L = sel.D.lv[sel.lv], N = sel.D.lv[sel.lv + 1];
            drawRange(sel.px, sel.py, L.range * CS, C[sel.D.col], true);
            if (N && N.range > L.range) drawRange(sel.px, sel.py, N.range * CS, C[sel.D.col], true, true);
        }

        // Türme
        for (const t of towers) drawTower(ctx, t, t.px, t.py, time);
        if (sel) {
            ctx.strokeStyle = rgb(C.text, .85); ctx.lineWidth = 2;
            G.roundRect(ctx, sel.px - 16, sel.py - 16, 32, 32, 7); ctx.stroke();
        }

        // Bodengegner, dann Geschosse, dann Flieger
        for (const f of foes) if (!f.def.fly) drawFoe(ctx, f, f.x, f.y, time);
        for (const s of shots) {
            if (s.k === 'a') {
                ctx.strokeStyle = rgb(C.text); ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(s.x - Math.cos(s.ang) * 8, s.y - Math.sin(s.ang) * 8); ctx.lineTo(s.x, s.y); ctx.stroke();
                ctx.fillStyle = rgb(C.success); ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
            } else {
                const k = s.t / s.T, x = s.sx + (s.tx - s.sx) * k, y = s.sy + (s.ty - s.sy) * k, h = Math.sin(Math.PI * k) * 26;
                ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 3, 4, 2, 0, 0, TAU); ctx.fill();
                ctx.fillStyle = rgb(mix(C.textMuted, C.bg, .4)); ctx.beginPath(); ctx.arc(x, y - h, 4.5, 0, TAU); ctx.fill();
                ctx.fillStyle = rgb(C.warning); ctx.beginPath(); ctx.arc(x - 1.2, y - h - 1.2, 1.4, 0, TAU); ctx.fill();
            }
        }
        for (const f of foes) if (f.def.fly) drawFoe(ctx, f, f.x, f.y, time);

        // Lebensbalken
        for (const f of foes) {
            if (f.hp >= f.max) continue;
            const w = Math.max(16, f.def.r * 2 + 4), k = Math.max(0, f.hp / f.max), y = f.y - f.def.r - (f.def.fly ? 13 : 7) - (f.def.boss ? 6 : 0);
            ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(f.x - w / 2 - 1, y - 1, w + 2, 5);
            ctx.fillStyle = rgb(k > .5 ? C.success : k > .25 ? C.warning : C.danger); ctx.fillRect(f.x - w / 2, y, w * k, 3);
        }

        // Laserstrahlen
        for (const t of towers) {
            if (t.type !== 'laser' || !t.firing || !t.lt || !t.lt.alive) continue;
            const col = C[t.D.col], w = 1.5 + t.ramp * 1.1, sx = t.px + Math.cos(t.ang) * 12, sy = t.py + Math.sin(t.ang) * 12;
            const ty = t.lt.y - (t.lt.def.fly ? 5 : 0);
            ctx.lineCap = 'round';
            ctx.strokeStyle = rgb(col, .35); ctx.lineWidth = w + 4 + Math.sin(time * 40) * 1.2;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(t.lt.x, ty); ctx.stroke();
            ctx.strokeStyle = rgb(mix(col, WHITE, .6)); ctx.lineWidth = w * .6;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(t.lt.x, ty); ctx.stroke();
        }

        // Blitze
        for (const b of bolts) {
            const a = 1 - b.t / b.T;
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.strokeStyle = rgb(C.warning, a * .5); ctx.lineWidth = 6;
            ctx.beginPath(); b.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
            ctx.strokeStyle = rgb(mix(C.warning, WHITE, .7), a); ctx.lineWidth = 1.8; ctx.stroke();
        }

        // Ringe
        for (const r of rings) {
            const k = r.t / r.T, e = 1 - Math.pow(1 - k, 3), R = r.r0 + (r.r1 - r.r0) * e, col = C[r.col];
            if (r.fill) { ctx.fillStyle = rgb(col, .12 * (1 - k)); ctx.beginPath(); ctx.arc(r.x, r.y, R, 0, TAU); ctx.fill(); }
            ctx.strokeStyle = rgb(col, .8 * (1 - k)); ctx.lineWidth = 1 + 3 * (1 - k);
            ctx.beginPath(); ctx.arc(r.x, r.y, R, 0, TAU); ctx.stroke();
        }

        // Partikel
        for (const p of parts) {
            const a = 1 - p.t / p.life;
            ctx.fillStyle = rgb(p.col, a);
            if (p.plus) { ctx.fillRect(p.x - 3, p.y - 1, 6, 2); ctx.fillRect(p.x - 1, p.y - 3, 2, 6); }
            else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        }

        // Bauvorschau
        const hc = kb || hover;
        if (hc && selType && (state === 'build' || state === 'wave') && !paused) {
            const D = TOWERS[selType], ok = buildable(hc.x, hc.y) && gold >= D.cost, x = hc.x * CS + CS / 2, y = hc.y * CS + CS / 2;
            drawRange(x, y, D.lv[0].range * CS, C[D.col], ok);
            if (!towerAt(hc.x, hc.y)) drawTower(ctx, { type: selType, lv: 0, ang: -Math.PI / 2, cd: 1 }, x, y, time, ok ? .65 : .35);
            if (touchCell && touchCell.x === hc.x && touchCell.y === hc.y && ok) {
                ctx.fillStyle = rgb(C.text); ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('nochmal tippen', x, y - 20);
            }
        } else if (hover && !kb && !selType && towerAt(hover.x, hover.y) && towerAt(hover.x, hover.y) !== sel) {
            const t = towerAt(hover.x, hover.y);
            drawRange(t.px, t.py, t.D.lv[t.lv].range * CS, C[t.D.col], true, true);
        }
        if (nopeT > 0 && nopeCell) {
            ctx.strokeStyle = rgb(C.danger, nopeT * 2.5); ctx.lineWidth = 2;
            ctx.strokeRect(nopeCell.x * CS + 2, nopeCell.y * CS + 2, CS - 4, CS - 4);
        }
        if (kb) {
            ctx.strokeStyle = rgb(C.text); ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -time * 10;
            ctx.strokeRect(kb.x * CS + 1.5, kb.y * CS + 1.5, CS - 3, CS - 3); ctx.setLineDash([]);
        }

        // Schwebende Texte
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const t of texts) {
            const a = Math.min(1, (t.T - t.t) * 3);
            ctx.font = (t.small ? '700 11px ' : '800 14px ') + 'system-ui, sans-serif';
            ctx.fillStyle = rgb(C.bg, a * .7); ctx.fillText(t.s, t.x + 1, t.y + 1);
            ctx.fillStyle = rgb(C[t.col] || C.text, a); ctx.fillText(t.s, t.x, t.y);
        }

        // Banner
        if (banner) {
            const k = banner.t, a = Math.min(1, k * 4, (banner.T - k) * 2.5), y = 64 - (1 - Math.min(1, k * 4)) * 12;
            ctx.font = '800 22px system-ui, sans-serif';
            const w = Math.max(ctx.measureText(banner.txt).width, (ctx.font = '600 12px system-ui, sans-serif', ctx.measureText(banner.sub).width)) + 40;
            ctx.globalAlpha = a;
            ctx.fillStyle = rgb(C.surface, .9); ctx.strokeStyle = rgb(C[banner.col]); ctx.lineWidth = 1.5;
            G.roundRect(ctx, W / 2 - w / 2, y - 26, w, banner.sub ? 56 : 40, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = rgb(C[banner.col]); ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText(banner.txt, W / 2, y - 6);
            if (banner.sub) { ctx.fillStyle = rgb(C.textMuted); ctx.font = '600 12px system-ui, sans-serif'; ctx.fillText(banner.sub, W / 2, y + 16); }
            ctx.globalAlpha = 1;
        }
        if (paused && state !== 'menu') { ctx.fillStyle = rgb(C.bg, .25); ctx.fillRect(0, 0, W, H); }
        ctx.restore();
    }

    /* ── Oberfläche (DOM) ──────────────────────────────────────────────── */
    function makeIcons() {
        Object.keys(FOES).forEach(k => {
            const c = document.createElement('canvas'); c.width = c.height = 64;
            const g = c.getContext('2d'); g.scale(2, 2);
            const D = FOES[k], sc = Math.min(1.25, 26 / (D.r * 2 + (D.boss ? 12 : 8)));
            g.translate(16, D.fly ? 19 : 16); g.scale(sc, sc);
            drawFoe(g, { type: k, def: D, ang: 0, ph: 1, hitT: 0, slowT: 0, freezeT: 0, healT: 1 }, 0, 0, .3);
            icons.foe[k] = c.toDataURL();
        });
        TKEYS.forEach(k => {
            const c = document.createElement('canvas'); c.width = c.height = 64;
            const g = c.getContext('2d'); g.scale(2, 2);
            drawTower(g, { type: k, lv: 0, ang: -Math.PI / 4, recoil: 0, cd: 1 }, 16, 16, .4);
            icons.tower[k] = c.toDataURL();
        });
    }
    function thumb(m) {
        const s = 6, c = document.createElement('canvas');
        c.width = COLS * s * 2; c.height = ROWS * s * 2;
        const g = c.getContext('2d'); g.scale(2, 2);
        g.fillStyle = rgb(C.surface2); g.fillRect(0, 0, COLS * s, ROWS * s);
        g.strokeStyle = rgb(C.rc); g.lineWidth = s; g.lineJoin = 'miter'; g.lineCap = 'square';
        m.paths.forEach(p => { g.beginPath(); p.forEach((q, i) => { const X = q[0] * s + s / 2, Y = q[1] * s + s / 2; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); });
        const e = m.paths[0][m.paths[0].length - 1];
        g.fillStyle = rgb(C.warning); g.fillRect(e[0] * s - 1, e[1] * s - 1, s + 2, s + 2);
        return c.toDataURL();
    }

    function renderTowerBar() {
        $('td-towers').innerHTML = TKEYS.map(k => {
            const D = TOWERS[k];
            return '<button type="button" class="td-tower" data-t="' + k + '" title="' + esc(D.n + ' – ' + D.desc) + '">' +
                '<img alt="" src="' + icons.tower[k] + '"><span>' + esc(D.n) + '<small>' + D.cost + ' Gold</small></span><kbd>' + D.key + '</kbd></button>';
        }).join('');
    }
    function renderLexicon() {
        $('td-lex').innerHTML = Object.keys(FOES).map(k => '<li><img alt="" src="' + icons.foe[k] + '"><span><b>' + esc(FOES[k].n) + '</b>' + esc(FOES[k].d) + '</span></li>').join('');
    }
    function wavePreviewText(n) {
        const c = waveCounts(n);
        return Object.keys(c).map(k => c[k] + '× ' + FOES[k].n).join(', ');
    }
    function updateNext() {
        const el = $('td-next');
        if (state === 'menu') { el.innerHTML = ''; return; }
        if (state === 'won' || state === 'over') { el.innerHTML = '<span>Partie beendet.</span>'; return; }
        const n = state === 'wave' && qi < queue.length ? wave : wave + 1;
        const c = waveCounts(n);
        el.innerHTML = '<b>' + (n === wave ? 'Aktuelle' : 'Nächste') + ' Welle ' + n + (n <= LAST ? '/' + LAST : ' (endlos)') + ':</b>' +
            Object.keys(c).map(k => '<span class="td-next__item" title="' + esc(FOES[k].n) + '"><img alt="" src="' + icons.foe[k] + '">' + c[k] + '× ' + esc(FOES[k].n) + '</span>').join('');
    }

    function statRows(type, L, N) {
        const f1 = v => XIRU.fmt(v, 1);
        const row = (label, a, b, unit) => '<dt>' + label + '</dt><dd>' + a + (unit || '') +
            (b != null && b !== a ? ' <span class="td-up">→ ' + b + (unit || '') + '</span>' : '') + '</dd>';
        const nx = key => N ? N[key] : null;
        let h = '';
        if (type === 'laser') h += row('Schaden/s', L.dps, nx('dps'));
        else h += row('Schaden', L.dmg, nx('dmg'));
        if (L.rate) h += row(type === 'frost' ? 'Pulse/s' : 'Schüsse/s', f1(L.rate), N ? f1(N.rate) : null);
        h += row('Reichweite', f1(L.range), N ? f1(N.range) : null, ' Felder');
        if (L.splash) h += row('Explosion', f1(L.splash), N ? f1(N.splash) : null, ' Felder');
        if (L.slow) h += row('Bremst', Math.round(L.slow * 100), N ? Math.round(N.slow * 100) : null, ' %');
        if (L.chain) h += row('Ziele', L.chain, nx('chain'));
        if (type === 'pfeil') h += row('Pfeile', L.multi || 1, N ? (N.multi || 1) : null);
        if (type === 'frost' && (L.freeze || (N && N.freeze))) h += row('Einfrieren', Math.round((L.freeze || 0) * 100), N ? Math.round((N.freeze || 0) * 100) : null, ' %');
        if (type === 'kanone') h += '<dt>Ziele</dt><dd>nur Boden</dd>';
        return h;
    }

    function renderInfo() {
        const box = $('td-info');
        if (sel) {
            const t = sel, D = t.D, L = D.lv[t.lv], N = D.lv[t.lv + 1];
            box.innerHTML = '<div class="td-info__head"><img alt="" src="' + icons.tower[t.type] + '"><div><h3>' + esc(D.n) + '</h3>' +
                '<span class="badge badge--accent">Stufe ' + (t.lv + 1) + '/4</span></div></div>' +
                '<dl class="td-stats">' + statRows(t.type, L, N) +
                '<dt>Besiegt</dt><dd id="ti-kills">' + t.kills + '</dd><dt>Schaden gesamt</dt><dd id="ti-dmg">' + fmt(t.dmg) + '</dd></dl>' +
                '<div class="row">' +
                (N ? '<button type="button" class="btn btn--primary btn--sm" data-act="up"' + (gold < N.cost ? ' disabled' : '') + '>Aufrüsten · ' + N.cost + ' <kbd>U</kbd></button>'
                    : '<span class="badge badge--warning">★ Voll ausgebaut</span>') +
                '<button type="button" class="btn btn--danger btn--sm" data-act="sell">Verkaufen · <span id="ti-refund">+' + refund(t) + '</span> <kbd>V</kbd></button></div>' +
                '<p class="small muted mt-2 mb-0">Ziel wählen <kbd>Z</kbd></p><div class="row td-modes">' +
                MODES.map(m => '<button type="button" class="chip' + (t.mode === m.id ? ' is-active' : '') + '" data-mode="' + m.id + '">' + m.n + '</button>').join('') + '</div>';
        } else if (selType) {
            const D = TOWERS[selType];
            box.innerHTML = '<div class="td-info__head"><img alt="" src="' + icons.tower[selType] + '"><div><h3>' + esc(D.n) + '</h3>' +
                '<span class="badge ' + (gold >= D.cost ? 'badge--success' : 'badge--danger') + '">' + D.cost + ' Gold</span></div></div>' +
                '<p class="small muted">' + esc(D.desc) + '</p><dl class="td-stats">' + statRows(selType, D.lv[0], null) + '</dl>' +
                '<p class="small faint mb-0">Klick auf ein freies Feld neben der Leitung baut den Turm. <kbd>Esc</kbd> bricht ab.</p>';
        } else {
            box.innerHTML = '<h3>Turm-Info</h3><p class="small muted">Wähle unten einen Turm (oder <kbd>1</kbd>–<kbd>5</kbd>) und klicke ein freies Feld an. ' +
                'Klickst du einen gebauten Turm an, kannst du ihn hier aufrüsten, verkaufen oder sein Ziel ändern.</p>' +
                '<p class="small faint mb-0">Verkaufen bringt 70 % zurück – oder alles, solange die nächste Welle noch nicht gestartet ist.</p>';
        }
    }

    function refreshUI(force) {
        if (state !== 'menu') {
            G.hud('#hud', {
                Gold: fmt(gold), Leben: lives + ' ♥',
                Welle: (endless || wave > LAST ? wave : wave + '/' + LAST),
                Punkte: fmt(score)
            });
        }
        // Turmknöpfe
        document.querySelectorAll('#td-towers .td-tower').forEach(b => {
            const k = b.dataset.t;
            b.classList.toggle('is-active', selType === k);
            b.classList.toggle('is-poor', gold < TOWERS[k].cost);
        });
        // Wellenknopf
        const wb = $('btn-wave');
        const spawning = state === 'wave' && qi < queue.length;
        if (state === 'build') { wb.disabled = false; wb.textContent = '▶ Welle ' + (wave + 1) + (autoT > 0 ? ' (' + Math.ceil(autoT) + ')' : ''); }
        else if (state === 'wave' && spawning) { wb.disabled = true; wb.textContent = 'Welle ' + wave + ' läuft …'; }
        else if (state === 'wave') { wb.disabled = false; wb.textContent = '⏩ Welle ' + (wave + 1) + ' (+' + Math.round(8 + (wave + 1) * 1.5) + ')'; }
        else { wb.disabled = true; wb.textContent = '▶ Welle'; }
        $('btn-pause').textContent = paused ? '▶' : '❚❚';
        // Info-Karte
        const N = sel && sel.D.lv[sel.lv + 1];
        const sig = [sel ? towers.indexOf(sel) : -1, sel && sel.lv, sel && sel.mode, sel && sel.fresh, selType,
            N ? gold >= N.cost : '', selType ? gold >= TOWERS[selType].cost : ''].join('|');
        if (force || sig !== infoSig) { infoSig = sig; renderInfo(); }
        else if (sel) {
            const k = $('ti-kills'), d = $('ti-dmg');
            if (k) k.textContent = sel.kills;
            if (d) d.textContent = fmt(sel.dmg);
        }
        if (force) updateNext();
    }
    function renderBest() {
        const b = XIRU.best('tower-defense');
        $('best').textContent = b == null ? '–' : fmt(b);
        const prog = (XIRU.load('tower-defense', {}) || {}).maps || {};
        const won = MAPS.filter(m => prog[m.id] && prog[m.id].won).map(m => m.n);
        $('best-maps').textContent = won.length ? 'Geschafft: ' + won.join(', ') : 'Noch keine Karte bezwungen.';
    }

    function panel(o) {
        ov.el.innerHTML = (o.icon ? '<div style="font-size:3rem">' + o.icon + '</div>' : '') + '<h2>' + esc(o.title) + '</h2>' + (o.html || '') +
            '<div class="row" style="justify-content:center">' +
            o.buttons.map((b, i) => '<button type="button" class="btn btn--lg' + (i === 0 ? ' btn--primary' : '') + '" data-i="' + i + '">' + esc(b.label) + '</button>').join('') + '</div>';
        ov.el.hidden = false;
        ov.el.querySelectorAll('button[data-i]').forEach(btn => btn.addEventListener('click', () => { XIRU.audio(); o.buttons[+btn.dataset.i].onClick(); }));
        const f = ov.el.querySelector('button');
        if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
        renderBest();
    }

    function showMenu() {
        state = 'menu'; paused = false; sel = null; selType = null; kb = null;
        loop.stop();
        const prog = (XIRU.load('tower-defense', {}) || {}).maps || {};
        ov.el.innerHTML = '<div style="font-size:2.6rem">🏰</div><h2>Turmwacht</h2>' +
            '<p>Wähle eine Karte. Überstehe ' + LAST + ' Wellen, damit kein Virus den Floppy Hub erreicht.</p><div class="td-maps">' +
            MAPS.map((m, i) => {
                const p = prog[m.id] || {};
                return '<button type="button" class="td-map" data-i="' + i + '"><img alt="" src="' + thumb(m) + '"><span class="td-map__txt"><b>' + esc(m.n) + '</b>' +
                    '<span class="badge ' + DIFF_BADGE[m.diff] + '">' + m.diff + (m.paths.length > 1 ? ' · 2 Eingänge' : '') + '</span>' +
                    '<small>' + (p.won ? '✓ Geschafft' + (p.best > LAST ? ' · bis Welle ' + p.best : '') : p.best ? 'Bisher bis Welle ' + p.best : m.lives + ' Leben · ' + m.gold + ' Gold Start') + '</small></span></button>';
            }).join('') + '</div>';
        ov.el.hidden = false;
        ov.el.querySelectorAll('.td-map').forEach(b => b.addEventListener('click', () => { XIRU.audio(); startGame(MAPS[+b.dataset.i]); }));
        const f = ov.el.querySelector('.td-map');
        if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
        G.hud('#hud', { Gold: '–', Leben: '–', Welle: '–', Punkte: '–' });
        refreshUI(true);
        renderBest();
        draw();
    }

    function togglePause(force) {
        if (state !== 'build' && state !== 'wave') return;
        paused = force != null ? force : !paused;
        if (paused) ov.show({ icon: '⏸', title: 'Pause', text: 'Die Viren warten brav. Drücke P oder klicke auf Weiter.', button: 'Weiter', onClick: () => togglePause(false) });
        else ov.hide();
        refreshUI(true);
    }
    function toggleSpeed() {
        speed = speed === 1 ? 2 : 1;
        $('btn-speed').textContent = '×' + speed;
        $('btn-speed').classList.toggle('btn--primary', speed === 2);
        sfx('click');
    }

    /* ── Eingaben ──────────────────────────────────────────────────────── */
    function cellAt(p) {
        const x = Math.floor(p.x / CS), y = Math.floor(p.y / CS);
        return x >= 0 && y >= 0 && x < COLS && y < ROWS ? { x, y } : null;
    }
    cv.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { hover = cellAt(G.pointer(cv, W, H, e)); kb = null; } });
    cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hover = null; });
    cv.addEventListener('pointerdown', e => {
        if (state === 'menu') return;
        XIRU.audio();
        if (e.button === 2) { cancelSel(); return; }
        const c = cellAt(G.pointer(cv, W, H, e));
        kb = null;
        hover = c;
        act(c, e.pointerType === 'touch');
    });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); cancelSel(); });

    $('td-towers').addEventListener('click', e => {
        const b = e.target.closest('[data-t]');
        if (!b || state === 'menu') return;
        b.blur();
        chooseType(b.dataset.t);
    });
    $('td-info').addEventListener('click', e => {
        const a = e.target.closest('[data-act]'), m = e.target.closest('[data-mode]');
        if (a && sel) { a.blur(); a.dataset.act === 'up' ? upgrade(sel) : sell(sel); }
        if (m && sel) { m.blur(); sel.mode = m.dataset.mode; sel.lt = null; sfx('click'); refreshUI(true); }
    });
    $('btn-wave').addEventListener('click', e => { e.currentTarget.blur(); XIRU.audio(); startWave(); });
    $('btn-speed').addEventListener('click', e => { e.currentTarget.blur(); toggleSpeed(); });
    $('btn-pause').addEventListener('click', e => { e.currentTarget.blur(); togglePause(); });
    $('auto-wave').addEventListener('change', e => {
        const prog = XIRU.load('tower-defense', {}) || {};
        prog.auto = e.target.checked; XIRU.save('tower-defense', prog);
        if (e.target.checked && state === 'build') autoT = 3.5;
        if (!e.target.checked) autoT = -1;
        refreshUI(true);
    });

    G.keys.onPress((k, e) => {
        if (state === 'menu' || (e && (e.ctrlKey || e.metaKey || e.altKey))) return;
        if (k === 'p') { togglePause(); return; }
        if (paused) { if (k === ' ' || k === 'Escape') togglePause(false); return; }
        if (state !== 'build' && state !== 'wave') return;
        const tk = TKEYS.find(t => TOWERS[t].key === k);
        if (tk) { chooseType(tk); return; }
        switch (k) {
            case ' ': startWave(); break;
            case 'g': toggleSpeed(); break;
            case 'u': upgrade(sel); break;
            case 'v': case 'Delete': case 'Backspace': if (sel) { if (e) e.preventDefault(); sell(sel); } break;
            case 'z': cycleMode(sel); break;
            case 'Escape': cancelSel(); kb = null; break;
            case 'Enter':
                if (kb && (!document.activeElement || document.activeElement === document.body)) act(kb, false);
                break;
            case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
                if (!kb) kb = sel ? { x: sel.x, y: sel.y } : hover ? { x: hover.x, y: hover.y } : { x: 10, y: 6 };
                else {
                    kb.x = Math.max(0, Math.min(COLS - 1, kb.x + (k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0)));
                    kb.y = Math.max(0, Math.min(ROWS - 1, kb.y + (k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0)));
                }
                break;
            }
        }
    });

    const loop = G.loop(update, draw);
    loop.onHide = () => { if (!paused) togglePause(true); };

    XIRU.on('setting', () => {
        C = readPalette();
        makeIcons(); renderTowerBar(); renderLexicon(); buildBackground();
        refreshUI(true);
        if (state === 'menu') showMenu(); else draw();
    });

    /* ── Start ─────────────────────────────────────────────────────────── */
    const prog0 = XIRU.load('tower-defense', {}) || {};
    $('auto-wave').checked = !!prog0.auto;
    makeIcons();
    renderTowerBar();
    renderLexicon();
    prepareMap(MAPS[0]);
    showMenu();
});
