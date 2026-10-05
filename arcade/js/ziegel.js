/* Ziegelbrecher – Breakout mit acht Mauern, harten Ziegeln, Metall und Power-ups */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const { cv, ctx, W, H } = G.canvas('#cv', 480, 560);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const COLS = 12, BRW = 37, BRH = 16, GAP = 2, TOP = 64;
    const OX = (W - (COLS * (BRW + GAP) - GAP)) / 2;
    const PAD_Y = 514, PAD_H = 12, PAD_W = 84, PAD_WIDE = 138, R = 6;

    /* Mauern: . leer · a–f Farbziegel · p Ziegel mit Power-up · 2/3 harte Ziegel · # Metall */
    const LEVELS = [
        { n: 'Aufwärmen', m: [
            'aaaaaaaaaaaa',
            'bbbbbbbbbbbb',
            'ccccpccccccc',
            'dddddddpdddd',
            'eeeeeeeeeeee'] },
        { n: 'Pyramide', m: [
            '.....pp.....',
            '....aaaa....',
            '...bbbbbb...',
            '..cccccccc..',
            '.dddddddddd.',
            '222222222222'] },
        { n: 'Schachbrett', m: [
            'a2a2a2a2a2a2',
            '2b2b2b2b2b2b',
            'c2c2c2c2c2c2',
            '2d2d2d2d2d2d',
            'e2e2e2e2e2e2',
            '.p........p.'] },
        { n: 'Diskette', m: [
            '222222222222',
            '2...3333...2',
            '2...3..3...2',
            '2...3333...2',
            '2..........2',
            '2.aaaaaaaa.2',
            '2.bbbpbbbb.2',
            '2.aaaaaaaa.2',
            '222222222222'] },
        { n: 'Festung', m: [
            'aaaaaaaaaaaa',
            '#2########2#',
            'bbbbbpbbbbbb',
            'cccccccccccc',
            '##2######2##',
            'dddddddddddd',
            'eeeeepeeeeee'] },
        { n: 'Invasor', m: [
            '..b.....b...',
            '...b...b....',
            '..bbbbbbb...',
            '.bb3bbb3bb..',
            'bbbbbpbbbbb.',
            'b.bbbbbbb.b.',
            'b.b.....b.b.',
            '...aa.aa....'] },
        { n: 'Zickzack', m: [
            'ab3.ab3.ab3.',
            '.ab3.ab3.ab3',
            '3.ab3.ap3.ab',
            'b3.ab3.ab3.a',
            'ab3.ab3.ab3.',
            '.ab3.ab3.ab3',
            '............',
            '#...#...#...'] },
        { n: 'XIRU', m: [
            'a...a..bbbbb',
            '.a.a.....b..',
            '..a......b..',
            '.a.a.....b..',
            'a...a..bbbbb',
            '.....pp.....',
            'cccc...d...d',
            'c...c..d...d',
            'cccc...d...d',
            'c..c...d...d',
            'c...c...ddd.'] }
    ];

    let mode = 'normal', state = 'idle';
    let bricks = [], balls = [], caps = [], parts = [], pops = [];
    let pad = { x: W / 2, w: PAD_W, v: 0, vx: 0, squash: 0 };
    let level = 1, lives = 3, score = 0, wideT = 0, slowT = 0, shake = 0, flash = 0, clearT = 0, overAt = 0, hudKey = '', aim = null, t = 0;
    const hard = () => mode === 'hardcore';
    const baseSpeed = () => Math.min(500, 300 + (level - 1) * 14) * (hard() ? 1.15 : 1);

    function reset() {
        score = 0; lives = hard() ? 1 : 3; level = 1;
        pad.x = W / 2; pad.w = PAD_W; aim = null;
        loadLevel();
    }
    function loadLevel() {
        const L = LEVELS[(level - 1) % LEVELS.length];
        bricks = [];
        L.m.forEach((row, ry) => Array.from(row).forEach((ch, cx) => {
            if (ch === '.') return;
            const b = { x: OX + cx * (BRW + GAP), y: TOP + ry * (BRH + GAP), w: BRW, h: BRH, row: ry, alive: true, flash: 0, metal: ch === '#', drop: ch === 'p' };
            b.hp = b.max = ch === '2' ? 2 : ch === '3' ? 3 : 1;
            b.key = ch === 'p' ? 'warning' : { a: 'rc', b: 'accent2', c: 'warning', d: 'success', e: 'accent', f: 'danger' }[ch] || 'strong';
            bricks.push(b);
        }));
        balls = [newBall()]; caps = []; wideT = 0; slowT = 0;
        const round = Math.floor((level - 1) / LEVELS.length);
        pops.push({ text: 'Level ' + level + ' · ' + L.n + (round ? ' (Runde ' + (round + 1) + ')' : ''), x: W / 2, y: 330, t: 2.2, life: 2.2, size: 20, c: C.text });
        if (level >= 5) X.egg('g-ziegel-abriss');
        updateHud();
    }
    function newBall() {
        return { x: pad.x, y: PAD_Y - R - 1, vx: 0, vy: 0, spd: baseSpeed(), stuck: true, off: (Math.random() - .5) * 20, combo: 0, idle: 0, trail: [] };
    }
    function launch() {
        let any = false;
        balls.forEach(b => {
            if (!b.stuck) return;
            const a = X.clamp(b.off / (pad.w / 2) * .6 + (Math.random() - .5) * .3 + X.clamp(pad.vx / 2000, -.3, .3), -.9, .9);
            b.vx = Math.sin(a) * b.spd; b.vy = -Math.cos(a) * b.spd; b.stuck = false; any = true;
        });
        if (any) X.beep(660, .06, 'triangle', .06);
    }

    function updateHud() {
        const key = score + '|' + level + '|' + lives;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: X.fmt(score), Level: level, Leben: lives > 0 ? '♥'.repeat(Math.min(lives, 9)) : '–' });
        const b = X.best('ziegel');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }

    /* ── Kollision ──────────────────────────────────────────────────────── */
    function hitTest(b) {
        for (const br of bricks) {
            if (br.alive && b.x + R > br.x && b.x - R < br.x + br.w && b.y + R > br.y && b.y - R < br.y + br.h) return br;
        }
        return null;
    }
    function burst(x, y, color, n, speed) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = (.3 + Math.random()) * (speed || 160);
            parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: .5 + Math.random() * .4, c: color, s: 2 + Math.random() * 3 });
        }
    }
    function hitBrick(br, b) {
        br.flash = .14;
        if (br.metal) { X.beep(1250, .03, 'square', .025); return; }
        b.idle = 0;
        br.hp--;
        b.combo++;
        if (b.combo >= 10) X.egg('g-ziegel-durchbruch');
        if (br.hp > 0) { score += 5 * (hard() ? 2 : 1); X.beep(300, .05, 'square', .04); burst(b.x, b.y, C.muted, 4, 90); updateHud(); return; }
        br.alive = false;
        score += (10 * br.max + (b.combo > 1 ? (b.combo - 1) * 2 : 0)) * (hard() ? 2 : 1);
        burst(br.x + br.w / 2, br.y + br.h / 2, brickColor(br), 12, 170);
        X.beep(380 + (10 - Math.min(10, br.row)) * 45 + Math.min(b.combo, 12) * 18, .05, 'square', .04);
        shake = Math.max(shake, 1.6);
        if (b.combo > 2 && b.combo % 3 === 0) pops.push({ text: b.combo + '× Combo', x: br.x + br.w / 2, y: br.y, t: .9, life: .9, size: 13, c: C.warning });
        if (br.drop || Math.random() < .1) {
            const r = Math.random();
            caps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type: r < .32 ? 'B' : r < .63 ? 'M' : r < .93 ? 'L' : '+' });
        }
        updateHud();
    }

    function step(b, h) {
        b.x += b.vx * h;
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); X.beep(200, .02, 'square', .02); }
        else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); X.beep(200, .02, 'square', .02); }
        let br = hitTest(b);
        if (br) { b.x -= b.vx * h; b.vx = -b.vx; hitBrick(br, b); }
        b.y += b.vy * h;
        if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); X.beep(200, .02, 'square', .02); }
        br = hitTest(b);
        if (br) { b.y -= b.vy * h; b.vy = -b.vy; hitBrick(br, b); }
        // Schläger: Trefferpunkt bestimmt den Winkel
        if (b.vy > 0 && b.y + R >= PAD_Y && b.y - R <= PAD_Y + PAD_H && Math.abs(b.x - pad.x) <= pad.w / 2 + R) {
            const off = X.clamp((b.x - pad.x) / (pad.w / 2), -1, 1);
            const a = off * 1.05;
            b.spd = Math.min(baseSpeed() * 1.5, b.spd + 3);
            b.vx = Math.sin(a) * b.spd; b.vy = -Math.cos(a) * b.spd;
            b.y = PAD_Y - R; b.combo = 0; b.idle = 0;
            pad.squash = .12;
            X.beep(520 + Math.abs(off) * 200, .04, 'triangle', .06);
            burst(b.x, PAD_Y, C.rc, 4, 80);
        }
        if (b.y - R > H) b.dead = true;
    }

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    function tickFx(dt) {
        t += dt;
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 18 * dt; });
        bricks.forEach(b => { if (b.flash > 0) b.flash -= dt; });
        shake = Math.max(0, shake - dt * 25);
        flash = Math.max(0, flash - dt * 1.5);
        pad.squash = Math.max(0, pad.squash - dt);
    }

    function update(dt) {
        tickFx(dt);
        if (state === 'clear') {
            clearT -= dt;
            balls.forEach(b => { b.trail = []; });
            if (clearT <= 0) { level++; loadLevel(); state = 'play'; }
            return;
        }
        if (state !== 'play') return;

        // Schläger
        const kl = G.keys.isDown('ArrowLeft') || G.keys.isDown('a'), kr = G.keys.isDown('ArrowRight') || G.keys.isDown('d');
        if (kl || kr) aim = null;
        pad.w += ((wideT > 0 ? PAD_WIDE : PAD_W) - pad.w) * Math.min(1, dt * 10);
        let nx;
        if (aim != null) nx = pad.x + (aim - pad.x) * Math.min(1, dt * 28);
        else {
            const dir = (kr ? 1 : 0) - (kl ? 1 : 0);
            pad.v = dir ? X.clamp(pad.v + dir * 4200 * dt, -640, 640) : 0;
            if (dir && Math.sign(pad.v) !== dir) pad.v = dir * 200;
            nx = pad.x + pad.v * dt;
        }
        nx = X.clamp(nx, pad.w / 2, W - pad.w / 2);
        pad.vx = (nx - pad.x) / dt; pad.x = nx;
        wideT = Math.max(0, wideT - dt); slowT = Math.max(0, slowT - dt);

        // Bälle
        const slow = slowT > 0 ? .62 : 1;
        balls.forEach(b => {
            if (b.stuck) { b.x = X.clamp(pad.x + b.off, R, W - R); b.y = PAD_Y - R - 1; return; }
            const sp = Math.hypot(b.vx, b.vy) || 1;
            b.vx *= b.spd / sp; b.vy *= b.spd / sp;
            b.idle += dt;
            if (b.idle > 9) {   // Endlosschleife zwischen Metall und Wand verhindern
                const a = Math.atan2(b.vy, b.vx) + (Math.random() < .5 ? -.35 : .35);
                b.vx = Math.cos(a) * b.spd; b.vy = Math.sin(a) * b.spd;
                if (Math.abs(b.vy) < b.spd * .4) b.vy = Math.sign(b.vy || 1) * b.spd * .4;
                b.idle = 0;
            }
            const n = Math.max(1, Math.ceil(b.spd * slow * dt / 3)), h = dt * slow / n;
            for (let i = 0; i < n && !b.dead; i++) step(b, h);
            b.trail.push([b.x, b.y]); if (b.trail.length > 7) b.trail.shift();
        });
        balls = balls.filter(b => !b.dead);
        if (!balls.length) return loseLife();

        // Power-ups
        caps.forEach(c => {
            c.y += 150 * dt;
            if (c.y + 7 >= PAD_Y && c.y - 7 <= PAD_Y + PAD_H && Math.abs(c.x - pad.x) <= pad.w / 2 + 15) { c.done = true; power(c); }
            if (c.y > H + 10) c.done = true;
        });
        caps = caps.filter(c => !c.done);

        if (!bricks.some(b => b.alive && !b.metal)) {
            state = 'clear'; clearT = 2;
            const bonus = 100 * level * (hard() ? 2 : 1) + lives * 25;
            score += bonus;
            pops.push({ text: 'Mauer geschafft!', x: W / 2, y: 300, t: 2, life: 2, size: 28, c: C.rc });
            pops.push({ text: '+' + X.fmt(bonus) + ' Bonus', x: W / 2, y: 332, t: 2, life: 2, size: 16, c: C.text });
            G.sfx.win(); updateHud();
        }
    }

    function power(c) {
        const names = { B: 'Breiter Schläger', M: 'Multiball', L: 'Langsamer Ball', '+': 'Extraleben' };
        G.sfx.power();
        pops.push({ text: names[c.type], x: c.x, y: PAD_Y - 20, t: 1.1, life: 1.1, size: 15, c: capColor(c.type) });
        if (c.type === 'B') wideT = 15;
        else if (c.type === 'L') slowT = 10;
        else if (c.type === '+') { lives = Math.min(9, lives + 1); updateHud(); }
        else if (c.type === 'M') {
            if (balls.every(b => b.stuck)) launch();
            const extra = [];
            balls.forEach(b => {
                if (b.stuck) return;
                [-.4, .4].forEach(da => {
                    if (balls.length + extra.length >= 40) return;
                    let a = Math.atan2(b.vy, b.vx) + da;
                    const nb = Object.assign({}, b, { trail: [], combo: 0, idle: 0 });
                    nb.vx = Math.cos(a) * b.spd; nb.vy = Math.sin(a) * b.spd;
                    if (Math.abs(nb.vy) < b.spd * .35) nb.vy = Math.sign(nb.vy || -1) * b.spd * .35;
                    extra.push(nb);
                });
            });
            balls = balls.concat(extra);
            if (balls.length >= 9) X.egg('g-ziegel-flut');
        }
    }

    function loseLife() {
        lives--; shake = 9; flash = 1; caps = [];
        X.beep(180, .25, 'sawtooth', .06);
        updateHud();
        if (lives <= 0) return gameOver();
        wideT = 0; slowT = 0;
        balls = [newBall()];
    }
    function gameOver() {
        state = 'over'; loop.stop(); overAt = performance.now();
        G.sfx.die();
        const r = X.score('ziegel', score);
        updateHud(); draw();
        ov.show({
            icon: '🧱', title: 'Game Over',
            text: X.fmt(score) + ' Punkte · Level ' + level + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
            button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
        });
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    function brickColor(br) {
        if (br.metal) return C.muted;
        if (br.max > 1) return br.hp === 3 ? C.danger : br.hp === 2 ? C.warning : C.text;
        return C[br.key];
    }
    function capColor(type) { return { B: C.success, M: C.accent2, L: C.accent, '+': C.danger }[type]; }

    function drawBrick(br) {
        const { x, y, w, h } = br;
        if (br.metal) {
            const g = ctx.createLinearGradient(0, y, 0, y + h);
            g.addColorStop(0, C.a('text', .55)); g.addColorStop(.5, C.a('muted', .45)); g.addColorStop(1, C.a('faint', .5));
            ctx.fillStyle = g; G.roundRect(ctx, x, y, w, h, 3); ctx.fill();
            ctx.fillStyle = C.a('bg', .5);
            [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 2, 2));
        } else if (br.max > 1) {
            ctx.fillStyle = C.surface2; G.roundRect(ctx, x, y, w, h, 3); ctx.fill();
            ctx.strokeStyle = brickColor(br); ctx.lineWidth = 2; G.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 3); ctx.stroke();
            ctx.fillStyle = brickColor(br);
            for (let i = 0; i < br.hp; i++) ctx.fillRect(x + w / 2 - (br.hp * 6 - 2) / 2 + i * 6, y + h / 2 - 2, 4, 4);
            if (br.hp < br.max) {   // Risse
                ctx.strokeStyle = C.a('text', .5); ctx.lineWidth = 1; ctx.beginPath();
                ctx.moveTo(x + 6, y + 2); ctx.lineTo(x + 11, y + 8); ctx.lineTo(x + 8, y + 14);
                if (br.hp < br.max - 1) { ctx.moveTo(x + w - 5, y + 3); ctx.lineTo(x + w - 11, y + 9); ctx.lineTo(x + w - 7, y + 13); }
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = C[br.key]; G.roundRect(ctx, x, y, w, h, 3); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 3, y + 2, w - 6, 3);
            ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
            if (br.drop) { ctx.fillStyle = C.a('bg', .6); ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 3, 0, 7); ctx.fill(); }
        }
        if (br.flash > 0) { ctx.fillStyle = C.a('text', br.flash / .14 * .7); G.roundRect(ctx, x, y, w, h, 3); ctx.fill(); }
    }

    function draw() {
        ctx.save();
        const bgG = ctx.createLinearGradient(0, 0, 0, H);
        bgG.addColorStop(0, C.bg2); bgG.addColorStop(1, C.bg);
        ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        // feines Raster
        ctx.fillStyle = C.a('border', .35);
        for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) ctx.fillRect(x, y, 1.5, 1.5);

        bricks.forEach(b => { if (b.alive) drawBrick(b); });

        // Power-up-Kapseln
        caps.forEach(c => {
            ctx.fillStyle = capColor(c.type); G.roundRect(ctx, c.x - 15, c.y - 7, 30, 14, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(c.x - 10, c.y - 5, 20, 2);
            ctx.fillStyle = C.bg; ctx.font = '800 11px ' + C.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(c.type, c.x, c.y + 1);
        });
        ctx.textBaseline = 'alphabetic';

        // Schläger
        const sq = pad.squash / .12;
        const pw = pad.w * (1 + sq * .06), ph = PAD_H * (1 - sq * .25);
        ctx.fillStyle = wideT > 0 ? C.success : C.rc;
        G.roundRect(ctx, pad.x - pw / 2, PAD_Y + (PAD_H - ph), pw, ph, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(pad.x - pw / 2 + 6, PAD_Y + (PAD_H - ph) + 2, pw - 12, 2);

        // Bälle
        balls.forEach(b => {
            b.trail.forEach((p, i) => { ctx.globalAlpha = (i + 1) / b.trail.length * .25; ctx.fillStyle = slowT > 0 ? C.accent : C.rc; ctx.beginPath(); ctx.arc(p[0], p[1], R * (i + 1) / b.trail.length, 0, 7); ctx.fill(); });
            ctx.globalAlpha = 1;
            ctx.fillStyle = slowT > 0 ? C.accent : C.text; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 1.8, 0, 7); ctx.fill();
        });

        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 2.5); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
        ctx.globalAlpha = 1;

        // Zeitbalken der Power-ups
        let by = H - 14;
        [[wideT, 15, C.success, 'Breit'], [slowT, 10, C.accent, 'Langsam']].forEach(([v, max, c, label]) => {
            if (v <= 0) return;
            ctx.fillStyle = C.a('border', .7); ctx.fillRect(W - 112, by, 100, 5);
            ctx.fillStyle = c; ctx.fillRect(W - 112, by, 100 * v / max, 5);
            ctx.font = '600 10px ' + C.font; ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText(label, W - 118, by + 5);
            by -= 12;
        });
        // Leben
        for (let i = 0; i < Math.min(lives, 9); i++) { ctx.fillStyle = C.a('rc', .8); G.roundRect(ctx, 12 + i * 26, H - 16, 20, 6, 3); ctx.fill(); }

        if (state === 'play' && balls.some(b => b.stuck) && Math.floor(t * 2) % 2 === 0) {
            ctx.fillStyle = C.muted; ctx.font = '600 13px ' + C.font; ctx.textAlign = 'center';
            ctx.fillText('Klick oder Leertaste zum Abschiessen', W / 2, PAD_Y - 40);
        }
        ctx.textAlign = 'center';
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 ' + p.size + 'px ' + C.font;
            ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .85); ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
        if (flash > 0) { ctx.fillStyle = C.a('danger', flash * .25); ctx.fillRect(0, 0, W, H); }
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && state === 'play') {
            state = 'paused'; G.keys.clear();
            ov.show({ icon: '⏸', title: 'Pause', text: 'P oder Esc zum Weiterspielen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = 'play'; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === 'p' || k === 'Escape') return setPause(true);
        if (state === 'play' && (k === ' ' || k === 'ArrowUp' || k === 'w')) launch();
    });
    const aimAt = e => { aim = X.clamp(G.pointer(cv, W, H, e).x, 0, W); };
    stage.addEventListener('pointermove', e => { if (state === 'play') aimAt(e); });
    stage.addEventListener('pointerdown', e => {
        if (state !== 'play' || e.target.closest('.game__overlay')) return;
        aimAt(e);
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        launch();
    });

    function start() {
        reset(); state = 'play'; ov.hide(); loop.start();
    }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || state === 'play' || state === 'paused' || state === 'clear') return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = hard() ? 'Ein Leben, schnellerer Ball – dafür doppelte Punkte.' : 'Drei Leben, acht Mauern.';
    });
    C.onChange = () => { if (!loop.running) draw(); };

    reset(); pops = []; draw(); updateHud();
    ov.show({ icon: '🧱', title: 'Ziegelbrecher', text: 'Acht Mauern warten. Schläger mit Maus, Finger oder Pfeiltasten steuern.', button: 'Spielen', onClick: start, hint: 'Oder Leertaste' });

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
            p.anim = X.setting('anim') !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (p.onChange) p.onChange();
        };
        p.a = (k, a) => 'rgba(' + p.rgb[k] + ',' + a + ')';
        p.mixA = (rgbStr, a) => rgbStr.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
        p.refresh();
        new MutationObserver(p.refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', p.refresh);
        return p;
    }
});
