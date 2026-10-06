/* Froschsprung – Frogger-artig: Strasse, Fluss, fünf Buchten, Zeitlimit */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const COLS = 15, CELL = 36, ROWS = 13, TOP = 28;
    const { cv, ctx, W, H } = G.canvas('#cv', COLS * CELL, TOP + ROWS * CELL + 36);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const BAYS = [1, 4, 7, 10, 13], START_ROW = 12, HOP = .11;
    const rowY = r => TOP + r * CELL;
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const KEYMAP = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };

    let mode = 'normal', state = 'idle', pausedFrom = null;
    let lanes = [], homes = [], frog, fly = null, flyT = 8;
    let score = 0, lives = 3, level = 1, timeLeft = 30, homesTotal = 0;
    let parts = [], pops = [], shake = 0, t = 0, overAt = 0, hudKey = '', held = null, holdT = 0, queued = null, levelT = 0;
    const pro = () => mode === 'profi';
    const timeMax = () => pro() ? 24 : 30;

    /* ── Aufbau ─────────────────────────────────────────────────────────── */
    function buildLanes() {
        const f = (1 + (level - 1) * .14) * (pro() ? 1.22 : 1);
        const shorter = level >= 3 ? 1 : 0, tighter = Math.min(level - 1, 2);
        const defs = [
            { row: 1, kind: 'log', dir: 1, v: 42, len: 4 - shorter, gap: [3, 4] },
            { row: 2, kind: 'turtle', dir: -1, v: 50, len: 2, gap: [2, 3] },
            { row: 3, kind: 'log', dir: 1, v: 68, len: 5 - shorter, gap: [3, 4] },
            { row: 4, kind: 'log', dir: 1, v: 36, len: 3, gap: [2, 3 + shorter] },
            { row: 5, kind: 'turtle', dir: -1, v: 44, len: 3, gap: [2, 3] },
            { row: 7, kind: 'truck', dir: -1, v: 42, len: 2, gap: [4 - tighter, 6 - tighter] },
            { row: 8, kind: 'racer', dir: 1, v: 115, len: 1, gap: [7, 10 - tighter] },
            { row: 9, kind: 'car', dir: -1, v: 58, len: 1, gap: [4 - tighter, 6 - tighter] },
            { row: 10, kind: 'dozer', dir: 1, v: 38, len: 1, gap: [3, 5 - tighter] },
            { row: 11, kind: 'car2', dir: -1, v: 48, len: 1, gap: [4 - tighter, 6 - tighter] }
        ];
        lanes = defs.map(d => {
            const lane = Object.assign({}, d, { v: d.v * f, objs: [] });
            let x = -2 * CELL + Math.random() * CELL * 2, i = 0;
            while (x < W + 3 * CELL) {
                lane.objs.push({ x, len: d.len, dive: d.kind === 'turtle' && i % 3 === 1, phase: Math.random() * 5, hue: i % 4 });
                x += (d.len + X.rand(d.gap[0], d.gap[1])) * CELL; i++;
            }
            lane.period = x + 2 * CELL;
            return lane;
        });
    }
    function newFrog() {
        frog = { x: 7 * CELL, row: START_ROW, face: 'up', hopT: 0, fromX: 0, fromRow: 0, toX: 0, toRow: 0, best: START_ROW, dead: 0, cause: '' };
        timeLeft = timeMax();
    }
    function reset() {
        score = 0; lives = 3; level = 1; homesTotal = 0;
        homes = BAYS.map(() => false); fly = null; flyT = 8;
        parts = []; pops = [];
        buildLanes(); newFrog();
        updateHud();
    }
    function updateHud() {
        const key = score + '|' + lives + '|' + level;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: X.fmt(score), Level: level, Frösche: lives > 0 ? lives : '–' });
        const b = X.best('frosch');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }

    /* ── Bewegung ───────────────────────────────────────────────────────── */
    function hop(dir) {
        if (state !== 'play' || frog.dead) return;
        if (frog.hopT > 0) { queued = dir; return; }
        const [dx, dy] = DIRS[dir];
        const nx = X.clamp(frog.x + dx * CELL, 0, W - CELL), nr = X.clamp(frog.row + dy, 0, START_ROW);
        frog.face = dir;
        if (nx === frog.x && nr === frog.row) return;
        frog.fromX = frog.x; frog.fromRow = frog.row; frog.toX = nx; frog.toRow = nr; frog.hopT = HOP;
        X.beep(dy < 0 ? 620 : 520, .04, 'triangle', .05);
    }
    function land() {
        frog.x = frog.toX; frog.row = frog.toRow;
        if (frog.row < frog.best) { frog.best = frog.row; score += 10; updateHud(); }
        if (frog.row === 0) {
            const cx = frog.x + CELL / 2;
            const i = BAYS.findIndex(b => Math.abs(cx - (b * CELL + CELL / 2)) < CELL * .6);
            if (i < 0 || homes[i]) return die(i < 0 ? 'wall' : 'wall');
            reachHome(i);
        }
    }
    function reachHome(i) {
        homes[i] = true; homesTotal++;
        const bonus = Math.floor(timeLeft * 2) * 10;
        let pts = 50 + bonus;
        const bx = BAYS[i] * CELL + CELL / 2;
        if (fly && fly.bay === i) { pts += 200; pops.push({ text: 'Fliege! +200', x: bx, y: rowY(1) + 6, t: 1.4, life: 1.4, c: C.warning }); X.egg('g-frosch-fliege'); fly = null; }
        if (timeLeft < 2) { X.egg('g-frosch-knapp'); pops.push({ text: 'Knapp!', x: bx, y: rowY(1) + 26, t: 1.4, life: 1.4, c: C.danger }); }
        score += pts;
        pops.push({ text: '+' + pts, x: bx, y: rowY(0) + CELL + 4, t: 1.1, life: 1.1, c: C.text });
        burst(bx, rowY(0) + CELL / 2, C.success, 16, 120);
        G.sfx.coin();
        if (homes.every(Boolean)) {
            score += 1000;
            pops.push({ text: 'Level ' + level + ' geschafft! +1000', x: W / 2, y: rowY(6) + 24, t: 2, life: 2, c: C.rc });
            G.sfx.win();
            state = 'level'; levelT = 1.8;
        } else newFrog();
        updateHud();
    }
    function die(cause) {
        if (frog.dead) return;
        frog.dead = 1; frog.cause = cause; frog.hopT = 0;
        lives--; shake = cause === 'squash' ? 8 : 4;
        if (cause === 'splash') { burst(frog.x + CELL / 2, rowY(frog.row) + CELL / 2, C.accent, 18, 120); X.beep(300, .2, 'sine', .06); setTimeout(() => X.beep(180, .25, 'sine', .05), 90); }
        else G.sfx.die();
        if (cause === 'squash') burst(frog.x + CELL / 2, rowY(frog.row) + CELL / 2, C.success, 14, 160);
        updateHud();
    }
    function burst(x, y, color, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = (.3 + Math.random()) * sp;
            parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .4 + Math.random() * .4, c: color, s: 2 + Math.random() * 3 });
        }
    }
    function gameOver() {
        state = 'over'; loop.stop(); overAt = performance.now();
        const r = X.score('frosch', score);
        updateHud(); draw();
        ov.show({
            icon: '🐸', title: 'Game Over',
            text: X.fmt(score) + ' Punkte · Level ' + level + ' · ' + homesTotal + ' Frösche zu Hause' + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
            button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
        });
    }

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    const submerged = o => o.dive && (o.phase % 5) > 4.0 && (o.phase % 5) < 4.85;
    const sinking = o => o.dive && (o.phase % 5) > 3.3;

    function update(dt) {
        t += dt;
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 18 * dt; });
        shake = Math.max(0, shake - dt * 25);
        if (state === 'level') {
            levelT -= dt;
            if (levelT <= 0) {
                level++; homes = BAYS.map(() => false); fly = null;
                if (level >= 3) X.egg('g-frosch-level3');
                buildLanes(); newFrog(); state = 'play'; updateHud();
            }
            return;
        }
        if (state !== 'play') return;

        // Verkehr & Fluss
        lanes.forEach(l => l.objs.forEach(o => {
            o.x += l.v * l.dir * dt; o.phase += dt;
            if (l.dir > 0 && o.x > W + CELL) o.x -= l.period;
            if (l.dir < 0 && o.x + o.len * CELL < -CELL) o.x += l.period;
        }));
        // Fliege
        flyT -= dt;
        if (fly) { fly.t -= dt; if (fly.t <= 0) { fly = null; flyT = 6 + Math.random() * 6; } }
        else if (flyT <= 0) {
            const free = homes.map((h, i) => h ? -1 : i).filter(i => i >= 0);
            if (free.length) fly = { bay: X.pick(free), t: 5 };
            flyT = 7 + Math.random() * 6;
        }

        if (frog.dead) {
            frog.dead += dt;
            if (frog.dead > 1.1) { if (lives <= 0) return gameOver(); newFrog(); }
            return;
        }
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; return die('time'); }

        // Hüpfen (mit Halten-Wiederholung)
        if (frog.hopT > 0) {
            frog.hopT -= dt;
            const k = 1 - Math.max(0, frog.hopT) / HOP;
            frog.x = frog.fromX + (frog.toX - frog.fromX) * k;
            if (frog.hopT <= 0) {
                land();
                if (frog.dead || state !== 'play') return;
                if (queued) { const q = queued; queued = null; hop(q); }
            }
        } else if (held && G.keys.isDown(held.key)) {
            holdT -= dt;
            if (holdT <= 0) { holdT = .16; hop(held.dir); }
        } else held = null;

        const row = frog.hopT > 0 ? (frog.hopT > HOP / 2 ? frog.fromRow : frog.toRow) : frog.row;
        const fx = frog.x + CELL / 2;
        const lane = lanes.find(l => l.row === row);
        if (lane && lane.row >= 7) {
            // Strasse: Zusammenstoss?
            for (const o of lane.objs) {
                if (frog.x + CELL - 7 > o.x + 2 && frog.x + 7 < o.x + o.len * CELL - 2) return die('squash');
            }
        } else if (lane && frog.hopT <= 0) {
            // Fluss: nur auf Stämmen und Schildkröten sicher
            const on = lane.objs.find(o => fx > o.x + 3 && fx < o.x + o.len * CELL - 3 && !submerged(o));
            if (!on) return die('splash');
            frog.x += lane.v * lane.dir * dt;
            if (frog.x < -CELL * .35 || frog.x > W - CELL * .65) return die('splash');
        }
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    const water = () => mix(C.rgb.bg2, [37, 99, 235], C.light ? .28 : .38);
    function mix(a, b, k) { return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)) + ')'; }

    function drawLog(o, y) {
        const x = o.x, w = o.len * CELL;
        ctx.fillStyle = 'rgb(120,78,42)'; G.roundRect(ctx, x + 1, y + 5, w - 2, CELL - 10, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 8, y + 8, w - 16, 3);
        ctx.strokeStyle = 'rgba(60,35,15,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 1; i < o.len * 2; i++) { const gx = x + i * CELL / 2; ctx.moveTo(gx, y + 14 + (i % 2) * 6); ctx.lineTo(gx + 10, y + 14 + (i % 2) * 6); }
        ctx.stroke();
        ctx.fillStyle = 'rgb(176,128,80)'; ctx.beginPath(); ctx.ellipse(x + w - 6, y + CELL / 2, 5, CELL / 2 - 6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgb(120,78,42)'; ctx.beginPath(); ctx.ellipse(x + w - 6, y + CELL / 2, 2.5, 6, 0, 0, 7); ctx.stroke();
    }
    function drawTurtles(o, y) {
        const under = submerged(o), sink = sinking(o);
        if (under) {
            ctx.fillStyle = C.a('text', .12);
            for (let i = 0; i < o.len; i++) { ctx.beginPath(); ctx.arc(o.x + i * CELL + CELL / 2, y + CELL / 2, 9 + Math.sin(t * 6 + i) * 2, 0, 7); ctx.fill(); }
            return;
        }
        ctx.globalAlpha = sink ? .55 + .35 * Math.sin(t * 18) : 1;
        for (let i = 0; i < o.len; i++) {
            const cx = o.x + i * CELL + CELL / 2, cy = y + CELL / 2, wob = Math.sin(t * 5 + i + o.hue) * 2;
            ctx.fillStyle = 'rgb(74,160,90)';
            ctx.beginPath(); ctx.arc(cx - 13, cy + wob * .3, 4, 0, 7); ctx.fill();   // Kopf
            [[-8, -10], [8, -10], [-8, 10], [8, 10]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx * .9, cy + dy * .9 + (dx < 0 ? wob : -wob) * .4, 3.5, 0, 7); ctx.fill(); });
            ctx.fillStyle = 'rgb(46,110,62)'; ctx.beginPath(); ctx.ellipse(cx, cy, 12, 10, 0, 0, 7); ctx.fill();
            ctx.strokeStyle = 'rgba(200,240,190,.45)'; ctx.lineWidth = 1; ctx.beginPath();
            ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6); ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    function drawVehicle(l, o, y) {
        const x = o.x, w = o.len * CELL, d = l.dir;
        const cols = [C.rc, C.accent2, C.warning, C.accent];
        const body = l.kind === 'truck' ? C.surface2 : l.kind === 'racer' ? C.danger : l.kind === 'dozer' ? C.warning : cols[o.hue];
        // Räder
        ctx.fillStyle = 'rgba(10,10,15,.85)';
        [[x + 6, y + 4], [x + w - 14, y + 4], [x + 6, y + CELL - 9], [x + w - 14, y + CELL - 9]].forEach(([wx, wy]) => ctx.fillRect(wx, wy, 8, 5));
        if (l.kind === 'truck') {
            const cab = d < 0 ? x + 2 : x + w - 22;
            ctx.fillStyle = C.rc; G.roundRect(ctx, cab, y + 7, 20, CELL - 14, 4); ctx.fill();
            ctx.fillStyle = 'rgba(200,230,255,.8)'; ctx.fillRect(d < 0 ? cab + 2 : cab + 14, y + 10, 4, CELL - 20);
            ctx.fillStyle = body; G.roundRect(ctx, d < 0 ? x + 24 : x + 2, y + 6, w - 26, CELL - 12, 3); ctx.fill();
            ctx.strokeStyle = C.strong; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = C.a('text', .35); ctx.font = '700 9px ' + C.font; ctx.textAlign = 'center';
            ctx.fillText('XIRU', (d < 0 ? x + 24 : x + 2) + (w - 26) / 2, y + CELL / 2 + 3); ctx.textAlign = 'left';
            return;
        }
        ctx.fillStyle = body; G.roundRect(ctx, x + 3, y + 7, w - 6, CELL - 14, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x + 8, y + 9, w - 16, 2);
        if (l.kind === 'dozer') {
            ctx.fillStyle = C.muted; ctx.fillRect(d > 0 ? x + w - 6 : x + 1, y + 4, 5, CELL - 8);
            ctx.fillStyle = 'rgba(30,30,40,.7)'; ctx.fillRect(x + 11, y + 12, 12, CELL - 24);
        } else {
            ctx.fillStyle = 'rgba(200,230,255,.85)';
            ctx.fillRect(d > 0 ? x + w - 15 : x + 9, y + 11, 6, CELL - 22);
            if (l.kind === 'racer') { ctx.fillStyle = C.a('text', .8); ctx.fillRect(x + 4, y + CELL / 2 - 1.5, w - 8, 3); }
        }
        ctx.fillStyle = d > 0 ? 'rgba(255,240,170,.9)' : 'rgba(255,240,170,.9)';
        ctx.fillRect(d > 0 ? x + w - 4 : x + 2, y + 9, 2, 4); ctx.fillRect(d > 0 ? x + w - 4 : x + 2, y + CELL - 13, 2, 4);
    }
    function drawFrog(x, y, face, scale, color) {
        const rot = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[face];
        ctx.save(); ctx.translate(x + CELL / 2, y + CELL / 2); ctx.rotate(rot); ctx.scale(scale, scale);
        ctx.fillStyle = color || C.success;
        [[-10, 8, -14, 13], [10, 8, 14, 13], [-9, -6, -13, -10], [9, -6, 13, -10]].forEach(([a, b, c, d]) => {
            ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineWidth = 4; ctx.strokeStyle = color || C.success; ctx.stroke();
        });
        ctx.beginPath(); ctx.ellipse(0, 1, 10, 12, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-3, 3, 4, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = color || C.success;
        [-6, 6].forEach(ex => { ctx.beginPath(); ctx.arc(ex, -9, 4.5, 0, 7); ctx.fill(); });
        ctx.fillStyle = '#fff'; [-6, 6].forEach(ex => { ctx.beginPath(); ctx.arc(ex, -10, 2.6, 0, 7); ctx.fill(); });
        ctx.fillStyle = '#111'; [-6, 6].forEach(ex => { ctx.beginPath(); ctx.arc(ex, -10.5, 1.3, 0, 7); ctx.fill(); });
        ctx.restore();
    }

    function draw() {
        ctx.save();
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        // Ziel-Ufer mit Buchten
        ctx.fillStyle = mix(C.rgb.success, C.rgb.bg, .55); ctx.fillRect(0, rowY(0), W, CELL);
        ctx.fillStyle = C.a('success', .35);
        for (let x = 0; x < W; x += 12) ctx.fillRect(x + (x / 12 % 2) * 4, rowY(0) + 4, 4, 6);
        // Fluss
        ctx.fillStyle = water(); ctx.fillRect(0, rowY(1), W, CELL * 5);
        ctx.strokeStyle = C.a('text', .08); ctx.lineWidth = 2;
        for (let r = 1; r <= 5; r++) for (let i = 0; i < 6; i++) {
            const wx = ((i * 97 + t * 20 * (r % 2 ? 1 : -1)) % (W + 40)) - 20;
            ctx.beginPath(); ctx.moveTo(wx, rowY(r) + 18); ctx.quadraticCurveTo(wx + 6, rowY(r) + 14, wx + 12, rowY(r) + 18); ctx.stroke();
        }
        BAYS.forEach((b, i) => {
            ctx.fillStyle = water(); G.roundRect(ctx, b * CELL - 6, rowY(0) + 4, CELL + 12, CELL - 2, 8); ctx.fill();
            if (homes[i]) drawFrog(b * CELL, rowY(0) + 2, 'down', .8);
            else if (fly && fly.bay === i) {
                const fx = b * CELL + CELL / 2, fy = rowY(0) + CELL / 2 + Math.sin(t * 9) * 2;
                ctx.fillStyle = C.a('text', .5); const wing = 4 + Math.sin(t * 40) * 2;
                ctx.beginPath(); ctx.ellipse(fx - 4, fy - 3, wing, 2.5, -.5, 0, 7); ctx.ellipse(fx + 4, fy - 3, wing, 2.5, .5, 0, 7); ctx.fill();
                ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.ellipse(fx, fy, 3, 4.5, 0, 0, 7); ctx.fill();
            }
        });
        // Mittelstreifen und Start
        [6, 12].forEach(r => {
            ctx.fillStyle = C.surface2; ctx.fillRect(0, rowY(r), W, CELL);
            ctx.fillStyle = C.a('success', .28);
            for (let x = 3; x < W; x += 9) ctx.fillRect(x, rowY(r) + 5 + (x * 7 % 22), 2, 5);
        });
        // Strasse
        ctx.fillStyle = C.bg; ctx.fillRect(0, rowY(7), W, CELL * 5);
        ctx.fillStyle = C.a('text', .22);
        for (let r = 8; r <= 11; r++) for (let x = 6; x < W; x += 36) ctx.fillRect(x, rowY(r) - 1, 18, 2);
        ctx.fillStyle = C.a('warning', .55); ctx.fillRect(0, rowY(7), W, 2); ctx.fillRect(0, rowY(12) - 2, W, 2);

        lanes.forEach(l => l.objs.forEach(o => {
            if (o.x > W + 4 || o.x + o.len * CELL < -4) return;
            const y = rowY(l.row);
            if (l.kind === 'log') drawLog(o, y);
            else if (l.kind === 'turtle') drawTurtles(o, y);
            else drawVehicle(l, o, y);
        }));

        // Frosch
        if (frog) {
            const y = frog.hopT > 0 ? rowY(frog.fromRow) + (rowY(frog.toRow) - rowY(frog.fromRow)) * (1 - frog.hopT / HOP) : rowY(frog.row);
            if (frog.dead) {
                const k = Math.min(1, frog.dead / .5);
                if (frog.cause === 'splash') {
                    ctx.strokeStyle = C.a('text', .7 * (1 - k)); ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(frog.x + CELL / 2, y + CELL / 2, 4 + k * 16 + i * 6, 0, 7); ctx.stroke(); }
                } else {
                    ctx.fillStyle = C.danger; ctx.font = '800 22px ' + C.font; ctx.textAlign = 'center';
                    ctx.globalAlpha = 1 - Math.max(0, frog.dead - .7) / .4;
                    ctx.fillText(frog.cause === 'time' ? '⏰' : '✖', frog.x + CELL / 2, y + CELL / 2 + 8);
                    ctx.globalAlpha = 1; ctx.textAlign = 'left';
                }
            } else {
                const hopScale = frog.hopT > 0 ? 1 + Math.sin((1 - frog.hopT / HOP) * Math.PI) * .25 : 1;
                drawFrog(frog.x, y, frog.face, hopScale);
            }
        }
        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 3); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
        ctx.globalAlpha = 1;

        // Kopfzeile & Zeitbalken
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, rowY(ROWS), W, H - rowY(ROWS));
        ctx.font = '700 12px ' + C.mono; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
        ctx.fillText('LEVEL ' + level, 10, 19);
        ctx.textAlign = 'right'; ctx.fillText('PUNKTE ' + String(score).padStart(5, '0'), W - 10, 19);
        ctx.textAlign = 'left';
        for (let i = 0; i < Math.max(0, lives - 1); i++) drawFrog(6 + i * 26, rowY(ROWS) + 4, 'up', .62);
        const k = timeLeft / timeMax(), bw = 220, bx = W - bw - 50, by = rowY(ROWS) + 14;
        ctx.fillStyle = C.a('border', .8); G.roundRect(ctx, bx, by, bw, 9, 4.5); ctx.fill();
        ctx.fillStyle = k > .5 ? C.success : k > .2 ? C.warning : C.danger; G.roundRect(ctx, bx, by, Math.max(9, bw * k), 9, 4.5); ctx.fill();
        ctx.fillStyle = C.muted; ctx.font = '700 11px ' + C.font; ctx.fillText('ZEIT', bx + bw + 8, by + 9);
        ctx.textAlign = 'center';
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 16px ' + C.font; ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .85);
            ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && (state === 'play' || state === 'level')) {
            pausedFrom = state; state = 'paused'; G.keys.clear(); held = null;
            ov.show({ icon: '⏸', title: 'Pause', text: 'Leertaste oder P zum Weiterhüpfen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = pausedFrom; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === 'p' || k === 'Escape' || k === ' ') return setPause(true);
        const dir = KEYMAP[k];
        if (dir) { hop(dir); held = { key: k, dir }; holdT = .28; }
    });
    let ptr = null;
    stage.addEventListener('pointerdown', e => {
        if (e.target.closest('.game__overlay') || state !== 'play') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        ptr = { x: e.clientX, y: e.clientY, p: G.pointer(cv, W, H, e) };
    });
    stage.addEventListener('pointerup', e => {
        if (!ptr || state !== 'play') { ptr = null; return; }
        const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
        if (Math.hypot(dx, dy) >= 24) hop(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        else {
            // Tippen/Klick: Richtung relativ zum Frosch
            const p = ptr.p, fx = frog.x + CELL / 2, fy = rowY(frog.row) + CELL / 2;
            const ax = p.x - fx, ay = p.y - fy;
            if (Math.abs(ax) > CELL * .4 || Math.abs(ay) > CELL * .4) hop(Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up'));
        }
        ptr = null;
    });

    function start() { reset(); state = 'play'; ov.hide(); loop.start(); }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || (state !== 'idle' && state !== 'over')) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = pro() ? '24 Sekunden pro Frosch und schnellerer Verkehr.' : '30 Sekunden pro Frosch.';
    });
    C.onChange = () => { if (!loop.running) draw(); };

    reset(); draw();
    ov.show({ icon: '🐸', title: 'Froschsprung', text: 'Bring fünf Frösche in die Buchten am oberen Ufer. Autos meiden, Stämme nutzen, nicht baden gehen!', button: 'Losspringen', onClick: start, hint: 'Oder Leertaste' });

    /* Farben aus dem aktiven Design (löst auch color-mix() auf) */
    function palette() {
        const probe = document.createElement('span');
        probe.hidden = true; document.body.appendChild(probe);
        const vars = { bg: '--bg', bg2: '--bg-2', surface: '--surface', surface2: '--surface-2', border: '--border', strong: '--border-strong', text: '--text', muted: '--text-muted', faint: '--text-faint', rc: '--rc', accent: '--accent', accent2: '--accent-2', success: '--success', warning: '--warning', danger: '--danger' };
        const p = { rgb: {} };
        const parse = s => {
            let m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s);
            if (m) return [+m[1], +m[2], +m[3]].map(Math.round);
            m = /color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)/.exec(s);
            if (m) return [m[1], m[2], m[3]].map(v => Math.round(Math.max(0, Math.min(1, +v)) * 255));
            return [128, 128, 128];
        };
        p.refresh = () => {
            for (const k in vars) {
                probe.style.color = ''; probe.style.color = 'var(' + vars[k] + ')';
                p.rgb[k] = parse(getComputedStyle(probe).color); p[k] = 'rgb(' + p.rgb[k] + ')';
            }
            p.light = p.rgb.bg.reduce((a, b) => a + b, 0) / 3 > 140;
            p.font = G.css('--font') || 'system-ui, sans-serif';
            p.mono = G.css('--mono') || 'monospace';
            p.anim = X.setting('anim') !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (p.onChange) p.onChange();
        };
        p.a = (k, a) => 'rgba(' + p.rgb[k] + ',' + a + ')';
        p.refresh();
        new MutationObserver(p.refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', p.refresh);
        return p;
    }
});
