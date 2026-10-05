/* ==========================================================================
   Xiruprojekts – Spielhallen-Baukasten (arcade.js)
   --------------------------------------------------------------------------
   Gemeinsame Werkzeuge für alle Spiele. Wird NACH core.js geladen.

     const G = XIRU.Game;
     const { cv, ctx, W, H } = G.canvas('#cv', 480, 480);   // logische Grösse, scharf auf HiDPI
     const loop = G.loop(update, draw);                      // feste 60 Updates/s
     loop.start(); loop.stop(); loop.running
     G.keys.isDown('ArrowLeft')  G.keys.onPress(fn)          // Tastatur
     G.bindTouch('.touch-pad')                               // [data-key]-Knöpfe -> Tasten
     G.swipe(el, dir => …)                                   // 'up' | 'down' | 'left' | 'right'
     G.overlay('#ov').show({ title, text, button, onClick })  .hide()
     G.sfx.coin() / hit() / die() / jump() / win() / click() / power()
     G.rng(seed)  -> function () => 0..1                      // reproduzierbarer Zufall
     G.hud('#hud', { Punkte: 10, Leben: 3 })                  // einfache HUD-Anzeige
     G.bestLabel('snake')                                      // "Rekord: 123" oder "Noch kein Rekord"
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU;
    const G = X.Game = {};

    /* Canvas mit logischer Grösse W×H, gestochen scharf auf HiDPI-Bildschirmen */
    G.canvas = function (sel, W, H) {
        const cv = typeof sel === 'string' ? document.querySelector(sel) : sel;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.aspectRatio = W + ' / ' + H;
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        return { cv, ctx, W, H, dpr };
    };

    /* Umrechnung Mausposition -> logische Koordinaten */
    G.pointer = function (cv, W, H, e) {
        const r = cv.getBoundingClientRect();
        const p = e.touches ? e.touches[0] || e.changedTouches[0] : e;
        return { x: (p.clientX - r.left) / r.width * W, y: (p.clientY - r.top) / r.height * H };
    };

    /* Spielschleife mit festem Zeitschritt */
    G.loop = function (update, render, hz) {
        const step = 1000 / (hz || 60);
        let acc = 0, last = 0, raf = 0;
        const api = { running: false, frame: 0 };
        function tick(now) {
            if (!api.running) return;
            acc += Math.min(250, now - last); last = now;
            while (acc >= step) { update(step / 1000); acc -= step; api.frame++; if (!api.running) break; }
            render(acc / step);
            raf = requestAnimationFrame(tick);
        }
        api.start = () => { if (api.running) return; api.running = true; last = performance.now(); acc = 0; raf = requestAnimationFrame(tick); };
        api.stop = () => { api.running = false; cancelAnimationFrame(raf); };
        // Pausieren, wenn der Tab verborgen ist
        document.addEventListener('visibilitychange', () => { if (document.hidden && api.running && api.onHide) api.onHide(); });
        return api;
    };

    /* Tastatur */
    const down = {};
    const pressFns = [];
    const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    G.keys = {
        isDown: k => !!down[k],
        onPress: fn => pressFns.push(fn),
        clear: () => Object.keys(down).forEach(k => { down[k] = false; })
    };
    function onDown(key, e) {
        const repeat = !!(e && e.repeat);
        down[key] = true;
        if (!repeat) pressFns.forEach(fn => fn(key, e));
    }
    document.addEventListener('keydown', e => {
        const t = e.target;
        if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
        if (GAME_KEYS.includes(e.key) && document.querySelector('.game__stage')) e.preventDefault();
        onDown(e.key.length === 1 ? e.key.toLowerCase() : e.key, e);
    });
    document.addEventListener('keyup', e => { down[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
    addEventListener('blur', () => G.keys.clear());

    /* Touch-Knöpfe: <button data-key="ArrowLeft"> */
    G.bindTouch = function (sel) {
        document.querySelectorAll(sel + ' [data-key]').forEach(b => {
            const k = b.getAttribute('data-key');
            const on = e => { e.preventDefault(); onDown(k); };
            const off = e => { e.preventDefault(); down[k] = false; };
            b.addEventListener('touchstart', on, { passive: false });
            b.addEventListener('touchend', off, { passive: false });
            b.addEventListener('mousedown', on);
            b.addEventListener('mouseup', off);
            b.addEventListener('mouseleave', off);
        });
    };

    /* Wischgesten */
    G.swipe = function (el, cb) {
        el = typeof el === 'string' ? document.querySelector(el) : el;
        let sx = 0, sy = 0;
        el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
        el.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
            cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }, { passive: true });
    };

    /* Overlay (Start / Pause / Game Over) */
    G.overlay = function (sel) {
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        return {
            el,
            show(o) {
                o = o || {};
                el.innerHTML = (o.icon ? '<div style="font-size:3rem">' + o.icon + '</div>' : '') +
                    '<h2>' + X.esc(o.title || '') + '</h2>' +
                    (o.text ? '<p>' + (o.html ? o.text : X.esc(o.text)) + '</p>' : '') +
                    (o.button ? '<button class="btn btn--primary btn--lg" type="button">' + X.esc(o.button) + '</button>' : '') +
                    (o.hint ? '<p class="small faint">' + X.esc(o.hint) + '</p>' : '');
                el.hidden = false;
                const b = el.querySelector('button');
                if (b) { b.addEventListener('click', () => { X.audio(); o.onClick && o.onClick(); }); setTimeout(() => b.focus({ preventScroll: true }), 50); }
            },
            hide() { el.hidden = true; },
            get visible() { return !el.hidden; }
        };
    };

    /* Kleine Soundeffekte (über XIRU.beep, respektiert die Ton-Einstellung) */
    G.sfx = {
        click: () => X.beep(880, .03, 'square', .03),
        coin: () => { X.beep(988, .06); setTimeout(() => X.beep(1319, .1), 60); },
        hit: () => X.beep(220, .08, 'sawtooth', .05),
        jump: () => X.beep(520, .09, 'triangle', .07),
        power: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => X.beep(f, .07, 'triangle'), i * 60)); },
        die: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => X.beep(f, .12, 'sawtooth', .05), i * 110)); },
        win: () => { [523, 659, 784, 1046, 1319].forEach((f, i) => setTimeout(() => X.beep(f, .1, 'square', .04), i * 90)); }
    };

    /* Reproduzierbarer Zufall (mulberry32) */
    G.rng = function (seed) {
        let a = (typeof seed === 'string' ? Array.from(seed).reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1) : seed) >>> 0;
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    };

    /* HUD-Zeile */
    G.hud = function (sel, values) {
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        el.innerHTML = Object.keys(values).map(k => '<div><span>' + X.esc(k) + '</span>' + X.esc(values[k]) + '</div>').join('');
    };

    G.bestLabel = function (game, unit, lower) {
        const b = X.best(game);
        return b == null ? 'Noch kein Rekord' : 'Rekord: ' + X.fmt(b) + (unit ? ' ' + unit : '');
    };

    /* Hilfsfunktionen fürs Zeichnen */
    G.roundRect = function (ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };
    G.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
})();
