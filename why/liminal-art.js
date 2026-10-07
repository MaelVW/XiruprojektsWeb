/* ==========================================================================
   Liminal – Illustrationen: Risse im Putz, eingeritzte Strichlisten, Handabdruck mit Messer,
   alte Generator-Anzeige für den Skillcheck. Alles entsteht als SVG und sieht bei jedem
   Besuch ein wenig anders aus. Nach core.js laden; Funktionen hängen an window.LM_ART.
   ========================================================================== */
(function () {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg';
    const rnd = Math.random;
    const R = (a, b) => a + rnd() * (b - a);
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-anim');
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
    const f1 = n => Math.round(n * 10) / 10;
    const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

    // Fläche um eine Linie mit wechselnder Breite – Grundlage für Risse, Kratzer und Striche
    function ribbon(pts, widthAt) {
        const left = [], right = [];
        for (let i = 0; i < pts.length; i++) {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
            let nx = a[1] - b[1], ny = b[0] - a[0];
            const len = Math.hypot(nx, ny) || 1, w = widthAt(i) / 2;
            nx /= len; ny /= len;
            left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
            right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
        }
        return 'M' + left.concat(right.reverse()).map(q => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z';
    }
    // Unregelmässiges Vieleck (Putzbrocken, Splitter)
    function chip(cx, cy, r) {
        const n = 5 + Math.floor(rnd() * 3), pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R(-.3, .3), rr = r * R(.45, 1); pts.push(f1(cx + Math.cos(a) * rr) + ' ' + f1(cy + Math.sin(a) * rr)); }
        return 'M' + pts.join('L') + 'Z';
    }
    // Ein von Hand gezogener Strich: leicht gebogen, Druck in der Mitte, dünne Enden
    function roughStroke(x1, y1, x2, y2, w) {
        const pts = [], ws = [], n = 10, bow = R(-1.2, 1.2), len = Math.hypot(x2 - x1, y2 - y1);
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        for (let i = 0; i <= n; i++) {
            const t = i / n, off = bow * Math.sin(Math.PI * t) + R(-.25, .25);
            pts.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off]);
            ws.push(w * (.35 + .65 * Math.sin(Math.PI * Math.min(1, t * 1.25 + .08))) * R(.82, 1.12));
        }
        return ribbon(pts, i => ws[i]);
    }

    /* ── Risse im Putz, die langsam und ruckartig wachsen ───────────────── */
    function cracks(svg, opts) {
        if (!svg) return;
        opts = Object.assign({ count: 4, pace: 1, delay: .8 }, opts || {});
        const W = innerWidth, H = innerHeight;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.replaceChildren();
        const stains = el('g', {}, svg), shade = el('g', {}, svg), light = el('g', { transform: 'translate(1.1 1.3)' }, svg), core = el('g', {}, svg), bits = el('g', {}, svg);
        const list = [];
        function grow(x, y, ang, len, w, depth, t0, dur) {
            const pts = [[x, y]], acc = [0], jit = [1];
            let a = ang, total = 0;
            while (total < len) {
                a += R(-.6, .6); a += (ang - a) * .32;
                const s = R(4, 13);
                x += Math.cos(a) * s; y += Math.sin(a) * s; total += s;
                pts.push([x, y]); acc.push(total); jit.push(R(.55, 1.3));
            }
            const c = { pts, acc, jit, w, depth, t0, dur, len: total, nodes: [], chips: [] };
            c.nodes = depth < 2 ? [el('path', { fill: 'rgba(0,0,0,.2)' }, shade), el('path', { fill: 'rgba(226,218,196,.2)' }, light), el('path', { fill: '#0b0a08' }, core)]
                : [null, el('path', { fill: 'rgba(226,218,196,.14)' }, light), el('path', { fill: '#0d0c0a', opacity: .85 }, core)];
            list.push(c);
            for (let i = 3; i < pts.length - 3; i++) {
                const along = acc[i] / total;
                // Abgeplatzter Putz entlang der Hauptrisse
                if (depth === 0 && rnd() < .07) {
                    const side = rnd() < .5 ? -1 : 1, r = R(2, 6.5) * (1 - along * .6);
                    const p = el('path', { d: chip(pts[i][0] + side * R(1, 5), pts[i][1] + side * R(1, 5), r), fill: rnd() < .6 ? 'rgba(198,190,166,.36)' : 'rgba(14,12,10,.4)', stroke: 'rgba(8,7,6,.45)', 'stroke-width': .6, opacity: 0 }, bits);
                    c.chips.push({ at: acc[i], node: p });
                }
                // Verzweigungen
                if (depth < 2 && rnd() < (depth ? .05 : .085)) {
                    const dir = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), side = rnd() < .5 ? -1 : 1;
                    const sub = (total - acc[i]) * R(.25, .65);
                    grow(pts[i][0], pts[i][1], dir + side * R(.45, 1.15), sub, w * (1 - along * .7) * R(.4, .65), depth + 1, t0 + dur * along, dur * sub / total * R(.7, 1.1));
                }
            }
            return c;
        }
        const minS = Math.min(W, H);
        for (let k = 0; k < opts.count; k++) {
            // Start an einem Rand, Richtung grob ins Zimmer hinein
            const edge = Math.floor(rnd() * 4);
            const x = edge === 1 ? W + 4 : edge === 3 ? -4 : R(.05, .95) * W, y = edge === 0 ? -4 : edge === 2 ? H + 4 : R(.05, .95) * H;
            const ang = Math.atan2(H * R(.3, .7) - y, W * R(.3, .7) - x) + R(-.5, .5), len = minS * R(.35, .62);
            const t0 = opts.delay + k * R(.4, 1.8) / opts.pace;
            grow(x, y, ang, len, R(2.2, 3.8), 0, t0, len / R(38, 70) / opts.pace);
            // Feuchter, dunkler Hof am Ursprung
            el('ellipse', { cx: f1(x), cy: f1(y), rx: f1(R(40, 110)), ry: f1(R(30, 90)), fill: 'url(#lmStain)', opacity: R(.35, .7) }, stains);
        }
        const defs = el('defs', {}, svg);
        const g = el('radialGradient', { id: 'lmStain' }, defs);
        el('stop', { offset: '0', 'stop-color': '#1c160e', 'stop-opacity': '.45' }, g); el('stop', { offset: '1', 'stop-color': '#1c160e', 'stop-opacity': '0' }, g);

        // Ruckartiges Wachstum: kurze Sprünge, dann Stille („knack … knack")
        const steps = 9;
        const jerk = u => u >= 1 ? 1 : u <= 0 ? 0 : (Math.floor(u * steps) + Math.min(1, (u * steps % 1) / .18)) / steps;
        function draw(c, L) {
            if (L <= 0) { c.nodes.forEach(n => n && n.setAttribute('d', '')); return; }
            let k = 1; while (k < c.pts.length && c.acc[k] <= L) k++;
            const pts = c.pts.slice(0, k);
            if (k < c.pts.length) { const a = c.pts[k - 1], b = c.pts[k], t = (L - c.acc[k - 1]) / (c.acc[k] - c.acc[k - 1]); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
            const wAt = (i, f) => { const s = Math.min(L, c.acc[i] === undefined ? L : c.acc[i]); return c.w * f * (1 - s / c.len * .78) * (c.jit[i] || 1) * Math.min(1, (L - s) / 22 + .08); };
            if (c.nodes[0]) c.nodes[0].setAttribute('d', ribbon(pts, i => wAt(i, 3.4)));
            c.nodes[1].setAttribute('d', ribbon(pts, i => wAt(i, .8)));
            c.nodes[2].setAttribute('d', ribbon(pts, i => wAt(i, 1)));
            c.chips.forEach(ch => { if (ch.at < L) ch.node.setAttribute('opacity', 1); });
        }
        if (calm()) { list.forEach(c => draw(c, c.len)); return; }
        const start = performance.now();
        (function frame(now) {
            const t = (now - start) / 1000;
            let busy = false;
            list.forEach(c => {
                const u = (t - c.t0) / c.dur; if (u < 1) busy = true;
                if (u > 0 && !c.done) {
                    draw(c, c.len * jerk(u)); if (u >= 1) c.done = true;
                    const step = Math.floor(Math.min(u, .999) * steps);   // jeder Ruck knackt (liminal-ton.js)
                    if (step !== c.step) { c.step = step; if (window.LM_TON) LM_TON.crack(c.depth); }
                }
            });
            if (busy) requestAnimationFrame(frame);
        })(start);
    }

    /* ── Fünf Striche ───────────────────────────────────────────────────── */
    // look: 'carved' (in die Wand geritzt) oder 'blood' (mit Blut gezogen, verschmiert)
    function tallyGroup(svg, look) {
        svg.setAttribute('viewBox', '0 0 46 50');
        svg.replaceChildren();
        const lines = [];
        for (let i = 0; i < 4; i++) {
            const x = 8 + i * 8.6 + R(-1, 1), lean = R(-2.2, 2.2);
            lines.push([x - lean / 2, R(5, 9), x + lean / 2, R(38, 43), 'v']);
        }
        lines.push([R(1, 4), R(34, 40), R(41, 45), R(8, 14), 'd']);
        const strokes = lines.map(l => {
            const g = el('g', { class: 'lm-stroke lm-stroke--' + l[4] }, svg);
            const d = roughStroke(l[0], l[1], l[2], l[3], look === 'blood' ? R(3, 4.2) : R(2.1, 2.9));
            if (look === 'blood') {
                el('path', { d, fill: '#420c09', opacity: .35, transform: 'translate(' + f1(R(-1, 1)) + ' ' + f1(R(4, 9)) + ') scale(1 1.05)', class: 'lm-smear' }, g);
                el('path', { d, fill: '#440d0a' }, g);
                if (rnd() < .6) el('path', { d: roughStroke(l[2] + R(-1, 1), l[3], l[2] + R(-1.5, 1.5), l[3] + R(6, 16), 1.4), fill: '#380a08' }, g);
            } else {
                el('path', { d, fill: 'rgba(238,233,206,.35)', transform: 'translate(.7 .8)' }, g);
                el('path', { d, fill: '#16170f' }, g);
            }
            return g;
        });
        return {
            set(n, animate) {
                strokes.forEach((s, i) => {
                    const on = i < n, was = s.classList.contains('is-on');
                    s.classList.toggle('is-on', on);
                    if (on && !was && animate && !calm()) { s.classList.remove('is-new'); void s.getBoundingClientRect(); s.classList.add('is-new'); }
                });
            }
        };
    }
    function tallies(box, groups, look) {
        box.replaceChildren();
        const list = [];
        for (let i = 0; i < groups; i++) list.push(tallyGroup(el('svg', { class: 'lm-tally', 'aria-hidden': 'true' }, box), look));
        return {
            // phase = abgeschlossene Gruppen, hits = Striche in der aktuellen Gruppe
            set(phase, hits, animate) { list.forEach((t, i) => t.set(i < phase ? 5 : i === phase ? hits : 0, animate)); }
        };
    }

    /* ── Handabdruck, Messer im Putz, verwischte Striche ────────────────── */
    function mark(svg) {
        if (!svg) return;
        svg.setAttribute('viewBox', '0 0 330 430');
        svg.innerHTML =
            '<defs>' +
            '<filter id="lmBlood" x="-20%" y="-20%" width="140%" height="140%">' +
            '<feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="' + Math.floor(R(1, 99)) + '" result="warp"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="warp" scale="9" xChannelSelector="R" yChannelSelector="G" result="shape"/>' +
            '<feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="4" seed="' + Math.floor(R(1, 99)) + '" result="blot"/>' +
            '<feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -.5" result="blotA"/>' +
            '<feComposite in="shape" in2="blotA" operator="in" result="tex"/>' +
            '<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="' + Math.floor(R(1, 99)) + '" result="fine"/>' +
            '<feColorMatrix in="fine" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.3 0 0 0 .2" result="fineA"/>' +
            '<feComposite in="tex" in2="fineA" operator="in" result="tex2"/>' +
            '<feMorphology in="tex" operator="erode" radius="1" result="core"/>' +
            '<feComposite in="tex" in2="core" operator="out" result="rim"/>' +
            '<feFlood flood-color="#1c0504" flood-opacity=".35"/><feComposite in2="rim" operator="in" result="rimC"/>' +
            '<feMerge><feMergeNode in="tex2"/><feMergeNode in="rimC"/></feMerge></filter>' +
            '<filter id="lmSoftM" filterUnits="userSpaceOnUse" x="0" y="0" width="330" height="430"><feGaussianBlur stdDeviation="3.5"/></filter>' +
            '<filter id="lmSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>' +
            '<mask id="lmPrintMask" maskUnits="userSpaceOnUse" x="0" y="0" width="330" height="430"><rect width="330" height="430" fill="#fff"/>' +
            '<g id="lmGaps" fill="#000" filter="url(#lmSoftM)"></g>' +
            '<g id="lmCreases" stroke="#000" stroke-width="1.5" stroke-linecap="round" opacity=".8"></g></mask>' +
            '<filter id="lmStreak" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".45 .011" numOctaves="2" seed="' + Math.floor(R(1, 99)) + '"/>' +
            '<feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.6 0 0 0 -.62"/></filter>' +
            '<mask id="lmStreakMask" maskUnits="userSpaceOnUse" x="0" y="0" width="330" height="430"><rect width="330" height="430" filter="url(#lmStreak)"/></mask>' +
            '<linearGradient id="lmSmearG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0b08" stop-opacity=".9"/><stop offset=".5" stop-color="#320a07" stop-opacity=".5"/><stop offset="1" stop-color="#2a0806" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="lmSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bdbab0"/><stop offset=".45" stop-color="#8e8b82"/><stop offset=".55" stop-color="#66645d"/><stop offset="1" stop-color="#3b3a35"/></linearGradient>' +
            '<linearGradient id="lmEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d5b55"/><stop offset="1" stop-color="#e4e2da"/></linearGradient>' +
            '<linearGradient id="lmWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2e1c"/><stop offset=".5" stop-color="#2a190e"/><stop offset="1" stop-color="#140c06"/></linearGradient>' +
            '<radialGradient id="lmRivet"><stop offset="0" stop-color="#e8e2cf"/><stop offset=".6" stop-color="#8d8571"/><stop offset="1" stop-color="#3a352a"/></radialGradient>' +
            '</defs>' +
            '<g class="lm-mark__print" filter="url(#lmBlood)" opacity=".93"><g id="lmSmear" mask="url(#lmStreakMask)"></g><g mask="url(#lmPrintMask)" id="lmHand" fill="#3c0b08"></g></g>' +
            '<g id="lmDrips" fill="#350907" opacity=".9"></g>' +
            '<g id="lmTallyWall" transform="translate(22 30) scale(1.25) rotate(-4)"></g>' +
            '<g id="lmKnife"></g>';
        const hand = svg.querySelector('#lmHand'), creases = svg.querySelector('#lmCreases'), gaps = svg.querySelector('#lmGaps');
        const drips = svg.querySelector('#lmDrips'), smear = svg.querySelector('#lmSmear');
        // Finger: unten breiter, zur Kuppe schmaler und oval
        const finger = (len, wb, wt) => 'M' + f1(-wb / 2) + ' 12Q' + f1(-wb / 2 - 1.5) + ' ' + f1(-len * .45) + ' ' + f1(-wt / 2) + ' ' + f1(-len + wt * .55) +
            'A' + f1(wt / 2) + ' ' + f1(wt * .6) + ' 0 0 1 ' + f1(wt / 2) + ' ' + f1(-len + wt * .55) + 'Q' + f1(wb / 2 + 1.5) + ' ' + f1(-len * .45) + ' ' + f1(wb / 2) + ' 12Z';
        // Handballen + fünf Finger (Grundpunkt, Winkel, Länge, Breite unten, Breite Kuppe)
        el('path', { d: 'M104 188 Q146 172 194 192 Q205 236 191 278 Q172 305 141 305 Q107 300 97 268 Q89 236 104 188Z' }, hand);
        [[113, 188, -13, 80, 23, 19], [138, 182, -3, 90, 24, 20], [162, 186, 7, 82, 23, 19], [183, 198, 19, 62, 20, 16], [100, 246, -55, 62, 27, 22]].forEach(f => {
            const [bx, by, a, len, wb, wt] = f, tr = 'translate(' + bx + ' ' + by + ') rotate(' + a + ')';
            el('path', { d: finger(len, wb, wt), transform: tr }, hand);
            // Fingerfalten bleiben beim Abdruck hell
            [.36, .64].forEach(p => { if (rnd() < .7) el('line', { x1: f1(-wb / 2 + R(3, 6)), x2: f1(wb / 2 - R(3, 6)), y1: f1(-len * p + R(-2, 2)), y2: f1(-len * p + R(-2, 2)), transform: tr }, creases); });
        });
        // Die hohle Handfläche und Stellen ohne Blut
        [[146, 250, 22, 17, .55], [137, 259, 12, 9, .35], [157, 242, 10, 9, .35], [129, 268, 8, 6, .3]].forEach(([x, y, rx, ry, o]) => el('ellipse', { cx: x, cy: y, rx, ry, opacity: o }, gaps));
        for (let k = 0; k < 12; k++) el('ellipse', { cx: f1(R(96, 202)), cy: f1(R(100, 300)), rx: f1(R(4, 13)), ry: f1(R(3, 10)), opacity: f1(R(.3, .85)) }, gaps);
        // Die Hand ist an der Wand heruntergerutscht: eine breite, streifige Spur
        const top = 262, len = R(90, 135);
        let d = 'M100 ' + top;
        for (let i = 1; i <= 5; i++) d += 'L' + f1(100 + i * 1.4 + R(-2, 2)) + ' ' + f1(top + i / 5 * len * .8);
        for (let i = 0; i <= 8; i++) d += 'L' + f1(108 + i * 10.5 + R(-2, 2)) + ' ' + f1(top + len * R(.55, 1));
        for (let i = 4; i >= 0; i--) d += 'L' + f1(194 - i * 1.6 + R(-2, 2)) + ' ' + f1(top + i / 5 * len * .7);
        el('path', { d: d + 'Z', fill: 'url(#lmSmearG)' }, smear);
        // Ein paar Tropfen laufen weiter nach unten
        for (let k = 0; k < 5; k++) {
            const x = R(108, 188), y0 = R(296, 330), dl = R(28, 105), w = R(1.3, 2.5), pts = [];
            for (let i = 0; i <= 10; i++) pts.push([x + Math.sin(i * .9 + x) * .7, y0 + i / 10 * dl]);
            el('path', { d: ribbon(pts, i => w * (i < 9 ? R(.75, 1) : 1.3)) }, drips);
            el('ellipse', { cx: f1(x), cy: f1(y0 + dl + 1), rx: f1(w * .95), ry: f1(w * 1.3) }, drips);
        }
        // Verwischte Strichliste mit Blut an der Wand
        const tw = svg.querySelector('#lmTallyWall'); tw.setAttribute('filter', 'url(#lmBlood)');
        const tsvg = el('svg', { width: 46, height: 50, overflow: 'visible' }, tw);
        tallyGroup(tsvg, 'blood').set(5, false);

        // Messer: Spitze steckt im Putz, Griff ragt schräg heraus (lokal: Spitze bei 0, Griff Richtung +x)
        const kn = svg.querySelector('#lmKnife'), ex = 158, ey = 226, ang = -36;
        const entry = el('g', { transform: 'translate(' + ex + ' ' + ey + ')' }, kn);
        for (let i = 0; i < 7; i++) {   // Haarrisse um die Einstichstelle
            const a = i / 7 * Math.PI * 2 + R(-.3, .3), len = R(10, 26), pts = [[0, 0]];
            for (let s = 1; s <= 5; s++) pts.push([Math.cos(a) * len * s / 5 + R(-1.2, 1.2), Math.sin(a) * len * s / 5 + R(-1.2, 1.2)]);
            el('path', { d: ribbon(pts, j => 1.6 * (1 - j / 6)), fill: '#0b0a08', opacity: .8 }, entry);
        }
        for (let i = 0; i < 5; i++) el('path', { d: chip(R(-9, 9), R(-9, 9), R(2, 4.5)), fill: 'rgba(196,188,164,.5)', stroke: 'rgba(10,9,8,.5)', 'stroke-width': .6 }, entry);
        const local = 'translate(' + ex + ' ' + ey + ') rotate(' + ang + ')';
        const blade = 'M0 -6 L86 -8.5 L86 8.5 Q50 10 0 6.5Z';
        const handle = 'M95 -9.5 L166 -10.5 Q172 -10 172 0 Q172 10 166 10.5 L148 10.5 Q143 13 138 10.5 L128 10.5 Q123 13 118 10.5 L108 10.5 Q103 13 98 10.5 L95 9.5Z';
        const shadow = el('g', { transform: local, opacity: .55 }, kn);
        el('g', { transform: 'matrix(1 .17 0 1 0 0)', filter: 'url(#lmSoft)', fill: '#0a0907' }, shadow).innerHTML = '<path d="' + blade + '"/><rect x="86" y="-15" width="9" height="30" rx="2"/><path d="' + handle + '"/>';
        const k = el('g', { transform: local }, kn);
        k.innerHTML =
            '<ellipse cx="0" cy="0" rx="2.6" ry="7.5" fill="#050403"/>' +
            '<path d="' + blade + '" fill="url(#lmSteel)" stroke="#2a2925" stroke-width=".8"/>' +
            '<path d="M0 2.6 L86 3.4 L86 8.5 Q50 10 0 6.5Z" fill="url(#lmEdge)" opacity=".75"/>' +
            '<path d="M14 -2.4 L72 -3.6" stroke="#5a5852" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>' +
            '<path d="M14 -1.3 L72 -2.4" stroke="#f2f0e8" stroke-width=".6" stroke-linecap="round" opacity=".55"/>' +
            '<path d="M0 -5 Q12 -7 22 -3 Q34 1 40 6 Q24 8 10 7 Q2 6.5 0 6Z" fill="#3e0b08" opacity=".9" filter="url(#lmBlood)"/>' +
            '<path d="M30 -6 Q38 -4 44 -7" stroke="#4a0e0b" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>' +
            '<rect x="86" y="-15" width="9" height="30" rx="2" fill="#3a3832" stroke="#151411" stroke-width=".8"/>' +
            '<rect x="87.5" y="-13.5" width="2" height="27" fill="#8c8a82" opacity=".6"/>' +
            '<path d="' + handle + '" fill="url(#lmWood)" stroke="#0d0805" stroke-width=".9"/>' +
            '<path d="M100 -5 Q130 -7 165 -5 M102 3 Q132 1 166 3" stroke="#6b4a32" stroke-width=".6" fill="none" opacity=".45"/>' +
            [110, 134, 156].map(x => '<circle cx="' + x + '" cy="0" r="2.7" fill="url(#lmRivet)" stroke="#1b170f" stroke-width=".5"/>').join('');
    }

    /* ── Generator-Anzeige (Skillcheck) ─────────────────────────────────── */
    function meter(box) {
        const cx = 120, cy = 132, pos = p => Math.PI + p / 100 * Math.PI;
        box.innerHTML =
            '<svg viewBox="0 0 240 160" class="lm-meter__svg">' +
            '<defs>' +
            '<linearGradient id="lmBake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#36342c"/><stop offset="1" stop-color="#16150f"/></linearGradient>' +
            '<radialGradient id="lmFace" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#c9bd95"/><stop offset=".7" stop-color="#ab9e74"/><stop offset="1" stop-color="#7b6f49"/></radialGradient>' +
            '<linearGradient id="lmGlass" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".4" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<filter id="lmGrime" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".05 .09" numOctaves="4" seed="' + Math.floor(R(1, 99)) + '"/>' +
            '<feColorMatrix type="matrix" values="0 0 0 0 .25  0 0 0 0 .19  0 0 0 0 .09  0 0 0 -2.1 1.25"/></filter>' +
            '<filter id="lmChalk" x="-10%" y="-30%" width="120%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" result="n"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G"/></filter>' +
            '<filter id="lmNeedleSh"><feGaussianBlur stdDeviation="1.2"/></filter>' +
            '<clipPath id="lmFaceClip"><rect x="22" y="20" width="196" height="122" rx="6"/></clipPath>' +
            '</defs>' +
            '<rect x="4" y="4" width="232" height="152" rx="12" fill="url(#lmBake)" stroke="#0c0b08" stroke-width="2"/>' +
            '<rect x="7" y="7" width="226" height="146" rx="10" fill="none" stroke="rgba(255,255,255,.07)"/>' +
            [[15, 15], [225, 15], [15, 145], [225, 145]].map(([x, y]) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + Math.floor(R(0, 180)) + ')"><circle r="4.2" fill="#55524a" stroke="#0d0c09"/><path d="M-3 0H3" stroke="#121109" stroke-width="1.3"/></g>').join('') +
            '<g clip-path="url(#lmFaceClip)"><rect x="22" y="20" width="196" height="122" fill="url(#lmFace)"/>' +
            '<g class="lm-meter__ticks"></g>' +
            '<path class="lm-meter__zone" d="M' + (cx - 74) + ' ' + cy + ' A74 74 0 0 1 ' + (cx + 74) + ' ' + cy + '" pathLength="100" fill="none" stroke="#f4ffe6" stroke-width="15" stroke-dasharray="0 200" filter="url(#lmChalk)"/>' +
            '<text x="120" y="104" text-anchor="middle" class="lm-meter__label">KONTAKT</text>' +
            '<text x="120" y="116" text-anchor="middle" class="lm-meter__sub">Gen. Nr. 4 · Prüfung</text>' +
            '<rect x="22" y="20" width="196" height="122" filter="url(#lmGrime)" opacity=".55"/>' +
            '<g class="lm-meter__needle-sh" filter="url(#lmNeedleSh)" opacity=".35" transform="translate(2 3)"><path d="M-1.6 0 L-.5 -92 L.5 -92 L1.6 0Z M-3 0 L3 0 L2 16 L-2 16Z" fill="#000"/></g>' +
            '<g class="lm-meter__needle"><path d="M-1.6 0 L-.5 -92 L.5 -92 L1.6 0Z" fill="#17150f"/><path d="M-3 0 L3 0 L2 16 L-2 16Z" fill="#2a271f"/></g>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#2b2922" stroke="#0e0d0a"/><circle cx="' + (cx - 1.5) + '" cy="' + (cy - 1.5) + '" r="2.2" fill="#8d897b"/>' +
            '<g class="lm-meter__glasscrack" opacity="0"></g>' +
            '<rect x="22" y="20" width="196" height="122" fill="url(#lmGlass)"/>' +
            '<path d="M40 30 L70 26 M176 128 L204 122" stroke="#fff" stroke-opacity=".12" stroke-width=".8"/>' +
            '</g>' +
            '<rect x="22" y="20" width="196" height="122" rx="6" fill="none" stroke="#0b0a07" stroke-width="2.5"/>' +
            '</svg>';
        const svg = box.firstChild, ticks = svg.querySelector('.lm-meter__ticks'), zone = svg.querySelector('.lm-meter__zone');
        const needle = svg.querySelector('.lm-meter__needle'), needleSh = svg.querySelector('.lm-meter__needle-sh'), glass = svg.querySelector('.lm-meter__glasscrack');
        // Skala: aufgedruckt und verblasst; das Ende rot (Überlast)
        for (let p = 0; p <= 100; p += 2) {
            const a = pos(p), big = p % 20 === 0, mid = p % 10 === 0, r1 = 88, r2 = r1 - (big ? 11 : mid ? 7 : 4.5);
            el('line', { x1: f1(cx + Math.cos(a) * r1), y1: f1(cy + Math.sin(a) * r1), x2: f1(cx + Math.cos(a) * r2), y2: f1(cy + Math.sin(a) * r2),
                stroke: p >= 84 ? '#7a1d14' : '#2b261b', 'stroke-width': big ? 1.8 : mid ? 1.2 : .7, opacity: f1(R(.55, .95)) }, ticks);
            if (big) { const t = el('text', { x: f1(cx + Math.cos(a) * 66), y: f1(cy + Math.sin(a) * 66 + 3), 'text-anchor': 'middle', class: 'lm-meter__num' }, ticks); t.textContent = p / 20; }
        }
        el('path', { d: 'M' + f1(cx + Math.cos(pos(84)) * 90) + ' ' + f1(cy + Math.sin(pos(84)) * 90) + ' A90 90 0 0 1 ' + (cx + 90) + ' ' + cy, fill: 'none', stroke: '#7a1d14', 'stroke-width': 2.5, opacity: .7 }, ticks);
        let cur = 0;
        const setNeedle = p => {
            cur = p;
            const tr = 'translate(' + cx + ' ' + cy + ') rotate(' + f1(-90 + p * 1.8) + ')';
            needle.setAttribute('transform', tr); needleSh.setAttribute('transform', 'translate(2 3) ' + tr);
        };
        setNeedle(0);
        let rest = 0;
        return {
            needle: setNeedle,
            zone(a, w) { zone.setAttribute('stroke-dasharray', f1(w) + ' 200'); zone.setAttribute('stroke-dashoffset', f1(-a)); zone.classList.add('is-on'); },
            idle() {   // Zone weg, Zeiger fällt langsam auf 0 zurück
                zone.classList.remove('is-on');
                cancelAnimationFrame(rest);
                const from = cur, t0 = performance.now();
                (function fall(now) { const u = Math.min(1, (now - t0) / 700); setNeedle(from * (1 - u) * (1 - u) + Math.sin(u * 9) * (1 - u) * 1.5); if (u < 1) rest = requestAnimationFrame(fall); })(t0);
            },
            stop() { cancelAnimationFrame(rest); },
            hit() { zone.classList.remove('is-hit'); void zone.getBoundingClientRect(); zone.classList.add('is-hit'); },
            miss() {
                // Ein Sprung im Glas, der bleibt
                const x = R(60, 180), y = R(40, 110), n = 7 + Math.floor(rnd() * 4), rays = [];
                for (let i = 0; i < n; i++) {
                    const a = i / n * Math.PI * 2 + R(-.25, .25), len = R(22, 62), pts = [[x, y]];
                    for (let s = 1; s <= 7; s++) pts.push([x + Math.cos(a) * len * s / 7 + R(-1.6, 1.6), y + Math.sin(a) * len * s / 7 + R(-1.6, 1.6)]);
                    rays.push(pts);
                    el('path', { d: ribbon(pts, j => .5), fill: '#1a1810', opacity: .4, transform: 'translate(.7 .7)' }, glass);
                    el('path', { d: ribbon(pts, j => 1.25 * (1 - j / 8) + .15), fill: '#f6f3e6', opacity: .8 }, glass);
                }
                // Ringe zwischen den Strahlen
                [2, 4].forEach(s => rays.forEach((r, i) => {
                    const a = r[s], b = rays[(i + 1) % n][s + (rnd() < .5 ? 0 : 1)];
                    if (rnd() < .75) el('path', { d: 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'Q' + f1((a[0] + b[0]) / 2 + R(-3, 3)) + ' ' + f1((a[1] + b[1]) / 2 + R(-3, 3)) + ' ' + f1(b[0]) + ' ' + f1(b[1]), fill: 'none', stroke: '#f6f3e6', 'stroke-width': .7, opacity: .6 }, glass);
                }));
                el('circle', { cx: f1(x), cy: f1(y), r: 2.4, fill: '#fbf9ef', opacity: .85 }, glass);
                glass.setAttribute('opacity', 1);
                box.classList.remove('is-miss'); void box.offsetWidth; box.classList.add('is-miss');
            }
        };
    }

    /* ── Beine aus dem Nebel: greifen seitlich über den Rand ins Bild, ziehen sich zurück, wenn man hinsieht ── */
    function legs(n) {
        const W = innerWidth, H = innerHeight;
        const svg = el('svg', { class: 'lm-legs', 'aria-hidden': 'true', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
        document.body.appendChild(svg);
        const list = [];
        for (let i = 0; i < n; i++) {
            const side = i % 2 ? 1 : -1;   // abwechselnd links und rechts, nie über dem Text
            const g = el('g', {}, svg);
            list.push({
                side, bx: side < 0 ? -R(40, 110) : W + R(40, 110), by: R(.02, .28) * H,
                tx: side < 0 ? R(.07, .19) * W : R(.81, .93) * W, ty: R(.42, .8) * H, w: R(14, 19),
                shade: el('path', { fill: 'rgba(0,0,0,.28)', transform: 'translate(10 14)' }, g),
                body: el('path', { fill: '#0b0907' }, g),
                hi: el('path', { fill: 'rgba(210,198,165,.13)' }, g),
                spines: el('path', { fill: 'none', stroke: '#0b0907', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g),
                claw: el('path', { fill: '#0b0907' }, g),
                reach: 0, target: 0, wake: R(5, 12) + i * R(3, 7), jerk: 0
            });
        }
        function draw(L) {
            const px = L.bx + (L.tx - L.bx) * L.reach, py = L.by + (L.ty - L.by) * L.reach;
            const dx = px - L.bx, dy = py - L.by, d = Math.hypot(dx, dy) || 1, full = Math.hypot(L.tx - L.bx, L.ty - L.by);
            let nx = -dy / d, ny = dx / d;
            if (ny > 0) { nx = -nx; ny = -ny; }   // Knie zeigen nach oben, wie über eine Mauer gegriffen
            const arch = full * (.34 - L.reach * .1);
            const k1 = [L.bx + dx * .36 + nx * arch, L.by + dy * .36 + ny * arch], k2 = [L.bx + dx * .74 + nx * arch * .55, L.by + dy * .74 + ny * arch * .55];
            const tip = [px + (L.jerk ? R(-4, 4) : 0), py + (L.jerk ? R(-3, 3) : 0)];
            const segs = [[[L.bx, L.by], k1, L.w, L.w * .72], [k1, k2, L.w * .8, L.w * .45], [k2, tip, L.w * .5, 1.2]];
            const pts = [], ws = [];
            segs.forEach(([a, b, w0, w1], si) => {
                for (let s = 0; s <= 8; s++) {
                    if (si && !s) continue;
                    const t = s / 8, knob = (s === 8 && si < 2) || (s === 0 && si > 0) ? 1.35 : 1;   // Gelenke dicker
                    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); ws.push((w0 + (w1 - w0) * t) * knob);
                }
            });
            const d1 = ribbon(pts, i => ws[i]);
            L.shade.setAttribute('d', d1); L.body.setAttribute('d', d1);
            L.hi.setAttribute('d', ribbon(pts.map(p => [p[0] - nx * 1.6, p[1] - ny * 1.6]), i => ws[i] * .22));
            // Borsten an Schenkel und Schiene
            let sp = '';
            for (let i = 3; i < pts.length - 3; i += 2) {
                const a = pts[i], o = i % 4 ? 1 : -1, l = ws[i] * .7 + 5;
                sp += 'M' + f1(a[0] + nx * ws[i] * .5 * o) + ' ' + f1(a[1] + ny * ws[i] * .5 * o) + 'l' + f1(nx * l * o + (pts[i + 1][0] - a[0]) * .6) + ' ' + f1(ny * l * o + (pts[i + 1][1] - a[1]) * .6);
            }
            L.spines.setAttribute('d', sp);
            // Kralle: krümmt sich an der Spitze nach innen
            const ux = (tip[0] - k2[0]), uy = (tip[1] - k2[1]), ul = Math.hypot(ux, uy) || 1, cxw = -nx * 9, cyw = -ny * 9;
            L.claw.setAttribute('d', 'M' + f1(tip[0] - ux / ul * 10 + nx * 2.4) + ' ' + f1(tip[1] - uy / ul * 10 + ny * 2.4) + 'Q' + f1(tip[0] + ux / ul * 6) + ' ' + f1(tip[1] + uy / ul * 6) + ' ' + f1(tip[0] + ux / ul * 4 + cxw) + ' ' + f1(tip[1] + uy / ul * 4 + cyw) + 'Q' + f1(tip[0] + ux / ul * 2) + ' ' + f1(tip[1] + uy / ul * 2) + ' ' + f1(tip[0] - ux / ul * 10 - nx * 2.4) + ' ' + f1(tip[1] - uy / ul * 10 - ny * 2.4) + 'Z');
        }
        if (calm()) { list.forEach(L => { L.reach = .7; draw(L); }); return; }
        let mx = -999, my = -999;
        addEventListener('pointermove', e => { mx = e.clientX * W / innerWidth; my = e.clientY * H / innerHeight; }, { passive: true });
        const start = performance.now();
        (function frame(now) {
            const t = (now - start) / 1000;
            list.forEach(L => {
                if (t > L.wake && L.target === 0 && L.reach < .02) L.target = R(.85, 1);
                const tipX = L.bx + (L.tx - L.bx) * L.reach, tipY = L.by + (L.ty - L.by) * L.reach;
                if (L.reach > .3 && Math.hypot(mx - tipX, my - tipY) < 170) { L.target = 0; L.wake = t + R(6, 12); }   // angeschaut: zurück in den Nebel
                L.reach += (L.target - L.reach) * (L.target > L.reach ? .006 : .09);
                L.jerk = L.reach > .8 && Math.random() < .015 ? 1 : 0;
                draw(L);
            });
            requestAnimationFrame(frame);
        })(start);
    }

    /* ── Gekritzelte Spinne (mit zu vielen Beinen) für Zettel und Wände ── */
    function spider(box) {
        const n = +(box.getAttribute('data-lm-spinne') || 8) || 8;
        const svg = el('svg', { class: 'lm-spider', viewBox: '0 0 80 60', 'aria-hidden': 'true' });
        box.replaceChildren(svg);
        const g = el('g', { fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
        const cx = 40, cy = 32;
        for (let i = 0; i < n; i++) {   // Beine: zwei Glieder, Knie nach oben
            const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), spread = n / 2;
            const a = (-.75 + k / Math.max(1, spread - 1) * 1.5) + R(-.12, .12);
            const kx = cx + side * (12 + R(0, 6)) , ky = cy - 10 + a * 14 + R(-3, 3);
            const fx = cx + side * (26 + R(0, 8)), fy = cy + 6 + a * 22 + R(-3, 3);
            el('path', { d: 'M' + f1(cx + side * 4) + ' ' + f1(cy + a * 4) + 'Q' + f1((cx + kx) / 2) + ' ' + f1(ky - 6) + ' ' + f1(kx) + ' ' + f1(ky) + 'L' + f1(fx) + ' ' + f1(fy), 'stroke-width': R(.8, 1.3) }, g);
        }
        // Körper: mehrmals nachgezogen
        for (let i = 0; i < 3; i++) el('ellipse', { cx: f1(cx + R(-1, 1)), cy: f1(cy + 4 + R(-1, 1)), rx: f1(R(6.5, 8)), ry: f1(R(8, 9.5)), 'stroke-width': .9, transform: 'rotate(' + f1(R(-10, 10)) + ' 40 36)' }, g);
        el('circle', { cx: cx, cy: cy - 6, r: 3.6, 'stroke-width': 1 }, g);
        el('path', { d: 'M40 0 V' + (cy - 10), 'stroke-width': .6, opacity: .6 }, g);   // sie hängt an einem Faden
    }

    window.LM_ART = { cracks, tallies, tallyGroup, mark, meter, legs, spider };
})();
