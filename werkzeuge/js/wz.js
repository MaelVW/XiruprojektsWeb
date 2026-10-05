/* ==========================================================================
   Werkzeugkasten – kleine gemeinsame Helfer (nur für Seiten unter werkzeuge/)
     WZ.num(text)            "1’234,5" / "1.5" -> Zahl (oder NaN)
     WZ.fmt(zahl, stellen)   lesbare Zahl im Schweizer Format
     WZ.copy(text, knopf)    in die Zwischenablage (mit Rückmeldung am Knopf)
     WZ.download(name, text, mime)
     WZ.randInt(n)           gleichverteilte Zufallszahl 0..n-1 (crypto)
     WZ.shuffle(array)       Fisher-Yates mit crypto
     WZ.tabs(el, opts)       zugängliche Reiter (Pfeiltasten, #hash)
     WZ.typing(event)        tippt jemand gerade in ein Eingabefeld?
     WZ.debounce(fn, ms)
   ========================================================================== */
(function () {
    'use strict';
    const WZ = window.WZ = {};

    WZ.num = function (s) {
        if (typeof s === 'number') return s;
        s = String(s == null ? '' : s).trim().replace(/[\s’'`_]/g, '').replace(/−/g, '-');
        if (!s) return NaN;
        // "1,5" -> 1.5 ; "1.234,5" -> 1234.5 ; "1,234.5" -> 1234.5
        const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
        if (lastComma > -1 && lastDot > -1) {
            if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
            else s = s.replace(/,/g, '');
        } else if (lastComma > -1) {
            s = s.replace(',', '.');
        }
        if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
        return parseFloat(s);
    };

    const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    /* Zahl lesbar: grosse/kleine Werte als 1.23 × 10⁹, sonst bis zu `digits` signifikante Stellen */
    WZ.fmt = function (v, digits) {
        if (v == null || !isFinite(v)) return '–';
        if (v === 0) return '0';
        digits = digits || 6;
        const a = Math.abs(v);
        if (a >= 1e15 || a < 1e-6) {
            const e = Math.floor(Math.log10(a));
            let m = v / Math.pow(10, e);
            m = +m.toPrecision(Math.min(digits, 4));
            return m.toLocaleString('de-CH', { maximumFractionDigits: 3 }) + ' × 10' + String(e).split('').map(c => SUP[c]).join('');
        }
        const intDigits = Math.max(1, Math.floor(Math.log10(a)) + 1);
        const frac = Math.max(0, Math.min(10, digits - intDigits));
        return v.toLocaleString('de-CH', { maximumFractionDigits: frac });
    };
    /* feste Nachkommastellen, z. B. Geld */
    WZ.fix = (v, d) => isFinite(v) ? Number(v).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–';

    WZ.copy = function (text, btn) {
        const done = ok => {
            if (!btn) return;
            const old = btn.getAttribute('data-label') || btn.innerHTML;
            btn.setAttribute('data-label', old);
            btn.innerHTML = ok ? '✓ Kopiert' : '✗ Nicht möglich';
            btn.classList.add('wz-pop');
            clearTimeout(btn._wzT);
            btn._wzT = setTimeout(() => { btn.innerHTML = old; btn.classList.remove('wz-pop'); }, 1400);
        };
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            ta.remove(); done(ok);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => done(true), fallback);
        } else fallback();
    };

    WZ.download = function (name, text, mime) {
        const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };

    /* Gleichverteilt dank Verwerfungsmethode – kein Modulo-Bias */
    WZ.randInt = function (n) {
        n = Math.floor(n);
        if (!(n > 0)) return 0;
        if (n > 4294967296) throw new Error('Bereich zu gross');
        const buf = new Uint32Array(1);
        const limit = 4294967296 - (4294967296 % n);
        let x;
        do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
        return x % n;
    };
    WZ.shuffle = function (arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = WZ.randInt(i + 1);
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    };

    /* Reiter: <div class="tabs wz-tabs" role="tablist"><button data-tab="x">…</button></div>
       Panels: <section id="tab-x" class="wz-panel">                                     */
    WZ.tabs = function (el, opts) {
        opts = opts || {};
        const btns = Array.from(el.querySelectorAll('[data-tab]'));
        el.setAttribute('role', 'tablist');
        btns.forEach(b => {
            const id = b.getAttribute('data-tab');
            const panel = document.getElementById('tab-' + id);
            b.setAttribute('role', 'tab'); b.type = 'button';
            b.id = b.id || 'tabbtn-' + id;
            b.setAttribute('aria-controls', 'tab-' + id);
            if (panel) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', b.id); panel.tabIndex = -1; }
        });
        function select(id, focus, fromHash) {
            const b = btns.find(x => x.getAttribute('data-tab') === id) || btns[0];
            id = b.getAttribute('data-tab');
            btns.forEach(x => {
                const on = x === b;
                x.setAttribute('aria-selected', on ? 'true' : 'false');
                x.tabIndex = on ? 0 : -1;
                const p = document.getElementById('tab-' + x.getAttribute('data-tab'));
                if (p) p.hidden = !on;
            });
            if (focus) b.focus();
            if (opts.hash !== false && !fromHash) { try { history.replaceState(null, '', '#' + id); } catch (e) { } }
            if (opts.onChange) opts.onChange(id);
            return id;
        }
        btns.forEach((b, i) => {
            b.addEventListener('click', () => select(b.getAttribute('data-tab')));
            b.addEventListener('keydown', e => {
                let j = null;
                if (e.key === 'ArrowRight') j = (i + 1) % btns.length;
                else if (e.key === 'ArrowLeft') j = (i - 1 + btns.length) % btns.length;
                else if (e.key === 'Home') j = 0;
                else if (e.key === 'End') j = btns.length - 1;
                if (j != null) { e.preventDefault(); select(btns[j].getAttribute('data-tab'), true); }
            });
        });
        const fromHash = (location.hash || '').slice(1);
        const start = btns.some(b => b.getAttribute('data-tab') === fromHash) ? fromHash : (opts.start || btns[0].getAttribute('data-tab'));
        select(start, false, true);
        return { select };
    };

    WZ.typing = e => {
        const t = e && e.target;
        return !!(t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName)));
    };
    WZ.debounce = function (fn, ms) {
        let t;
        return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(() => fn.apply(s, a), ms); };
    };
    WZ.css = function (name, el) {
        return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();
    };
    /* Farbvariable als fertige rgb()-Farbe (löst var() und color-mix() auf – für Canvas) */
    let probe = null;
    WZ.color = function (name) {
        if (!probe) { probe = document.createElement('span'); probe.style.display = 'none'; document.body.appendChild(probe); }
        probe.style.color = '';
        probe.style.color = 'var(' + name + ')';
        return getComputedStyle(probe).color || '#888';
    };
})();
