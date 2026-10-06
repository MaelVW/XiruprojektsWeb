/* Asteroiden – Schiff mit Trägheit, zerfallende Brocken, Bildschirmrand-Wrap, Hyperraum */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const { cv, ctx, W, H } = G.canvas('#cv', 720, 480);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const TURN = 4.4, THRUST = 270, MAX_V = 390, SHIP_R = 11, BULLET_V = 540, BULLET_LIFE = .95, MAX_BULLETS = 5;
    const SIZES = { 3: { r: 46, pts: 20, v: [28, 70] }, 2: { r: 24, pts: 50, v: [45, 110] }, 1: { r: 13, pts: 100, v: [70, 150] } };

    let mode = 'klassisch', state = 'idle', pausedFrom = null;
    let ship, bullets = [], rocks = [], saucer = null, sBullets = [], parts = [], debris = [], pops = [];
    let score = 0, lives = 3, wave = 0, nextLife = 10000, waveT = 0, saucerT = 20, beatT = 0, beatHi = false, waveCount = 1;
    let shake = 0, t = 0, overAt = 0, hudKey = '', fireCd = 0, hyperCd = 0, escape = null;
    let aimP = null, aimT = 0, mouseFire = false, mouseThrust = false;
    const hard = () => mode === 'hardcore';
    const stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 137.5) % W, y: (i * 89.3 + i * i * .7) % H, s: (i % 3) * .5 + .6, p: i }));

    /* ── Aufbau ─────────────────────────────────────────────────────────── */
    function newShip() {
        ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, alive: true, inv: 2.2, thrust: false, hyper: 0, respawn: 0 };
    }
    function makeRock(x, y, size, dirA) {
        const s = SIZES[size], a = dirA == null ? Math.random() * Math.PI * 2 : dirA;
        const sp = (s.v[0] + Math.random() * (s.v[1] - s.v[0])) * (1 + Math.min(wave, 10) * .04) * (hard() ? 1.15 : 1);
        const n = 9 + Math.floor(Math.random() * 4);
        return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, r: s.r, rot: 0, vr: (Math.random() - .5) * 1.4,
            shape: Array.from({ length: n }, (_, i) => ({ a: i / n * Math.PI * 2 + (Math.random() - .5) * .3, r: .72 + Math.random() * .32 })) };
    }
    function startWave() {
        wave++;
        const n = Math.min(12, 3 + wave + (hard() ? 2 : 0));
        rocks = [];
        for (let i = 0; i < n; i++) {
            let x, y;
            do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - ship.x, y - ship.y) < 170);
            rocks.push(makeRock(x, y, 3));
        }
        waveCount = n * 7;   // grob: wie viele Brocken diese Welle insgesamt hat (fürs Herzschlag-Tempo)
        saucerT = Math.max(10, 24 - wave * 2) + Math.random() * 6;
        if (wave > 1) pops.push({ text: 'Welle ' + wave, x: W / 2, y: H / 2 - 40, t: 1.6, life: 1.6, size: 26, c: C.rc });
        updateHud();
    }
    function reset() {
        score = 0; lives = hard() ? 1 : 3; wave = 0; nextLife = 10000;
        bullets = []; sBullets = []; parts = []; debris = []; pops = []; saucer = null; escape = null;
        newShip(); ship.inv = 2.5;
        startWave();
    }
    function updateHud() {
        const key = score + '|' + lives + '|' + wave;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: X.fmt(score), Welle: wave, Schiffe: Math.max(0, lives) });
        const b = X.best('asteroiden');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }
    function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 10000; lives++; G.sfx.power(); pops.push({ text: 'Extraschiff!', x: W / 2, y: 60, t: 1.5, life: 1.5, size: 18, c: C.success }); }
        if (score >= 10000) X.egg('g-asteroiden-10k');
        updateHud();
    }

    /* ── Aktionen ───────────────────────────────────────────────────────── */
    function fire() {
        if (state !== 'play' || !ship.alive || ship.hyper > 0 || fireCd > 0) return;
        if (bullets.length >= MAX_BULLETS) return;
        fireCd = .14;
        const cx = Math.cos(ship.a), cy = Math.sin(ship.a);
        bullets.push({ x: ship.x + cx * 14, y: ship.y + cy * 14, vx: cx * BULLET_V + ship.vx, vy: cy * BULLET_V + ship.vy, life: BULLET_LIFE, wrapped: false });
        X.beep(980, .05, 'square', .025); setTimeout(() => X.beep(620, .04, 'square', .02), 25);
    }
    function hyperspace() {
        if (state !== 'play' || !ship.alive || ship.hyper > 0 || hyperCd > 0) return;
        const danger = rocks.some(r => Math.hypot(r.x - ship.x, r.y - ship.y) - r.r < 40) || sBullets.some(b => Math.hypot(b.x - ship.x, b.y - ship.y) < 50);
        burst(ship.x, ship.y, C.accent2, 16, 160);
        ship.hyper = .55; ship.vx = 0; ship.vy = 0; hyperCd = 1.6;
        ship.x = 40 + Math.random() * (W - 80); ship.y = 40 + Math.random() * (H - 80);
        escape = danger ? { t: 2.1 } : null;
        [1400, 900, 500].forEach((f, i) => setTimeout(() => X.beep(f, .06, 'sine', .04), i * 50));
    }
    function burst(x, y, color, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = (.2 + Math.random()) * sp;
            parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .4 + Math.random() * .6, c: color });
        }
    }
    function splitRock(r, i) {
        rocks.splice(i, 1);
        addScore(SIZES[r.size].pts);
        burst(r.x, r.y, C.muted, 6 + r.size * 5, 60 + r.size * 30);
        shake = Math.max(shake, r.size * 1.8);
        X.beep(90 + (3 - r.size) * 60, .12 + r.size * .05, 'sawtooth', .05);
        if (r.size > 1) {
            const base = Math.atan2(r.vy, r.vx);
            for (const d of [-.6, .6]) rocks.push(makeRock(r.x, r.y, r.size - 1, base + d + (Math.random() - .5) * .5));
        }
    }
    function killShip() {
        if (!ship.alive || ship.inv > 0 || ship.hyper > 0) return;
        ship.alive = false; ship.respawn = 2; lives--; escape = null;
        shake = 12;
        G.sfx.die();
        const pts = shipPoints(ship);
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i], q = pts[(i + 1) % pts.length], a = Math.random() * Math.PI * 2;
            debris.push({ x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, len: Math.hypot(q[0] - p[0], q[1] - p[1]), a: Math.atan2(q[1] - p[1], q[0] - p[0]),
                vx: ship.vx * .3 + Math.cos(a) * 50, vy: ship.vy * .3 + Math.sin(a) * 50, va: (Math.random() - .5) * 5, t: 1.6 });
        }
        burst(ship.x, ship.y, C.rc, 30, 180);
        updateHud();
    }
    function gameOver() {
        state = 'over'; loop.stop(); overAt = performance.now();
        const r = X.score('asteroiden', score);
        updateHud(); draw();
        ov.show({
            icon: '☄️', title: 'Game Over',
            text: X.fmt(score) + ' Punkte · Welle ' + wave + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
            button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
        });
    }

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    function wrap(o, m) {
        let w = false;
        if (o.x < -m) { o.x += W + 2 * m; w = true; } else if (o.x > W + m) { o.x -= W + 2 * m; w = true; }
        if (o.y < -m) { o.y += H + 2 * m; w = true; } else if (o.y > H + m) { o.y -= H + 2 * m; w = true; }
        return w;
    }
    function update(dt) {
        t += dt;
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .98; p.vy *= .98; });
        debris = debris.filter(d => (d.t -= dt) > 0);
        debris.forEach(d => { d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 16 * dt; });
        shake = Math.max(0, shake - dt * 30);
        if (state !== 'play') return;
        fireCd = Math.max(0, fireCd - dt); hyperCd = Math.max(0, hyperCd - dt);

        // Schiff
        if (ship.alive) {
            ship.inv = Math.max(0, ship.inv - dt);
            if (ship.hyper > 0) { ship.hyper -= dt; }
            else {
                const kl = G.keys.isDown('ArrowLeft') || G.keys.isDown('a'), kr = G.keys.isDown('ArrowRight') || G.keys.isDown('d');
                if (kl || kr) { ship.a += ((kr ? 1 : 0) - (kl ? 1 : 0)) * TURN * dt; aimP = null; }
                else if (aimP && performance.now() - aimT < 4000) {
                    let d = Math.atan2(aimP.y - ship.y, aimP.x - ship.x) - ship.a;
                    d = Math.atan2(Math.sin(d), Math.cos(d));
                    ship.a += X.clamp(d, -TURN * 1.3 * dt, TURN * 1.3 * dt);
                }
                ship.thrust = G.keys.isDown('ArrowUp') || G.keys.isDown('w') || mouseThrust;
                if (ship.thrust) {
                    ship.vx += Math.cos(ship.a) * THRUST * dt; ship.vy += Math.sin(ship.a) * THRUST * dt;
                    if (Math.random() < .6) parts.push({ x: ship.x - Math.cos(ship.a) * 12, y: ship.y - Math.sin(ship.a) * 12,
                        vx: -Math.cos(ship.a + (Math.random() - .5) * .6) * 120 + ship.vx, vy: -Math.sin(ship.a + (Math.random() - .5) * .6) * 120 + ship.vy, t: .25, c: C.warning });
                    if (Math.floor(t * 14) !== Math.floor((t - dt) * 14)) X.beep(70 + Math.random() * 20, .06, 'sawtooth', .025);
                }
                const sp = Math.hypot(ship.vx, ship.vy);
                if (sp > MAX_V) { ship.vx *= MAX_V / sp; ship.vy *= MAX_V / sp; }
                const drag = Math.pow(.55, dt);
                ship.vx *= drag; ship.vy *= drag;
                ship.x += ship.vx * dt; ship.y += ship.vy * dt;
                wrap(ship, 12);
                if (G.keys.isDown(' ') || mouseFire) fire();
            }
            if (escape && ship.hyper <= 0) { escape.t -= dt; if (escape.t <= 0) { X.egg('g-asteroiden-hyper'); escape = null; pops.push({ text: 'Puh, knapp!', x: ship.x, y: ship.y - 24, t: 1.2, life: 1.2, size: 14, c: C.accent2 }); } }
        } else {
            ship.respawn -= dt;
            if (ship.respawn <= 0) {
                if (lives <= 0) return gameOver();
                if (!rocks.some(r => Math.hypot(r.x - W / 2, r.y - H / 2) < r.r + 90)) { newShip(); X.beep(440, .1, 'triangle', .05); }
            }
        }

        // Geschosse
        bullets.forEach(b => {
            b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
            if (wrap(b, 2)) b.wrapped = true;
            // Das All ist rund: eigenes Geschoss fliegt einmal herum und durchs Schiff
            if (b.wrapped && ship.alive && ship.hyper <= 0 && Math.hypot(b.x - ship.x, b.y - ship.y) < SHIP_R + 2) {
                X.egg('g-asteroiden-eigen'); b.life = 0;
                pops.push({ text: 'Autsch … nichts passiert.', x: ship.x, y: ship.y - 22, t: 1.2, life: 1.2, size: 13, c: C.muted });
            }
        });
        bullets = bullets.filter(b => b.life > 0);

        // Brocken
        rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r, r.r); });
        for (let i = rocks.length - 1; i >= 0; i--) {
            const r = rocks[i];
            const bi = bullets.findIndex(b => Math.hypot(b.x - r.x, b.y - r.y) < r.r);
            if (bi >= 0) { bullets.splice(bi, 1); splitRock(r, i); continue; }
            if (ship.alive && ship.hyper <= 0 && ship.inv <= 0 && Math.hypot(ship.x - r.x, ship.y - r.y) < r.r * .9 + SHIP_R) { killShip(); splitRock(r, i); continue; }
            if (saucer && Math.hypot(saucer.x - r.x, saucer.y - r.y) < r.r + saucer.r) { burst(saucer.x, saucer.y, C.accent2, 20, 160); saucer = null; splitRock(r, i); }
        }

        // Festplatten-Drohne
        saucerT -= dt;
        if (!saucer && saucerT <= 0 && wave >= 1) {
            const small = score >= 10000 ? Math.random() < .7 : wave >= 3 && Math.random() < .35;
            const fromLeft = Math.random() < .5;
            saucer = { x: fromLeft ? -20 : W + 20, y: 60 + Math.random() * (H - 120), vx: (fromLeft ? 1 : -1) * (small ? 120 : 85), vy: 0, small, r: small ? 11 : 20, fireT: 1, turnT: 1.2 };
            saucerT = Math.max(9, 22 - wave * 1.5) + Math.random() * 8;
        }
        if (saucer) {
            const s = saucer;
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (s.y < 20) s.y += H - 40; if (s.y > H - 20) s.y -= H - 40;
            s.turnT -= dt;
            if (s.turnT <= 0) { s.turnT = .8 + Math.random() * 1.2; s.vy = X.pick([-1, 0, 1]) * Math.abs(s.vx) * .7; }
            s.fireT -= dt;
            if (s.fireT <= 0 && ship.alive) {
                s.fireT = s.small ? .9 : 1.2;
                let a = Math.random() * Math.PI * 2;
                if (s.small) a = Math.atan2(ship.y - s.y, ship.x - s.x) + (Math.random() - .5) * Math.max(.08, .5 - wave * .05);
                sBullets.push({ x: s.x, y: s.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 1.3 });
                X.beep(1500, .04, 'triangle', .025);
            }
            if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) X.beep(s.small ? 1100 : 820, .07, 'sine', .015);
            const bi = bullets.findIndex(b => Math.hypot(b.x - s.x, b.y - s.y) < s.r + 3);
            if (bi >= 0) {
                bullets.splice(bi, 1);
                const v = s.small ? 1000 : 200;
                addScore(v);
                pops.push({ text: String(v), x: s.x, y: s.y, t: 1.3, life: 1.3, size: 16, c: C.warning });
                burst(s.x, s.y, C.accent2, 26, 200); shake = 6;
                G.sfx.coin();
                saucer = null;
            } else if (ship.alive && ship.hyper <= 0 && ship.inv <= 0 && Math.hypot(ship.x - s.x, ship.y - s.y) < s.r + SHIP_R) { burst(s.x, s.y, C.accent2, 20, 160); saucer = null; killShip(); }
            else if (s.x < -40 || s.x > W + 40) saucer = null;
        }
        sBullets.forEach(b => {
            b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrap(b, 2);
            if (ship.alive && ship.hyper <= 0 && ship.inv <= 0 && Math.hypot(b.x - ship.x, b.y - ship.y) < SHIP_R) { b.life = 0; killShip(); }
            const ri = rocks.findIndex(r => Math.hypot(b.x - r.x, b.y - r.y) < r.r);
            if (ri >= 0 && b.life > 0) { b.life = 0; const r = rocks[ri]; rocks.splice(ri, 1); if (r.size > 1) { const base = Math.atan2(r.vy, r.vx); [-.6, .6].forEach(d => rocks.push(makeRock(r.x, r.y, r.size - 1, base + d))); } burst(r.x, r.y, C.muted, 8, 80); }
        });
        sBullets = sBullets.filter(b => b.life > 0);

        // Herzschlag – schneller, je weniger Brocken übrig sind
        beatT -= dt;
        if (rocks.length && beatT <= 0) {
            beatT = .22 + .8 * Math.min(1, rocks.length / 10);
            beatHi = !beatHi; X.beep(beatHi ? 62 : 55, .09, 'square', .045);
        }

        // Welle geschafft?
        if (!rocks.length && !saucer) {
            waveT += dt;
            if (waveT > 2) { waveT = 0; startWave(); }
        } else waveT = 0;
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    function shipPoints(s) {
        const c = Math.cos(s.a), n = Math.sin(s.a);
        return [[15, 0], [-10, -9], [-6, 0], [-10, 9]].map(([x, y]) => [s.x + x * c - y * n, s.y + x * n + y * c]);
    }
    function poly(pts, stroke, fill, width) {
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = stroke; ctx.lineWidth = width || 2; ctx.stroke();
    }
    function drawRock(r, ox, oy) {
        const pts = r.shape.map(p => [r.x + ox + Math.cos(p.a + r.rot) * r.r * p.r, r.y + oy + Math.sin(p.a + r.rot) * r.r * p.r]);
        poly(pts, C.a('text', .85), C.a('surface2', .55), 2);
        // Krater
        ctx.strokeStyle = C.a('text', .2); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(r.x + ox + Math.cos(r.rot) * r.r * .3, r.y + oy + Math.sin(r.rot) * r.r * .3, r.r * .18, 0, 7); ctx.stroke();
    }
    function drawShipAt(s, x, y, scale, alpha) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale); ctx.translate(-s.x, -s.y);
        poly(shipPoints(s), C.rc, C.a('rc', .18), 2);
        if (s.thrust && Math.random() < .8) {
            const c = Math.cos(s.a), n = Math.sin(s.a), len = 10 + Math.random() * 9;
            poly([[s.x - 7 * c + 5 * n, s.y - 7 * n - 5 * c], [s.x - (7 + len) * c, s.y - (7 + len) * n], [s.x - 7 * c - 5 * n, s.y - 7 * n + 5 * c]], C.warning, C.a('warning', .3), 1.5);
        }
        ctx.restore();
    }
    function drawSaucer(s) {
        // Festplatten-Drohne: rotierende Magnetscheibe mit Lesekopf
        const R = s.r;
        ctx.save(); ctx.translate(s.x, s.y);
        const g = ctx.createRadialGradient(0, 0, R * .2, 0, 0, R);
        g.addColorStop(0, 'rgb(225,230,240)'); g.addColorStop(.7, 'rgb(170,178,195)'); g.addColorStop(1, 'rgb(120,128,150)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, R, R * .55, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
        const sp = t * (s.small ? 9 : 5);
        ctx.beginPath(); ctx.ellipse(0, 0, R * .7, R * .38, 0, sp, sp + 1.2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, R * .45, R * .25, 0, sp + 3, sp + 4); ctx.stroke();
        ctx.fillStyle = 'rgb(80,86,100)'; ctx.beginPath(); ctx.ellipse(0, 0, R * .15, R * .09, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = C.accent2; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(R * .95, -R * .25); ctx.lineTo(R * .25, -R * .05 + Math.sin(t * 7) * 2); ctx.stroke();
        ctx.fillStyle = Math.floor(t * 5) % 2 ? C.danger : C.a('danger', .3); ctx.fillRect(-R * .9, -2, 4, 4);
        ctx.restore();
    }
    function draw() {
        ctx.save();
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        stars.forEach(s => { ctx.fillStyle = C.a('text', .15 + .15 * Math.sin(t * 1.5 + s.p)); ctx.fillRect(s.x, s.y, s.s, s.s); });

        rocks.forEach(r => {
            drawRock(r, 0, 0);
            // Kopie am gegenüberliegenden Rand, damit das Durchwandern sauber aussieht
            if (r.x < r.r) drawRock(r, W + 2 * r.r, 0); else if (r.x > W - r.r) drawRock(r, -W - 2 * r.r, 0);
            if (r.y < r.r) drawRock(r, 0, H + 2 * r.r); else if (r.y > H - r.r) drawRock(r, 0, -H - 2 * r.r);
        });
        if (saucer) drawSaucer(saucer);
        ctx.fillStyle = C.warning; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, 7); ctx.fill(); });
        ctx.fillStyle = C.danger; sBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, 7); ctx.fill(); });
        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x - 1, p.y - 1, 2.2, 2.2); });
        ctx.globalAlpha = 1;
        debris.forEach(d => {
            ctx.globalAlpha = Math.min(1, d.t); ctx.strokeStyle = C.rc; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(d.x - Math.cos(d.a) * d.len / 2, d.y - Math.sin(d.a) * d.len / 2); ctx.lineTo(d.x + Math.cos(d.a) * d.len / 2, d.y + Math.sin(d.a) * d.len / 2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        if (ship && ship.alive) {
            if (ship.hyper > 0) {
                const k = ship.hyper / .55;
                ctx.strokeStyle = C.a('accent2', 1 - k); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(ship.x, ship.y, 4 + k * 30, 0, 7); ctx.stroke();
            } else {
                const blink = ship.inv > 0 && Math.floor(ship.inv * 8) % 2 === 0;
                drawShipAt(ship, ship.x, ship.y, 1, blink ? .35 : 1);
                if (ship.inv > 0) { ctx.strokeStyle = C.a('accent', .25 + .15 * Math.sin(t * 10)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ship.x, ship.y, 20, 0, 7); ctx.stroke(); }
            }
        } else if (state === 'play' && lives > 0 && ship.respawn <= 0) {
            ctx.fillStyle = C.muted; ctx.font = '600 13px ' + C.font; ctx.textAlign = 'center';
            ctx.fillText('Warte auf freie Bahn …', W / 2, H / 2 + 40); ctx.textAlign = 'left';
        }
        // Punkte & Reserve-Schiffe
        ctx.font = '700 20px ' + C.mono; ctx.fillStyle = C.text; ctx.textAlign = 'left';
        ctx.fillText(String(score).padStart(5, '0'), 14, 28);
        const reserve = Math.min(8, ship && ship.alive ? lives - 1 : lives);
        for (let i = 0; i < reserve; i++) drawShipAt({ x: 0, y: 0, a: -Math.PI / 2 }, 22 + i * 20, 48, .65, .9);
        if (hyperCd > 0) { ctx.fillStyle = C.a('accent2', .6); ctx.fillRect(14, 62, 60 * (1 - hyperCd / 1.6), 3); }
        ctx.textAlign = 'center';
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 ' + p.size + 'px ' + C.font; ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .8);
            ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && state === 'play') {
            pausedFrom = state; state = 'paused'; G.keys.clear(); mouseFire = mouseThrust = false;
            ov.show({ icon: '⏸', title: 'Pause', text: 'P oder Esc zum Weiterfliegen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = pausedFrom; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === 'p' || k === 'Escape') return setPause(true);
        if (k === ' ') fire();
        if (k === 'h' || k === 'ArrowDown' || k === 's') hyperspace();
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    stage.addEventListener('pointermove', e => {
        if (state !== 'play') return;
        if (e.pointerType === 'mouse' || e.buttons) { aimP = G.pointer(cv, W, H, e); aimT = performance.now(); }
    });
    stage.addEventListener('pointerdown', e => {
        if (e.target.closest('.game__overlay') || state !== 'play') return;
        aimP = G.pointer(cv, W, H, e); aimT = performance.now();
        if (e.pointerType === 'mouse' && e.button === 2) { mouseThrust = true; return; }
        mouseFire = true; fire();
    });
    addEventListener('pointerup', () => { mouseFire = false; mouseThrust = false; });

    function start() { reset(); state = 'play'; ov.hide(); loop.start(); }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || (state !== 'idle' && state !== 'over')) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = hard() ? 'Ein einziges Schiff, mehr und schnellere Brocken.' : 'Drei Schiffe, gemütlicher Start.';
    });
    C.onChange = () => { if (!loop.running) draw(); };

    newShip(); wave = 1;
    for (let i = 0; i < 6; i++) { let x, y; do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - W / 2, y - H / 2) < 150); rocks.push(makeRock(x, y, X.pick([1, 2, 3]))); }
    wave = 0; draw(); updateHud();
    ov.show({ icon: '☄️', title: 'Asteroiden', text: 'Zerschiess die Brocken, bevor sie dich erwischen. Der Rand des Bildschirms ist kein Ende – du kommst auf der anderen Seite wieder heraus.', button: 'Abheben', onClick: start, hint: 'Oder Leertaste' });

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
