/* Pong – gegen die CPU (drei Stärken) oder zu zweit an einer Tastatur */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const { cv, ctx, W, H } = G.canvas('#cv', 640, 400);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const PW = 12, PH = 72, BS = 10, WIN = 7, MAXA = .96, START_SPEED = 300, MAX_SPEED = 790;
    const CPU = {
        1: { spd: 260, react: .24, err: 30, miss: .14, missFast: .4, predict: false, name: 'leicht' },
        2: { spd: 380, react: .12, err: 22, miss: .05, missFast: .26, predict: false, name: 'mittel' },
        3: { spd: 520, react: .06, err: 18, miss: .02, missFast: .15, predict: true, name: 'schwer' }
    };

    let mode = '2', state = 'idle', pausedFrom = null;
    let L, R, ball, sc = [0, 0], serveT = 0, pointT = 0, serveDir = 1, rally = 0, maxRally = 0;
    let parts = [], pops = [], shake = 0, flash = 0, t = 0, overAt = 0, hudKey = '';
    let aimL = null, aimR = null, cpuT = 0, cpuTarget = H / 2, cpuErr = 0;
    const twoP = () => mode === '2p';
    const lvl = () => twoP() ? 0 : +mode;
    const names = () => twoP() ? ['Links', 'Rechts'] : ['Du', 'CPU'];

    function reset() {
        L = { x: 24, y: H / 2, vy: 0, hit: 0 };
        R = { x: W - 24 - PW, y: H / 2, vy: 0, hit: 0 };
        sc = [0, 0]; maxRally = 0; parts = []; pops = [];
        aimL = aimR = null; cpuTarget = H / 2;
        serveDir = Math.random() < .5 ? -1 : 1;
        newServe();
    }
    function newServe() {
        ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, spd: START_SPEED, trail: [] };
        state = 'serve'; serveT = 1.1; rally = 0;
        updateHud();
    }
    function doServe() {
        const a = (Math.random() - .5) * .8;
        ball.vx = Math.cos(a) * ball.spd * serveDir; ball.vy = Math.sin(a) * ball.spd;
        state = 'play';
        X.beep(440, .06, 'square', .04);
        rollCpu();
    }
    function updateHud() {
        const n = names();
        const key = sc.join() + '|' + rally + '|' + mode;
        if (key === hudKey) return;
        hudKey = key;
        const o = {}; o[n[0]] = sc[0]; o[n[1]] = sc[1]; o['Ballwechsel'] = rally;
        G.hud('#hud', o);
        const b = X.best('pong');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }

    /* ── Schläger ───────────────────────────────────────────────────────── */
    function drive(p, up, down, aim, dt) {
        const oy = p.y;
        if (up || down) {
            const dir = (down ? 1 : 0) - (up ? 1 : 0);
            p.vy = dir ? X.clamp(p.vy + dir * 5200 * dt, -560, 560) : 0;
            if (dir && Math.sign(p.vy) !== dir) p.vy = dir * 240;
            p.y += p.vy * dt;
        } else if (aim != null) {
            const d = aim - p.y;
            p.y += Math.sign(d) * Math.min(Math.abs(d), 1100 * dt);
        }
        p.y = X.clamp(p.y, PH / 2, H - PH / 2);
        p.vy = (p.y - oy) / dt;
        if (!(up || down) && aim == null) p.vy = 0;
    }
    function predictY(x) {
        if (!ball.vx) return H / 2;
        const time = (x - ball.x) / ball.vx;
        if (time < 0) return H / 2;
        const range = H - BS;
        let p = ball.y + ball.vy * time - BS / 2;
        p = ((p % (2 * range)) + 2 * range) % (2 * range);
        if (p > range) p = 2 * range - p;
        return p + BS / 2;
    }
    // Die CPU verschätzt sich manchmal – öfter bei schnellen, steilen Bällen
    function rollCpu() {
        const cfg = CPU[mode];
        if (!cfg) return;
        const fast = (ball.spd - START_SPEED) / (MAX_SPEED - START_SPEED), steep = Math.abs(ball.vy) / ball.spd;
        if (Math.random() < cfg.miss + fast * cfg.missFast + steep * .08) cpuErr = (Math.random() < .5 ? -1 : 1) * (PH / 2 + BS / 2 + 6 + Math.random() * 30);
        else cpuErr = (Math.random() * 2 - 1) * cfg.err;
    }
    function cpu(dt) {
        const cfg = CPU[mode];
        cpuT -= dt;
        if (cpuT <= 0) {
            cpuT = cfg.react;
            if (state === 'play' && ball.vx > 0) cpuTarget = (cfg.predict ? predictY(R.x) : ball.y) + cpuErr;
            else cpuTarget = H / 2 + (ball.y - H / 2) * .3;
        }
        const oy = R.y, d = cpuTarget - R.y;
        if (Math.abs(d) > 4) R.y += Math.sign(d) * Math.min(Math.abs(d), cfg.spd * dt);
        R.y = X.clamp(R.y, PH / 2, H - PH / 2);
        R.vy = (R.y - oy) / dt;
    }
    function movePaddles(dt) {
        const kw = G.keys.isDown('w'), ks = G.keys.isDown('s');
        const ku = G.keys.isDown('ArrowUp'), kd = G.keys.isDown('ArrowDown');
        if (twoP()) {
            if (kw || ks) aimL = null;
            if (ku || kd) aimR = null;
            drive(L, kw, ks, aimL, dt);
            drive(R, ku, kd, aimR, dt);
        } else {
            if (kw || ks || ku || kd) aimL = null;
            drive(L, kw || ku, ks || kd, aimL, dt);
            cpu(dt);
        }
        L.hit = Math.max(0, L.hit - dt); R.hit = Math.max(0, R.hit - dt);
    }

    /* ── Ball ───────────────────────────────────────────────────────────── */
    function burst(x, y, color, n, sp, dir) {
        for (let i = 0; i < n; i++) {
            const a = (dir == null ? Math.random() * Math.PI * 2 : (dir > 0 ? 0 : Math.PI) + (Math.random() - .5) * 2.2), s = (.3 + Math.random()) * sp;
            parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .35 + Math.random() * .35, c: color, s: 2 + Math.random() * 3 });
        }
    }
    function bounce(p, dir) {
        const off = X.clamp((ball.y - p.y) / (PH / 2 + BS / 2), -1, 1);
        const a = X.clamp(off * MAXA + p.vy / 1800, -1.05, 1.05);
        ball.spd = Math.min(MAX_SPEED, ball.spd + 18);
        ball.vx = Math.cos(a) * ball.spd * dir; ball.vy = Math.sin(a) * ball.spd;
        ball.x = dir > 0 ? p.x + PW + BS / 2 : p.x - BS / 2;
        p.hit = .12;
        rally++; maxRally = Math.max(maxRally, rally);
        if (rally === 30) { X.egg('g-pong-rally'); pops.push({ text: '30er-Ballwechsel!', x: W / 2, y: H / 2 - 40, t: 1.4, life: 1.4, size: 22, c: C.warning }); }
        else if (rally % 10 === 0) pops.push({ text: rally + ' Treffer!', x: W / 2, y: H / 2 - 40, t: 1, life: 1, size: 18, c: C.muted });
        X.beep(330 + ball.spd * .7, .05, 'square', .05);
        burst(ball.x, ball.y, dir > 0 ? colL() : colR(), 6 + Math.abs(off) * 6, 140 + ball.spd * .2, dir);
        if (Math.abs(off) > .8) shake = Math.max(shake, 3);
        if (dir > 0) rollCpu();
        updateHud();
    }
    function point(who) {
        sc[who]++;
        state = 'point'; pointT = 1.2; shake = 9; flash = 1;
        burst(who === 0 ? W - 4 : 4, X.clamp(ball.y, 10, H - 10), who === 0 ? colL() : colR(), 26, 260, who === 0 ? -1 : 1);
        if (who === 0 || twoP()) G.sfx.coin(); else G.sfx.hit();
        serveDir = who === 0 ? 1 : -1;
        pops.push({ text: names()[who] + (twoP() ? ' punktet!' : who === 0 ? ' punktest!' : ' punktet'), x: W / 2, y: H / 2 + 50, t: 1.1, life: 1.1, size: 20, c: who === 0 ? colL() : colR() });
        updateHud();
    }

    function update(dt) {
        t += dt;
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.vx *= .97; p.vy *= .97; p.x += p.vx * dt; p.y += p.vy * dt; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 20 * dt; });
        shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt * 2.5);

        if (state === 'serve') { movePaddles(dt); serveT -= dt; if (serveT <= 0) doServe(); return; }
        if (state === 'point') {
            movePaddles(dt); pointT -= dt;
            if (pointT <= 0) { if (Math.max(sc[0], sc[1]) >= WIN) gameOver(); else newServe(); }
            return;
        }
        if (state !== 'play') return;
        movePaddles(dt);
        const n = Math.max(1, Math.ceil(ball.spd * dt / 4)), h = dt / n;
        for (let i = 0; i < n; i++) {
            ball.x += ball.vx * h; ball.y += ball.vy * h;
            if (ball.y < BS / 2) { ball.y = BS / 2; ball.vy = Math.abs(ball.vy); X.beep(220, .03, 'square', .03); }
            else if (ball.y > H - BS / 2) { ball.y = H - BS / 2; ball.vy = -Math.abs(ball.vy); X.beep(220, .03, 'square', .03); }
            if (ball.vx < 0 && ball.x - BS / 2 <= L.x + PW && ball.x + BS / 2 >= L.x && Math.abs(ball.y - L.y) <= PH / 2 + BS / 2) bounce(L, 1);
            else if (ball.vx > 0 && ball.x + BS / 2 >= R.x && ball.x - BS / 2 <= R.x + PW && Math.abs(ball.y - R.y) <= PH / 2 + BS / 2) bounce(R, -1);
            if (ball.x < -BS) return point(1);
            if (ball.x > W + BS) return point(0);
        }
        ball.trail.push([ball.x, ball.y]); if (ball.trail.length > 10) ball.trail.shift();
    }

    function gameOver() {
        state = 'over'; loop.stop(); overAt = performance.now();
        const won = sc[0] > sc[1];
        let text, title, icon;
        if (twoP()) {
            title = (won ? 'Links' : 'Rechts') + ' gewinnt!'; icon = '🏓';
            text = sc[0] + ' : ' + sc[1] + ' · längster Ballwechsel: ' + maxRally;
            G.sfx.win();
        } else {
            const l = lvl(), value = sc[0] * l * 10 + (won ? 100 * l : 0);
            const r = X.score('pong', value);
            title = won ? 'Gewonnen!' : 'Die CPU gewinnt.'; icon = won ? '🏆' : '🤖';
            text = sc[0] + ' : ' + sc[1] + ' gegen CPU ' + CPU[mode].name + ' · Wertung ' + value + (r.isNew && value > 0 ? ' – neuer Rekord!' : '') + ' · längster Ballwechsel: ' + maxRally;
            if (won) {
                G.sfx.win(); X.confetti(80);
                if (l === 3) X.egg('g-pong-schwer');
                if (sc[1] === 0 && l >= 2) X.egg('g-pong-perfekt');
            } else G.sfx.die();
        }
        updateHud(); draw();
        ov.show({ icon, title, text, button: 'Revanche', onClick: start, hint: 'Oder Leertaste' });
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    const colL = () => C.rc;
    const colR = () => twoP() ? C.accent : C.accent2;

    function paddle(p, color) {
        const s = p.hit / .12;
        const w = PW + s * 3, h = PH - s * 6;
        ctx.fillStyle = color;
        G.roundRect(ctx, p.x + PW / 2 - w / 2, p.y - h / 2, w, h, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(p.x + PW / 2 - w / 2 + 3, p.y - h / 2 + 5, 2, h - 10);
    }
    function draw() {
        ctx.save();
        ctx.fillStyle = C.bg2; ctx.fillRect(0, 0, W, H);
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        // Mittellinie
        ctx.fillStyle = C.a('border', .9);
        for (let y = 6; y < H; y += 24) ctx.fillRect(W / 2 - 2, y, 4, 12);
        ctx.strokeStyle = C.a('border', .5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 46, 0, 7); ctx.stroke();
        // Spielstand
        const n = names();
        ctx.textAlign = 'center';
        ctx.font = '900 60px ' + C.mono; ctx.fillStyle = C.a('text', .22);
        ctx.fillText(sc[0], W / 2 - 70, 76); ctx.fillText(sc[1], W / 2 + 70, 76);
        ctx.font = '700 11px ' + C.font; ctx.fillStyle = C.faint;
        ctx.fillText(n[0].toUpperCase(), W / 2 - 70, 94); ctx.fillText(n[1].toUpperCase() + (twoP() ? '' : ' · ' + CPU[mode].name.toUpperCase()), W / 2 + 70, 94);

        paddle(L, colL()); paddle(R, colR());

        if (ball) {
            ball.trail.forEach((p, i) => {
                ctx.globalAlpha = (i + 1) / ball.trail.length * .3 * Math.min(1, ball.spd / 500);
                ctx.fillStyle = C.rc; const s = BS * (i + 1) / ball.trail.length;
                ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
            });
            ctx.globalAlpha = 1;
            const vis = state !== 'serve' || Math.floor(serveT * 6) % 2 === 0;
            if (vis && state !== 'point') { ctx.fillStyle = C.text; ctx.fillRect(ball.x - BS / 2, ball.y - BS / 2, BS, BS); }
        }
        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 3); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
        ctx.globalAlpha = 1;
        if (state === 'serve') {
            ctx.font = '700 14px ' + C.font; ctx.fillStyle = C.muted;
            ctx.fillText(sc[0] + sc[1] === 0 ? 'Erster bis ' + WIN + ' gewinnt' : 'Bereit?', W / 2, H / 2 + 40);
        }
        if (rally >= 5 && state === 'play') {
            ctx.font = '700 12px ' + C.font; ctx.fillStyle = C.a('text', .45);
            ctx.fillText('Ballwechsel ' + rally, W / 2, H - 14);
        }
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 ' + p.size + 'px ' + C.font; ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .8);
            ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
        if (flash > 0) { ctx.fillStyle = C.a('text', flash * .12); ctx.fillRect(0, 0, W, H); }
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    function setPause(on) {
        if (on && (state === 'play' || state === 'serve' || state === 'point')) {
            pausedFrom = state; state = 'paused'; G.keys.clear();
            ov.show({ icon: '⏸', title: 'Pause', text: 'Leertaste oder P zum Weiterspielen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') { state = pausedFrom; ov.hide(); }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === ' ' || k === 'p' || k === 'Escape') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === ' ' || k === 'p' || k === 'Escape') setPause(true);
    });
    const pointers = {};
    function aimFrom(e) {
        if (state === 'idle' || state === 'over' || state === 'paused') return;
        const p = G.pointer(cv, W, H, e);
        const y = X.clamp(p.y, 0, H);
        if (twoP()) {
            if (e.pointerType !== 'mouse' && !pointers[e.pointerId]) pointers[e.pointerId] = p.x < W / 2 ? 'L' : 'R';
            const side = e.pointerType === 'mouse' ? (p.x < W / 2 ? 'L' : 'R') : pointers[e.pointerId];
            if (side === 'L') aimL = y; else aimR = y;
        } else aimL = y;
    }
    stage.addEventListener('pointerdown', e => { if (!e.target.closest('.game__overlay')) { delete pointers[e.pointerId]; aimFrom(e); } });
    stage.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) aimFrom(e); });
    stage.addEventListener('pointerup', e => { delete pointers[e.pointerId]; });

    function start() {
        reset(); ov.hide(); loop.start();
    }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    const DESC = {
        1: 'Die CPU ist etwas verschlafen. Perfekt zum Aufwärmen.',
        2: 'Die CPU ist wach, aber nicht unfehlbar.',
        3: 'Die CPU berechnet, wo der Ball landet. Steile Bälle sind deine Chance.',
        '2p': 'Links spielt mit W/S, rechts mit ↑/↓. Auf dem Handy steuert jede Bildschirmhälfte einen Schläger.'
    };
    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || (state !== 'idle' && state !== 'over')) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = DESC[mode];
        document.getElementById('keys-help').firstElementChild.innerHTML = twoP()
            ? 'Links: <kbd>W</kbd> <kbd>S</kbd> · Rechts: <kbd>↑</kbd> <kbd>↓</kbd>'
            : '<kbd>W</kbd> <kbd>S</kbd> oder <kbd>↑</kbd> <kbd>↓</kbd> – deinen Schläger (links) bewegen';
        hudKey = ''; updateHud(); draw();
    });
    C.onChange = () => { if (!loop.running) draw(); };

    reset(); state = 'idle'; draw();
    ov.show({ icon: '🏓', title: 'Pong', text: 'Wer zuerst sieben Punkte hat, gewinnt. Wähl rechts deinen Gegner.', button: 'Anpfiff', onClick: start, hint: 'Oder Leertaste' });

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
