/* ==========================================================================
   Liminal – kleine Unsicherheiten. Nach core.js laden.
   <span class="lm-text" data-v="Normaler Text|seltene Variante|noch seltener">Normaler Text</span>
     * Bei jedem Besuch kann eine leicht andere Variante erscheinen (die erste ist die häufigste).
     * Der Text treibt kaum merklich hin und her.
     * Schaust du weg (Tab gewechselt, Maus verlässt das Fenster), ist kurz ein Buchstabe anders.
     * Am Rand erscheinen manchmal Wörter, die sofort wieder weg sind.
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU;
    const pagePath = location.pathname.toLowerCase();
    if (X.load('why-abdrift-locked', false) === true) {
        if (pagePath.includes('/why/') || /\/why\.html$/.test(pagePath)) {
            location.replace(/\/why\//.test(pagePath) ? '../index.html' : 'index.html');
            return;
        }
    }
    const visits = (X.load('liminal-besuche', 0) || 0) + 1;
    X.save('liminal-besuche', visits);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1 · Variante je Besuch: meistens das Original, manchmal nicht
    function pickVariant(el) {
        const v = (el.getAttribute('data-v') || '').split('|').filter(Boolean);
        if (v.length < 2) return;
        el.dataset.base = v[0];
        const roll = Math.random();
        const idx = visits < 2 ? 0 : roll < .72 ? 0 : 1 + Math.floor(Math.random() * (v.length - 1));
        el.textContent = v[idx];
    }

    // 2 · Treiben
    function drift(el) {
        if (calm) return;
        const go = () => {
            el.style.setProperty('--dx', rnd(-5, 5).toFixed(1) + 'px');
            el.style.setProperty('--dy', rnd(-3, 3).toFixed(1) + 'px');
            el.style.letterSpacing = rnd(.12, .19).toFixed(3) + 'em';
            setTimeout(go, rnd(6000, 11000));
        };
        setTimeout(go, rnd(500, 3000));
    }

    // 3 · Weggeschaut? Ein Buchstabe ist anders – aber nur ganz kurz
    const SWAP = { a: 'ä', e: 'ë', o: '0', i: '1', s: '5', u: 'v', n: 'm', r: 'n', t: '†', E: 'Ǝ', W: 'VV', L: 'ꓡ' };
    function glitchOnce() {
        const els = X.$$('.lm-text');
        if (!els.length) return;
        const el = X.pick(els), txt = el.textContent, chars = txt.split('');
        const pos = chars.map((c, i) => SWAP[c] ? i : -1).filter(i => i >= 0);
        if (!pos.length) return;
        const i = X.pick(pos);
        chars[i] = SWAP[chars[i]];
        el.textContent = chars.join('');
        setTimeout(() => { el.textContent = txt; }, rnd(700, 1600));
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(glitchOnce, 60); });
    document.addEventListener('mouseleave', () => setTimeout(glitchOnce, 300));

    // 4 · Etwas am Rand
    const GHOSTS = ['hier', 'du', 'bleib', 'warum', 'wir', 'noch da?', 'zurück', '…'];
    function ghost() {
        if (!calm && document.body && !document.hidden) {
            const g = document.createElement('div');
            g.className = 'lm-ghost'; g.textContent = X.pick(GHOSTS);
            const edge = Math.floor(Math.random() * 4);
            g.style.left = (edge === 1 ? 92 : edge === 3 ? 3 : rnd(5, 90)) + 'vw';
            g.style.top = (edge === 0 ? 3 : edge === 2 ? 94 : rnd(8, 88)) + 'vh';
            document.body.appendChild(g);
            requestAnimationFrame(() => { g.style.opacity = '.09'; });
            setTimeout(() => { g.style.opacity = '0'; }, 280);
            setTimeout(() => g.remove(), 900);
        }
        setTimeout(ghost, rnd(18000, 42000));
    }

    // 5 · Wer lange still hält, liest plötzlich etwas anderes
    let idleT;
    function idle() {
        clearTimeout(idleT);
        X.$$('.lm-text[data-idle]').forEach(el => { if (el.dataset.idleOn) { el.textContent = el.dataset.idleBack; delete el.dataset.idleOn; } });
        idleT = setTimeout(() => {
            X.$$('.lm-text[data-idle]').forEach(el => { el.dataset.idleBack = el.textContent; el.dataset.idleOn = '1'; el.style.opacity = '.0'; setTimeout(() => { el.textContent = el.dataset.idle; el.style.opacity = ''; }, 1200); });
        }, 30000);
    }
    ['pointermove', 'keydown', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, idle, { passive: true }));

    X.ready(function () {
        X.typedEggs = false;
        X.$$('.lm-text').forEach(el => { pickVariant(el); drift(el); });
        setTimeout(ghost, rnd(9000, 20000));
        idle();
        if (/\/why\.html$/i.test(location.pathname)) X.save('why-back-clicks', 0);
        const back = document.querySelector('[data-lm-back]');
        if (back) {
            back.addEventListener('click', function (event) {
                const destinations = (back.getAttribute('data-lm-next') || '').split('|').filter(Boolean);
                if (!destinations.length) return;
                const clicks = (X.load('why-back-clicks', 0) || 0) + 1;
                X.save('why-back-clicks', clicks);
                const chance = clicks === 1 ? .33 : .66;
                if (Math.random() < chance) {
                    event.preventDefault();
                    location.href = X.pick(destinations);
                }
            });
        }
        // Wer alle drei Antworten gegeben hat …
        const page = (X.page && X.page.p) || '';
        const seen = X.load('why-gesehen', {}) || {};
        if (/^why\//.test(page)) { seen[page] = 1; X.save('why-gesehen', seen); }
        if (['why/neugier.html', 'why/testen.html', 'why/unbekannt.html'].every(p => seen[p])) X.egg('h-why-alle');
    });
})();
