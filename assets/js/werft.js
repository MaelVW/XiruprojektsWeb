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
    /* opts: { item: Chance 0–1, maxT, luck, minQ, maxQ, taler: [min,max], mats: Anzahl Materialwürfe, rare: Chance auf Splitter/Kern,
              bp: Chance auf einen unbekannten Bauplan, bpT: höchste Stufe dafür } */
    W.loot = function (o) {
        o = o || {}; const out = [];
        if (o.bp && Math.random() < o.bp) { const id = M.randomBp(o.bpT || o.maxT || 3); if (id) out.push({ type: 'bp', id }); }
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
            if (e.type === 'bp') {
                const p = M.part(e.id);
                if (!p || !M.learnBp(e.id)) { const n = M.addTaler(15); return PX('bp') + ' ein Bauplan, den du schon kennst (Altpapier: +' + n + ' Taler)'; }
                return PX('bp') + ' <b class="bp-new">Bauplan: ' + esc(p.n) + '</b>';
            }
            if (e.type === 'item') {
                const it = M.add(e.id, e.q); if (!it) return PX('inventar') + ' <i>Inventar voll – ein Teil ging verloren</i>';
                const p = M.part(e.id); return PX(p.id) + ' <b class="q' + e.q + '">' + esc(p.n) + '</b> <span class="small q' + e.q + '">(' + W.qName(e.q) + ')</span>';
            }
            return '';
        }).filter(Boolean);
    };

    /* Rezept als Chips: Schrott + Materialien, fehlende rot markiert */
    W.costChips = function (c) {
        if (!c) return '';
        const have = M.mats(), sc = M.scrap();
        let h = '<span class="cost-chip' + (sc < c.scrap ? ' is-short' : '') + '" title="Schrott: ' + sc + ' vorhanden">' + PX('schrott') + ' ' + c.scrap + '</span>';
        Object.keys(c.mats || {}).forEach(k => {
            const m = M.mat(k), n = c.mats[k], got = have[k] || 0;
            h += '<span class="cost-chip' + (got < n ? ' is-short' : '') + '" title="' + esc(m.n) + ': ' + got + ' vorhanden">' + PX('mat-' + k) + ' ' + n + '</span>';
        });
        return h;
    };

    /* ── Sonar-Peilung: Baupläne und Material auf einer Insel aufspüren ──
       Der Radarstrahl dreht sich, Echos leuchten kurz auf. Mit 4 Greifer-Würfen
       schnappt man sich, was man erwischt. Je besser der Sensor, desto länger
       leuchten die Echos – ab Sensor 2 sieht man Seeminen, ab Sensor 3 Baupläne. */
    W.bpDots = function (isle) {
        const all = (X.blueprintSpots || {})[isle] || []; if (!all.length) return '';
        const left = M.bpLeft(isle).length;
        return '<span class="bp-dots" title="Baupläne auf dieser Insel: ' + (all.length - left) + ' von ' + all.length + ' gefunden">' + PX('bp') + ' ' +
            all.map((id, i) => '<i class="' + (i < all.length - left ? 'is-found' : '') + '"></i>').join('') + '</span>';
    };
    W.scanButton = function (isle) {
        const wait = M.scanWait(isle), left = M.bpLeft(isle).length;
        return '<button class="btn btn--sm' + (left ? ' btn--primary' : '') + '" type="button" data-scan="' + isle + '"' + (wait ? ' disabled' : '') + '>' + PX('s-radar') + ' ' +
            (wait ? 'Sonar lädt … ' + Math.ceil(wait / 60000) + ' min' : left ? 'Nach Bauplänen peilen' : 'Nach Material peilen') + '</button>';
    };
    W.scan = function (isle) {
        return new Promise(resolve => {
            if (M.pos() !== isle || M.scanWait(isle)) { resolve(null); return; }
            const st = M.stats(), S = st.S, I = M.isle(isle);
            const left = M.bpLeft(isle), bpId = left.find(id => M.scanNeed(M.part(id).t) <= S) || null;
            const tooWeak = !bpId && left.length ? M.scanNeed(Math.min.apply(null, left.map(id => M.part(id).t))) : 0;
            const N = 160, R = 70, vis = Math.min(2.4, .95 + S * .2), TIME = 16;
            const rnd = X.rand, rare = I && I.req ? Math.min(.35, ((I.req.R || 0) + (I.req.S || 0)) * .04) : .02;
            const blips = [];
            const place = type => { let a, r, ok, n = 0; do { a = Math.random() * Math.PI * 2; r = 18 + Math.random() * (R - 24); ok = blips.every(b => Math.hypot(Math.cos(a) * r - Math.cos(b.a) * b.r, Math.sin(a) * r - Math.sin(b.a) * b.r) > 16); } while (!ok && ++n < 40); blips.push({ type, a, r, t: -9, got: false }); };
            if (bpId) place('bp');
            for (let i = 0, n = rnd(3, 4); i < n; i++) place('mat');
            for (let i = 0, n = rnd(1, 2); i < n; i++) place('mine');
            place('junk');
            const m = X.modal('<div class="scan"><h2 class="mb-1">' + PX('s-radar', 26) + ' Sonar-Peilung · ' + esc(I ? I.n : '') + '</h2>' +
                '<p class="small muted mb-2">Der Strahl dreht sich – Echos leuchten kurz auf. Klick sie an, solange sie leuchten. Du hast <b>4 Greifer-Würfe</b>.' +
                (S >= 3 ? ' Dein Sensor erkennt Baupläne (gold) und Seeminen (rot).' : S >= 2 ? ' Dein Sensor erkennt Seeminen (rot) – Baupläne sehen aus wie Material.' : ' Dein Sensor ist schwach: Alle Echos sehen gleich aus.') + '</p>' +
                '<div class="scan__wrap"><canvas class="scan__cv" width="' + N * 2 + '" height="' + N * 2 + '" aria-label="Radarschirm"></canvas></div>' +
                '<div class="scan__hud"><span id="sc-left">Würfe: 4</span><span id="sc-time">' + TIME + ' s</span></div><div class="scan__log small" id="sc-log"></div>' +
                '<div class="row mt-2"><button class="btn btn--sm btn--ghost" type="button" data-close>Abbrechen</button></div></div>', { onClose: () => finish(true) });
            const cv = m.el.querySelector('canvas'), ctx = cv.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            const t0 = performance.now(); let raf = 0, throws = 4, ended = false, sweep = 0;
            const got = [];
            M.scanUsed(isle);
            const pos = b => ({ x: N / 2 + Math.cos(b.a) * b.r, y: N / 2 + Math.sin(b.a) * b.r });
            const col = b => b.type === 'mine' && S >= 2 ? '#ff4d4d' : b.type === 'bp' && S >= 3 ? '#ffd23f' : '#5dff8f';
            function draw(now) {
                const t = (now - t0) / 1000, rest = Math.max(0, TIME - t);
                sweep = (t * Math.PI * 2 / 2.4) % (Math.PI * 2);
                ctx.setTransform(2, 0, 0, 2, 0, 0);
                ctx.fillStyle = '#031208'; ctx.fillRect(0, 0, N, N);
                ctx.strokeStyle = '#0f4a24'; ctx.lineWidth = 1;
                [R, R * .66, R * .33].forEach(r => { ctx.beginPath(); ctx.arc(N / 2, N / 2, r, 0, Math.PI * 2); ctx.stroke(); });
                ctx.beginPath(); ctx.moveTo(N / 2 - R, N / 2); ctx.lineTo(N / 2 + R, N / 2); ctx.moveTo(N / 2, N / 2 - R); ctx.lineTo(N / 2, N / 2 + R); ctx.stroke();
                // Strahl mit Nachleuchten
                for (let i = 0; i < 26; i++) {
                    const a = sweep - i * .03; ctx.strokeStyle = 'rgba(93,255,143,' + (.5 - i * .018).toFixed(3) + ')';
                    ctx.beginPath(); ctx.moveTo(N / 2, N / 2); ctx.lineTo(N / 2 + Math.cos(a) * R, N / 2 + Math.sin(a) * R); ctx.stroke();
                }
                blips.forEach(b => {
                    const d = ((sweep - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                    if (d < .08 && t - b.t > .5) b.t = t;
                    const age = t - b.t; if (b.got || age > vis) return;
                    const p = pos(b), al = 1 - age / vis, c = col(b), sz = b.type === 'bp' ? 5 : 4;
                    ctx.globalAlpha = al; ctx.fillStyle = c;
                    ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
                    ctx.globalAlpha = al * .35; ctx.fillRect(Math.round(p.x - sz / 2) - 2, Math.round(p.y - sz / 2) - 2, sz + 4, sz + 4);
                    ctx.globalAlpha = 1;
                });
                // Rand
                ctx.strokeStyle = '#1f8a45'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(N / 2, N / 2, R + 2, 0, Math.PI * 2); ctx.stroke();
                const te = m.el.querySelector('#sc-time'); if (te) te.textContent = Math.ceil(rest) + ' s';
                if (rest <= 0) { finish(); return; }
                raf = requestAnimationFrame(draw);
            }
            raf = requestAnimationFrame(draw);
            const log = h => { const l = m.el.querySelector('#sc-log'); if (l) l.insertAdjacentHTML('afterbegin', '<div>' + h + '</div>'); };
            cv.addEventListener('pointerdown', e => {
                if (ended || throws <= 0) return;
                const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * N, y = (e.clientY - r.top) / r.height * N;
                const t = (performance.now() - t0) / 1000;
                throws--; m.el.querySelector('#sc-left').textContent = 'Würfe: ' + throws;
                const hit = blips.filter(b => !b.got && t - b.t <= vis).map(b => ({ b, d: Math.hypot(pos(b).x - x, pos(b).y - y) })).filter(o => o.d < 11).sort((a, b) => a.d - b.d)[0];
                if (!hit) { X.beep(160, .08, 'square', .03); log('Daneben – nur Wasser.'); }
                else {
                    const b = hit.b; b.got = true;
                    if (b.type === 'bp') { got.push({ type: 'bp', id: bpId }); X.beep(988, .12, 'triangle'); log(PX('bp') + ' <b>Etwas Papierenes!</b>'); }
                    else if (b.type === 'mat') { got.push.apply(got, W.loot({ mats: 1, rare })); X.beep(660, .06); log(PX('mat-zahnrad') + ' Material am Haken.'); }
                    else if (b.type === 'mine') { const sen = M.installed('sensor') || M.installed('rahmen'); const dmg = sen ? M.damage(sen.u, X.rand(8, 15)) : 0; X.beep(110, .25, 'sawtooth'); log(PX('ev-sturm') + ' <b>Seemine!</b> ' + (sen ? esc(sen.n) + ' −' + dmg + ' %' : 'Bumm.')); }
                    else { X.beep(330, .06); log('Ein alter Stiefel. Weg damit.'); }
                }
                if (throws <= 0 || blips.every(b => b.got || b.type !== 'bp' && b.type !== 'mat')) setTimeout(finish, 500);
            });
            function finish(closed) {
                if (ended) return; ended = true; cancelAnimationFrame(raf);
                const lines = W.grant(got);
                if (!closed) m.close();
                const msg = lines.length ? lines.join('<br>') : 'Diesmal nichts Brauchbares.';
                const extra = tooWeak ? '<p class="small muted mt-1">Dein Sonar spürt hier noch einen Bauplan, kommt aber nicht ran. Sensor ' + tooWeak + ' nötig (du hast ' + S + ').</p>' : '';
                if (!closed || got.length) X.modal('<h2>' + PX('s-radar', 26) + ' Peilung beendet</h2><p>' + msg + '</p>' + extra + '<div class="row"><button class="btn btn--primary" type="button" data-close>Weiter</button></div>');
                resolve({ got, lines });
            }
        });
    };

    /* ── Angeln (wie in Dredge) ───────────────────────────────────────
       Auswerfen → die Pose tanzt → Biss! → am Rad kreist ein Zeiger: drück Leertaste/Klick,
       wenn er in einer hellen Zone steht. Jeder Treffer holt die Schnur ein Stück ein,
       Danebengreifen kostet Zeit. Seltene Fische brauchen mehr Treffer, drehen schneller und
       ab Episch die Richtung. Eine bessere Angel macht die Zonen breiter und den Zeiger ruhiger.
       Was am Haken hängt, steht beim Auswerfen fest und bleibt bis zum Schluss eine Silhouette. */
    const FISH_W = [0, 100, 55, 28, 13, 5, 1.5];
    W.fishCard = (id, n) => { const f = M.fishInfo(id); return f ? '<div class="item item--mat" data-q="' + f.q + '" title="' + esc(f.d) + '"><span class="item__icon">' + PX('fish-' + id, 36) + '</span><span class="item__name">' + esc(f.n) + '</span><span class="item__count">' + X.fmt(n) + '×</span></div>' : ''; };
    function rollCatch(sp) {
        const r = Math.random(), luck = M.stats().fx.luck || 0;
        if (r < .02 && sp.tier >= 2) { const id = M.randomBp(Math.min(5, sp.tier + 1)); if (id) return { type: 'bp', id, q: Math.min(6, M.part(id).t + 1), hits: 3, icon: 'bp' }; }
        if (r < .10) { const pt = W.rollPart({ maxT: Math.min(5, sp.tier + 1), luck: .1 * sp.tier }); return { type: 'item', id: pt.id, q: pt.q, hits: 2 + Math.ceil(pt.q / 2), icon: pt.id }; }
        if (r < .14) return { type: 'taler', n: X.rand(5, 15) * sp.tier, q: 1, hits: 2, icon: 'ev-kiste' };
        if (r < .26) { const e = W.loot({ mats: 1, rare: .06 * sp.tier })[0]; return { type: 'mat', id: e.id, n: e.n, q: e.id === 'nebelkern' ? 5 : e.id === 'splitter' ? 3 : 1, hits: 2, icon: 'mat-' + e.id }; }
        const pool = sp.fish.map(id => M.fishInfo(id)).filter(Boolean), w = pool.map(f => FISH_W[f.q] * (1 + luck * (f.q - 1) * .4));
        let x = Math.random() * w.reduce((a, b) => a + b, 0), f = pool[0];
        for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { f = pool[i]; break; } }
        return { type: 'fish', id: f.id, q: f.q, hits: [0, 2, 3, 3, 4, 5, 6][f.q], icon: 'fish-' + f.id };
    }
    function landCatch(c) {
        if (c.type === 'fish') { M.addFish(c.id, 1); const f = M.fishInfo(c.id); return '<b class="q' + f.q + '">' + esc(f.n) + '</b> <span class="small q' + f.q + '">(' + W.qName(f.q) + (f.abart ? ', Abart' : '') + ')</span> · ' + f.v + ' ' + PX('taler') + ' Wert'; }
        return W.grant([c.type === 'mat' ? { type: 'mat', id: c.id, n: c.n } : c.type === 'taler' ? { type: 'taler', n: c.n } : c.type === 'bp' ? { type: 'bp', id: c.id } : { type: 'item', id: c.id, q: c.q }]).join(', ');
    }
    W.fish = function (spotId) {
        return new Promise(resolve => {
            const sp = M.spot(spotId), miss = M.fishMissing(spotId);
            if (!sp || miss.length) { X.toast('Hier kannst du gerade nicht angeln', miss.join(' · '), { iconHtml: PX('ic-angel', 26), type: 'error' }); resolve(null); return; }
            M.useSpot(spotId);
            const c = rollCatch(sp), rod = M.rod(), anim = X.setting('anim') !== false;
            const N = 120, R = 46, speed = Math.max(90, 120 + c.q * 34 - rod * 14), width = Math.max(14, 44 - c.q * 5 + rod * 6), zonesN = c.q >= 4 ? 2 : 1;
            const TIME = 8 + c.hits * 1.6;
            const m = X.modal('<div class="fishing"><h2 class="mb-1">' + PX('ic-angel', 26) + ' ' + esc(sp.n) + '</h2>' +
                '<p class="small muted mb-2" id="fi-say">Du wirfst die ' + esc(M.rodInfo().n) + ' aus …</p>' +
                '<div class="fishing__stage"><canvas class="fishing__cv" width="' + N * 2 + '" height="' + N * 2 + '" aria-label="Angel-Rad"></canvas>' +
                '<div class="fishing__catch" style="--qc:var(--q' + c.q + ')">' + PX(c.icon, 64) + '</div></div>' +
                '<div class="fishing__bars"><span>Schnur</span><div class="bar"><div class="bar__fill" id="fi-line" style="width:0%"></div></div><span>Zeit</span><div class="bar"><div class="bar__fill fishing__time" id="fi-time" style="width:100%"></div></div></div>' +
                '<div class="row mt-2" style="justify-content:center"><button class="btn btn--primary" type="button" id="fi-reel" disabled>Einholen <kbd>Leertaste</kbd></button><button class="btn btn--ghost" type="button" data-close>Abbrechen</button></div></div>',
                { onClose: () => end(false, true) });
            const el = m.el, cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), say = h => { el.querySelector('#fi-say').innerHTML = h; };
            let phase = 0, ang = 0, dir = 1, hits = 0, left = TIME, last = 0, raf = 0, done = false, zones = [], flash = 0;
            const newZones = () => { zones = []; for (let i = 0; i < zonesN; i++) { let a, n = 0; do { a = Math.random() * 360; } while (n++ < 20 && (zones.some(z => Math.abs(((a - z + 540) % 360) - 180) < width * 1.6) || Math.abs(((a - ang + 540) % 360) - 180) < 50)); zones.push(a); } };
            function draw() {
                ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, N, N);
                ctx.fillStyle = '#071526'; ctx.beginPath(); ctx.arc(N / 2, N / 2, R + 14, 0, Math.PI * 2); ctx.fill();
                ctx.lineWidth = 14; ctx.strokeStyle = '#13243a'; ctx.beginPath(); ctx.arc(N / 2, N / 2, R, 0, Math.PI * 2); ctx.stroke();
                if (phase === 2) zones.forEach(z => { ctx.strokeStyle = flash > 0 ? '#ffffff' : '#5dff8f'; ctx.beginPath(); ctx.arc(N / 2, N / 2, R, (z - width / 2) * Math.PI / 180, (z + width / 2) * Math.PI / 180); ctx.stroke(); });
                ctx.lineWidth = 2; ctx.strokeStyle = '#000'; [R - 7, R + 7].forEach(r => { ctx.beginPath(); ctx.arc(N / 2, N / 2, r, 0, Math.PI * 2); ctx.stroke(); });
                if (phase === 2) {   // Zeiger
                    const a = ang * Math.PI / 180;
                    ctx.lineWidth = 4; ctx.strokeStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(N / 2 + Math.cos(a) * 18, N / 2 + Math.sin(a) * 18); ctx.lineTo(N / 2 + Math.cos(a) * (R + 9), N / 2 + Math.sin(a) * (R + 9)); ctx.stroke();
                    ctx.fillStyle = '#fde68a'; ctx.fillRect(Math.round(N / 2 + Math.cos(a) * (R + 9)) - 3, Math.round(N / 2 + Math.sin(a) * (R + 9)) - 3, 6, 6);
                }
            }
            const inZone = () => zones.findIndex(z => Math.abs(((ang - z + 540) % 360) - 180) <= width / 2 + 2);
            function frame(now) {
                if (done) return;
                const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
                if (phase === 2) {
                    ang = (ang + dir * speed * dt + 360) % 360; left -= dt; flash -= dt;
                    el.querySelector('#fi-time').style.width = Math.max(0, left / TIME * 100) + '%';
                    if (left <= 0) { lose(); return; }
                }
                draw(); raf = requestAnimationFrame(frame);
            }
            function reel() {
                if (phase !== 2 || done) return;
                const z = inZone();
                if (z >= 0) {
                    hits++; flash = .12; X.beep(520 + hits * 70, .06, 'square', .04);
                    el.querySelector('#fi-line').style.width = (hits / c.hits * 100) + '%';
                    if (hits >= c.hits) { win(); return; }
                    if (c.q >= 4) dir = -dir;
                    newZones();
                } else { left -= 1.5; X.beep(150, .1, 'sawtooth', .03); cv.classList.remove('is-miss'); void cv.offsetWidth; cv.classList.add('is-miss'); }
            }
            function win() {
                phase = 3; const html = landCatch(c);
                el.querySelector('.fishing__catch').classList.add('is-landed');
                [659, 784, 1046].forEach((f, i) => setTimeout(() => X.beep(f, .1, 'triangle', .05), i * 90));
                if (c.q >= 5) X.confetti(90);
                say(PX('st-R') + ' <b>Gefangen!</b> ' + html);
                finishButtons(true, html);
            }
            function lose() {
                phase = 3; X.beep(130, .3, 'sawtooth', .04);
                el.querySelector('.fishing__catch').classList.add('is-gone');
                say(PX('ev-sturm') + ' <b>Die Schnur ist schlaff.</b> ' + X.pick(['Weg ist er.', 'Der war zu schnell.', 'Nur ein paar Blasen bleiben zurück.']));
                finishButtons(false, '');
            }
            function finishButtons(ok, html) {
                cancelAnimationFrame(raf); draw();
                const row = el.querySelector('.row'), more = M.fishMissing(spotId).length === 0;
                row.innerHTML = (more ? '<button class="btn btn--primary" type="button" id="fi-again">Nochmal auswerfen · ' + M.spotStock(spotId) + ' übrig</button>' : '<span class="small muted">' + esc(M.fishMissing(spotId).join(' · ')) + '</span>') + '<button class="btn" type="button" id="fi-done">Fertig</button>';
                row.querySelector('#fi-done').addEventListener('click', () => { end(ok); m.close(); });
                const ag = row.querySelector('#fi-again'); if (ag) ag.addEventListener('click', () => { end(ok); m.close(); W.fish(spotId).then(resolve2 => resolve2); });
                result = { ok, html, c };
            }
            let result = null;
            function end(ok, closed) { if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('keydown', onKey); resolve(result || { ok: false }); }
            const onKey = e => { if ((e.key === ' ' || e.key === 'Enter') && phase === 2) { e.preventDefault(); reel(); } };
            addEventListener('keydown', onKey);
            cv.addEventListener('pointerdown', e => { e.preventDefault(); reel(); });
            el.querySelector('#fi-reel').addEventListener('click', reel);
            // Auswerfen und Biss abwarten
            phase = 1; draw(); raf = requestAnimationFrame(frame);
            X.beep(300, .08, 'triangle', .03);
            setTimeout(() => { if (done) return; say('Die Pose tanzt auf den Wellen …'); }, 500);
            setTimeout(() => {
                if (done) return;
                phase = 2; newZones(); el.querySelector('#fi-reel').disabled = false; el.querySelector('#fi-reel').focus();
                say('<b>Biss!</b> Drück, wenn der Zeiger in einer grünen Zone steht – ' + c.hits + ' Treffer' + (c.q >= 4 ? ', er wechselt die Richtung' : '') + '.');
                X.beep(880, .07, 'square', .04); X.beep(990, .07, 'square', .04);
            }, anim ? 1100 + Math.random() * 1500 : 300);
        });
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
                ? '<span>' + PX('z-anker', 18) + ' Dein Mech liegt hier vor Anker.</span>' + W.bpDots(isle) + '<span class="spacer"></span>' + ((X.blueprintSpots || {})[isle] ? W.scanButton(isle) : '') + '<span class="small muted">' + (M.ready() ? 'Fahrbereit' : 'Nicht fahrbereit – zur Werft im Heimathafen') + '</span>'
                : '<span>' + PX('z-kompass', 18) + ' Dein Mech ist gerade in <b>' + esc(W.isleName(pos)) + '</b>. Um hier etwas zu tun, musst du herreisen.</span>' +
                  '<button class="btn btn--primary btn--sm" type="button" data-go-here>' + PX('ev-schiff') + ' Hierher reisen (' + Math.round(M.travelSecs(isle)) + ' s)</button>';
            const b = el.querySelector('[data-go-here]');
            if (b) b.addEventListener('click', () => W.travel(isle).then(r => { if (r && r.arrived) { draw(); if (onArrive) onArrive(); } }));
            const sc = el.querySelector('[data-scan]');
            if (sc) sc.addEventListener('click', () => W.scan(isle).then(() => { draw(); if (onArrive) onArrive(); }));
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
        { w: 2, run(st) { const l = W.grant(W.loot({ item: .55, maxT: 3, mats: 1, taler: [3, 12], bp: .1, bpT: 2 })); return PX('ev-kiste') + ' <b>Eine treibende Kiste!</b> Darin: ' + l.join(', ') + '.'; } },
        { w: 3, run(st) { const rep = M.wear(2, Math.round(11 * (1 - Math.min(.9, st.fx.storm || 0))), ['antrieb', 'rahmen', 'panzer']); return PX('ev-sturm') + ' <b>Sturm!</b> ' + (rep.length ? 'Schaden: ' + rep.map(r => esc(r.part.n) + ' −' + r.dmg + ' %').join(', ') + '.' : 'Deine Panzerung hält alles ab.'); } },
        { w: 1.4, run() { X.egg('m-flaschenpost'); return PX('ev-flasche') + ' <b>Flaschenpost:</b> „' + X.pick(BOTTLE) + '“'; } },
        { w: .9, run(st) { const id = M.randomBp(st.S >= 3 ? 3 : 2); if (!id) return PX('ev-flasche') + ' <b>Eine Kartenrolle</b> treibt vorbei – leider völlig aufgeweicht.'; M.learnBp(id); return PX('bp') + ' <b>Eine wasserdichte Kartenrolle!</b> Darin: der Bauplan für <b class="bp-new">' + esc(M.part(id).n) + '</b>.'; } },
        { w: 2, run() { const n = M.addTaler(X.rand(4, 14)); return PX('ev-schiff') + ' <b>Ein Händlerschiff</b> kauft dir alte Schrauben ab: +' + n + ' ' + PX('taler'); } },
        { w: 2, run(st) { if (st.S >= 3) { X.addXP(6, 'Nebelbank'); return PX('ev-nebel') + ' <b>Nebelbank.</b> Dein Sensor erkennt Umrisse einer fernen Küste. +6 XP'; } return PX('ev-nebel') + ' <b>Nebelbank.</b> Der Sensor rauscht. Man sieht die eigenen Paddel kaum.'; } },
        { w: 1.4, run() { X.addXP(4, 'Wal'); return PX('ev-wal') + ' <b>Ein Wal</b> begleitet dich ein Stück und bläst eine Fontäne. +4 XP'; } },
        { w: 1, run(st) { if (st.S >= 4 && Math.random() < .5) { M.addMat('splitter', 1); return PX('ev-drache') + ' <b>Ein grüner Schatten</b> zieht unter dir vorbei. Im Kielwasser glitzert ein Kristallsplitter!'; } return PX('ev-drache') + ' <b>Ein grüner Schatten</b> zieht unter dir vorbei … dann ist er weg.'; } },
        { w: 2, run() { return PX('ev-moewe') + ' <b>Möwen</b> kreisen über dem Mech. Eine klaut eine Schraube. Frech.'; } },
        { w: 1.5, run() { return PX('ev-sonne') + ' <b>Spiegelglatte See.</b> Der Mech brummt zufrieden vor sich hin.'; } }
    ];
    const pickEvent = () => { let r = Math.random() * EVENTS.reduce((a, e) => a + e.w, 0); for (const e of EVENTS) { r -= e.w; if (r <= 0) return e; } return EVENTS[0]; };
    const TIPS = ['Tipp: Zu weit für eine Fahrt? Dein Mech plant eine Route mit Zwischenstopps über Inseln, die du schon kennst.', 'Tipp: Sturmsee, Nebelbank und Riffgürtel kosten eine Stufe mehr Reichweite.', 'Tipp: Auf jeder Insel liegen verschollene Baupläne. Peil sie mit dem Sonar an, wenn dein Mech dort vor Anker liegt.', 'Tipp: In der Werft presst du Schrott zu Kabeln, Zahnrädern und Platinen.', 'Tipp: Ein besserer Antrieb verkürzt jede Reise.', 'Tipp: Zubehör wie der Messingkompass macht dich schneller.', 'Tipp: Panzerung schützt vor Sturmschäden.', 'Tipp: Mit Sturmlaterne und Funkgerät erlebst du unterwegs mehr.', 'Tipp: Kaputte Teile repariert die Werft im Heimathafen – oder die Funkenschmiede.'];

    function voyageView(stops, label) {
        const pts = stops.map(id => M.isle(id)), pad = 230;
        let x0 = Math.min.apply(null, pts.map(p => p.x)) - pad, x1 = Math.max.apply(null, pts.map(p => p.x)) + pad;
        let y0 = Math.min.apply(null, pts.map(p => p.y)) - pad, y1 = Math.max.apply(null, pts.map(p => p.y)) + pad;
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
        // Die Pixel-Karte von Sektaria als Ladebildschirm, mit Route (je Etappe ein Pfad), Stopps und Mech-Figur
        const ctl = X.mapPix.mount(root.querySelector('.voyage__map'), { discovered: id => M.discovered(id), visitedSecret, unknown: false, view: [x0, y0, w, h], fit: 'cover' });
        let r = '';
        for (let i = 1; i < stops.length; i++) r += '<path class="voyage__route" data-leg="' + (i - 1) + '" d="' + X.mapArt.route(stops[i - 1], stops[i]) + '"/>';
        for (let i = 1; i < stops.length; i++) r += '<path class="voyage__done" data-leg="' + (i - 1) + '" d=""/>';
        stops.slice(1, -1).forEach(id => { const I = M.isle(id); r += '<rect class="voyage__stop" x="' + (I.x - 12) + '" y="' + (I.y + I.s * .45 - 12) + '" width="24" height="24"/>'; });
        ctl.layer('route').innerHTML = r;
        root._ctl = ctl;
        return root;
    }
    function closeVoyage(root) { if (root._ctl) setTimeout(() => root._ctl.destroy(), 360); document.body.style.overflow = ''; root.style.transition = 'opacity .35s'; root.style.opacity = '0'; setTimeout(() => root.remove(), 360); }
    function mechToken(f, run, tug) {
        if (tug) return '<g transform="translate(-30 -22)"><path d="M0 18 Q30 32 60 18 L54 30 L6 30Z" fill="#b91c1c" stroke="#000" stroke-width="2"/><rect x="18" y="4" width="22" height="14" fill="#f8fafc" stroke="#000" stroke-width="2"/><rect x="24" y="-6" width="6" height="10" fill="#111827"/></g>';
        return '<g transform="translate(-40 -70) scale(.34)">' + X.mechArt.draw(f, run).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</g>';
    }

    /* Läuft eine Reise ab: Mech folgt der Route Etappe für Etappe (dazwischen je M.STOP Sekunden
       Zwischenstopp), Ereignisse unterwegs, am Ende Ankunft.
       o: { stops: [Start, …, Ziel], secs (nur Schlepper), label, page, tug, onArrive() } */
    function runVoyage(o) {
        return new Promise(resolve => {
            const stops = o.stops, from = stops[0], to = stops[stops.length - 1], root = voyageView(stops, o.label);
            const ctl = root._ctl, PS = ctl.S, legs = [];
            for (let i = 1; i < stops.length; i++) {
                const path = root.querySelector('.voyage__route[data-leg="' + (i - 1) + '"]');
                legs.push({ a: stops[i - 1], b: stops[i], path, done: root.querySelector('.voyage__done[data-leg="' + (i - 1) + '"]'), len: path.getTotalLength(), secs: o.secs || M.legSecs(stops[i - 1], stops[i]) });
            }
            // Zeitplan: Etappe, Stopp, Etappe, …
            const plan = []; let T = 0;
            legs.forEach((L, i) => { plan.push({ leg: i, t0: T, secs: L.secs }); T += L.secs; if (i < legs.length - 1) { plan.push({ stop: i, t0: T, secs: M.STOP }); T += M.STOP; } });
            const tok = document.createElement('canvas'); tok.width = 44; tok.height = 44; ctl.place(tok, 0, 0, 44 * PS, 44 * PS, 'voyage__mech');
            if (o.tug) X.mapPix.sprite(mechToken(0, false, true), [-36, -30, 72, 44], 24, 15).then(sp => { if (sp) { tok.width = 24; tok.height = 15; tok.getContext('2d').drawImage(sp, 0, 0); tok.style.width = 24 * PS + 'px'; tok.style.height = 15 * PS + 'px'; } });
            const bar = root.querySelector('.voyage__progress i'), log = root.querySelector('.voyage__log'), timeEl = root.querySelector('.voyage__time');
            const calm = X.setting('anim') === false;
            let t = 0, speed = 1, last = performance.now(), tokT = 0, seg = -1, lastPt = null;
            const st = M.stats(), events = [];
            if (!o.tug) legs.forEach((L, li) => {
                const n = Math.min(4, Math.round((.5 + M.dist(L.a, L.b) / 600) * (1 + (st.fx.events || 0)) + Math.random() * .6));
                for (let i = 0; i < n; i++) events.push({ leg: li, at: .14 + (i + Math.random() * .7) / n * .74, ev: pickEvent() });
            });
            const say = html => { const li = document.createElement('li'); li.innerHTML = html; log.appendChild(li); log.scrollTop = log.scrollHeight; };
            say(o.tug ? PX('ev-schiff') + ' Der Schlepper hat dich am Haken. Ab nach Hause!' : PX('z-anker') + ' Leinen los in <b>' + esc(W.isleName(from)) + '</b>. Ziel: <b>' + esc(W.isleName(to)) + '</b>' +
                (stops.length > 2 ? ' über ' + stops.slice(1, -1).map(id => '<b>' + esc(W.isleName(id)) + '</b>').join(', ') + ' (' + (stops.length - 2) + ' Zwischenstopp' + (stops.length > 3 ? 's' : '') + ')' : ' · ' + Math.round(M.dist(from, to) / 10) + ' Seemeilen') + '.');
            const zones = []; legs.forEach(L => M.legZones(L.a, L.b).forEach(z => { if (!zones.includes(z)) zones.push(z); }));
            if (!o.tug && zones.length) say(PX('ev-sturm') + ' Achtung, schwierige Gewässer: ' + zones.map(z => '<b>' + esc(z.n) + '</b>').join(', ') + '.');
            const fast = root.querySelector('[data-fast]');
            fast.addEventListener('click', () => { speed = speed === 1 ? 3 : 1; fast.setAttribute('aria-pressed', speed === 3); fast.classList.toggle('btn--primary', speed === 3); });
            [196, 247, 294].forEach((fq, i) => setTimeout(() => X.beep(fq, .15, 'triangle', .04), 200 + i * 300));
            function placeTok(pt, flip, now) {
                const bob = calm ? 0 : Math.sin(now / 260) * 3, tw = parseFloat(tok.style.width), th = parseFloat(tok.style.height);
                tok.style.left = (Math.round((pt.x - tw / 2) / PS) * PS) + 'px'; tok.style.top = (Math.round((pt.y - th * .86 + bob) / PS) * PS) + 'px';
                tok.style.transform = flip < 0 ? 'scaleX(-1)' : '';
            }
            function frame(now) {
                const dt = Math.min(.1, (now - last) / 1000); last = now;
                t = Math.min(T, t + dt * speed);
                let k = plan.length - 1; while (k > 0 && plan[k].t0 > t) k--;
                const P = plan[k];
                if (k !== seg) {   // neuer Abschnitt
                    if (P.stop != null) {
                        const at = legs[P.stop].b, res = M.arrive(at);
                        X.beep(440, .08, 'square', .035); X.beep(554, .08, 'square', .035);
                        say(PX('z-anker') + ' <b>Zwischenstopp in ' + esc(W.isleName(at)) + '.</b> ' + X.pick(['Proviant fassen, Schrauben nachziehen …', 'Kurz durchschnaufen, Kurs prüfen …', 'Der Mech tankt Sonne …', 'Ein Hafenarbeiter winkt dir zu.']) +
                            (res && res.report && res.report.length ? ' (Abnutzung: ' + res.report.map(r => esc(r.part.n) + ' −' + r.dmg + ' %').join(', ') + ')' : ''));
                    }
                    seg = k;
                }
                tokT += dt;
                if (!o.tug && (tokT > .2 || !tok.dataset.on)) { tokT = 0; tok.dataset.on = 1; X.mapPix.mechSprite(tok, now / 1000); }
                if (P.leg != null) {
                    const L = legs[P.leg], p = Math.min(1, (t - P.t0) / P.secs);
                    const pt = L.path.getPointAtLength(p * L.len), ahead = L.path.getPointAtLength(Math.min(L.len, p * L.len + 2));
                    placeTok(pt, ahead.x < pt.x ? -1 : 1, now); lastPt = pt;
                    legs.forEach((M2, i) => { if (i < P.leg) { M2.done.setAttribute('d', M2.path.getAttribute('d')); M2.done.style.strokeDasharray = 'none'; } });
                    L.done.setAttribute('d', L.path.getAttribute('d')); L.done.style.strokeDasharray = (p * L.len) + ' ' + L.len;
                    while (events.length && events[0].leg === P.leg && events[0].at <= p) { const e = events.shift(); try { say(e.ev.run(st)); X.beep(523, .06, 'sine', .04); } catch (err) { console.error(err); } }
                } else if (lastPt) placeTok(lastPt, 1, now);
                bar.style.width = (t / T * 100).toFixed(1) + '%';
                timeEl.textContent = P.stop != null ? 'Zwischenstopp · noch ' + Math.max(0, Math.ceil((T - t) / speed)) + ' s' : 'noch ' + Math.max(0, Math.ceil((T - t) / speed)) + ' s';
                if (t < T) return requestAnimationFrame(frame);
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
        const stops = M.canReach(to) ? M.route(to) : null;
        if (!stops) {
            const fog = !M.discovered(to);
            X.modal('<h2>' + esc(isle.n) + (fog ? ' liegt im Nebel' : ' ist zu weit weg') + '</h2><p class="muted">' + (fog ? 'Für die erste Reise dorthin braucht dein Mech: ' : 'Von ' + esc(W.isleName(from)) + ' aus braucht dein Mech: ') + '<b>' + esc(M.islandReqText(to)) + '</b>.</p>' +
                '<p class="small">Es fehlt: ' + esc(M.missing(to).join(' · ')) + '</p><p class="small muted">Je weiter die Strecke, desto mehr Reichweite braucht sie. Reicht sie nicht für die direkte Fahrt, plant dein Mech eine Route mit Zwischenstopps über Inseln, die du schon kennst.</p>' +
                '<div class="row"><a class="btn btn--primary" href="' + X.url('konto/skilltree.html') + '">Zur Werft</a><button class="btn" type="button" data-close>OK</button></div>');
            return Promise.resolve({ arrived: false });
        }
        const first = !M.discovered(to);
        return runVoyage({ stops, label: (first ? 'Expedition nach ' : 'Unterwegs nach ') + isle.n + (stops.length > 2 ? ' · ' + (stops.length - 2) + ' Zwischenstopp' + (stops.length > 3 ? 's' : '') : ''), page: o.page, onArrive: () => M.arrive(to) });
    };
    W.tow = function () {
        const from = M.pos(); if (from === 'konto') return Promise.resolve({ arrived: true });
        return runVoyage({ stops: [from, 'konto'], secs: 6, tug: true, label: 'Notruf: Schlepper bringt dich heim', onArrive: () => { M.tow(); const n = Math.min(M.taler(), 10); if (n) M.spendTaler(n); return { report: [], first: false, cost: n }; } });
    };
})();
