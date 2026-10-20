/* Mixer-Studio – Übersicht: Live-Equalizer, Energie-Regler, Kacheln, Regal */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, M = X.Mixer;

    /* ── Kacheln ─────────────────────────────────────────────────────────── */
    const META = {
        'mixer/klang.html': { i: '🌧', tc: 'var(--rc)', tags: ['Ton', '16 Kanäle', 'Schlaf-Timer'] },
        'mixer/farbe.html': { i: '🎨', tc: 'var(--accent-2)', tags: ['Licht & Malfarbe', 'Paletten', 'Kontrast'] },
        'mixer/namen.html': { i: '🔤', tc: 'var(--warning)', tags: ['7 Generatoren', 'Kofferwörter'] },
        'mixer/wesen.html': { i: '🐲', tc: 'var(--success)', tags: ['Pixel-Art', 'Bestiarium', 'PNG'] },
        'mixer/synth.html': { i: '🎹', tc: 'var(--accent)', tags: ['Ton', 'Keyboard', 'Oszilloskop'] },
        'mixer/beat.html':  { i: '🥁', tc: 'var(--danger)', tags: ['Ton', 'bis 64 Schritte', 'Vorlagen'] },
        'mixer/musik.html': { i: '🎶', tc: 'var(--accent-2)', tags: ['Ton', 'Drums + Synth', 'Song-Abfolge', 'WAV-Export'] }
    };
    const pages = X.pages.filter(p => p.r === 'mixer' && p.p !== 'mixer/index.html');
    const nose = X.hasSkill('e2');
    X.$('#tiles').innerHTML = pages.map((p, i) => {
        const m = META[p.p] || { i: '≋', tc: 'var(--rc)', tags: [] };
        const unlocked = X.isUnlocked(p);
        let lock = '';
        if (!unlocked) {
            const s = X.skillInfo(p.skill);
            const br = s && X.branches.find(b => b.id === s.b);
            lock = '<div class="tile__lock">🔒 Benötigt: <strong>' + X.esc(s ? s.n : p.skill) + '</strong>' + (br ? ' (' + X.esc(br.name) + ')' : '') + '</div>';
        }
        let crystals = '';
        if (nose) {
            const here = X.eggs.filter(e => e.pg === p.p);
            if (here.length) crystals = '<span class="mx-crystals" title="Realitätskristalle auf dieser Seite">' + X.crystalSVG(2, 14) + here.filter(e => X.hasEgg(e.id)).length + '/' + here.length + '</span>';
        }
        const isNew = unlocked && !X.isVisited(p.p);
        return '<a class="tile mixer-tile' + (unlocked ? '' : ' is-locked') + (isNew ? ' is-new' : '') + '" href="' + X.esc(p.p.replace('mixer/', '')) + '" style="--tc:' + m.tc + ';--d:' + (i * .06).toFixed(2) + 's" data-reveal>' +
            '<div class="tile__head"><div class="tile__icon" aria-hidden="true">' + (unlocked ? m.i : '🔒') + '</div>' +
            '<div class="tile__title">' + X.esc(p.t) + '</div>' +
            (unlocked ? '<div class="tile__wave" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' : '') + '</div>' +
            '<div class="tile__desc">' + X.esc(p.d) + '</div>' + lock +
            '<div class="tile__meta">' + m.tags.map(t => '<span class="badge">' + X.esc(t) + '</span>').join('') +
            (X.isVisited(p.p) ? '<span class="badge badge--success">besucht</span>' : '') + crystals + '</div></a>';
    }).join('');

    /* ── Regal ───────────────────────────────────────────────────────────── */
    const len = (k, f) => { const v = M.load(k, {}); return Array.isArray(v[f]) ? v[f].length : 0; };
    const shelf = [
        ['🌧', len('klang', 'mixes'), 'Klangmischungen', 'klang.html'],
        ['🎨', len('farbe', 'saved'), 'Paletten', 'farbe.html'],
        ['⭐', len('namen', 'fav'), 'Lieblingsnamen', 'namen.html'],
        ['🐲', len('wesen', 'list'), 'Kreaturen', 'wesen.html'],
        ['🎹', len('synth', 'user'), 'Synth-Klänge', 'synth.html'],
        ['🥁', len('beat', 'slots'), 'Beats', 'beat.html']
    ];
    X.$('#shelf').innerHTML = shelf.map(s => '<a class="stat" href="' + s[3] + '" style="color:inherit"><span class="stat__value"><span aria-hidden="true">' + s[0] + '</span> <span data-count="' + s[1] + '">0</span></span><span class="stat__label">' + s[2] + '</span></a>').join('');

    /* ── Energie-Regler (geht bis … 10. Oder?) ───────────────────────────── */
    const knob = X.$('#knob'), knobVal = X.$('#knob-val'), scale = X.$('#knob-scale');
    const angleOf = v => -135 + v * 27;
    scale.innerHTML = Array.from({ length: 11 }, (_, i) => '<span style="--t:' + angleOf(i) + 'deg">' + i + '</span>').join('');
    let level = 5, overpush = 0, rainbowUntil = 0;
    function setLevel(v, fromUser) {
        v = Math.max(0, Math.min(11, v));
        if (v === level) return;
        level = v;
        knob.style.setProperty('--a', angleOf(v) + 'deg');
        knobVal.textContent = v;
        knob.setAttribute('aria-valuenow', v);
        knob.setAttribute('aria-valuetext', v === 11 ? '11 – eins lauter' : String(v));
        X.$$('span', scale).forEach((s, i) => s.classList.toggle('is-lit', i <= v));
        knob.classList.toggle('is-eleven', v === 11);
        if (v < 10) overpush = 0;
        if (v === 11 && fromUser) {
            rainbowUntil = performance.now() + 5000;
            X.egg('x-elf');
        }
        wake();
    }
    function push(dir) {
        if (dir > 0 && level >= 10 && level < 11) {
            overpush++;
            const body = X.$('.knob__body', knob);
            body.animate([{ transform: 'rotate(' + angleOf(10) + 'deg)' }, { transform: 'rotate(' + (angleOf(10) + 4) + 'deg)' }, { transform: 'rotate(' + angleOf(10) + 'deg)' }], { duration: 160 });
            if (overpush >= 3) setLevel(11, true);
            return;
        }
        setLevel(level + dir, true);
    }
    knob.style.setProperty('--a', angleOf(level) + 'deg');
    X.$$('span', scale).forEach((s, i) => s.classList.toggle('is-lit', i <= level));
    knob.addEventListener('keydown', e => {
        const k = e.key;
        if (k === 'ArrowUp' || k === 'ArrowRight' || k === 'PageUp') { e.preventDefault(); push(1); }
        else if (k === 'ArrowDown' || k === 'ArrowLeft' || k === 'PageDown') { e.preventDefault(); push(-1); }
        else if (k === 'Home') { e.preventDefault(); setLevel(0, true); }
        else if (k === 'End') { e.preventDefault(); setLevel(Math.max(level, 10) === 11 ? 11 : 10, true); }
    });
    knob.addEventListener('wheel', e => { e.preventDefault(); push(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    let dragY = null, dragAcc = 0;
    knob.addEventListener('pointerdown', e => { dragY = e.clientY; dragAcc = 0; knob.setPointerCapture(e.pointerId); knob.focus({ preventScroll: true }); });
    knob.addEventListener('pointermove', e => {
        if (dragY == null) return;
        dragAcc += dragY - e.clientY + (e.movementX || 0) * .5; dragY = e.clientY;
        while (dragAcc > 14) { dragAcc -= 14; push(1); }
        while (dragAcc < -14) { dragAcc += 14; push(-1); }
    });
    const endDrag = () => { dragY = null; };
    knob.addEventListener('pointerup', endDrag);
    knob.addEventListener('pointercancel', endDrag);

    /* ── Live-Equalizer ──────────────────────────────────────────────────── */
    const stage = X.$('#stage'), hint = X.$('#eq-hint');
    let bars = [], N = 0;
    const cvs = M.canvas('#eq', st => {
        N = Math.max(16, Math.min(72, Math.floor(st.w / 14)));
        bars = Array.from({ length: N }, (_, i) => bars[i] || { v: 0, peak: 0, pv: 0 });
        bars.length = N;
        draw(performance.now());
    });
    const ptr = { x: .5, y: .5, on: 0, target: 0 };
    const ripples = [];
    function local(e) {
        const r = stage.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }
    stage.addEventListener('pointermove', e => { const p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.target = 1; hint.style.opacity = 0; wake(); });
    stage.addEventListener('pointerleave', () => { ptr.target = 0; });
    stage.addEventListener('pointercancel', () => { ptr.target = 0; });
    stage.addEventListener('pointerdown', e => {
        const p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.target = 1;
        ripples.push({ x: p.x, t0: performance.now(), a: 1 });
        if (ripples.length > 6) ripples.shift();
        hint.style.opacity = 0; wake();
    });

    let raf = 0, visible = true, lastT = performance.now();
    function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    function frame(now) {
        raf = 0;
        draw(now);
        const busy = !M.calm() || ptr.on > .01 || ripples.length;
        if (visible && busy) raf = requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(en => { visible = en[0].isIntersecting; if (visible) wake(); }).observe(stage);
    }
    M.onTheme(() => draw(performance.now()));

    function hsl(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')'; }

    function draw(now) {
        const { ctx, w, h } = cvs;
        if (!w || !N) return;
        const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
        const t = M.calm() ? 0 : now / 1000;
        const e = level / 10;                        // 0 … 1.1
        ptr.on += (ptr.target - ptr.on) * Math.min(1, dt * 6);
        const rainbow = now < rainbowUntil;

        ctx.clearRect(0, 0, w, h);
        // Rasterlinien
        ctx.strokeStyle = M.color('--border', .5); ctx.lineWidth = 1;
        for (let y = h * .18; y < h; y += h * .16) { ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(w, Math.round(y) + .5); ctx.stroke(); }

        const base = h * .68, maxH = h * .58, gap = 3;
        const bw = (w - gap * (N + 1)) / N;
        const rc = M.rgb('--rc'), a2 = M.rgb('--accent-2');
        for (let i = 0; i < N; i++) {
            const x = i / (N - 1);
            const b = bars[i];
            let target = (.18 + .5 * (.5 + .5 * Math.sin(t * 1.9 + i * .37)) * (.5 + .5 * Math.sin(t * .83 - i * .19 + 1.3)) +
                .18 * (.5 + .5 * Math.sin(t * 5.3 + i * 1.7))) * e;
            if (e > 1) target += .25 * Math.abs(Math.sin(t * 9 + i));
            target += ptr.on * Math.exp(-Math.pow((x - ptr.x) / .09, 2)) * (1.05 - ptr.y) * 1.05;
            for (let r = ripples.length - 1; r >= 0; r--) {
                const rp = ripples[r], age = (now - rp.t0) / 1000;
                if (age > 1.6) { ripples.splice(r, 1); continue; }
                const d = Math.abs(x - rp.x) - age * .7;
                target += Math.exp(-d * d / .0025) * (1 - age / 1.6) * .8;
            }
            target = Math.max(.02, Math.min(1.05, target));
            b.v += (target - b.v) * Math.min(1, dt * (target > b.v ? 18 : 7));
            if (b.v > b.peak) { b.peak = b.v; b.pv = 0; } else { b.pv += dt * 1.2; b.peak = Math.max(b.v, b.peak - b.pv * dt * 2.5); }

            const bh = Math.max(2, b.v * maxH), bx = gap + i * (bw + gap);
            let top, bottom;
            if (rainbow) {
                const hue = (i / N * 360 + now / 6) % 360;
                top = hsl(hue, 90, 70, 1); bottom = hsl(hue, 85, 50, .95);
            } else {
                const k = Math.min(1, b.v);
                top = 'rgba(' + Math.round(M.lerp(rc[0], a2[0], k)) + ',' + Math.round(M.lerp(rc[1], a2[1], k)) + ',' + Math.round(M.lerp(rc[2], a2[2], k)) + ',1)';
                bottom = 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',.85)';
            }
            const grad = ctx.createLinearGradient(0, base - bh, 0, base);
            grad.addColorStop(0, top); grad.addColorStop(1, bottom);
            ctx.fillStyle = grad;
            roundTop(ctx, bx, base - bh, bw, bh, Math.min(4, bw / 2));
            // Spiegelung
            ctx.globalAlpha = .18;
            ctx.fillRect(bx, base + 3, bw, bh * .45);
            ctx.globalAlpha = 1;
            // Spitzenkappe
            ctx.fillStyle = rainbow ? hsl((i / N * 360 + now / 6) % 360, 90, 80, 1) : M.color('--text', .85);
            ctx.fillRect(bx, base - Math.max(b.peak * maxH, 2) - 5, bw, 2);
        }
        // Wellenform darüber
        ctx.beginPath();
        const freq = 2 + ptr.on * ptr.x * 10, amp = (8 + 22 * e) * (.4 + .6 * ptr.on + .4 * Math.min(1, e));
        for (let px = 0; px <= w; px += 4) {
            const u = px / w;
            const y = h * .3 + Math.sin(u * Math.PI * freq + t * 3) * amp * Math.sin(u * Math.PI) + Math.sin(u * 23 + t * 7) * 3 * e;
            px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
        }
        ctx.strokeStyle = rainbow ? hsl((now / 4) % 360, 90, 75, .9) : M.color('--text', .55);
        ctx.lineWidth = 2; ctx.shadowColor = M.color('--rc', .8); ctx.shadowBlur = 12;
        ctx.stroke(); ctx.shadowBlur = 0;
        // Grundlinie
        ctx.fillStyle = M.color('--border-strong', 1);
        ctx.fillRect(0, base + 1, w, 1);
    }
    function roundTop(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y); ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h);
        ctx.closePath(); ctx.fill();
    }
    wake();
});
