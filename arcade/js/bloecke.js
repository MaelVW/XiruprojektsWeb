/* Blöcke – Stapelspiel der Spielhalle
   SRS-Drehung mit Wandkick, 7er-Beutel, Halten, Geisterstein, Lock-Verzögerung, T-Dreh-Erkennung */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const COLS = 10, ROWS = 22, HID = 2, CELL = 26, BX = 110, BY = 18;
    const BW = COLS * CELL, BH = (ROWS - HID) * CELL;
    const DAS = 0.16, ARR = 0.045, SOFT = 0.03, LOCK_DELAY = 0.5, CLEAR_TIME = 0.32;
    const { cv, ctx, W, H } = G.canvas('#cv', 480, 560);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();

    const SHAPES = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        O: [[1, 1], [1, 1]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
    };
    const BASE = { I: '#22d3ee', O: '#facc15', T: '#c084fc', S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c' };
    // SRS-Wandkicks (x nach rechts, y nach OBEN wie in der Spezifikation)
    const KJ = {
        '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
    };
    const KI = {
        '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
    };
    let COL = {}, booted = false;
    C.onChange = () => {
        const mono = /floppy|crt/.test(document.documentElement.getAttribute('data-theme') || '');
        Object.keys(BASE).forEach(t => { COL[t] = C.mixHex(BASE[t], 'rc', mono ? .6 : .12); });
        if (booted && !loop.running) draw();
    };
    C.onChange();

    let board, cur, queue, bag, hold, canHold, score, lines, level, startLevel = 1, combo, b2b;
    let state = 'idle', fallAcc = 0, lockT = 0, lockMoves = 0, lowest = 0, lastRot = false, rotCount = 0;
    let clearRows = [], clearT = 0, dieT = 0, overAt = 0, pendingSpin = false;
    let dasDir = 0, dasT = 0, arrT = 0, shake = 0, flash = 0, hudKey = '';
    let parts = [], pops = [], trails = [];

    /* ── Grundlagen ─────────────────────────────────────────────────────── */
    const rot = (m, dir) => m.map((row, y) => row.map((_, x) => dir > 0 ? m[m.length - 1 - x][y] : m[x][m.length - 1 - y]));
    function fits(m, px, py) {
        for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) {
            if (!m[y][x]) continue;
            const bx = px + x, by = py + y;
            if (bx < 0 || bx >= COLS || by >= ROWS) return false;
            if (by >= 0 && board[by][bx]) return false;
        }
        return true;
    }
    function cells(p) {
        const out = [];
        p.m.forEach((row, y) => row.forEach((v, x) => { if (v) out.push([p.x + x, p.y + y]); }));
        return out;
    }
    function fillQueue() {
        while (queue.length < 5) {
            if (!bag.length) { bag = Object.keys(SHAPES); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
            queue.push(bag.pop());
        }
    }
    const gravity = () => Math.max(0.0008, Math.pow(0.8 - (level - 1) * 0.007, level - 1));
    const grounded = () => !fits(cur.m, cur.x, cur.y + 1);
    const keyL = () => G.keys.isDown('ArrowLeft') || G.keys.isDown('a');
    const keyR = () => G.keys.isDown('ArrowRight') || G.keys.isDown('d');
    const keySoft = () => G.keys.isDown('ArrowDown') || G.keys.isDown('s');

    function reset() {
        board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
        queue = []; bag = []; fillQueue();
        hold = null; canHold = true; score = 0; lines = 0; level = startLevel; combo = -1; b2b = false;
        parts = []; pops = []; trails = []; shake = 0; flash = 0; clearT = 0; clearRows = [];
        dasDir = 0; cur = null;
        spawn();
        updateHud();
    }

    function spawn(t) {
        if (!t) { t = queue.shift(); fillQueue(); }
        cur = { t, m: SHAPES[t].map(r => r.slice()), x: t === 'O' ? 4 : 3, y: 0, r: 0 };
        fallAcc = 0; lockT = 0; lockMoves = 0; lastRot = false; rotCount = 0;
        if (!fits(cur.m, cur.x, cur.y)) return die();
        if (fits(cur.m, cur.x, cur.y + 1)) cur.y++;
        lowest = cur.y;
    }

    function lockReset() {
        if (grounded() && lockMoves < 15) { lockT = 0; lockMoves++; }
    }
    function move(dx) {
        if (!cur || clearT > 0 || !fits(cur.m, cur.x + dx, cur.y)) return false;
        cur.x += dx; lastRot = false; lockReset();
        return true;
    }
    function rotate(dir) {
        if (!cur || clearT > 0 || cur.t === 'O') return false;
        const nr = (cur.r + dir + 4) % 4, nm = rot(cur.m, dir);
        const kicks = (cur.t === 'I' ? KI : KJ)[cur.r + '>' + nr];
        for (const [kx, ky] of kicks) {
            if (fits(nm, cur.x + kx, cur.y - ky)) {
                cur.m = nm; cur.x += kx; cur.y -= ky; cur.r = nr; lastRot = true;
                if (cur.y > lowest) { lowest = cur.y; lockMoves = 0; }
                lockReset();
                X.beep(640 + nr * 40, .03, 'square', .025);
                if (++rotCount === 12) X.egg('g-bloecke-pirouette');
                return true;
            }
        }
        return false;
    }
    function hardDrop() {
        if (!cur || clearT > 0) return;
        const before = cells(cur);
        let d = 0;
        while (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; d++; }
        if (d) lastRot = false;
        score += d * 2;
        const top = {}, bottom = {};
        before.forEach(([x, y]) => { top[x] = Math.min(top[x] == null ? 99 : top[x], y); });
        cells(cur).forEach(([x, y]) => { bottom[x] = Math.max(bottom[x] == null ? -1 : bottom[x], y); });
        Object.keys(bottom).forEach(x => trails.push({ x: +x, y0: top[x], y1: bottom[x], t: .22, c: COL[cur.t] }));
        shake = Math.max(shake, 2 + Math.min(4, d / 4));
        lock();
    }
    function doHold() {
        if (!cur || !canHold || clearT > 0 || state !== 'play') return;
        const t = cur.t; canHold = false;
        if (hold) { const h = hold; hold = t; spawn(h); } else { hold = t; spawn(); }
        X.beep(420, .05, 'triangle', .05);
    }

    function lock() {
        let above = true, spin = false;
        cells(cur).forEach(([x, y]) => { if (y >= 0) board[y][x] = cur.t; if (y >= HID) above = false; });
        if (cur.t === 'T' && lastRot) {
            let c = 0;
            [[0, 0], [2, 0], [0, 2], [2, 2]].forEach(([dx, dy]) => {
                const x = cur.x + dx, y = cur.y + dy;
                if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x])) c++;
            });
            spin = c >= 3;
        }
        X.beep(150, .05, 'square', .04);
        cur = null; canHold = true;
        if (above) return die();
        const full = [];
        for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) full.push(y);
        pendingSpin = spin;
        if (full.length) {
            clearRows = full; clearT = CLEAR_TIME;
            full.forEach(y => board[y].forEach((t, x) => {
                for (let i = 0; i < 3; i++) parts.push({
                    x: BX + x * CELL + CELL / 2, y: BY + (y - HID) * CELL + CELL / 2,
                    vx: (Math.random() - .5) * 320, vy: -Math.random() * 260 - 40, t: .7 + Math.random() * .4, life: 1.1, c: COL[t], s: 3 + Math.random() * 4
                });
            }));
            if (full.length === 4) G.sfx.power(); else G.sfx.coin();
        } else {
            award(0, spin);
            spawn();
        }
        updateHud();
    }

    function finishClear() {
        const n = clearRows.length;
        board = board.filter((_, y) => !clearRows.includes(y));
        while (board.length < ROWS) board.unshift(new Array(COLS).fill(null));
        clearRows = [];
        award(n, pendingSpin);
        spawn();
        updateHud();
    }

    function award(n, spin) {
        const cx = BX + BW / 2;
        const difficult = n === 4 || (spin && n > 0);
        let pts = (spin ? [100, 800, 1200, 1600][n] : [0, 100, 300, 500, 800][n]) * level;
        if (spin && n === 0) pts = 400 * level;
        const labels = [];
        if (spin) labels.push(['T-Dreh' + (n ? ' ' + ['', 'Einzel', 'Doppel', 'Dreifach'][n] : '') + '!', C.accent2]);
        else if (n === 4) labels.push(['VIERER!', C.rc]);
        else if (n > 1) labels.push([['', '', 'Doppel', 'Dreifach'][n], C.text]);
        if (difficult && b2b) { pts = Math.floor(pts * 1.5); labels.push(['Rücken an Rücken ×1.5', C.warning]); }
        if (n > 0) b2b = difficult;
        combo = n > 0 ? combo + 1 : -1;
        if (combo > 0) { pts += 50 * combo * level; labels.push(['Combo ×' + combo, C.success]); }
        if (n > 0 && board.every(r => r.every(c => !c))) {
            pts += [0, 800, 1200, 1800, 2000][n] * level;
            labels.push(['Alles leer!', C.warning]);
            X.egg('g-bloecke-leer'); G.sfx.win(); flash = .5;
        }
        if (n === 4) { X.egg('g-bloecke-vier'); shake = Math.max(shake, 9); flash = Math.max(flash, .35); }
        else if (n > 0) shake = Math.max(shake, 2 + n * 1.5);
        score += pts;
        labels.forEach((l, i) => pops.push({ text: l[0], c: l[1], x: cx, y: BY + BH * .42 + i * 26, t: 1.3, life: 1.3, size: i ? 16 : 24 }));
        if (pts && n) pops.push({ text: '+' + X.fmt(pts), c: C.text, x: cx, y: BY + BH * .42 - 30, t: 1, life: 1, size: 15 });
        lines += n;
        const nl = startLevel + Math.floor(lines / 10);
        if (nl > level) {
            level = nl;
            pops.push({ text: 'Level ' + level, c: C.rc, x: cx, y: BY + BH * .25, t: 1.6, life: 1.6, size: 30 });
            setTimeout(() => G.sfx.power(), 250);
        }
    }

    function die() {
        if (state !== 'play') return;
        state = 'dying'; dieT = 0; cur = null;
        G.sfx.die(); shake = 8;
    }
    function finish() {
        state = 'over'; loop.stop(); overAt = performance.now();
        const r = X.score('bloecke', score);
        updateHud();
        ov.show({
            icon: '🧱', title: 'Game Over',
            text: X.fmt(score) + ' Punkte · ' + lines + ' Reihen · Level ' + level + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
            button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
        });
    }

    function updateHud() {
        const key = score + '|' + lines + '|' + level;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: X.fmt(score), Reihen: lines, Level: level });
        const b = X.best('bloecke');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && state === 'play') {
            state = 'paused'; G.keys.clear();
            ov.show({ icon: '⏸', title: 'Pause', text: 'P, Esc oder Leertaste zum Weiterspielen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = 'play'; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (state !== 'play') return;
        if (k === 'p' || k === 'Escape') return setPause(true);
        if (k === 'ArrowLeft' || k === 'a') { move(-1); dasDir = -1; dasT = 0; arrT = 0; }
        else if (k === 'ArrowRight' || k === 'd') { move(1); dasDir = 1; dasT = 0; arrT = 0; }
        else if (k === 'ArrowUp' || k === 'x' || k === 'w') rotate(1);
        else if (k === 'z' || k === 'y' || k === 'Control') rotate(-1);
        else if (k === ' ') hardDrop();
        else if (k === 'c' || k === 'Shift') doHold();
    });

    let touch = null, wheelT = 0;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
        if (state !== 'play' || !cur) return;
        const p = G.pointer(cv, W, H, e);
        if (e.pointerType === 'mouse') {
            if (e.button === 2) rotate(1);
            else if (e.button === 0) { if (p.x < BX) doHold(); else if (p.x < BX + BW) hardDrop(); }
            return;
        }
        touch = { x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), moved: false };
    });
    cv.addEventListener('pointermove', e => {
        if (state !== 'play' || !cur || clearT > 0) return;
        const p = G.pointer(cv, W, H, e);
        if (e.pointerType === 'mouse') {
            if (p.x < BX || p.x > BX + BW) return;
            const col = Math.floor((p.x - BX) / CELL);
            let guard = 12;
            while (guard--) {
                const xs = cells(cur).map(c => c[0]);
                const mid = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
                if (mid === col || !move(Math.sign(col - mid))) break;
            }
            return;
        }
        if (!touch) return;
        const step = CELL * .85;
        while (p.x - touch.x >= step) { move(1); touch.x += step; touch.moved = true; }
        while (touch.x - p.x >= step) { move(-1); touch.x -= step; touch.moved = true; }
        while (p.y - touch.y >= CELL) {
            if (fits(cur.m, cur.x, cur.y + 1)) { cur.y++; score++; lastRot = false; }
            touch.y += CELL; touch.moved = true;
        }
    });
    const endTouch = e => {
        if (!touch || e.pointerType === 'mouse') return;
        const p = G.pointer(cv, W, H, e), dt = performance.now() - touch.t;
        const dx = p.x - touch.sx, dy = p.y - touch.sy;
        if (!touch.moved && Math.hypot(dx, dy) < 12 && dt < 350) rotate(1);
        else if (dy > 70 && dt < 260 && dy > Math.abs(dx) * 2) hardDrop();
        else if (dy < -50 && dt < 320 && -dy > Math.abs(dx) * 2) doHold();
        touch = null;
    };
    cv.addEventListener('pointerup', endTouch);
    cv.addEventListener('pointercancel', () => { touch = null; });
    cv.addEventListener('wheel', e => {
        if (state !== 'play') return;
        e.preventDefault();
        const now = performance.now();
        if (now - wheelT < 110) return;
        wheelT = now; rotate(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    function tickFx(dt) {
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 22 * dt; });
        trails = trails.filter(t => (t.t -= dt) > 0);
        shake = Math.max(0, shake - dt * 30);
        flash = Math.max(0, flash - dt);
    }

    function update(dt) {
        tickFx(dt);
        if (state === 'dying') { dieT += dt; if (dieT > 1.15) finish(); return; }
        if (state !== 'play') return;
        if (clearT > 0) { clearT -= dt; if (clearT <= 0) finishClear(); return; }
        if (!cur) return;
        // seitliches Wiederholen beim Festhalten
        if (dasDir && !(dasDir < 0 ? keyL() : keyR())) dasDir = keyL() ? -1 : keyR() ? 1 : 0;
        if (dasDir) {
            dasT += dt;
            if (dasT >= DAS) { arrT += dt; while (arrT >= ARR) { arrT -= ARR; if (!move(dasDir)) { arrT = 0; break; } } }
        }
        const soft = keySoft();
        const g = soft ? Math.min(gravity(), SOFT) : gravity();
        fallAcc += dt;
        while (fallAcc >= g) {
            fallAcc -= g;
            if (fits(cur.m, cur.x, cur.y + 1)) {
                cur.y++; lastRot = false; lockT = 0;
                if (soft) score++;
                if (cur.y > lowest) { lowest = cur.y; lockMoves = 0; }
            } else { fallAcc = 0; break; }
        }
        if (grounded()) { lockT += dt; if (lockT >= LOCK_DELAY) lock(); }
        if (soft) updateHud();
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    function block(px, py, s, color, alpha) {
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.fillStyle = color; ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
        const b = Math.max(2, s / 8);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(px + 1, py + 1, s - 2, b); ctx.fillRect(px + 1, py + 1, b, s - 2);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + 1, py + s - 1 - b, s - 2, b); ctx.fillRect(px + s - 1 - b, py + 1, b, s - 2);
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px + s * .3, py + s * .3, s * .4, s * .4);
        ctx.globalAlpha = 1;
    }
    function mini(t, cx, cy, s, alpha) {
        const m = SHAPES[t];
        let minX = 9, maxX = -1, minY = 9, maxY = -1;
        m.forEach((row, y) => row.forEach((v, x) => { if (v) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }));
        const ox = cx - (maxX - minX + 1) * s / 2, oy = cy - (maxY - minY + 1) * s / 2;
        m.forEach((row, y) => row.forEach((v, x) => { if (v) block(ox + (x - minX) * s, oy + (y - minY) * s, s, COL[t], alpha); }));
    }
    function panel(x, y, w, h, title) {
        ctx.fillStyle = C.a('surface', .9); G.roundRect(ctx, x, y, w, h, 8); ctx.fill();
        ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = C.muted; ctx.font = '700 10px ' + C.font; ctx.textAlign = 'center';
        ctx.fillText(title, x + w / 2, y + 15);
    }

    function draw() {
        ctx.save();
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);

        // Spielfeld
        ctx.fillStyle = C.a('bg', .9); ctx.fillRect(BX, BY, BW, BH);
        ctx.strokeStyle = C.a('border', .5); ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 1; i < COLS; i++) { ctx.moveTo(BX + i * CELL + .5, BY); ctx.lineTo(BX + i * CELL + .5, BY + BH); }
        for (let i = 1; i < ROWS - HID; i++) { ctx.moveTo(BX, BY + i * CELL + .5); ctx.lineTo(BX + BW, BY + i * CELL + .5); }
        ctx.stroke();

        // Fallspuren
        trails.forEach(t => {
            const y0 = BY + Math.max(0, t.y0 - HID) * CELL, y1 = BY + (t.y1 - HID) * CELL;
            if (y1 <= y0) return;
            const gr = ctx.createLinearGradient(0, y0, 0, y1);
            gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, t.c);
            ctx.globalAlpha = t.t / .22 * .45; ctx.fillStyle = gr;
            ctx.fillRect(BX + t.x * CELL + 3, y0, CELL - 6, y1 - y0);
        });
        ctx.globalAlpha = 1;

        // liegende Steine
        const deadRows = state === 'dying' || state === 'over' ? Math.floor(Math.min(1, dieT / 1) * (ROWS - HID)) : 0;
        for (let y = HID; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            const t = board[y][x];
            const dead = ROWS - y <= deadRows;
            if (t) block(BX + x * CELL, BY + (y - HID) * CELL, CELL, dead ? C.faint : COL[t]);
            else if (dead) { ctx.fillStyle = C.a('faint', .18); ctx.fillRect(BX + x * CELL + 1, BY + (y - HID) * CELL + 1, CELL - 2, CELL - 2); }
        }
        // Reihen, die gerade verschwinden
        if (clearRows.length) {
            const k = clearT / CLEAR_TIME;
            clearRows.forEach(y => {
                if (y < HID) return;
                ctx.fillStyle = C.a('text', .25 + .6 * k);
                const shrink = (1 - k) * BW / 2;
                ctx.fillRect(BX + shrink, BY + (y - HID) * CELL, BW - shrink * 2, CELL);
            });
        }

        if (cur && state === 'play') {
            // Geisterstein
            let gy = cur.y;
            while (fits(cur.m, cur.x, gy + 1)) gy++;
            cur.m.forEach((row, y) => row.forEach((v, x) => {
                if (!v || gy + y < HID) return;
                const px = BX + (cur.x + x) * CELL, py = BY + (gy + y - HID) * CELL;
                ctx.fillStyle = C.mixA(COL[cur.t], .16); ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
                ctx.strokeStyle = C.mixA(COL[cur.t], .65); ctx.lineWidth = 1.5; ctx.strokeRect(px + 2.5, py + 2.5, CELL - 5, CELL - 5);
            }));
            // aktueller Stein (Lock-Verzögerung lässt ihn leicht pulsieren)
            const a = grounded() ? .75 + .25 * Math.cos(lockT / LOCK_DELAY * Math.PI * 3) : 1;
            cells(cur).forEach(([x, y]) => { if (y >= HID) block(BX + x * CELL, BY + (y - HID) * CELL, CELL, COL[cur.t], a); });
        }

        if (flash > 0) { ctx.fillStyle = C.a('text', flash * .4); ctx.fillRect(BX, BY, BW, BH); }
        ctx.strokeStyle = C.strong; ctx.lineWidth = 2; ctx.strokeRect(BX - 1, BY - 1, BW + 2, BH + 2);

        // Seitenfelder
        panel(10, BY, 90, 78, 'HALTEN');
        if (hold) mini(hold, 55, BY + 45, 16, canHold ? 1 : .35);
        panel(10, BY + 92, 90, 108, 'LEVEL');
        ctx.fillStyle = C.text; ctx.font = '800 30px ' + C.mono; ctx.textAlign = 'center';
        ctx.fillText(level, 55, BY + 150);
        const prog = (lines % 10) / 10;
        ctx.fillStyle = C.a('border', .8); G.roundRect(ctx, 22, BY + 168, 66, 7, 3.5); ctx.fill();
        ctx.fillStyle = C.rc; G.roundRect(ctx, 22, BY + 168, Math.max(7, 66 * prog), 7, 3.5); ctx.fill();
        ctx.fillStyle = C.faint; ctx.font = '600 10px ' + C.font; ctx.fillText((10 - lines % 10) + ' bis Level ' + (level + 1), 55, BY + 190);
        if (combo > 0 || b2b) {
            panel(10, BY + 214, 90, 64, 'SERIE');
            ctx.font = '800 15px ' + C.font; ctx.fillStyle = C.success;
            if (combo > 0) ctx.fillText('Combo ×' + combo, 55, BY + 242);
            if (b2b) { ctx.fillStyle = C.warning; ctx.font = '700 11px ' + C.font; ctx.fillText('Rücken an Rücken', 55, BY + 262); }
        }
        panel(380, BY, 90, 206, 'NÄCHSTE');
        if (queue) {
            mini(queue[0], 425, BY + 52, 18, 1);
            mini(queue[1], 425, BY + 112, 14, .75);
            mini(queue[2], 425, BY + 162, 12, .55);
        }
        ctx.textAlign = 'left';

        // Partikel & Texte
        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t / .4); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        pops.forEach(p => {
            const k = p.t / p.life, grow = 1 + (1 - Math.min(1, (p.life - p.t) * 8)) * .4;
            ctx.globalAlpha = Math.min(1, k * 2.5);
            ctx.font = '800 ' + Math.round(p.size * grow) + 'px ' + C.font;
            ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .85); ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
    }

    function start() {
        reset();
        state = 'play'; ov.hide(); loop.start();
    }

    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || state === 'play' || state === 'paused' || state === 'dying') return;
        startLevel = +b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = {
            1: 'Start bei Level 1 – genug Zeit zum Nachdenken.',
            5: 'Start bei Level 5 – schon ordentlich flott.',
            10: 'Start bei Level 10 – nur für schnelle Finger.'
        }[startLevel];
        level = startLevel; hudKey = ''; updateHud(); draw();
    });

    reset(); state = 'idle'; booted = true; draw();
    ov.show({ icon: '🧱', title: 'Blöcke', text: 'Schieb und dreh die Steine zu vollen Reihen. Vier Reihen auf einmal geben am meisten Punkte.', button: 'Spielen', onClick: start, hint: 'Oder Leertaste' });

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
        const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
        p.refresh = () => {
            for (const k in vars) {
                probe.style.color = ''; probe.style.color = 'var(' + vars[k] + ')';
                p.rgb[k] = parse(getComputedStyle(probe).color); p[k] = 'rgb(' + p.rgb[k] + ')';
            }
            p.font = G.css('--font') || 'system-ui, sans-serif';
            p.mono = G.css('--mono') || 'monospace';
            p.anim = X.setting('anim') !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (p.onChange) p.onChange();
        };
        p.a = (k, a) => 'rgba(' + p.rgb[k] + ',' + a + ')';
        p.mixHex = (h, k, t) => { const a = hex(h), b = p.rgb[k]; return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)) + ')'; };
        p.mixA = (rgbStr, a) => rgbStr.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
        p.refresh();
        new MutationObserver(p.refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', p.refresh);
        return p;
    }
});
