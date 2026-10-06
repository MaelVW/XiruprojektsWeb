/* ==========================================================================
   Mixer-Studio – gemeinsame Helfer (mixer/js/mixer.js)
   --------------------------------------------------------------------------
   Wird auf allen Mixer-Seiten NACH core.js geladen.

     const M = XIRU.Mixer;
     M.color('--rc', .5)           CSS-Variable als rgba()-String (auch für Canvas)
     M.rgb('--rc')                 [r, g, b, a]
     M.onTheme(fn)                 wenn Design/Einstellungen wechseln
     M.soundGate('#sound-off')     Hinweis, wenn der Ton ausgeschaltet ist -> .check()
     M.ctx()                       gemeinsamer AudioContext (XIRU.audio) oder null
     M.noise(ctx, 'white'|'pink'|'brown')    nahtlos loopbarer Rausch-Puffer
     M.noiseSource(ctx, kind)      laufende, geloopte BufferSource
     M.impulse(ctx, sek, decay)    Impulsantwort für einen Hall
     M.copy(text, label)           in die Zwischenablage
     M.download(name, blob)        Datei lokal speichern
     M.load(key, def) / M.save(key, obj)    Spielstand (Präfix "mixer-")
     M.canvas(cv, onResize)        Canvas an CSS-Grösse anpassen (HiDPI)
     M.calm()                      Animationen reduziert?
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU;
    const M = X.Mixer = {};

    /* ── Farben aus CSS-Variablen ───────────────────────────────────────── */
    let probe = null;
    const colorCache = {};
    function parseColor(s) {
        let m = /rgba?\(([^)]+)\)/.exec(s);
        if (m) {
            const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
            return [p[0], p[1], p[2], p[3] == null || isNaN(p[3]) ? 1 : p[3]];
        }
        m = /color\(srgb\s+([^)]+)\)/.exec(s);
        if (m) {
            const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
            return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] == null || isNaN(p[3]) ? 1 : p[3]];
        }
        return [96, 165, 250, 1];
    }
    M.rgb = function (name) {
        if (colorCache[name]) return colorCache[name];
        if (!probe) {
            probe = document.createElement('span');
            probe.setAttribute('aria-hidden', 'true');
            probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
            document.body.appendChild(probe);
        }
        probe.style.color = '';
        probe.style.color = name.indexOf('--') === 0 ? 'var(' + name + ')' : name;
        return (colorCache[name] = parseColor(getComputedStyle(probe).color));
    };
    M.color = function (name, alpha) {
        const c = M.rgb(name);
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (alpha == null ? c[3] : alpha) + ')';
    };
    const themeFns = [];
    M.onTheme = fn => themeFns.push(fn);
    function themeChanged() {
        Object.keys(colorCache).forEach(k => delete colorCache[k]);
        themeFns.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    }
    X.on('setting', themeChanged);
    if (window.matchMedia) {
        const mq = matchMedia('(prefers-color-scheme: light)');
        if (mq.addEventListener) mq.addEventListener('change', themeChanged);
    }
    // Kristall-Effekte wie "retro" setzen data-theme kurz um
    if ('MutationObserver' in window) {
        new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    M.calm = () => X.setting('anim') === false || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ── Ton ─────────────────────────────────────────────────────────────── */
    M.soundOn = () => X.setting('sound') !== false;
    M.soundGate = function (sel) {
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        if (!el) return { check: () => M.soundOn() };
        el.classList.add('callout', 'callout--warning', 'mx-sound-off');
        el.setAttribute('role', 'status');
        el.innerHTML = '<div class="mx-sound-off__icon" aria-hidden="true">🔇</div><div><strong>Der Ton ist ausgeschaltet.</strong> ' +
            '<span class="muted">In deinen Einstellungen ist „Ton“ deaktiviert – darum bleibt es hier still.</span>' +
            '<div class="row mt-1"><button class="btn btn--sm btn--primary" type="button" data-sound-on>🔊 Ton einschalten</button>' +
            '<a class="btn btn--sm btn--ghost" href="' + X.url('konto/einstellungen.html') + '">Zu den Einstellungen</a></div></div>';
        const render = () => { el.hidden = M.soundOn(); };
        el.querySelector('[data-sound-on]').addEventListener('click', () => {
            X.setting('sound', true);
            X.toast('Ton ist wieder an', 'Viel Spass beim Mischen!', { icon: '🔊', time: 2500 });
        });
        X.on('setting', d => { if (d && d.key === 'sound') render(); });
        render();
        return {
            el,
            check() {
                if (M.soundOn()) return true;
                el.hidden = false;
                el.classList.remove('is-nudged'); void el.offsetWidth; el.classList.add('is-nudged');
                el.scrollIntoView({ behavior: M.calm() ? 'auto' : 'smooth', block: 'center' });
                return false;
            }
        };
    };
    M.ctx = function () {
        const c = X.audio();
        if (!c) X.toast('Kein Ton möglich', 'Dein Browser unterstützt kein Web Audio.', { type: 'error', icon: '⚠' });
        return c;
    };

    const noiseCache = new WeakMap();
    M.noise = function (ctx, kind) {
        kind = kind || 'white';
        let cache = noiseCache.get(ctx);
        if (!cache) { cache = {}; noiseCache.set(ctx, cache); }
        if (cache[kind]) return cache[kind];
        const sr = ctx.sampleRate, len = Math.round(sr * 4), fade = 2048;
        const buf = ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            const tmp = new Float32Array(len + fade);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
            for (let i = 0; i < tmp.length; i++) {
                const w = Math.random() * 2 - 1;
                if (kind === 'pink') {
                    b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852;
                    b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898;
                    tmp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926;
                } else if (kind === 'brown') {
                    last = (last + .02 * w) / 1.02; tmp[i] = last * 3.5;
                } else tmp[i] = w * .5;
            }
            for (let i = 0; i < len; i++) d[i] = tmp[i];
            // Anfang mit dem Überhang überblenden -> nahtlose Schleife
            for (let i = 0; i < fade; i++) { const k = i / fade; d[i] = tmp[i] * k + tmp[len + i] * (1 - k); }
        }
        cache[kind] = buf;
        return buf;
    };
    M.noiseSource = function (ctx, kind, when) {
        const s = ctx.createBufferSource();
        s.buffer = M.noise(ctx, kind); s.loop = true;
        s.start(when || ctx.currentTime, Math.random() * 3.5);
        return s;
    };
    M.impulse = function (ctx, seconds, decay) {
        const sr = ctx.sampleRate, len = Math.max(1, Math.round(sr * seconds));
        const buf = ctx.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay || 2.5);
        }
        return buf;
    };

    /* ── Zwischenablage & Dateien ────────────────────────────────────────── */
    M.copy = function (text, label) {
        const ok = () => X.toast('Kopiert', label || String(text).slice(0, 80), { icon: '📋', time: 2200 });
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
            document.body.appendChild(ta); ta.select();
            let done = false;
            try { done = document.execCommand('copy'); } catch (e) { done = false; }
            ta.remove();
            if (done) ok(); else X.toast('Kopieren klappt nicht', 'Markiere den Text und kopiere ihn von Hand.', { type: 'error', icon: '⚠' });
        };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
        else fallback();
    };
    M.download = function (name, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    /* ── Speicher ────────────────────────────────────────────────────────── */
    M.load = (key, def) => { const v = X.load('mixer-' + key); return v == null ? def : v; };
    M.save = (key, val) => X.save('mixer-' + key, val);

    /* ── Canvas ──────────────────────────────────────────────────────────── */
    M.canvas = function (cv, onResize) {
        cv = typeof cv === 'string' ? document.querySelector(cv) : cv;
        const ctx = cv.getContext('2d');
        const st = { cv, ctx, w: 0, h: 0, dpr: 1 };
        st.fit = function () {
            const r = cv.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
            if (w === st.w && h === st.h && dpr === st.dpr) return;
            st.w = w; st.h = h; st.dpr = dpr;
            cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (onResize) onResize(st);
        };
        // erste Anpassung: Callback erst, wenn der Aufrufer st schon kennt
        const first = onResize; onResize = null; st.fit(); onResize = first;
        if (onResize) Promise.resolve().then(() => onResize(st));
        if ('ResizeObserver' in window) new ResizeObserver(st.fit).observe(cv);
        else addEventListener('resize', st.fit);
        return st;
    };

    /* ── Schieberegler: Füllstand für .mx-range ──────────────────────────── */
    M.paintRange = function (el) {
        const min = +el.min || 0, max = el.max === '' ? 100 : +el.max, v = +el.value;
        el.style.setProperty('--p', ((v - min) / ((max - min) || 1) * 100).toFixed(1) + '%');
    };
    M.paintRanges = root => X.$$('input.mx-range', root).forEach(M.paintRange);
    document.addEventListener('input', e => { if (e.target && e.target.classList && e.target.classList.contains('mx-range')) M.paintRange(e.target); });

    /* ── Kleinkram ───────────────────────────────────────────────────────── */
    M.mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    M.lerp = (a, b, t) => a + (b - a) * t;
    M.isTyping = e => { const t = e.target; return !!(t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))); };
    M.isTextField = e => {
        const t = e.target;
        if (!t) return false;
        if (t.isContentEditable || /^(textarea|select)$/i.test(t.tagName)) return true;
        return /^input$/i.test(t.tagName) && !/^(range|checkbox|radio|color|button)$/i.test(t.type);
    };
})();
