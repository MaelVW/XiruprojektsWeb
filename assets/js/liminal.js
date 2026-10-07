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
    // Nur wer durch einen offenen Riss gekommen ist, darf hier sein (siehe X.riss in core.js)
    if (!X.riss.open()) { location.replace(X.url('index.html')); return; }
    // Geräusche (Brummen, Klopfen, Schritte …) – Schichten je Raum über <body data-lm-ton="…">
    { const t = document.createElement('script'); t.src = X.url('assets/js/liminal-ton.js'); document.head.appendChild(t); }
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
        // Die vier jagen dich: zählt die Räume seit Why.html, mit jedem Raum kommen sie näher
        const path = location.pathname.toLowerCase();
        if (/\/why\.html$/.test(path)) X.save('why-folgt', 0);
        else if (!document.body.classList.contains('lm-drift') && !/(weiter|erlebt)\.html$/.test(path)) {
            const rooms = (X.load('why-folgt', 0) || 0) + 1;
            X.save('why-folgt', rooms);
            const FOLLOW = ['Hinter dir ist eine Tür ins Schloss gefallen.', 'Irgendwo lacht jemand. Dann noch jemand.',
                'Sie sind zu viert. Sie rennen nie gleichzeitig.', 'Ein Messer schleift an der Wand entlang.', 'Sie haben deine Spur.',
                'Einer von ihnen ist zwei Räume hinter dir.', 'Einer ist im Raum nebenan.'];
            const f = document.createElement('p');
            f.className = 'lm-follow';
            f.textContent = rooms <= FOLLOW.length ? FOLLOW[rooms - 1] : X.pick(['Versteck dich.', 'Nicht atmen.', 'Eine Maske grinst in der Tür.', 'Über dir bewegt sich etwas mit zu vielen Beinen.']);
            document.body.appendChild(f);
            setTimeout(() => f.classList.add('is-on'), 2500);
        }
        // Spinnenbeine (<body data-lm-beine="2">) und gekritzelte Spinnen (<span data-lm-spinne="12">) aus why/liminal-art.js
        if (document.body.hasAttribute('data-lm-beine') || document.querySelector('[data-lm-spinne]')) {
            const art = () => {
                if (document.body.hasAttribute('data-lm-beine')) LM_ART.legs(+document.body.getAttribute('data-lm-beine') || 1);
                X.$$('[data-lm-spinne]').forEach(el => LM_ART.spider(el));
            };
            if (window.LM_ART) art();
            else { const s = document.createElement('script'); s.src = X.url('why/liminal-art.js'); s.onload = art; document.head.appendChild(s); }
        }
        const back = document.querySelector('[data-lm-back]');
        // Weiter-Knopf: meistens tiefer hinein, manchmal passiert nichts, manchmal geht es doch zurück.
        // Chancen am zurück-Link: data-lm-weiter="weiter nichts zurück" (in %), je nach Stimmung des Raums
        if (back && back.getAttribute('data-lm-next')) {
            const odds = (back.getAttribute('data-lm-weiter') || '80 10 10').split(/\s+/).map(Number);
            const fwd = document.createElement('a');
            fwd.className = 'lm-forward'; fwd.href = '#'; fwd.textContent = 'weiter';
            document.body.appendChild(fwd);
            fwd.addEventListener('click', function (event) {
                event.preventDefault();
                const destinations = back.getAttribute('data-lm-next').split('|').filter(Boolean);
                const r = Math.random() * (odds[0] + odds[1] + odds[2]);
                if (r < odds[0]) location.href = X.pick(destinations);
                else if (r >= odds[0] + odds[1]) location.href = back.getAttribute('href');
                // sonst: nichts. Gar nichts.
            });
        }
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
    });
})();
