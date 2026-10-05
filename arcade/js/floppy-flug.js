/* Floppy Flug – eine Diskette flattert durch Laufwerksschächte und Flachbandkabel */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, G = X.Game;
    const { cv, ctx, W, H } = G.canvas('#cv', 480, 640);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    const C = palette();
    const stage = document.getElementById('stage');

    const GROUND = 72, GY = H - GROUND, PX = 130, SIZE = 34, RAD = 14, OW = 64, SPACING = 232;
    const GRAV = 1550, FLAP = -430, METAL = 'rgb(214,220,230)', LABEL = 'rgb(246,247,250)';

    let mode = 'normal', state = 'idle';
    let y = H * .42, readyY = H * .42, vy = 0, ang = 0, shutter = 0, protect = false;
    let obs = [], bits = [], parts = [], pops = [];
    let score = 0, passed = 0, bitCount = 0, scroll = 0, dist = 0, lastGap = GY / 2;
    let shake = 0, flash = 0, t = 0, overT = 0, overAt = 0, hudKey = '';
    const turbo = () => mode === 'turbo';
    const speed = () => (165 + Math.min(85, passed * 2.4)) * (turbo() ? 1.3 : 1);
    const gapSize = () => Math.max(132, 178 - passed * 1.4) * (turbo() ? .95 : 1);

    // Hintergrund-Ebenen (einmal erzeugt, wiederholen sich alle 480 px)
    const rnd = G.rng('xiru-floppy');
    const racks = [];
    for (let x = 0; x < W;) { const w = 34 + rnd() * 40; racks.push({ x, w, h: 120 + rnd() * 190, leds: Math.floor(3 + rnd() * 6) }); x += w + 6 + rnd() * 18; }
    const traces = [];
    for (let i = 0; i < 9; i++) {
        const y0 = 90 + rnd() * (GY - 150), x0 = rnd() * W, len = 60 + rnd() * 160, dy = (rnd() - .5) * 90;
        traces.push([x0, y0, x0 + len * .5, y0, x0 + len * .5 + Math.abs(dy) * .6, y0 + dy, x0 + len + Math.abs(dy) * .6, y0 + dy]);
    }

    function reset() {
        y = readyY = H * .42; vy = 0; ang = 0; shutter = 0;
        obs = []; bits = []; parts = []; pops = [];
        score = 0; passed = 0; bitCount = 0; dist = 120; lastGap = GY / 2;
        shake = 0; flash = 0;
        updateHud();
    }
    function updateHud() {
        const key = score + '|' + bitCount;
        if (key === hudKey) return;
        hudKey = key;
        G.hud('#hud', { Punkte: score, Hindernisse: passed, Bits: bitCount });
        const b = X.best('floppy-flug');
        document.getElementById('best').textContent = b == null ? '–' : X.fmt(b);
    }

    function spawn() {
        const g = gapSize();
        const lo = 70 + g / 2, hi = GY - 50 - g / 2;
        const c = X.clamp(lastGap + (Math.random() * 2 - 1) * 190, lo, hi);
        lastGap = c;
        const x = W + 10;
        obs.push({ x, top: c - g / 2, bot: c + g / 2, passed: false, led: Math.random() * 6 });
        if (Math.random() < .45) bits.push({ x: x + OW / 2, y: c + (Math.random() - .5) * g * .45, v: Math.random() < .5 ? '0' : '1', ph: Math.random() * 6 });
        else if (Math.random() < .3) bits.push({ x: x + OW + SPACING / 2 - OW / 2, y: X.clamp(c + (Math.random() - .5) * 120, 60, GY - 60), v: Math.random() < .5 ? '0' : '1', ph: Math.random() * 6 });
    }

    function flap() {
        if (state === 'ready') state = 'play';
        if (state !== 'play') return;
        vy = FLAP; shutter = 1;
        X.beep(560 + Math.random() * 60, .07, 'triangle', .06);
        for (let i = 0; i < 5; i++) parts.push({ x: PX - 14, y: y + 8, vx: -60 - Math.random() * 80, vy: 40 + Math.random() * 60, t: .35 + Math.random() * .2, c: C.a('text', .5), s: 2 + Math.random() * 3 });
    }

    function burst(x, yy, color, n, sp) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, s = (.3 + Math.random()) * sp;
            parts.push({ x, y: yy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .5 + Math.random() * .5, c: color, s: 2 + Math.random() * 3 });
        }
    }

    function circleRect(cx, cy, r, rx, ry, rw, rh) {
        const nx = X.clamp(cx, rx, rx + rw), ny = X.clamp(cy, ry, ry + rh);
        return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
    }
    function hits(o) {
        const r = RAD - 2;
        return circleRect(PX, y, r, o.x, -50, OW, o.top - 22 + 50) ||
            circleRect(PX, y, r, o.x - 5, o.top - 22, OW + 10, 22) ||
            circleRect(PX, y, r, o.x - 5, o.bot, OW + 10, 18) ||
            circleRect(PX, y, r, o.x, o.bot + 18, OW, GY);
    }

    function crash(ground) {
        state = 'crash'; shake = 10; flash = 1;
        G.sfx.hit(); setTimeout(() => X.beep(110, .3, 'sawtooth', .05), 80);
        burst(PX, y, C.rc, 18, 220);
        if (!ground) vy = Math.min(vy, -160);
    }
    function finish() {
        state = 'over'; overAt = performance.now();
        const r = X.score('floppy-flug', score);
        updateHud();
        const medal = score >= 50 ? 'Gold-Diskette 🥇' : score >= 25 ? 'Silber-Diskette 🥈' : score >= 10 ? 'Bronze-Diskette 🥉' : null;
        setTimeout(() => {
            loop.stop();
            ov.show({
                icon: '💾', title: 'Datenverlust!',
                text: score + ' Punkte · ' + passed + ' Hindernisse · ' + bitCount + ' Bits' + (medal ? ' · ' + medal : '') + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''),
                button: 'Nochmal', onClick: start, hint: 'Oder Leertaste'
            });
        }, 450);
    }

    /* ── Spielschleife ──────────────────────────────────────────────────── */
    function update(dt) {
        t += dt;
        parts = parts.filter(p => (p.t -= dt) > 0);
        parts.forEach(p => { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
        pops = pops.filter(p => (p.t -= dt) > 0);
        pops.forEach(p => { p.y -= 30 * dt; });
        shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt * 2.5);
        shutter = Math.max(0, shutter - dt * 4);

        if (state === 'ready') { y = readyY + Math.sin(t * 4) * 9; ang = Math.sin(t * 4 + 1) * .08; scroll += 70 * dt; return; }
        if (state === 'crash' || state === 'over') {
            if (y < GY - RAD) { vy += GRAV * dt; y = Math.min(GY - RAD, y + vy * dt); ang += dt * 9; }
            else if (state === 'crash') { y = GY - RAD; finish(); }
            return;
        }
        if (state !== 'play') return;

        vy = Math.min(900, vy + GRAV * dt); y += vy * dt;
        if (y < RAD) { y = RAD; vy = Math.max(0, vy); }
        const target = vy < 0 ? -.42 : Math.min(1.35, vy / 520);
        ang += (target - ang) * Math.min(1, dt * (vy < 0 ? 18 : 6));

        const sp = speed();
        scroll += sp * dt;
        obs.forEach(o => { o.x -= sp * dt; });
        bits.forEach(b => { b.x -= sp * dt; });
        dist -= sp * dt;
        if (dist <= 0) { spawn(); dist += SPACING; }

        for (const o of obs) {
            if (!o.passed && o.x + OW < PX - RAD) {
                o.passed = true; passed++; score++;
                X.beep(880, .04, 'square', .03);
                if (passed % 10 === 0) { G.sfx.coin(); pops.push({ text: passed + ' geschafft!', x: W / 2, y: 150, t: 1.2, life: 1.2, size: 20, c: C.rc }); }
                if (passed === 25) X.egg('g-floppy-flug-25');
                updateHud();
            }
            if (hits(o)) return crash(false);
        }
        for (const b of bits) {
            if (!b.got && Math.hypot(b.x - PX, b.y - y) < RAD + 11) {
                b.got = true; bitCount++; score++;
                X.beep(1200 + (bitCount % 8) * 90, .05, 'square', .035);
                burst(b.x, b.y, C.accent, 8, 120);
                pops.push({ text: '+' + b.v, x: b.x, y: b.y - 14, t: .7, life: .7, size: 14, c: C.accent });
                if (bitCount % 8 === 0) pops.push({ text: (bitCount / 8) + ' Byte' + (bitCount > 8 ? 's' : '') + '!', x: W / 2, y: 190, t: 1.3, life: 1.3, size: 18, c: C.accent });
                if (bitCount === 8) X.egg('g-floppy-flug-byte');
                updateHud();
            }
        }
        obs = obs.filter(o => o.x > -OW - 20);
        bits = bits.filter(b => !b.got && b.x > -30);
        if (y + RAD >= GY) { y = GY - RAD; crash(true); }
    }

    /* ── Zeichnen ───────────────────────────────────────────────────────── */
    function drawBackground() {
        const g = ctx.createLinearGradient(0, 0, 0, GY);
        g.addColorStop(0, C.bg); g.addColorStop(1, C.bg2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY);
        // ferne Serverschränke
        const o1 = -(scroll * .15 % W);
        for (let k = 0; k < 2; k++) racks.forEach(r => {
            const x = r.x + o1 + k * W;
            if (x > W || x + r.w < 0) return;
            ctx.fillStyle = C.a('surface2', .4); ctx.fillRect(x, GY - r.h, r.w, r.h);
            ctx.fillStyle = C.a('border', .35);
            for (let yy = GY - r.h + 8; yy < GY - 6; yy += 14) ctx.fillRect(x + 4, yy, r.w - 8, 2);
            for (let i = 0; i < r.leds; i++) {
                const on = Math.sin(t * (1.5 + i * .7) + r.x) > .2;
                ctx.fillStyle = on ? C.a(i % 3 ? 'success' : 'warning', .55) : C.a('faint', .25);
                ctx.fillRect(x + r.w - 7, GY - r.h + 10 + i * 14, 3, 3);
            }
        });
        // Leiterbahnen
        const o2 = -(scroll * .4 % W);
        ctx.strokeStyle = C.a('rc', .13); ctx.lineWidth = 2; ctx.fillStyle = C.a('rc', .18);
        for (let k = 0; k < 2; k++) traces.forEach(tr => {
            ctx.beginPath(); ctx.moveTo(tr[0] + o2 + k * W, tr[1]);
            for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i] + o2 + k * W, tr[i + 1]);
            ctx.stroke();
            ctx.beginPath(); ctx.arc(tr[0] + o2 + k * W, tr[1], 3.5, 0, 7); ctx.arc(tr[6] + o2 + k * W, tr[7], 3.5, 0, 7); ctx.fill();
        });
    }
    function drawGround() {
        ctx.fillStyle = C.surface; ctx.fillRect(0, GY, W, GROUND);
        ctx.fillStyle = C.strong; ctx.fillRect(0, GY, W, 3);
        const o = -(scroll % 48);
        for (let x = o; x < W; x += 48) {
            ctx.fillStyle = C.a('border', .9); ctx.fillRect(x, GY + 16, 34, 9);
            ctx.fillStyle = C.a('warning', .35);
            for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + i * 5, GY + 40, 3, 10);
        }
    }
    function drawObstacle(o) {
        const x = o.x;
        // Flachbandkabel von oben
        const ch = o.top - 22;
        if (ch > 0) {
            ctx.fillStyle = C.surface2; ctx.fillRect(x, 0, OW, ch);
            ctx.fillStyle = C.a('strong', .7);
            for (let i = 6; i < OW; i += 4) ctx.fillRect(x + i, 0, 1, ch);
            ctx.fillStyle = C.danger; ctx.fillRect(x, 0, 4, ch);
            ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x + 4, 0, 6, ch);
        }
        ctx.fillStyle = C.surface; ctx.fillRect(x - 5, o.top - 22, OW + 10, 22);
        ctx.strokeStyle = C.strong; ctx.lineWidth = 2; ctx.strokeRect(x - 4, o.top - 21, OW + 8, 20);
        ctx.fillStyle = C.bg;
        for (let i = 0; i < 12; i++) { ctx.fillRect(x + 2 + i * 5, o.top - 16, 3, 3); ctx.fillRect(x + 2 + i * 5, o.top - 9, 3, 3); }
        // Laufwerksschächte von unten
        ctx.fillStyle = C.surface; ctx.fillRect(x - 5, o.bot, OW + 10, 18);
        ctx.strokeStyle = C.strong; ctx.strokeRect(x - 4, o.bot + 1, OW + 8, 16);
        ctx.fillStyle = C.a('text', .25); ctx.fillRect(x + 4, o.bot + 7, OW - 8, 3);
        for (let yy = o.bot + 18, i = 0; yy < GY; yy += 30, i++) {
            const h = Math.min(30, GY - yy);
            ctx.fillStyle = C.surface2; ctx.fillRect(x, yy, OW, h);
            ctx.strokeStyle = C.a('strong', .9); ctx.lineWidth = 1; ctx.strokeRect(x + .5, yy + .5, OW - 1, h - 1);
            if (h < 20) continue;
            ctx.fillStyle = C.bg; ctx.fillRect(x + 8, yy + 11, OW - 26, 4);
            const on = Math.sin(t * 3 + o.led + i * 1.7) > .3;
            ctx.fillStyle = on ? C.success : C.a('faint', .5); ctx.fillRect(x + OW - 12, yy + 8, 5, 3);
            ctx.fillStyle = C.a('text', .3); ctx.fillRect(x + OW - 14, yy + 18, 8, 5);
        }
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x, o.bot + 18, 5, GY - o.bot - 18);
        ctx.strokeStyle = C.a('rc', .35); ctx.lineWidth = 1; ctx.strokeRect(x - .5, o.bot + 17.5, OW + 1, GY - o.bot - 17);
    }
    function drawFloppy(px, py, a) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(a);
        const h = SIZE / 2;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.moveTo(-h + 3, -h + 3); ctx.lineTo(h - 2, -h + 3); ctx.lineTo(h + 3, -h + 8); ctx.lineTo(h + 3, h + 3); ctx.lineTo(-h + 3, h + 3); ctx.fill();
        ctx.fillStyle = C.rc;
        ctx.beginPath(); ctx.moveTo(-h, -h); ctx.lineTo(h - 5, -h); ctx.lineTo(h, -h + 5); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
        // Metallschieber – öffnet sich beim Flattern
        ctx.fillStyle = METAL; ctx.fillRect(-h + 7, -h, 19, 13);
        ctx.fillStyle = 'rgba(40,44,60,.85)'; ctx.fillRect(-h + 17 - shutter * 6, -h + 2, 5, 9);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-h + 7, -h + 11, 19, 2);
        // Etikett
        ctx.fillStyle = LABEL; ctx.fillRect(-h + 5, -h + 17, SIZE - 10, h - 2 + 2);
        ctx.fillStyle = C.rc; ctx.fillRect(-h + 5, -h + 17, SIZE - 10, 3);
        ctx.fillStyle = 'rgba(60,64,80,.4)'; ctx.fillRect(-h + 8, -h + 29, SIZE - 18, 1.5); ctx.fillRect(-h + 8, -h + 32, SIZE - 22, 1.5);
        // Schreibschutz-Schieber
        ctx.fillStyle = protect ? 'rgba(10,12,20,.9)' : 'rgba(0,0,0,.25)'; ctx.fillRect(-h + 2, h - 7, 5, 5);
        // Augen (es ist schliesslich eine Heldin)
        const blink = Math.sin(t * 1.3) > .985;
        ctx.fillStyle = 'rgba(20,22,35,.9)';
        if (state === 'crash' || state === 'over') {
            ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,22,35,.9)'; ctx.beginPath();
            [[-1, 4], [8, 4]].forEach(([ex, ey]) => { ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + 2, ey + 2); ctx.moveTo(ex + 2, ey - 2); ctx.lineTo(ex - 2, ey + 2); });
            ctx.stroke();
        } else if (!blink) { ctx.fillRect(-2, 2, 3, 4); ctx.fillRect(7, 2, 3, 4); }
        ctx.restore();
    }

    function draw() {
        ctx.save();
        if (shake > 0 && C.anim) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
        drawBackground();
        obs.forEach(drawObstacle);
        bits.forEach(b => {
            const bob = Math.sin(t * 5 + b.ph) * 3;
            ctx.fillStyle = C.a('accent', .18); ctx.beginPath(); ctx.arc(b.x, b.y + bob, 13, 0, 7); ctx.fill();
            ctx.fillStyle = C.accent; ctx.font = '800 17px ' + C.mono; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(b.v, b.x, b.y + bob + 1);
        });
        ctx.textBaseline = 'alphabetic';
        drawGround();
        parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.t * 2.5); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
        ctx.globalAlpha = 1;
        drawFloppy(PX, y, ang);

        ctx.textAlign = 'center';
        if (state !== 'idle') {
            ctx.font = '900 46px ' + C.font; ctx.lineWidth = 6; ctx.strokeStyle = C.a('bg', .8);
            ctx.strokeText(score, W / 2, 74); ctx.fillStyle = C.text; ctx.fillText(score, W / 2, 74);
        }
        if (state === 'ready') {
            ctx.font = '700 16px ' + C.font; ctx.fillStyle = C.muted;
            const ty = readyY < GY - 160 ? readyY + 70 : readyY - 60;
            ctx.fillText('Leertaste, Klick oder Tippen zum ' + (passed ? 'Weiterfliegen' : 'Abheben'), W / 2, ty);
            ctx.font = '600 13px ' + C.font; ctx.fillStyle = C.faint;
            ctx.fillText('Laufwerk bereit · 1,44 MB frei', W / 2, ty + 24);
        }
        pops.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.t / p.life * 3);
            ctx.font = '800 ' + p.size + 'px ' + C.font; ctx.lineWidth = 4; ctx.strokeStyle = C.a('bg', .8);
            ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y);
        });
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        ctx.restore();
        if (flash > 0) { ctx.fillStyle = C.a('text', flash * .35); ctx.fillRect(0, 0, W, H); }
    }

    /* ── Eingabe ────────────────────────────────────────────────────────── */
    let pausedFrom = null;
    function setPause(on) {
        if (on && (state === 'play' || state === 'ready')) {
            pausedFrom = state; state = 'paused'; G.keys.clear();
            ov.show({ icon: '⏸', title: 'Pause', text: 'P, Esc oder Leertaste zum Weiterfliegen.', button: 'Weiter', onClick: () => setPause(false) });
        } else if (!on && state === 'paused') {
            state = pausedFrom === 'play' ? 'ready' : pausedFrom;   // nach der Pause schwebt die Diskette erst wieder
            if (state === 'ready') { vy = 0; readyY = X.clamp(y, 40, GY - 60); t = 0; }
            ov.hide();
        }
    }
    G.keys.onPress(k => {
        if (state === 'paused') { if (k === 'p' || k === 'Escape' || k === ' ') setPause(false); return; }
        if (state === 'idle' || state === 'over') { if (k === ' ' && performance.now() - overAt > 700) start(); return; }
        if (k === 'p' || k === 'Escape') return setPause(true);
        if (k === ' ' || k === 'ArrowUp' || k === 'w') flap();
        if (k === 's' && (state === 'play' || state === 'ready')) {
            protect = !protect;
            X.beep(protect ? 300 : 400, .05, 'square', .04);
            pops.push({ text: protect ? 'Schreibschutz an' : 'Schreibschutz aus', x: PX, y: y - 30, t: 1.1, life: 1.1, size: 13, c: C.muted });
            X.egg('g-floppy-flug-schutz');
        }
    });
    stage.addEventListener('pointerdown', e => {
        if (e.target.closest('.game__overlay')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        flap();
    });

    function start() {
        reset(); X.audio(); state = 'ready'; ov.hide(); loop.start();
    }
    const loop = G.loop(update, draw);
    loop.onHide = () => setPause(true);

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b || (state !== 'idle' && state !== 'over')) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = turbo() ? 'Ein Drittel schneller und etwas engere Lücken.' : 'Gemütliches Tempo, das langsam anzieht.';
    });
    C.onChange = () => { if (!loop.running) draw(); };

    reset(); draw();
    ov.show({ icon: '💾', title: 'Floppy Flug', text: 'Flattere durch die Lücken zwischen Kabeln und Laufwerken. Bits geben Extrapunkte.', button: 'Abheben', onClick: start, hint: 'Oder Leertaste' });

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
