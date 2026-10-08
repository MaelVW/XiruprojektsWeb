/* ==========================================================================
   Werft & Welt – gemeinsame Spiel-Bausteine (nach core.js, mech-art.js, weltkarte-art.js laden)
   XIRU.werft:
     itemCard(it, {sel}) · matCard(id, n) · detail(it, {actions}) · statChips(s, cmp) · wallet(el)
     qName(q) · qColor(q) · slotName(slot)
     rollQ(luck, min, max) · rollPart({maxT, slot, luck, minQ, maxQ}) · loot(opts) · grant(list) → Zeilen
     here(isle, el, onArrive) – zeigt, ob der Mech auf dieser Insel steht (sonst Reise-Knopf)
     travel(to, {page}) → Promise – Reise-Ladebildschirm auf der echten Karte mit Ereignissen
     tow() → Promise – Notruf-Schlepper bringt den Mech zum Heimathafen
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, M = X.mech, W = X.werft = {};
    const STAT = W.STAT = { R: 'Reichweite', E: 'Energie', S: 'Sensor', P: 'Panzerung', A: 'Angriff' };
    const PX = (n, s) => X.pix ? X.pix.svg(n, s || 16) : '';
    W.px = PX;
    const STAT_I = W.STAT_I = { R: PX('st-R'), E: PX('st-E'), S: PX('st-S'), P: PX('st-P'), A: PX('st-A') };
    const FX = { speed: ['z-kompass', 'Reisetempo'], storm: ['z-anker', 'Sturmschutz'], events: ['z-laterne', 'Reise-Ereignisse'], luck: ['z-kleeblatt', 'Glück bei Beute'], taler: ['z-sparschwein', 'Taler'] };
    const esc = X.esc;
    W.qName = q => (X.rarities[q] || X.rarities[1]).n;
    W.qColor = q => (X.rarities[q] || X.rarities[1]).c;
    W.slotName = sl => (X.mechSlots.find(s => s.id === sl) || {}).n || sl;
    W.isleName = id => (M.isle(id) || {}).n || id;

    /* ── Anzeige ──────────────────────────────────────────────────────── */
    W.statChips = function (s, cmp) {
        const keys = ['R', 'E', 'S', 'P', 'A'].filter(k => (s && s[k]) || (cmp && cmp[k]));
        if (!keys.length) return '<span class="stat-chip faint">keine Grundwerte</span>';
        return keys.map(k => {
            const v = (s && s[k]) || 0, d = cmp ? v - (cmp[k] || 0) : 0;
            return '<span class="stat-chip" title="' + STAT[k] + '">' + STAT_I[k] + ' ' + (v > 0 ? '+' : '') + v + ' ' + STAT[k] +
                (cmp && d ? ' <span class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲' : '▼') + Math.abs(d) + '</span>' : '') + '</span>';
        }).join('');
    };
    W.fxChips = fx => Object.keys(fx || {}).map(k => FX[k] ? '<span class="stat-chip">' + PX(FX[k][0]) + ' ' + (k === 'storm' ? '−' : '+') + Math.round(fx[k] * 100) + ' % ' + FX[k][1] + '</span>' : '').join('');
    W.itemCard = function (it, o) {
        const v = M.view(it); if (!v) return '';
        const eq = M.equipped(it.u), c = v.c;
        return '<button type="button" class="item' + (o && o.sel === it.u ? ' is-selected' : '') + '" data-u="' + esc(it.u) + '" data-q="' + v.q + '" title="' + esc(v.n + ' · ' + W.qName(v.q)) + '">' +
            (eq ? '<span class="item__tag">aktiv</span>' : it.neu ? '<span class="item__tag item__tag--new">neu</span>' : '') +
            (v.up ? '<span class="item__up">+' + v.up + '</span>' : '') +
            '<span class="item__icon" aria-hidden="true">' + PX(v.id, 40) + '</span><span class="item__name">' + esc(v.n) + '</span><span class="item__q">' + W.qName(v.q) + '</span>' +
            '<span class="item__cond" title="Zustand ' + c + ' %"><i class="' + (c <= 0 ? 'dead' : c < 40 ? 'low' : '') + '" style="width:' + c + '%"></i></span></button>';
    };
    W.matCard = (id, n) => { const m = M.mat(id); return m ? '<div class="item item--mat" title="' + esc(m.d) + '"><span class="item__icon">' + PX('mat-' + id, 36) + '</span><span class="item__name">' + esc(m.n) + '</span><span class="item__count">' + X.fmt(n) + '×</span></div>' : ''; };
    W.detail = function (it, o) {
        const v = M.view(it); if (!v) return '';
        const cur = M.installed(v.slot), cmp = cur && cur.u !== it.u ? cur.s : null, c = v.c;
        return '<div class="idetail" style="--qc:' + W.qColor(v.q) + '"><div class="idetail__head"><span class="idetail__icon">' + PX(v.id, 56) + '</span><div><h3>' + esc(v.n) + (v.up ? ' <span class="q' + v.q + '">+' + v.up + '</span>' : '') + '</h3>' +
            '<span class="qbadge q' + v.q + '">' + W.qName(v.q) + '</span> <span class="small muted">' + esc(W.slotName(v.slot)) + ' · Bauplan-Stufe ' + v.t + '</span></div></div>' +
            '<div class="statrow">' + W.statChips(v.s, cmp) + (v.rep ? '<span class="stat-chip">' + PX('w-schluessel') + ' −' + Math.round(v.rep * 100) + ' % Reparatur</span>' : '') + W.fxChips(v.fx) + '</div>' +
            (cmp ? '<p class="small muted mb-1">▲▼ = Vergleich mit deinem eingebauten Teil (' + esc(cur.n) + ').</p>' : '') +
            '<p class="small">' + esc(v.d) + '</p>' +
            '<div class="row small"><span>Zustand: <b class="' + (c <= 0 ? 'text-danger' : c < 40 ? 'text-warning' : '') + '">' + (c <= 0 ? 'defekt' : c + ' %') + '</b></span><span>Wert: <b>' + X.fmt(M.value(it)) + '</b> ' + PX('taler') + '</span></div>' +
            (o && o.actions ? '<div class="row mt-1">' + o.actions + '</div>' : '') + '</div>';
    };
    W.wallet = function (el, extra) {
        el = typeof el === 'string' ? X.$(el) : el; if (!el) return;
        const draw = () => { el.innerHTML = '<span title="1 Schrott pro 4 XP">' + PX('schrott', 18) + ' ' + X.fmt(M.scrap()) + ' <small>Schrott</small></span><span>' + PX('taler', 18) + ' ' + X.fmt(M.taler()) + ' <small>Taler</small></span><span>' + PX('inventar', 18) + ' ' + M.items().length + '/' + M.INV_MAX + '</span>' + (extra ? extra() : ''); };
        draw(); X.on('mech', draw); X.on('xp', draw);
    };

    /* ── Beute ────────────────────────────────────────────────────────── */
    const BASE_W = [0, 600, 250, 100, 38, 10, 2];
    W.rollQ = function (luck, min, max) {
        luck = (luck || 0) + (M.stats().fx.luck || 0);
        min = min || 1; max = max || 5;
        const w = BASE_W.map((x, q) => q < min || q > max ? 0 : x * (1 + luck * (q - 1) * .6));
        let r = Math.random() * w.reduce((a, b) => a + b, 0), q = 0;
        while (r > 0 && q < 6) { q++; r -= w[q]; }
        return X.clamp(q, min, max);
    };
    W.rollPart = function (o) {
        o = o || {};
        const maxT = o.maxT || 3, pool = X.mechParts.filter(p => p.t <= maxT && (!o.slot || p.slot === o.slot) && (o.minT ? p.t >= o.minT : true));
        let r = Math.random() * pool.reduce((a, p) => a + 1 / p.t, 0), pick = pool[0];
        for (const p of pool) { r -= 1 / p.t; if (r <= 0) { pick = p; break; } }
        return { id: pick.id, q: W.rollQ(o.luck, o.minQ, o.maxQ) };
    };
    /* opts: { item: Chance 0–1, maxT, luck, minQ, maxQ, taler: [min,max], mats: Anzahl Materialwürfe, rare: Chance auf Splitter/Kern } */
    W.loot = function (o) {
        o = o || {}; const out = [];
        if (o.taler) out.push({ type: 'taler', n: X.rand(o.taler[0], o.taler[1]) });
        for (let i = 0; i < (o.mats || 0); i++) {
            const roll = Math.random(), rare = o.rare || 0;
            const id = roll < rare * .25 ? 'nebelkern' : roll < rare ? 'splitter' : X.pick(['kabel', 'kabel', 'zahnrad', 'zahnrad', 'oel', 'platine', 'chip']);
            out.push({ type: 'mat', id, n: id === 'nebelkern' ? 1 : id === 'splitter' ? X.rand(1, 2) : X.rand(1, 4) });
        }
        if (o.item && Math.random() < o.item) { const p = W.rollPart(o); out.push({ type: 'item', id: p.id, q: p.q }); }
        return out;
    };
    W.grant = function (list) {
        return (list || []).map(e => {
            if (e.type === 'taler') { const n = M.addTaler(e.n); return PX('taler') + ' <b>' + n + ' Taler</b>'; }
            if (e.type === 'mat') { M.addMat(e.id, e.n); const m = M.mat(e.id); return PX('mat-' + e.id) + ' ' + e.n + '× ' + esc(m.n); }
            if (e.type === 'item') {
                const it = M.add(e.id, e.q); if (!it) return PX('inventar') + ' <i>Inventar voll – ein Teil ging verloren</i>';
                const p = M.part(e.id); return PX(p.id) + ' <b class="q' + e.q + '">' + esc(p.n) + '</b> <span class="small q' + e.q + '">(' + W.qName(e.q) + ')</span>';
            }
            return '';
        }).filter(Boolean);
    };

    /* ── Wo steht der Mech? ───────────────────────────────────────────── */
    W.here = function (isle, el, onArrive) {
        el = typeof el === 'string' ? X.$(el) : el;
        const draw = () => {
            if (!el) return true;
            if (X.easy()) { el.className = 'here'; el.innerHTML = '<span>' + PX('z-kompass', 18) + ' <b>Entdecker-Modus</b> – hier gibt es keinen Mech. Wechsle in den <a href="' + X.url('konto/einstellungen.html') + '">Einstellungen</a> zum Abenteuer-Modus, um mitzuspielen.</span>'; return false; }
            const pos = M.pos(), at = pos === isle;
            el.className = 'here' + (at ? '' : ' here--away');
            el.innerHTML = at
                ? '<span>' + PX('z-anker', 18) + ' Dein Mech liegt hier vor Anker.</span><span class="small muted">' + (M.ready() ? 'Fahrbereit' : 'Nicht fahrbereit – zur Werft im Heimathafen') + '</span>'
                : '<span>' + PX('z-kompass', 18) + ' Dein Mech ist gerade in <b>' + esc(W.isleName(pos)) + '</b>. Um hier etwas zu tun, musst du herreisen.</span>' +
                  '<button class="btn btn--primary btn--sm" type="button" data-go-here>' + PX('ev-schiff') + ' Hierher reisen (' + Math.round(M.travelSecs(isle)) + ' s)</button>';
            const b = el.querySelector('[data-go-here]');
            if (b) b.addEventListener('click', () => W.travel(isle).then(r => { if (r && r.arrived) { draw(); if (onArrive) onArrive(); } }));
            return at;
        };
        return draw();
    };

    /* ── Gerüst für Spiel-Insel-Seiten (welt/*.html) ──────────────────
       Erwartet #isle-head, #here, #wallet, #game (und optional #easy).
       Zeichnet die Insel als Kopfbild, zeigt den Standort des Mechs und die Börse.
       at() → steht der Mech gerade hier? onChange wird nach einer Ankunft aufgerufen. */
    /* Platzhalter <i data-px="name"> im HTML durch Pixel-Icons ersetzen */
    W.pxify = root => X.$$('[data-px]', root).forEach(el => { el.outerHTML = PX(el.dataset.px, +el.dataset.size || 16); });
    W.islePage = function (id, onChange) {
        W.pxify();
        const isle = M.isle(id), head = X.$('#isle-head');
        if (head) {
            const w = isle.s * 4.2, h = w * .42, P = X.profile(), box = document.createElement('div');
            box.className = 'isle-head__map'; box.setAttribute('aria-hidden', 'true'); head.insertBefore(box, head.firstChild);
            X.mapPix.mount(box, { discovered: () => true, visitedSecret: X.pages.some(p => p.r === 'geheim' && P.visited[p.p]), labels: false, unknown: false, view: [isle.x - w / 2, isle.y - h * .62, w, h], fit: 'cover' });
        }
        if (X.easy()) {
            const g = X.$('#game'); if (g) g.hidden = true;
            const e = X.$('#easy');
            if (e) { e.hidden = false; e.innerHTML = '<div class="card easy-note"><div>' + PX('z-kompass', 64) + '</div><h2>Nur im Abenteuer-Modus</h2><p class="muted">' + esc(isle.n) + ' gehört zum Mech-Spiel. Im Entdecker-Modus gibt es keinen Mech, keine Taler und keine Bauteile.</p>' +
                '<div class="row" style="justify-content:center"><a class="btn" href="' + X.url('weltkarte.html') + '">Weltkarte</a><button class="btn btn--primary" type="button" data-adv>Zum Abenteuer-Modus wechseln</button></div></div>';
                e.querySelector('[data-adv]').addEventListener('click', () => { X.setting('modus', 'abenteuer'); location.reload(); }); }
            return { at: () => false, easy: true };
        }
        const at = () => M.pos() === id;
        const draw = () => { W.here(id, '#here', () => { draw(); if (onChange) onChange(); }); const g = X.$('#game'); if (g) g.classList.toggle('is-away', !at()); };
        draw(); W.wallet('#wallet');
        return { at, redraw: draw };
    };
    /* Kleiner Zufallsgenerator mit Startwert (für Tagesangebote) */
    W.seeded = seed => { let s = (typeof seed === 'string' ? X.mapArt.hash(seed) : seed) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646); };
    W.dayKey = () => X.today() + ':' + (X.user || 'gast');

    /* ── Reise-Ereignisse ─────────────────────────────────────────────── */
    const BOTTLE = [
        'Wer im Keller das Licht anknipst, sieht mehr als Staub.', 'Der Leuchtturm spricht in Punkten und Strichen.', 'Nach Ladenschluss spukt es in der Spielhalle.',
        'Jede Diskette kennt ein Wort. Tipp es irgendwo.', 'Im Wrackriff liegt mehr als Rost.', 'Die Runen lesen sich leichter, wenn man die Tafel benutzt.',
        'Die Arena-Champions tragen nur Teile, die in der Sonne glänzen.', 'Kristallsplitter wachsen im Dunkeln. Frag die Mine.', 'Grüss mir die Katzen.'
    ];
    const EVENTS = [
        { w: 5, run(st) { const id = X.pick(['kabel', 'zahnrad', 'oel', 'platine']), n = X.rand(1, 3); M.addMat(id, n); const m = M.mat(id); return PX('ev-treibgut') + ' <b>Treibgut!</b> Du fischst ' + n + '× ' + m.n + ' aus dem Wasser.'; } },
        { w: 2, run(st) { const l = W.grant(W.loot({ item: .55, maxT: 3, mats: 1, taler: [3, 12] })); return PX('ev-kiste') + ' <b>Eine treibende Kiste!</b> Darin: ' + l.join(', ') + '.'; } },
        { w: 3, run(st) { const rep = M.wear(2, Math.round(11 * (1 - Math.min(.9, st.fx.storm || 0))), ['antrieb', 'rahmen', 'panzer']); return PX('ev-sturm') + ' <b>Sturm!</b> ' + (rep.length ? 'Schaden: ' + rep.map(r => esc(r.part.n) + ' −' + r.dmg + ' %').join(', ') + '.' : 'Deine Panzerung hält alles ab.'); } },
        { w: 1.4, run() { X.egg('m-flaschenpost'); return PX('ev-flasche') + ' <b>Flaschenpost:</b> „' + X.pick(BOTTLE) + '“'; } },
        { w: 2, run() { const n = M.addTaler(X.rand(4, 14)); return PX('ev-schiff') + ' <b>Ein Händlerschiff</b> kauft dir alte Schrauben ab: +' + n + ' ' + PX('taler'); } },
        { w: 2, run(st) { if (st.S >= 3) { X.addXP(6, 'Nebelbank'); return PX('ev-nebel') + ' <b>Nebelbank.</b> Dein Sensor erkennt Umrisse einer fernen Küste. +6 XP'; } return PX('ev-nebel') + ' <b>Nebelbank.</b> Der Sensor rauscht. Man sieht die eigenen Paddel kaum.'; } },
        { w: 1.4, run() { X.addXP(4, 'Wal'); return PX('ev-wal') + ' <b>Ein Wal</b> begleitet dich ein Stück und bläst eine Fontäne. +4 XP'; } },
        { w: 1, run(st) { if (st.S >= 4 && Math.random() < .5) { M.addMat('splitter', 1); return PX('ev-drache') + ' <b>Ein grüner Schatten</b> zieht unter dir vorbei. Im Kielwasser glitzert ein Kristallsplitter!'; } return PX('ev-drache') + ' <b>Ein grüner Schatten</b> zieht unter dir vorbei … dann ist er weg.'; } },
        { w: 2, run() { return PX('ev-moewe') + ' <b>Möwen</b> kreisen über dem Mech. Eine klaut eine Schraube. Frech.'; } },
        { w: 1.5, run() { return PX('ev-sonne') + ' <b>Spiegelglatte See.</b> Der Mech brummt zufrieden vor sich hin.'; } }
    ];
    const pickEvent = () => { let r = Math.random() * EVENTS.reduce((a, e) => a + e.w, 0); for (const e of EVENTS) { r -= e.w; if (r <= 0) return e; } return EVENTS[0]; };
    const TIPS = ['Tipp: Ein besserer Antrieb verkürzt jede Reise.', 'Tipp: Zubehör wie der Messingkompass macht dich schneller.', 'Tipp: Panzerung schützt vor Sturmschäden.', 'Tipp: Mit Sturmlaterne und Funkgerät erlebst du unterwegs mehr.', 'Tipp: Kaputte Teile repariert die Werft im Heimathafen – oder die Funkenschmiede.'];

    function voyageView(from, to, label) {
        const A = M.isle(from), B = M.isle(to), pad = 230;
        let x0 = Math.min(A.x, B.x) - pad, x1 = Math.max(A.x, B.x) + pad, y0 = Math.min(A.y, B.y) - pad, y1 = Math.max(A.y, B.y) + pad;
        const ar = innerWidth / Math.max(320, innerHeight - 190);   // Kartenbereich etwa im Bildschirmformat
        let w = x1 - x0, h = y1 - y0;
        if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
        const root = document.createElement('div');
        root.className = 'voyage'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', label);
        const P = X.profile(), visitedSecret = X.pages.some(p => p.r === 'geheim' && P.visited[p.p]);
        root.innerHTML = '<div class="voyage__map"></div>' +
            '<div class="voyage__bar"><div class="voyage__top"><h2></h2><span class="spacer"></span><span class="voyage__time small"></span>' +
            '<button class="btn btn--sm" type="button" data-fast aria-pressed="false">' + PX('st-spd') + ' ×3</button></div>' +
            '<div class="voyage__progress"><i></i></div><ul class="voyage__log" aria-live="polite"></ul><p class="voyage__tip mb-0"></p><div class="voyage__end row" hidden></div></div>';
        document.body.appendChild(root);
        document.body.style.overflow = 'hidden';
        root.querySelector('h2').textContent = label;
        root.querySelector('.voyage__tip').textContent = X.pick(TIPS);
        // Die Pixel-Karte von Sektaria als Ladebildschirm, mit Route und Mech-Figur
        const ctl = X.mapPix.mount(root.querySelector('.voyage__map'), { discovered: id => M.discovered(id), visitedSecret, unknown: false, view: [x0, y0, w, h], fit: 'cover' });
        ctl.layer('route').innerHTML = '<path class="voyage__route" d="' + X.mapArt.route(from, to) + '"/><path class="voyage__done" d=""/>';
        root._ctl = ctl;
        return root;
    }
    function closeVoyage(root) { if (root._ctl) setTimeout(() => root._ctl.destroy(), 360); document.body.style.overflow = ''; root.style.transition = 'opacity .35s'; root.style.opacity = '0'; setTimeout(() => root.remove(), 360); }
    function mechToken(f, run, tug) {
        if (tug) return '<g transform="translate(-30 -22)"><path d="M0 18 Q30 32 60 18 L54 30 L6 30Z" fill="#b91c1c" stroke="#000" stroke-width="2"/><rect x="18" y="4" width="22" height="14" fill="#f8fafc" stroke="#000" stroke-width="2"/><rect x="24" y="-6" width="6" height="10" fill="#111827"/></g>';
        return '<g transform="translate(-40 -70) scale(.34)">' + X.mechArt.draw(f, run).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</g>';
    }

    /* Läuft eine Reise ab: Mech folgt der Route, Ereignisse unterwegs, am Ende Ankunft */
    function runVoyage(from, to, o) {
        return new Promise(resolve => {
            const secs = o.secs, root = voyageView(from, to, o.label);
            const ctl = root._ctl, path = root.querySelector('.voyage__route'), done = root.querySelector('.voyage__done'), PS = ctl.S;
            const tok = document.createElement('canvas'); tok.width = 44; tok.height = 44; ctl.place(tok, 0, 0, 44 * PS, 44 * PS, 'voyage__mech');
            if (o.tug) X.mapPix.sprite(mechToken(0, false, true), [-36, -30, 72, 44], 24, 15).then(sp => { if (sp) { tok.width = 24; tok.height = 15; tok.getContext('2d').drawImage(sp, 0, 0); tok.style.width = 24 * PS + 'px'; tok.style.height = 15 * PS + 'px'; } });
            const len = path.getTotalLength(), bar = root.querySelector('.voyage__progress i'), log = root.querySelector('.voyage__log'), timeEl = root.querySelector('.voyage__time');
            const calm = X.setting('anim') === false;
            let p = 0, speed = 1, last = performance.now(), tokT = 0;
            const st = M.stats(), events = [];
            if (!o.tug) {
                const n = Math.min(4, Math.round((.5 + M.dist(from, to) / 600) * (1 + (st.fx.events || 0)) + Math.random() * .6));
                for (let i = 0; i < n; i++) events.push({ at: .14 + (i + Math.random() * .7) / n * .74, ev: pickEvent() });
            }
            const say = html => { const li = document.createElement('li'); li.innerHTML = html; log.appendChild(li); log.scrollTop = log.scrollHeight; };
            say(o.tug ? PX('ev-schiff') + ' Der Schlepper hat dich am Haken. Ab nach Hause!' : PX('z-anker') + ' Leinen los in <b>' + esc(W.isleName(from)) + '</b>. Ziel: <b>' + esc(W.isleName(to)) + '</b> · ' + Math.round(M.dist(from, to) / 10) + ' Seemeilen.');
            const fast = root.querySelector('[data-fast]');
            fast.addEventListener('click', () => { speed = speed === 1 ? 3 : 1; fast.setAttribute('aria-pressed', speed === 3); fast.classList.toggle('btn--primary', speed === 3); });
            [196, 247, 294].forEach((fq, i) => setTimeout(() => X.beep(fq, .15, 'triangle', .04), 200 + i * 300));
            function frame(now) {
                const dt = Math.min(.1, (now - last) / 1000); last = now;
                p = Math.min(1, p + dt * speed / secs);
                const pt = path.getPointAtLength(p * len), ahead = path.getPointAtLength(Math.min(len, p * len + 2));
                const flip = ahead.x < pt.x ? -1 : 1, bob = calm ? 0 : Math.sin(now / 260) * 3;
                tokT += dt;
                if (!o.tug && (tokT > .2 || !tok.dataset.on)) { tokT = 0; tok.dataset.on = 1; X.mapPix.mechSprite(tok, now / 1000); }
                const tw = parseFloat(tok.style.width), th = parseFloat(tok.style.height);
                tok.style.left = (Math.round((pt.x - tw / 2) / PS) * PS) + 'px'; tok.style.top = (Math.round((pt.y - th * .86 + bob) / PS) * PS) + 'px';
                tok.style.transform = flip < 0 ? 'scaleX(-1)' : '';
                done.setAttribute('d', path.getAttribute('d')); done.style.strokeDasharray = (p * len) + ' ' + len;
                bar.style.width = (p * 100).toFixed(1) + '%';
                timeEl.textContent = 'noch ' + Math.max(0, Math.ceil((1 - p) * secs / speed)) + ' s';
                while (events.length && events[0].at <= p) { const e = events.shift(); try { say(e.ev.run(st)); X.beep(523, .06, 'sine', .04); } catch (err) { console.error(err); } }
                if (p < 1) return requestAnimationFrame(frame);
                arrive();
            }
            function arrive() {
                const res = o.onArrive();
                ctl.revealFog(to);
                [523, 659, 784, 1046].forEach((fq, i) => setTimeout(() => X.beep(fq, .09, 'square', .035), i * 90));
                say(o.tug ? PX('z-anker') + ' <b>Zuhause.</b> Der Schlepper tuckert davon.' : PX('st-R') + ' <b>Angekommen in ' + esc(W.isleName(to)) + '!</b>' + (res && res.first ? ' Neue Insel entdeckt: +40 XP' : ''));
                if (res && res.report && res.report.length) say(PX('w-schluessel') + ' Abnutzung: ' + res.report.map(r => esc(r.part.n) + ' −' + r.dmg + ' %').join(', '));
                timeEl.textContent = ''; fast.hidden = true;
                const end = root.querySelector('.voyage__end'); end.hidden = false;
                end.innerHTML = (o.page ? '<button class="btn btn--primary" type="button" data-enter>Betreten →</button>' : '') + '<button class="btn' + (o.page ? '' : ' btn--primary') + '" type="button" data-close-voy>' + (o.page ? 'Auf der Karte bleiben' : 'Weiter') + '</button>';
                const finish = enter => { closeVoyage(root); resolve(Object.assign({ arrived: true, enter }, res || {})); if (enter && o.page) location.href = X.url(o.page); };
                end.querySelector('[data-close-voy]').addEventListener('click', () => finish(false));
                const en = end.querySelector('[data-enter]'); if (en) { en.addEventListener('click', () => finish(true)); en.focus(); } else end.querySelector('[data-close-voy]').focus();
            }
            requestAnimationFrame(frame);
        });
    }

    W.travel = function (to, o) {
        o = o || {};
        const from = M.pos(), isle = M.isle(to);
        if (!isle) return Promise.resolve({ arrived: false });
        if (X.easy()) { if (o.page) location.href = X.url(o.page); return Promise.resolve({ arrived: true, easy: true }); }
        if (from === to) { if (o.page) location.href = X.url(o.page); return Promise.resolve({ arrived: true, already: true }); }
        if (!M.ready()) {
            const m = X.modal('<h2>Dein Mech ist nicht fahrbereit</h2><p class="muted">Rahmen, Antrieb und Energiekern müssen eingebaut und intakt sein.</p>' +
                '<div class="row">' + (from === 'konto' ? '<a class="btn btn--primary" href="' + X.url('konto/skilltree.html') + '">Zur Werft</a>' : '<button class="btn btn--primary" type="button" data-tow>Notruf: Schlepper nach Hause</button>') +
                '<button class="btn" type="button" data-close>Abbrechen</button></div>');
            const t = m.el.querySelector('[data-tow]'); if (t) t.addEventListener('click', () => { m.close(); W.tow(); });
            return Promise.resolve({ arrived: false });
        }
        if (!M.discovered(to) && !M.canReach(to)) {
            X.modal('<h2>' + esc(isle.n) + ' liegt im Nebel</h2><p class="muted">Für die erste Reise dorthin braucht dein Mech: <b>' + esc(M.islandReqText(to)) + '</b>.</p><p class="small">Es fehlt: ' + esc(M.missing(to).join(' · ')) + '</p>' +
                '<div class="row"><a class="btn btn--primary" href="' + X.url('konto/skilltree.html') + '">Zur Werft</a><button class="btn" type="button" data-close>OK</button></div>');
            return Promise.resolve({ arrived: false });
        }
        const first = !M.discovered(to);
        return runVoyage(from, to, { secs: M.travelSecs(to), label: (first ? 'Expedition nach ' : 'Unterwegs nach ') + isle.n, page: o.page, onArrive: () => M.arrive(to) });
    };
    W.tow = function () {
        const from = M.pos(); if (from === 'konto') return Promise.resolve({ arrived: true });
        return runVoyage(from, 'konto', { secs: 6, tug: true, label: 'Notruf: Schlepper bringt dich heim', onArrive: () => { M.tow(); const n = Math.min(M.taler(), 10); if (n) M.spendTaler(n); return { report: [], first: false, cost: n }; } });
    };
})();
