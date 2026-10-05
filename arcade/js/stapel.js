/* Stapelturm – Blöcke im richtigen Moment absetzen, Überhang fällt ab */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const { cv, ctx, W, H } = G.canvas('#cv', 400, 600);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const BH = 26, BASE_Y = H - 64, START_W = 200, PERFECT = 5, DEPTH = 9;
    let mode = 'klassisch', state = 'idle';
    let tower = [], cur = null, chunks = [], parts = [], waves = [], pops = [];
    let score = 0, streak = 0, bestStreak = 0, cam = 0, zoom = 1, shake = 0, flash = 0, t = 0, overAt = 0, hudKey = '', overT = 0;
    // Hintergrund: Wolken & Sterne (Weltkoordinaten)
    const rnd = G.rng('stapelturm');
    const clouds = Array.from({ length: 14 }, (_, i) => ({ x: rnd() * W, y: 700 + i * 90 + rnd() * 60, w: 60 + rnd() * 90, s: .3 + rnd() * .5 }));
    const stars = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: 1250 + rnd() * 2600, r: rnd() * 1.6 + .4, p: rnd() * 6 }));

    const speedFor = n => Math.min(470, (165 + n * 6) * (mode === 'turbo' ? 1.35 : 1));
    function colorFor(i) {
        const k = (Math.sin(i * .22) + 1) / 2, j = (Math.sin(i * .13 + 2) + 1) / 2;
        const a = C.rgb.rc, b = C.rgb.accent2, c = C.rgb.accent;
        return 'rgb(' + a.map((v, n) => Math.round((v * (1 - k) + b[n] * k) * (1 - j * .45) + c[n] * j * .45)) + ')';
    }
    const shade = (rgb, f) => rgb.replace(/\d+/g, v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));

    function reset() {
        tower = [{ x: W / 2 - START_W / 2, w: START_W, c: colorFor(0) }];
        chunks = []; parts = []; waves = []; pops = [];
        score = 0; streak = 0; bestStreak = 0; cam = 0; zoom = 1; shake = 0; flash = 0;
        nextBlock();
        updateHud();
    }
    function nextBlock() {
        const n = tower.length, top = tower[n - 1];
        const fromLeft = n % 2 === 1;
        cur = { x: fromLeft ? -top.w * .6 : W - top.w * .4, w: top.w, dir: fromLeft ? 1 : -1, c: colorFor(n), spd: speedFor(n) };
    }
    function updateHud() {
        const key = score + '|' + tower.length + '|' + streak;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: score, Höhe: tower.length - 1, Serie: streak });
        const b = X.best('stapel');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }
    const screenY = i => BASE_Y - (i * BH - cam);   // Unterkante von Block i

    function place() {
        if (state !== 'play' || !cur) return;
        const top = tower[tower.length - 1];
        const n = tower.length;
        let dx = cur.x - top.x;
        if (Math.abs(dx) <= PERFECT) {
            // perfekt!
            cur.x = top.x; dx = 0;
            streak++; bestStreak = Math.max(bestStreak, streak);
            let w = cur.w;
            if (streak >= 3 && w < START_W) w = Math.min(START_W, w + 10);
            const grow = w - cur.w;
            tower.push({ x: cur.x - grow / 2, w, c: cur.c });
            score += 1 + Math.min(streak, 5);
            waves.push({ i: n, x: cur.x - grow / 2, w, t: .6 });
            const notes = [523, 587, 659, 698, 784, 880, 988, 1046];
            X.beep(notes[Math.min(streak - 1, notes.length - 1)], .12, 'triangle', .07);
            pops.push({ text: streak >= 3 ? 'Perfekt ×' + streak + (grow > 0 ? ' · wächst!' : '') : 'Perfekt!', i: n + 1.5, x: W / 2, t: 1, life: 1, c: C.warning });
            if (streak >= 5) X.egg('g-stapel-perfekt');
        } else {
            const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w);
            const w = right - left;
            streak = 0;
            if (w <= 0) {
                chunks.push({ x: cur.x, y: screenWorld(n), w: cur.w, c: cur.c, vx: cur.dir * 60, vy: 0, rot: 0, vr: cur.dir * 2 });
                cur = null;
                return lose();
            }
            // Überhang abschneiden
            const cx = dx > 0 ? right : cur.x, cw = cur.w - w;
            chunks.push({ x: cx, y: screenWorld(n), w: cw, c: cur.c, vx: (dx > 0 ? 1 : -1) * 50, vy: -40, rot: 0, vr: (dx > 0 ? 1 : -1) * (1.5 + Math.random() * 2) });
            tower.push({ x: left, w, c: cur.c });
            score += 1;
            X.beep(240 + Math.min(w, 200), .06, 'square', .05);
            for (let i = 0; i < 8; i++) parts.push({ x: dx > 0 ? right : left, wy: n * BH + BH / 2, vx: (Math.random() - .5) * 120, vy: (Math.random() - .3) * 150, t: .5, c: cur.c });
        }
        shake = Math.max(shake, 1.5);
        checkEggs();
        if (tower.length - 1 === 50) { pops.push({ text: 'Willkommen im All!', i: tower.length + 2, x: W / 2, t: 2, life: 2, c: C.accent }); G.sfx.power(); }
        else if ((tower.length - 1) % 10 === 0) { pops.push({ text: (tower.length - 1) + ' Stockwerke', i: tower.length + 2.5, x: W / 2, t: 1.4, life: 1.4, c: C.text }); G.sfx.coin(); }
        nextBlock();
        updateHud();
    }
    const screenWorld = i => i * BH;   // Weltkoordinate (Unterkante) von Stockwerk i

    function checkEggs() {
        const h = tower.length - 1;
        if (h >= 25) X.egg('g-stapel-25');
        const top = tower[tower.length - 1], base = tower[0];
        if (h >= 12 && Math.abs((top.x + top.w / 2) - (base.x + base.w / 2)) >= 60) X.egg('g-stapel-pisa');
    }

    function lose() {
        state = 'falling'; overT = 0;
        shake = 7; flash = 1;
        G.sfx.die();
    }
    function finish() {
        state = 'over'; overAt = performance.now();
        const r = X.score('stapel', score);
        updateHud();
        loop.stop();
        ov.show({
            icon: '🏗️', title: 'Eingestürzt!',
            text: score + ' Punkte · ' + (tower.length - 1) + ' Stockwerke · beste Serie ' + bestStreak + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
            button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
        });
    }

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    function update(dt) {
        t += dt;
        shake = Math.max(0, shake - dt * 20); flash = Math.max(0, flash - dt * 2);
        chunks.forEach(c => { c.vy -= 1300 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; });
        chunks = chunks.filter(c => c.y > cam - 900);
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.x += p.vx * dt; p.wy += p.vy * dt; p.vy -= 400 * dt; });
        waves = waves.filter(w => (w.t -= dt) > 0);
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.i += dt * .8; });

        const n = tower.length;
        if (state === 'falling') {
            overT += dt;
            // Kamera zoomt heraus und zeigt den ganzen Turm
            const fit = Math.min(1, (H - 150) / ((n + 3) * BH));
            zoom += (fit - zoom) * Math.min(1, dt * 3);
            cam += (0 - cam) * Math.min(1, dt * 3);
            if (overT > 1.6) finish();
            return;
        }
        const target = Math.max(0, (n - 9) * BH);
        cam += (target - cam) * Math.min(1, dt * 6);
        if (state !== 'play' || !cur) return;
        cur.x += cur.dir * cur.spd * dt;
        const minX = -cur.w * .6, maxX = W - cur.w * .4;
        if (cur.x < minX) { cur.x = minX; cur.dir = 1; }
        if (cur.x > maxX) { cur.x = maxX; cur.dir = -1; }
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    function block(x, yb, w, c, alpha) {
        // yb = Unterkante auf dem Bildschirm (vor Zoom); leichte 3D-Optik
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.fillStyle = shade(c, .25);
        ctx.beginPath(); ctx.moveTo(x, yb - BH); ctx.lineTo(x + DEPTH, yb - BH - DEPTH); ctx.lineTo(x + w + DEPTH, yb - BH - DEPTH); ctx.lineTo(x + w, yb - BH); ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(c, -.25);
        ctx.beginPath(); ctx.moveTo(x + w, yb); ctx.lineTo(x + w, yb - BH); ctx.lineTo(x + w + DEPTH, yb - BH - DEPTH); ctx.lineTo(x + w + DEPTH, yb - DEPTH); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c; ctx.fillRect(x, yb - BH, w, BH);
        ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x, yb - BH, w, 4);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, yb - 4, w, 4);
        ctx.globalAlpha = 1;
    }
    function drawSky() {
        const h = cam;   // je höher, desto dunkler und sternenreicher
        const space = X.clamp((h - 600) / 500, 0, 1);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, C.bg); g.addColorStop(1, space > .5 ? C.bg : C.bg2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (space < 1) {
            const glow = ctx.createLinearGradient(0, H * .35, 0, H);
            glow.addColorStop(0, C.a('rc', 0)); glow.addColorStop(1, C.a('rc', .1 * (1 - space)));
            ctx.fillStyle = glow; ctx.fillRect(0, H * .35, W, H * .65);
        }
        // Sterne
        stars.forEach(s => {
            const y = BASE_Y - (s.y - cam * .6);
            if (y < -5 || y > H + 5) return;
            ctx.globalAlpha = (.35 + .35 * Math.sin(t * 2 + s.p)) * X.clamp((cam - 500) / 500, 0, 1);
            ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
        // Wolken
        clouds.forEach(c => {
            const y = BASE_Y - (c.y - cam * .7);
            if (y < -60 || y > H + 60) return;
            const x = ((c.x + t * 12 * c.s) % (W + 200)) - 100;
            ctx.fillStyle = C.a('text', .06);
            ctx.beginPath(); ctx.ellipse(x, y, c.w / 2, 14, 0, 0, 7); ctx.ellipse(x - c.w * .2, y - 8, c.w * .25, 12, 0, 0, 7); ctx.ellipse(x + c.w * .18, y - 6, c.w * .22, 11, 0, 0, 7); ctx.fill();
        });
    }

    function draw() {
        ctx.save();
        drawSky();
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        ctx.save();
        ctx.translate(W / 2, BASE_Y); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -BASE_Y);
        // Boden
        const gy = screenY(0);
        ctx.fillStyle = C.surface; ctx.fillRect(-W, gy, W * 3, 400);
        ctx.fillStyle = C.strong; ctx.fillRect(-W, gy, W * 3, 3);
        // Höhenmarken
        ctx.font = '700 10px ' + C.font; ctx.fillStyle = C.faint; ctx.textAlign = 'left';
        for (let i = 10; i < tower.length + 10; i += 10) {
            const y = screenY(i);
            if (y < -20 || y > H + 20) continue;
            ctx.fillStyle = C.a('border', .8); ctx.fillRect(4, y, 18, 1);
            ctx.fillStyle = C.faint; ctx.fillText(i, 6, y - 3);
        }
        // Turm
        const visTop = BASE_Y - BASE_Y / zoom - BH * 2, visBottom = BASE_Y + (H - BASE_Y) / zoom + BH;
        tower.forEach((b, i) => {
            const y = screenY(i);
            if (y < visTop || y - BH > visBottom) return;
            block(b.x, y, b.w, b.c);
        });
        // Perfekt-Wellen
        waves.forEach(w => {
            const k = 1 - w.t / .6, y = screenY(w.i), grow = k * 18;
            ctx.strokeStyle = C.a('warning', (1 - k) * .9); ctx.lineWidth = 2;
            ctx.strokeRect(w.x - grow, y - BH - grow, w.w + grow * 2, BH + grow * 2);
        });
        // aktueller Block (mit Schatten-Vorschau auf dem Turm)
        if (cur && state === 'play') {
            const n = tower.length, top = tower[n - 1];
            const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w);
            if (right > left) { ctx.fillStyle = C.a('text', .08); ctx.fillRect(left, screenY(n) - 3, right - left, 3); }
            block(cur.x, screenY(n), cur.w, cur.c);
        }
        // fallende Reste
        chunks.forEach(c => {
            const y = BASE_Y - (c.y - cam);
            ctx.save(); ctx.translate(c.x + c.w / 2, y - BH / 2); ctx.rotate(c.rot);
            block(-c.w / 2, BH / 2, c.w, c.c, .9);
            ctx.restore();
        });
        parts.forEach(p => { ctx.globalAlpha = p.t * 2; ctx.fillStyle = p.c; ctx.fillRect(p.x - 2, BASE_Y - (p.wy - cam) - 2, 4, 4); });
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 18px ' + C.font; ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .8);
            const y = screenY(p.i);
            ctx.strokeText(p.text, p.x, y); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, y);
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // Punktzahl gross oben
        if (state !== 'idle') {
            ctx.textAlign = 'center';
            ctx.font = '900 54px ' + C.font; ctx.lineWidth = 6; ctx.strokeStyle = C.a('bg', .7);
            ctx.strokeText(score, W / 2, 78); ctx.fillStyle = C.text; ctx.fillText(score, W / 2, 78);
            if (streak >= 2) { ctx.font = '700 13px ' + C.font; ctx.fillStyle = C.warning; ctx.fillText('Serie ×' + streak, W / 2, 100); }
        }
        ctx.textAlign = 'left';
        ctx.restore();
        if (flash > 0) { ctx.fillStyle = C.a('danger', flash * .2); ctx.fillRect(0, 0, W, H); }
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && state === 'play') {
            state = 'paused'; G.keys.clear();
            ov.show({ icon: '⏸', title: 'Pause', text: 'P oder Esc zum Weiterbauen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = 'play'; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === 'p' || k === 'Escape') return setPause(true);
        if (k === ' ' || k === 'ArrowDown' || k === 'Enter' || k === 's') place();
    });
    stage.addEventListener('pointerdown', e => {
        if (e.target.closest('.game__overlay')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        place();
    });

    function start() { reset(); state = 'play'; ov.hide(); loop.start(); }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || (state !== 'idle' && state !== 'over')) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = mode === 'turbo' ? 'Von Anfang an ein Drittel schneller.' : 'Das Tempo steigt mit jedem Stockwerk.';
    });
    C.onChange = () => {
        tower.forEach((b, i) => { b.c = colorFor(i); });
        if (cur) cur.c = colorFor(tower.length);
        if (!loop.running) draw();
    };

    reset(); draw();
    ov.show({ icon: '🏗️', title: 'Stapelturm', text: 'Setz die Blöcke genau aufeinander. Alles, was übersteht, fällt ab.', button: 'Bauen', onClick: start, hint: 'Oder Leertaste' });

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
        p.refresh();
        new MutationObserver(p.refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', p.refresh);
        return p;
    }
});
