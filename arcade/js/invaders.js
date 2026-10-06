/* Invasoren – Space-Invaders-artig: Wellen, zerbröselnde Bunker, Daten-UFO */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const { cv, ctx, W, H } = G.canvas('#cv', 480, 560);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const PX = 2.5, COLS = 11, ROWS = 5, CW = 36, RH = 30, PLAYER_Y = 506, GROUND = 536, INVADE_Y = 492;
    const BUNKER_Y = 420, BC = 3, BW = 22, BHC = 16;

    /* Pixelgrafiken: je zwei Animationsbilder */
    const SPR = {
        squid: [
            ['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X.XX.X.', 'X.X..X.X'],
            ['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X', '.X....X.']
        ],
        crab: [
            ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'],
            ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.']
        ],
        octo: [
            ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXX..XX..XXX', 'XXXXXXXXXXXX', '...XX..XX...', '..XX.XX.XX..', 'XX........XX'],
            ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXX..XX..XXX', 'XXXXXXXXXXXX', '..XXX..XXX..', '.XX..XX..XX.', '..XX....XX..']
        ],
        cannon: [['......X......', '.....XXX.....', '.....XXX.....', '.XXXXXXXXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX']],
        boom: [['X...X..X...X', '.X..X..X..X.', '..X......X..', '............', 'XX........XX', '............', '..X......X..', '.X..X..X..X.']]
    };
    const PATHS = {};
    Object.keys(SPR).forEach(k => {
        PATHS[k] = SPR[k].map(rows => {
            const p = new Path2D();
            rows.forEach((row, y) => Array.from(row).forEach((ch, x) => { if (ch === 'X') p.rect(x * PX, y * PX, PX + .05, PX + .05); }));
            return { p, w: rows[0].length * PX, h: rows.length * PX };
        });
    });
    const TYPES = ['squid', 'crab', 'crab', 'octo', 'octo'];
    const POINTS = { squid: 30, crab: 20, octo: 10 };

    let mode = 'normal', state = 'idle', pausedFrom = null;
    let aliens = [], fx = 0, fy = 0, dir = 1, frame = 0, tick = 0, note = 0, fireT = 1;
    let player = { x: W / 2 }, shot = null, bombs = [], bunkers = [], ufo = null, ufoT = 20;
    let parts = [], pops = [], booms = [];
    let score = 0, lives = 3, wave = 1, shots = 0, nextLife = 1500, deadT = 0, waveT = 0, shake = 0, flash = 0, t = 0, overAt = 0, hudKey = '', aim = null;
    const hard = () => mode === 'schwer';

    function reset() {
        score = 0; lives = 3; wave = 1; nextLife = 1500; shots = 0;
        player.x = W / 2; aim = null;
        setupWave();
    }
    function setupWave() {
        aliens = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) aliens.push({ r, c, type: TYPES[r], alive: true });
        fx = (W - (COLS - 1) * CW) / 2 - 15; fy = 78 + Math.min(wave - 1, 6) * 14; dir = 1; tick = 0; frame = 0;
        shot = null; bombs = []; ufo = null; ufoT = 16 + Math.random() * 8; fireT = 1.2;
        bunkers = [];
        for (let i = 0; i < 4; i++) {
            const cells = [];
            for (let y = 0; y < BHC; y++) for (let x = 0; x < BW; x++) {
                const corner = (y < 4 && (x < 4 - y || x > BW - 5 + y));
                const arch = (y >= 11 && x >= 6 && x <= 15) || (y === 10 && x >= 7 && x <= 14) || (y === 9 && x >= 8 && x <= 13);
                cells.push(corner || arch ? 0 : 1);
            }
            const x0 = Math.round(W * (i + 1) / 5 - BW * BC / 2);
            bunkers.push({ x: x0, y: BUNKER_Y, cells, total: cells.reduce((a, b) => a + b, 0), byPlayer: 0 });
        }
        if (wave >= 5) X.egg('g-invaders-welle5');
        updateHud();
    }
    function updateHud() {
        const key = score + '|' + lives + '|' + wave;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: X.fmt(score), Welle: wave, Leben: lives > 0 ? '▲'.repeat(Math.min(lives, 9)) : '–' });
        const b = X.best('invaders');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }

    const alienPos = a => {
        const sp = PATHS[a.type][0];
        return { x: fx + a.c * CW - sp.w / 2, y: fy + a.r * RH, w: sp.w, h: sp.h };
    };
    const aliveList = () => aliens.filter(a => a.alive);

    /* ── Bunker ─────────────────────────────────────────────────────────── */
    function bunkerAt(px, py) {
        for (const b of bunkers) {
            const cx = Math.floor((px - b.x) / BC), cy = Math.floor((py - b.y) / BC);
            if (cx >= 0 && cy >= 0 && cx < BW && cy < BHC && b.cells[cy * BW + cx]) return { b, cx, cy };
        }
        return null;
    }
    function erode(hit, radius, byPlayer) {
        const { b, cx, cy } = hit;
        let removed = 0;
        for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
            const nx = cx + x, ny = cy + y;
            if (nx < 0 || ny < 0 || nx >= BW || ny >= BHC) continue;
            const d = Math.hypot(x, y);
            if (d > radius + .3 || (d > radius - 1 && Math.random() < .5)) continue;
            if (b.cells[ny * BW + nx]) { b.cells[ny * BW + nx] = 0; removed++; }
        }
        for (let i = 0; i < 5; i++) parts.push({ x: b.x + cx * BC, y: b.y + cy * BC, vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 120, t: .4, c: C.success, s: 2 });
        if (byPlayer) {
            b.byPlayer += removed;
            const left = b.cells.reduce((n, c) => n + c, 0);
            if (left <= b.total * .1 && b.byPlayer >= b.total * .6) X.egg('g-invaders-eigentor');
        }
    }

    /* ── Aktionen ───────────────────────────────────────────────────────── */
    function fire() {
        if (state !== 'play' || shot) return;
        shot = { x: player.x, y: PLAYER_Y - 4 };
        shots++;
        X.beep(1200, .05, 'square', .03); setTimeout(() => X.beep(800, .04, 'square', .02), 30);
    }
    function burst(x, y, color, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = (.3 + Math.random()) * sp;
            parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .4 + Math.random() * .4, c: color, s: 2 + Math.random() * 2 });
        }
    }
    function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 1500; lives = Math.min(9, lives + 1); G.sfx.power(); pops.push({ text: 'Extraleben!', x: player.x, y: PLAYER_Y - 30, t: 1.4, life: 1.4, c: C.success }); }
        updateHud();
    }
    function ufoValue() {
        // Altes Arcade-Geheimnis: der 23. Schuss und danach jeder 15. trifft für 300
        if (shots === 23 || (shots > 23 && (shots - 23) % 15 === 0)) return 300;
        return X.pick([50, 100, 150, 100, 50]);
    }
    function killPlayer() {
        if (state !== 'play') return;
        state = 'dead'; deadT = 1.6; lives--;
        shake = 10; flash = 1; bombs = []; shot = null;
        burst(player.x, PLAYER_Y + 8, C.rc, 30, 200);
        G.sfx.die();
        updateHud();
    }
    function gameOver(invaded) {
        state = 'over'; loop.stop(); overAt = performance.now();
        const r = X.score('invaders', score);
        updateHud(); draw();
        ov.show({
            icon: invaded ? '👾' : '💥', title: invaded ? 'Invasion!' : 'Game Over',
            text: (invaded ? 'Sie sind gelandet. ' : '') + X.fmt(score) + ' Punkte · Welle ' + wave + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
            button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
        });
    }

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    function update(dt) {
        t += dt;
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 20 * dt; });
        booms = booms.filter(b => (b.t -= dt) > 0);
        shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt * 2);

        if (state === 'dead') {
            deadT -= dt;
            if (deadT <= 0) { if (lives <= 0) return gameOver(false); state = 'play'; player.x = W / 2; aim = null; }
            return;
        }
        if (state === 'wave') { waveT -= dt; if (waveT <= 0) { wave++; setupWave(); state = 'play'; } return; }
        if (state !== 'play') return;

        // Kanone
        const kl = G.keys.isDown('ArrowLeft') || G.keys.isDown('a'), kr = G.keys.isDown('ArrowRight') || G.keys.isDown('d');
        if (kl || kr) { aim = null; player.x += ((kr ? 1 : 0) - (kl ? 1 : 0)) * 230 * dt; }
        else if (aim != null) { const d = aim - player.x; player.x += Math.sign(d) * Math.min(Math.abs(d), 300 * dt); }
        player.x = X.clamp(player.x, 20, W - 20);
        if (G.keys.isDown(' ') || G.keys.isDown('ArrowUp') || G.keys.isDown('w')) fire();

        // Formation im Takt
        const alive = aliveList();
        const speedF = Math.max(.5, 1 - (wave - 1) * .07) * (hard() ? .78 : 1);
        tick += dt;
        const interval = Math.max(.018, (.03 + .55 * alive.length / 55) * speedF);
        if (tick >= interval) {
            tick = 0; frame ^= 1;
            let minX = W, maxX = 0;
            alive.forEach(a => { const p = alienPos(a); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x + p.w); });
            if ((dir > 0 && maxX + 7 > W - 8) || (dir < 0 && minX - 7 < 8)) { fy += 14; dir = -dir; }
            else fx += 7 * dir;
            X.beep([98, 87, 78, 73][note++ % 4], .07, 'square', .05);
            // Invasoren fressen sich durch die Bunker
            let invaded = false;
            alive.forEach(a => {
                const p = alienPos(a);
                if (p.y + p.h < BUNKER_Y) return;
                bunkers.forEach(b => {
                    for (let y = 0; y < BHC; y++) for (let x = 0; x < BW; x++) {
                        const cx = b.x + x * BC, cy = b.y + y * BC;
                        if (cx + BC > p.x && cx < p.x + p.w && cy + BC > p.y && cy < p.y + p.h) b.cells[y * BW + x] = 0;
                    }
                });
                if (p.y + p.h >= INVADE_Y) invaded = true;
            });
            if (invaded) { burst(player.x, PLAYER_Y, C.rc, 30, 200); lives = 0; return gameOver(true); }
        }

        // Schuss der Kanone
        if (shot) {
            shot.y -= 600 * dt;
            let gone = shot.y < 30;
            if (!gone) for (const a of alive) {
                const p = alienPos(a);
                if (shot.x > p.x - 1 && shot.x < p.x + p.w + 1 && shot.y < p.y + p.h && shot.y + 10 > p.y) {
                    a.alive = false; gone = true;
                    booms.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, t: .25, c: colorOf(a) });
                    burst(p.x + p.w / 2, p.y + p.h / 2, colorOf(a), 10, 140);
                    X.beep(180, .08, 'sawtooth', .05);
                    addScore(POINTS[a.type]);
                    break;
                }
            }
            if (!gone && ufo && Math.abs(shot.x - ufo.x) < 24 && shot.y < ufo.y + 9 && shot.y > ufo.y - 12) {
                const v = ufoValue();
                addScore(v);
                pops.push({ text: String(v), x: ufo.x, y: ufo.y, t: 1.6, life: 1.6, c: v === 300 ? C.warning : C.text });
                burst(ufo.x, ufo.y, C.accent2, 24, 180); G.sfx.coin();
                if (v === 300) X.egg('g-invaders-ufo300');
                ufo = null; gone = true; shake = 4;
            }
            if (!gone) for (const bm of bombs) {
                if (Math.abs(bm.x - shot.x) < 5 && Math.abs(bm.y - shot.y) < 12) { bm.dead = true; gone = true; burst(shot.x, shot.y, C.text, 6, 90); break; }
            }
            if (!gone) {
                const hit = bunkerAt(shot.x, shot.y) || bunkerAt(shot.x, shot.y + 5);
                if (hit) { erode(hit, 2, true); gone = true; }
            }
            if (gone) shot = null;
        }

        // Bomben der Invasoren
        fireT -= dt;
        const maxB = Math.min(6, 2 + Math.floor(wave / 2) + (hard() ? 1 : 0));
        if (fireT <= 0 && bombs.length < maxB && alive.length) {
            const cols = {};
            alive.forEach(a => { if (!cols[a.c] || cols[a.c].r < a.r) cols[a.c] = a; });
            const shooters = Object.values(cols);
            let a = X.pick(shooters);
            if (Math.random() < .45) a = shooters.reduce((m, s) => Math.abs(alienPos(s).x + 15 - player.x) < Math.abs(alienPos(m).x + 15 - player.x) ? s : m);
            const p = alienPos(a);
            bombs.push({ x: p.x + p.w / 2, y: p.y + p.h, kind: Math.random() < .5 ? 0 : 1, v: Math.min(340, 200 + wave * 14) * (hard() ? 1.15 : 1) });
            fireT = (.35 + Math.random() * .8) * (hard() ? .7 : 1) * Math.max(.5, 1 - wave * .05);
        }
        for (const bm of bombs) {
            if (bm.dead) continue;
            bm.y += bm.v * dt;
            if (bm.y > GROUND) { bm.dead = true; burst(bm.x, GROUND, C.danger, 4, 60); continue; }
            const hit = bunkerAt(bm.x, bm.y + 8);
            if (hit) { erode(hit, 2, false); bm.dead = true; continue; }
            if (Math.abs(bm.x - player.x) < 16 && bm.y + 8 > PLAYER_Y && bm.y < PLAYER_Y + 20) { bm.dead = true; killPlayer(); return; }
        }
        bombs = bombs.filter(b => !b.dead);

        // Daten-UFO
        ufoT -= dt;
        if (!ufo && ufoT <= 0 && alive.length >= 8) {
            const fromLeft = Math.random() < .5;
            ufo = { x: fromLeft ? -30 : W + 30, y: 50, v: fromLeft ? 95 : -95 };
            ufoT = 18 + Math.random() * 10;
        }
        if (ufo) {
            ufo.x += ufo.v * dt;
            if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) X.beep(Math.floor(t * 8) % 2 ? 760 : 880, .08, 'sine', .015);
            if (ufo.x < -40 || ufo.x > W + 40) ufo = null;
        }

        if (!aliveList().length) {
            state = 'wave'; waveT = 1.8; bombs = []; shot = null;
            const bonus = 50 * wave;
            addScore(bonus);
            pops.push({ text: 'Welle ' + wave + ' abgewehrt! +' + bonus, x: W / 2, y: 260, t: 1.8, life: 1.8, c: C.rc });
            G.sfx.win();
        }
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    function colorOf(a) { return a.type === 'squid' ? C.accent2 : a.type === 'crab' ? C.rc : C.accent; }
    function drawUfo(u) {
        // Daten-UFO: eine fliegende CD
        ctx.save(); ctx.translate(u.x, u.y);
        ctx.fillStyle = C.a('accent', .35); ctx.beginPath(); ctx.ellipse(0, -5, 9, 7, 0, Math.PI, 0); ctx.fill();
        const g = ctx.createLinearGradient(-22, 0, 22, 0);
        const sh = (t * 120) % 44;
        g.addColorStop(0, 'rgb(200,205,220)'); g.addColorStop(Math.max(0, sh / 44 - .15), 'rgb(170,220,255)');
        g.addColorStop(sh / 44, 'rgb(255,190,240)'); g.addColorStop(Math.min(1, sh / 44 + .15), 'rgb(200,255,210)'); g.addColorStop(1, 'rgb(190,195,215)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.ellipse(0, 0, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2); ctx.stroke();
        const blink = Math.floor(t * 6) % 3;
        [-14, 0, 14].forEach((x, i) => { ctx.fillStyle = i === blink ? C.warning : C.a('warning', .3); ctx.fillRect(x - 1.5, 4, 3, 2); });
        ctx.restore();
    }
    function draw() {
        ctx.save();
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        // Sternenhimmel
        for (let i = 0; i < 40; i++) {
            const sx = (i * 97.3) % W, sy = (i * 53.7 + t * (4 + i % 3 * 3)) % (BUNKER_Y - 20) + 20;
            ctx.fillStyle = C.a('text', .12 + (i % 4) * .05); ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        // Invasoren
        aliens.forEach(a => {
            if (!a.alive) return;
            const p = alienPos(a);
            ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = colorOf(a); ctx.fill(PATHS[a.type][frame].p); ctx.restore();
        });
        booms.forEach(b => { ctx.save(); ctx.translate(b.x - 15, b.y - 10); ctx.fillStyle = b.c; ctx.fill(PATHS.boom[0].p); ctx.restore(); });
        if (ufo) drawUfo(ufo);
        // Bunker
        ctx.fillStyle = C.success;
        bunkers.forEach(b => {
            for (let y = 0; y < BHC; y++) for (let x = 0; x < BW; x++) if (b.cells[y * BW + x]) ctx.fillRect(b.x + x * BC, b.y + y * BC, BC, BC);
        });
        // Kanone
        if (state !== 'dead' || Math.floor(deadT * 10) % 2 === 0) {
            if (state === 'dead') { ctx.save(); ctx.translate(player.x - 15, PLAYER_Y); ctx.fillStyle = C.danger; ctx.fill(PATHS.boom[0].p); ctx.restore(); }
            else { ctx.save(); ctx.translate(player.x - PATHS.cannon[0].w / 2, PLAYER_Y); ctx.fillStyle = C.rc; ctx.fill(PATHS.cannon[0].p); ctx.restore(); }
        }
        // Geschosse
        if (shot) { ctx.fillStyle = C.text; ctx.fillRect(shot.x - 1, shot.y, 2, 10); }
        bombs.forEach(b => {
            ctx.strokeStyle = C.danger; ctx.lineWidth = 2; ctx.beginPath();
            if (b.kind) { for (let i = 0; i <= 4; i++) ctx.lineTo(b.x + ((Math.floor(b.y / 6) + i) % 2 ? -2 : 2), b.y + i * 2.5); }
            else { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + 10); ctx.moveTo(b.x - 3, b.y + ((b.y / 4) % 2 < 1 ? 3 : 7)); ctx.lineTo(b.x + 3, b.y + ((b.y / 4) % 2 < 1 ? 3 : 7)); }
            ctx.stroke();
        });
        // Boden & Leben
        ctx.fillStyle = C.success; ctx.fillRect(0, GROUND, W, 2);
        for (let i = 0; i < Math.min(lives - (state === 'dead' ? 0 : 1), 8); i++) {
            ctx.save(); ctx.translate(14 + i * 36, GROUND + 8); ctx.scale(.7, .7); ctx.fillStyle = C.a('rc', .8); ctx.fill(PATHS.cannon[0].p); ctx.restore();
        }
        ctx.font = '700 12px ' + C.mono; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
        ctx.fillText('PUNKTE ' + String(score).padStart(5, '0'), W - 10, 22);
        ctx.textAlign = 'left'; ctx.fillText('WELLE ' + wave, 10, 22);
        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 3); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 16px ' + C.font; ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .8);
            ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
        if (flash > 0) { ctx.fillStyle = C.a('danger', flash * .2); ctx.fillRect(0, 0, W, H); }
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && (state === 'play' || state === 'dead' || state === 'wave')) {
            pausedFrom = state; state = 'paused'; G.keys.clear();
            ov.show({ icon: '⏸', title: 'Pause', text: 'P oder Esc zum Weiterspielen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = pausedFrom; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === 'p' || k === 'Escape') return setPause(true);
        if (k === ' ' || k === 'ArrowUp' || k === 'w') fire();
    });
    stage.addEventListener('pointermove', e => { if (state === 'play' && (e.pointerType === 'mouse' || e.buttons)) aim = X.clamp(G.pointer(cv, W, H, e).x, 20, W - 20); });
    stage.addEventListener('pointerdown', e => {
        if (e.target.closest('.game__overlay') || state !== 'play') return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        aim = X.clamp(G.pointer(cv, W, H, e).x, 20, W - 20);
        fire();
    });

    function start() { reset(); state = 'play'; ov.hide(); loop.start(); }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || (state !== 'idle' && state !== 'over')) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = hard() ? 'Schnellerer Marsch, mehr Bomben – für alte Hasen.' : 'Der Klassiker im Originaltempo.';
    });
    C.onChange = () => { if (!loop.running) draw(); };

    reset(); draw();
    ov.show({ icon: '👾', title: 'Invasoren', text: 'Halte die Wellen auf, bevor sie landen. Die Bunker schützen dich – aber nicht ewig.', button: 'Verteidigen', onClick: start, hint: 'Oder Leertaste' });

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
