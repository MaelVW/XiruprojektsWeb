/* ==========================================================================
   PIXMAG Mini – Regeln: Zustand, Züge, Kampf, KI, Zauber, Gegenstände, Speichern
   Reine Logik. Grafik & Ton laufen über PXM.fx, Oberfläche über PXM.ui
   (beides setzt arcade/js/dungeon.js). Ohne Oberfläche läuft alles „stumm“.
   ========================================================================== */
(function () {
    'use strict';
    const PXM = window.PXM;
    const D = PXM.D, W = PXM.W, T = W.T;
    const NOOP = () => 0;
    PXM.fx = PXM.fx || {};
    ['float', 'burst', 'proj', 'zap', 'flash', 'bump', 'shake', 'ring', 'sfx', 'glow', 'snap', 'lock', 'die'].forEach(k => { if (!PXM.fx[k]) PXM.fx[k] = NOOP; });
    PXM.ui = PXM.ui || {};
    ['refresh', 'shop', 'death', 'victory', 'floor', 'logged', 'book', 'boss', 'turn'].forEach(k => { if (!PXM.ui[k]) PXM.ui[k] = NOOP; });
    const fx = PXM.fx, ui = PXM.ui;

    const G = PXM.G = {};
    let S = null;
    let vd = 0;            // Verzögerung für Effekte (ms) innerhalb eines Zuges

    /* ── Hilfen ──────────────────────────────────────────────────────── */
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const rr = r => ri(r[0], r[1]);
    const chance = p => Math.random() < p;
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const idx = (x, y) => y * S.map.w + x;
    const IT = k => D.ITEMS[k] || {};
    const MR = W.rng((Math.random() * 4294967295) >>> 0);   // Zufall für Beute während des Spiels
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function weighted(R, arr) {
        const tot = arr.reduce((s, o) => s + (o.w || 0), 0);
        let r = R() * tot;
        for (const o of arr) { r -= (o.w || 0); if (r <= 0) return o; }
        return arr[arr.length - 1];
    }
    function egg(id) { const X = window.XIRU; if (X && X.egg) X.egg(id); }
    function once(k, xp, t) { const X = window.XIRU; if (X && X.once) X.once(k, xp, t); }

    /* ── Namen mit Artikel (der Goblin / die Ratte / das Skelett) ─────── */
    const GEN = { ratte: 'f', fledermaus: 'f', goblin: 'm', schleim: 'm', spinne: 'f', skelett: 'n', schuetze: 'm', mimik: 'f', zombie: 'm', geist: 'm', ork: 'm', hexer: 'm', flamme: 'n', troll: 'm', golem: 'm', herz: 'n' };
    const SHORT = { goblinkoenig: 'Grimmzahn', drache: 'Ignifax', lich: 'Morgrath', haendler: 'Krummfinger' };
    const ART = { n: { m: 'der', f: 'die', n: 'das' }, a: { m: 'den', f: 'die', n: 'das' }, d: { m: 'dem', f: 'der', n: 'dem' } };
    function adjs(m) { const a = []; if (m.elite) a.push('wütend'); if (m.k === 'schleim' && m.size === 1) a.push('klein'); return a; }
    function nm(m, c) {
        c = c || 'n';
        if (SHORT[m.k]) return SHORT[m.k];
        const g = GEN[m.k] || 'm';
        const base = m.k === 'herz' ? (c === 'd' ? 'Herzen der Dunkelheit' : 'Herz der Dunkelheit') : D.MON[m.k].n;
        const end = (c === 'n' || (c === 'a' && g !== 'm')) ? 'e' : 'en';
        return ART[c][g] + ' ' + adjs(m).map(a => a + end + ' ').join('') + base;
    }
    function nmIndef(m) {
        if (SHORT[m.k]) return SHORT[m.k];
        const g = GEN[m.k] || 'm';
        const end = { m: 'en', f: 'e', n: 'es' }[g];
        return { m: 'einen', f: 'eine', n: 'ein' }[g] + ' ' + adjs(m).map(a => a + end + ' ').join('') + D.MON[m.k].n;
    }
    G.name = nm;

    const ST_LABEL = {
        burn: ['brennt', '#ff7a2a'], soulburn: ['Höllenfeuer', '#c08cff'], poison: ['vergiftet', '#7bd651'],
        frozen: ['gefroren', '#8ee8ff'], stun: ['betäubt', '#ffe95a'], wet: ['nass', '#6fb0ff'],
        blind: ['geblendet', '#fff3b0'], root: ['festgehalten', '#c9a06a'], weak: ['geschwächt', '#b8bdd0'],
        fear: ['verängstigt', '#e070d0'], slow: ['im Schlamm', '#c9a06a'], haste: ['Hast', '#f6d55c'],
        invis: ['unsichtbar', '#c08cff'], revive: ['Wiedergeburt', '#fff3b0']
    };
    G.ST_LABEL = ST_LABEL;

    /* ── Protokoll ───────────────────────────────────────────────────── */
    function log(m, c) {
        const L = S.log, last = L[L.length - 1];
        if (last && last.m === m) last.n = (last.n || 1) + 1;
        else L.push({ m, c: c || '', t: S.turn });
        if (L.length > 80) L.splice(0, L.length - 80);
        ui.logged();
    }
    G.log = (m, c) => S && log(m, c);

    /* ── Werte des Spielers ──────────────────────────────────────────── */
    const wpn = () => S.p.wpn ? IT(S.p.wpn.k) : {};
    const arm = () => S.p.arm ? IT(S.p.arm.k) : {};
    G.maxMp = () => S.p.mmp + (arm().mp || 0) + (wpn().mp || 0);
    G.spellPower = () => S.p.sp + (wpn().sp || 0) + (arm().sp || 0);
    G.defense = () => S.p.arm ? (arm().def || 0) + (S.p.arm.p || 0) : 0;
    G.dodge = () => Math.max(0, Math.min(.45, S.p.dodge + (arm().dodge || 0)));
    G.crit = () => S.p.crit + (wpn().crit || 0);
    G.meleeRange = () => {
        const b = wpn().dmg || [1, 2], plus = (S.p.wpn && S.p.wpn.p) || 0;
        return [b[0] + plus + S.p.str, b[1] + plus + S.p.str];
    };

    /* ── Gegenstände ─────────────────────────────────────────────────── */
    const INV_MAX = 14;
    G.INV_MAX = INV_MAX;
    function itemName(it) {
        if (!it) return '';
        if (it.k === 'gold') return it.q + ' Gold';
        if (it.k === 'rune') return 'Rune: ' + D.EL[it.el].n;
        let s = IT(it.k).n || it.k;
        if (it.p) s += ' +' + it.p;
        if (it.q > 1) s += ' ×' + it.q;
        return s;
    }
    G.itemName = itemName;
    const stackable = k => { const t = IT(k).t; return t === 'trank' || t === 'rolle' || t === 'schrott'; };
    const AUTO = { gold: 1, tinte: 1, rune: 1, realkristall: 1 };
    function canTake(it) {
        if (AUTO[it.k]) return true;
        if (stackable(it.k) && S.p.inv.some(o => o.k === it.k)) return true;
        return S.p.inv.length < INV_MAX;
    }
    G.canTake = canTake;
    function addItem(it) {
        const p = S.p;
        if (it.k === 'tinte') { p.ink += it.q || 1; return true; }
        if (stackable(it.k)) { const s = p.inv.find(o => o.k === it.k); if (s) { s.q = (s.q || 1) + (it.q || 1); return true; } }
        if (p.inv.length >= INV_MAX) return false;
        p.inv.push({ k: it.k, q: it.q || 1, p: it.p || 0 });
        return true;
    }
    function take(it) {
        const p = S.p;
        switch (it.k) {
            case 'gold': p.gold += it.q; S.stats.gold += it.q; fx.float(p.x, p.y, '+' + it.q + ' Gold', '#facc15', vd, 'small'); fx.sfx('coin'); return true;
            case 'tinte': p.ink += it.q || 1; log('Ein Fläschchen Zaubertinte! (' + p.ink + ' im Gepäck)', 'magic'); fx.sfx('rune'); return true;
            case 'rune': learnRune(it.el); fx.burst(p.x, p.y, it.el, 26, 0); fx.sfx('rune'); return true;
            case 'realkristall': archiveFound(); return true;
        }
        return addItem(it);
    }
    function dropAt(x, y, it) { S.items.push({ x, y, it }); }
    function pickup() {
        const p = S.p;
        S.items.filter(o => o.x === p.x && o.y === p.y).forEach(o => {
            if (take(o.it)) {
                S.items.splice(S.items.indexOf(o), 1);
                if (!AUTO[o.it.k]) { log('Aufgehoben: ' + itemName(o.it) + '.'); fx.sfx('pickup'); }
            } else log('Dein Rucksack ist voll – ' + itemName(o.it) + ' bleibt liegen.', 'bad');
        });
    }
    function randomLoot(R, depth) {
        const roll = R();
        if (roll < .17) return makeGear(R, depth, 'waffe');
        if (roll < .32) return makeGear(R, depth, 'ruestung');
        const pool = D.FLOOR_LOOT.map(k => D.ITEMS[k]).filter(d => !d.minD || depth >= d.minD);
        return { k: weighted(R, pool).id, q: 1 };
    }
    function makeGear(R, depth, t) {
        const list = (t === 'waffe' ? D.WEAPONS : D.ARMORS).map(k => D.ITEMS[k]).filter(d => d.minD <= depth + 1);
        const d = weighted(R, list.map(x => ({ id: x.id, w: 1 + x.minD * .8 })));
        const plus = R() < .25 + depth * .03 ? 1 + Math.floor(R() * (1 + depth / 6)) : 0;
        return { k: d.id, q: 1, p: plus };
    }

    /* ── Runen & Zauber ──────────────────────────────────────────────── */
    function learnRune(el, silent) {
        const p = S.p, lvl = p.runes[el] || 0, E = D.EL[el];
        if (lvl >= 3) {
            if (!silent) { p.ink++; log('Die ' + E.n + '-Rune ist schon voll erwacht – sie zerfällt zu Zaubertinte.', 'magic'); }
            return;
        }
        p.runes[el] = lvl + 1;
        if (!lvl) {
            if (!p.spells.includes(el)) p.spells.push(el);
            autoSlot(el);
            if (!silent) log('Rune des Elements ' + E.n + '! Du lernst „' + D.SPELLS[el].n + '“.', 'magic');
        } else if (!silent) {
            log('Die ' + E.n + '-Rune erwacht weiter (Stufe ' + (lvl + 1) + '). ' + E.n + '-Zauber werden stärker.' + (lvl + 1 === 2 ? ' Das Buch flüstert von doppelten Seiten …' : ''), 'magic');
        }
        ui.book();
    }
    function autoSlot(id) {
        const p = S.p;
        if (!id) id = p.spells.find(s => !p.slots.includes(s));
        if (!id || p.slots.includes(id)) return;
        const i = p.slots.indexOf(null);
        if (i >= 0) p.slots[i] = id;
        else log('Alle Zauberplätze sind belegt. Lege „' + D.SPELLS[id].n + '“ im Buch auf einen Platz.', 'info');
    }
    G.setSlot = function (i, id) {
        const p = S.p;
        if (i < 0 || i >= p.slots.length) return false;
        if (id && !p.spells.includes(id)) return false;
        const j = id ? p.slots.indexOf(id) : -1;
        if (j >= 0) p.slots[j] = p.slots[i];
        p.slots[i] = id || null;
        ui.refresh();
        return true;
    };
    G.bookLoad = () => { const X = window.XIRU; const b = X ? X.load('dungeon-buch') : null; return b && typeof b === 'object' && b.found && typeof b.found === 'object' ? b : { found: {} }; };
    G.bookSave = b => { const X = window.XIRU; if (X) X.save('dungeon-buch', b); };
    G.combine = function (a, b) {
        const p = S.p;
        if (!D.EL[a] || !D.EL[b]) return { ok: false, msg: 'Wähle zwei Runen.' };
        if (!p.runes[a] || !p.runes[b]) return { ok: false, msg: 'Dir fehlt eine der beiden Runen.' };
        const key = D.comboKey(a, b), sp = D.SPELLS[key];
        if (a === b && p.runes[a] < 2) return { ok: false, msg: 'Das Buch bleibt stumm. Vielleicht braucht diese Seite eine stärkere Rune …' };
        if (p.spells.includes(key)) return { ok: false, msg: '„' + sp.n + '“ steht schon in deinem Buch.' };
        if (p.ink < 1) return { ok: false, msg: 'Dir fehlt Zaubertinte, um die Seite zu schreiben.' };
        p.ink--; p.spells.push(key); autoSlot(key);
        S.stats.combos.push(key);
        const book = G.bookLoad(), isNew = !book.found[key];
        if (isNew) { book.found[key] = Date.now(); G.bookSave(book); }
        log('Das Buch leuchtet: ' + D.EL[a].n + ' + ' + D.EL[b].n + ' = „' + sp.n + '“!' + (isNew ? ' Eine neue Seite!' : ''), 'magic');
        fx.burst(p.x, p.y, a, 22, 0); fx.burst(p.x, p.y, b, 22, 120); fx.sfx('combo');
        once('dungeon-kombi', 15, 'Erste Zauber-Kombination!');
        if (sp.secret && isNew) egg('g-dungeon-geheim');
        if (D.COMBOS.every(k => book.found[k])) egg('g-dungeon-buch');
        ui.book(); ui.refresh();
        return { ok: true, spell: sp, isNew };
    };

    /* ── Neuer Lauf ──────────────────────────────────────────────────── */
    G.newRun = function (cls, opt) {
        opt = opt || {};
        const C = D.CLASSES[cls] || D.CLASSES.magier;
        S = {
            v: 1, cls: D.CLASSES[cls] ? cls : 'magier', seed: (opt.seed || Math.floor(Math.random() * 4294967295)) >>> 0,
            depth: 0, turn: 0, nid: 1, over: false, won: false, forged: null, forgedFloor: false, archiveFound: false,
            p: {
                x: 0, y: 0, hp: C.hp, mhp: C.hp, mp: C.mp, mmp: C.mp, lvl: 1, xp: 0, str: C.str, sp: C.sp,
                crit: C.crit, dodge: C.dodge, sneak: C.sneak || 1.5, slots: new Array(C.slots).fill(null),
                spells: [], runes: {}, ink: C.ink, gold: C.gold, inv: [], wpn: { k: C.weapon, p: 0 }, arm: { k: C.armor, p: 0 },
                st: {}, shield: 0, hpRegen: C.hpRegen, mpRegen: C.mpRegen, rT: 0, mT: 0
            },
            mons: [], items: [], objs: [], fields: [], log: [], shop: null, bossKey: null, bossDead: true,
            stats: { kills: 0, bosses: 0, gold: 0, spells: 0, combos: [], potions: 0, deepest: 1, cause: '', dmg: 0, taken: 0 },
            pendingLevel: 0, lvlOpts: null, spawnT: 0, floorName: ''
        };
        C.runes.forEach(el => learnRune(el, true));
        C.inv.forEach(([k, q]) => addItem({ k, q }));
        if (opt.veteran) { addItem({ k: 'heiltrank', q: 1 }); S.p.ink += 1; }
        S.p.mp = G.maxMp();
        log(D.INTRO, 'info');
        if (opt.veteran) log('Veteranen-Bonus: ein Heiltrank und ein Fläschchen Zaubertinte extra.', 'good');
        if (opt.forged) enterForged(opt.forged); else enterFloor(1);
        return S;
    };
    G.state = () => S;

    function zoneIdx(depth) {
        if (depth > 20) return Math.floor((depth - 21) / 5) % D.ZONES.length;
        const i = D.ZONES.findIndex(z => depth <= z.to);
        return i < 0 ? D.ZONES.length - 1 : i;
    }

    function resetFloor(m) {
        S.map = m; S.mons = []; S.items = []; S.objs = []; S.fields = []; S.shop = null;
        S._explore = null;
    }

    function enterFloor(depth) {
        S.depth = depth;
        S.stats.deepest = Math.max(S.stats.deepest, depth);
        const bossKey = depth % 5 === 0 ? D.BOSSES[(depth / 5 - 1) % D.BOSSES.length] : null;
        const R = W.rng((S.seed + depth * 1013) >>> 0);
        const archive = depth >= 2 && !S.archiveFound && !bossKey && R() < .1;
        const merchant = depth % 3 === 0;
        const m = W.gen(depth, (S.seed ^ Math.imul(depth, 2654435761)) >>> 0, { boss: !!bossKey, merchant, archive });
        m.zone = zoneIdx(depth);
        resetFloor(m);
        S.bossKey = bossKey; S.bossDead = !bossKey;
        S.p.x = m.start.x; S.p.y = m.start.y;
        populate(R, m);
        S.floorName = depth > 20 && !bossKey ? 'Die Endlosen Tiefen' : bossKey ? D.BOSS_FLOOR_NAMES[bossKey] : D.ZONES[m.zone].n;
        log('Etage ' + depth + ' – ' + S.floorName, 'info');
        if (bossKey) log('Ein violettes Siegel liegt auf der Treppe nach unten. Hier haust ' + D.MON[bossKey].n + '.', 'boss');
        if (merchant) log('Irgendwo klimpern Münzen. Ein Händler muss in der Nähe sein.', 'gold');
        if (m.archive) log('Hinter den Mauern rattert leise ein Laufwerk …', 'magic');
        if (depth === 10) once('dungeon-etage10', 30, 'PIXMAG Mini: Etage 10 erreicht!');
        S.spawnT = S.turn;
        updateFov();
        fx.snap();
        ui.floor();
    }

    function enterForged(F) {
        S.depth = 1;
        S.forged = { name: F.name, lore: F.lore };
        S.forgedFloor = true;
        const m = F.map;
        m.zone = 0; m.rooms = m.rooms || [];
        resetFloor(m);
        S.bossKey = null; S.bossDead = true;
        S.p.x = F.start.x; S.p.y = F.start.y;
        const R = W.rng(F.seed >>> 0);
        S.seed = (F.seed * 7 + 13) >>> 0;
        const pool = Object.values(D.MON).filter(B => B.w && B.d && B.d[0] <= 2);
        const taken = new Set([idx(S.p.x, S.p.y)]);
        F.enemies.forEach(e => { if (taken.has(idx(e.x, e.y))) return; taken.add(idx(e.x, e.y)); S.mons.push(makeMon(weighted(R, pool).id, e.x, e.y)); });
        F.bosses.forEach(b => { if (taken.has(idx(b.x, b.y))) return; taken.add(idx(b.x, b.y)); const k = makeMon('goblinkoenig', b.x, b.y); k.asleep = false; S.mons.push(k); });
        F.chests.forEach(c => { if (taken.has(idx(c.x, c.y))) return; taken.add(idx(c.x, c.y)); S.objs.push({ x: c.x, y: c.y, k: 'truhe', open: false }); });
        // Eine Rune und etwas Tinte liegen immer irgendwo
        const free = randomFloor(R, (x, y) => !taken.has(idx(x, y)) && !(x === F.stairs.x && y === F.stairs.y));
        if (free) { const el = pickRune(R) || 'feuer'; S.items.push({ x: free.x, y: free.y, it: { k: 'rune', el } }); taken.add(idx(free.x, free.y)); }
        const free2 = randomFloor(R, (x, y) => !taken.has(idx(x, y)));
        if (free2) S.items.push({ x: free2.x, y: free2.y, it: { k: 'heiltrank', q: 1 } });
        S.floorName = F.name;
        log('Geschmiedete Karte: „' + F.name + '“', 'magic');
        if (F.lore) log(F.lore, 'info');
        if (F.note) log(F.note, 'info');
        S.spawnT = S.turn;
        updateFov();
        fx.snap();
        ui.floor();
    }

    function randomFloor(R, ok) {
        const m = S.map, list = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.t[y * m.w + x] === T.FLOOR && (!ok || ok(x, y))) list.push({ x, y });
        return list.length ? list[Math.floor(R() * list.length)] : null;
    }

    function pickRune(R) {
        const opts = D.EL_ORDER.filter(el => D.EL[el].minD <= Math.max(S.depth, 1)).map(el => {
            const l = S.p.runes[el] || 0;
            return { el, w: l === 0 ? 4 : l === 1 ? 1.4 : l === 2 ? .6 : 0 };
        }).filter(o => o.w > 0);
        return opts.length ? weighted(R, opts).el : null;
    }

    function populate(R, m) {
        const depth = S.depth;
        const occ = new Set([idx(m.stairs.x, m.stairs.y), idx(S.p.x, S.p.y)]);
        const sr = m.rooms[m.startRoom];
        const inRoom = (r, x, y) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
        function spot(o) {
            o = o || {};
            for (let i = 0; i < 300; i++) {
                const r = o.room || R.pick(m.rooms);
                const x = R.int(r.x, r.x + r.w - 1), y = R.int(r.y, r.y + r.h - 1);
                if (W.tile(m, x, y) !== T.FLOOR || occ.has(idx(x, y))) continue;
                if (o.notStart && inRoom(sr, x, y)) continue;
                if (o.minDist && cheb(x, y, S.p.x, S.p.y) < o.minDist) continue;
                if (m.lair && !o.lair && inRoom(m.lair, x, y)) continue;
                occ.add(idx(x, y));
                return { x, y };
            }
            return null;
        }
        function near(x0, y0) {
            for (let i = 0; i < 20; i++) {
                const x = x0 + R.int(-2, 2), y = y0 + R.int(-2, 2);
                if (W.tile(m, x, y) === T.FLOOR && !occ.has(idx(x, y))) { occ.add(idx(x, y)); return { x, y }; }
            }
            return null;
        }
        // Händler
        if (m.merchantSpot) { occ.add(idx(m.merchantSpot.x, m.merchantSpot.y)); spawnMerchant(m.merchantSpot.x, m.merchantSpot.y); }
        // Boss
        if (S.bossKey && m.lair) {
            const lr = m.lair;
            let s = { x: lr.x + (lr.w >> 1), y: lr.y + (lr.h >> 1) };
            if (W.tile(m, s.x, s.y) !== T.FLOOR || occ.has(idx(s.x, s.y))) s = spot({ room: lr, lair: true });
            if (s) { occ.add(idx(s.x, s.y)); const b = makeMon(S.bossKey, s.x, s.y); b.asleep = false; S.mons.push(b); }
            const t = spot({ room: lr, lair: true });
            if (t) S.items.push({ x: t.x, y: t.y, it: { k: 'tinte', q: 1 } });
        }
        // Das vergessene Archiv
        if (m.archive) {
            const a = m.archive;
            occ.add(idx(a.x, a.y));
            S.items.push({ x: a.x, y: a.y, it: { k: 'realkristall', q: 1 } });
            const junk = ['diskette', 'cd', 'festplatte', 'diskette', 'tinte', 'gold'];
            W.DIRS8.forEach(([dx, dy], i) => {
                if (i >= junk.length || R() < .2) return;
                const x = a.x + dx, y = a.y + dy;
                occ.add(idx(x, y));
                S.items.push({ x, y, it: junk[i] === 'gold' ? { k: 'gold', q: 30 + depth * 5 } : { k: junk[i], q: 1 } });
            });
        }
        // Gegner
        let n = Math.min(24, 5 + Math.floor(depth * .9));
        if (S.bossKey) n = Math.ceil(n * .5);
        const pool = Object.values(D.MON).filter(B => B.w && B.d && depth >= B.d[0] && depth <= B.d[1]);
        for (let i = 0; i < n; i++) {
            const B = weighted(R, pool);
            const s = spot({ notStart: true, minDist: 6 });
            if (!s) break;
            const elite = depth >= 2 && R() < .05 + depth * .006;
            S.mons.push(makeMon(B.id, s.x, s.y, { elite }));
            if (B.pack) {
                const extra = R.int(B.pack[0], B.pack[1]) - 1;
                for (let j = 0; j < extra && i < n; j++) { const q = near(s.x, s.y); if (q) { S.mons.push(makeMon(B.id, q.x, q.y)); i++; } }
            }
        }
        // Truhen (und Mimiks)
        const chests = R.int(1, 2) + (depth % 4 === 0 ? 1 : 0);
        for (let i = 0; i < chests; i++) {
            const s = spot({ notStart: true });
            if (!s) break;
            if (depth >= 2 && R() < .16) { const mm = makeMon('mimik', s.x, s.y); mm.disguised = 1; mm.asleep = false; S.mons.push(mm); }
            else S.objs.push({ x: s.x, y: s.y, k: 'truhe', open: false });
        }
        // Beute
        for (let i = 0, ni = R.int(3, 5); i < ni; i++) { const s = spot(); if (s) S.items.push({ x: s.x, y: s.y, it: randomLoot(R, depth) }); }
        for (let i = 0, ng = R.int(2, 4); i < ng; i++) { const s = spot(); if (s) S.items.push({ x: s.x, y: s.y, it: { k: 'gold', q: R.int(4, 10) + depth * 3 } }); }
        if (R() < .5) { const s = spot(); if (s) S.items.push({ x: s.x, y: s.y, it: { k: 'tinte', q: 1 } }); }
        if (depth === 1 || R() < .55) { const el = pickRune(R); const s = el && spot({ notStart: true }); if (s) S.items.push({ x: s.x, y: s.y, it: { k: 'rune', el } }); }
        if (R() < .12) { const s = spot(); if (s) S.items.push({ x: s.x, y: s.y, it: { k: R.pick(D.JUNK), q: 1 } }); }
    }

    function makeMon(k, x, y, o) {
        o = o || {};
        const B = D.MON[k], depth = Math.max(1, S.depth);
        let hpF = 1, atkB = 0, defB = 0, xpF = 1;
        if (B.boss) {
            const tier = Math.floor((depth - 1) / 20);
            hpF = 1 + tier * .7; atkB = tier * 3; defB = tier; xpF = 1 + tier * .5;
        } else if (B.d) {
            const lv = Math.max(0, depth - B.d[0]);
            hpF = 1 + lv * .07; atkB = Math.floor(lv / 4); defB = Math.floor(lv / 7); xpF = 1 + lv * .12;
            if (depth > 20) { hpF *= 1 + (depth - 20) * .05; atkB += Math.floor((depth - 20) / 3); }
        }
        if (o.elite) { hpF *= 1.6; atkB += 2; xpF *= 2; }
        if (o.minion) xpF *= .4;
        const hp = Math.max(1, Math.round(B.hp * hpF));
        const m = {
            id: S.nid++, k, x, y, hp, mhp: hp, atk: [B.atk[0] + atkB, B.atk[1] + atkB], def: B.def + defB, spd: B.spd,
            en: ri(0, 99), st: {}, cd: {}, aware: false, lost: 0,
            asleep: !B.noSleep && !B.boss && !B.friendly && chance(.5),
            xp: Math.max(1, Math.round(B.xp * xpF))
        };
        if (B.shot) m.shot = [B.shot[0] + atkB, B.shot[1] + atkB];
        if (o.elite) m.elite = 1;
        if (o.minion) m.minion = 1;
        if (k === 'schleim') m.size = 2;
        if (B.boss) m.boss = 1;
        return m;
    }

    function spawnMerchant(x, y) {
        const mm = makeMon('haendler', x, y); mm.asleep = false; S.mons.push(mm);
        const depth = S.depth, price = v => Math.round(v * (1 + depth * .04));
        const stock = [
            { k: 'heiltrank', q: 3 }, { k: 'manatrank', q: 2 }, { k: 'tinte', q: 2 },
            { k: pick(['reinigung', 'hast', 'leben', 'staerke']), q: 1 },
            { k: pick(['rolle_teleport', 'rolle_karte', 'rolle_feuer', 'rolle_furcht', 'rolle_verzaubern']), q: 1 },
            makeGear(MR, depth + 2, 'waffe'), makeGear(MR, depth + 2, 'ruestung')
        ];
        stock.forEach(e => { e.price = price((IT(e.k).val || 10) * (1 + (e.p || 0) * .35)); });
        S.shop = { stock, purse: 50 + depth * 14, id: mm.id, met: false };
    }

    /* ── Abfragen ────────────────────────────────────────────────────── */
    const monAt = (x, y) => S.mons.find(m => m.x === x && m.y === y && m.hp > 0);
    const objAt = (x, y) => S.objs.find(o => o.x === x && o.y === y);
    const fieldAt = (x, y, k) => S.fields.find(f => f.x === x && f.y === y && (!k || f.k === k));
    const isHostile = m => !D.MON[m.k].friendly;
    G.monAt = (x, y) => S && monAt(x, y);
    G.objAt = (x, y) => S && objAt(x, y);
    G.fieldAt = (x, y, k) => S && fieldAt(x, y, k);
    G.itemsAt = (x, y) => S ? S.items.filter(o => o.x === x && o.y === y) : [];
    G.visible = (x, y) => !!(S && W.inB(S.map, x, y) && S.map.vis[idx(x, y)]);
    G.hostilesVisible = () => S.mons.filter(m => isHostile(m) && !m.disguised && S.map.vis[idx(m.x, m.y)]);
    G.stuck = () => !!(S && (S.p.st.frozen > 0 || S.p.st.stun > 0));
    G.onStairs = () => { const v = W.tile(S.map, S.p.x, S.p.y); return v === T.STAIRS || v === T.SEALED; };
    function res(m, el) { if (el === 'arkan') return 1; const r = D.MON[m.k].res; return r && r[el] != null ? r[el] : 1; }

    function updateFov() {
        const m = S.map, p = S.p;
        W.fov(m, p.x, p.y, 8, m.vis);
        for (let i = 0; i < m.vis.length; i++) if (m.vis[i]) m.seen[i] = 1;
        S.mons.forEach(mon => {
            if (mon.seen || mon.disguised || !m.vis[idx(mon.x, mon.y)]) return;
            mon.seen = 1;
            if (mon.k === 'haendler') { log('Du entdeckst Krummfinger, den Händler. Lauf in ihn hinein, um zu handeln.', 'gold'); return; }
            S._int = true;
            if (mon.boss) { log(D.BOSS_INTRO[mon.k] || ('Vor dir steht ' + D.MON[mon.k].n + '!'), 'boss'); ui.boss(mon); fx.shake(6); fx.sfx('boss'); }
            else log('Du entdeckst ' + nmIndef(mon) + (mon.asleep ? ' (schläft)' : '') + '.', 'info');
        });
    }
    G.takeInterrupt = () => { const v = !!(S && S._int); if (S) S._int = false; return v; };

    /* ── Spielerzüge ─────────────────────────────────────────────────── */
    function blockedForPlayer(x, y) {
        const v = W.tile(S.map, x, y);
        if (!W.walkable(v)) return true;
        const o = objAt(x, y);
        if (o && !o.open) return true;
        return !!fieldAt(x, y, 'eiswand');
    }
    G.move = function (dx, dy) {
        if (!S || S.over || G.stuck()) return false;
        vd = 0;
        const p = S.p, m = S.map, nx = p.x + dx, ny = p.y + dy;
        if (!W.inB(m, nx, ny)) return false;
        const mon = monAt(nx, ny);
        if (mon) {
            if (mon.k === 'haendler') { G.talk(); return false; }
            if (mon.disguised) {
                mon.disguised = 0; wake(mon);
                log('Die Truhe reisst ihr Maul auf – eine Mimik!', 'bad');
                fx.shake(5); fx.sfx('mimic'); fx.bump(p, dx, dy);
                endTurn(); return true;
            }
            attack(mon); endTurn(); return true;
        }
        const o = objAt(nx, ny);
        if (o && !o.open) { openChest(o); fx.bump(p, dx, dy); endTurn(); return true; }
        const v = W.tile(m, nx, ny);
        if (fieldAt(nx, ny, 'eiswand')) { log('Eine Eiswand versperrt den Weg.', 'info'); return false; }
        if (v === T.SECRET) {
            W.setT(m, nx, ny, T.FLOOR);
            log('Die Wand bröckelt unter deiner Hand – dahinter liegt ein verborgener Raum!', 'magic');
            fx.burst(nx, ny, 'erde', 26, 0); fx.shake(4); fx.sfx('secret');
            endTurn(); return true;
        }
        if (v === T.WALL) return false;
        if (v === T.WATER) { log('Das Wasser ist zu tief und zu schwarz, um hindurchzuwaten.', 'info'); return false; }
        if (v === T.DOOR) { W.setT(m, nx, ny, T.OPEN); fx.sfx('door'); }
        p.x = nx; p.y = ny;
        pickup();
        const nv = W.tile(m, p.x, p.y);
        if (nv === T.STAIRS) log('Eine Treppe führt in die Tiefe. Drück Enter, um hinabzusteigen.', 'info');
        else if (nv === T.SEALED) log('Ein violettes Siegel liegt auf der Treppe.', 'info');
        endTurn();
        return true;
    };
    G.wait = function () { if (!S || S.over) return false; vd = 0; endTurn(); return true; };
    G.pass = function () {
        if (!S || S.over) return false;
        vd = 0;
        log(S.p.st.frozen > 0 ? 'Du bist eingefroren und kannst dich nicht rühren …' : 'Du bist betäubt …', 'bad');
        endTurn(); return true;
    };
    G.descend = function () {
        if (!S || S.over) return false;
        const p = S.p, v = W.tile(S.map, p.x, p.y);
        if (v === T.SEALED) { log('Das Siegel hält. Besiege zuerst ' + (SHORT[S.bossKey] || 'den Wächter') + '.', 'bad'); return false; }
        if (v !== T.STAIRS) return false;
        if (S.forgedFloor) { S.forgedFloor = false; log('Du verlässt „' + S.forged.name + '“ und steigst in die echten Katakomben hinab.', 'magic'); }
        enterFloor(S.depth + 1);
        fx.sfx('stairs');
        ui.refresh(); ui.turn();
        return true;
    };

    function attack(m) {
        const p = S.p, B = D.MON[m.k], w = wpn();
        fx.bump(p, m.x - p.x, m.y - p.y);
        const helpless = m.asleep || m.st.frozen > 0 || m.st.stun > 0 || m.st.root > 0;
        const acc = .9 + (w.acc || 0) - (B.dodge || 0) + (helpless ? .2 : 0);
        if (!chance(acc)) { log('Du verfehlst ' + nm(m, 'a') + '.', 'info'); fx.float(m.x, m.y, 'daneben', '#9aa3c4', 0, 'small'); fx.sfx('miss'); wake(m); return; }
        const [a, b] = G.meleeRange();
        let dmg = ri(a, b), note = '', crit = false;
        if (p.st.invis > 0) { dmg *= 3; note = ' Aus den Schatten!'; crit = true; }
        else if (m.asleep || !m.aware) { dmg = Math.round(dmg * p.sneak); note = ' Hinterhalt!'; crit = p.sneak > 2; }
        else if (chance(G.crit())) { dmg *= 2; note = ' Kritisch!'; crit = true; }
        if (m.st.frozen > 0) { dmg = Math.round(dmg * (w.shatter ? 2 : 1.5)); m.st.frozen = 0; note += ' Das Eis zerspringt!'; fx.burst(m.x, m.y, 'eis', 16, 0); }
        const r = w.magic ? 1 : res(m, 'phys');
        dmg = r === 0 ? 0 : Math.max(1, Math.round(dmg * r) - m.def);
        log('Du triffst ' + nm(m, 'a') + '.' + note);
        if (p.st.invis > 0) { p.st.invis = 0; log('Du trittst aus den Schatten.', 'magic'); }
        fx.sfx(crit ? 'crit' : 'hit');
        damageMon(m, dmg, { el: 'phys', crit });
    }

    function openChest(o) {
        o.open = true;
        fx.sfx('chest'); fx.burst(o.x, o.y, 'gold', 18, 0);
        const loot = [{ k: 'gold', q: ri(6, 12) + S.depth * 4 }, randomLoot(MR, S.depth + 1)];
        if (chance(.35)) loot.push({ k: 'tinte', q: 1 });
        if (chance(.12)) loot.push({ k: pick(D.JUNK), q: 1 });
        log('Du öffnest die Truhe: ' + loot.map(itemName).join(', ') + '.', 'gold');
        loot.forEach(it => { if (!take(it)) { dropAt(S.p.x, S.p.y, it); log(itemName(it) + ' passt nicht mehr in den Rucksack.', 'bad'); } });
    }

    function archiveFound() {
        const p = S.p;
        S.archiveFound = true;
        p.mhp += 3; p.hp = p.mhp; p.mp = G.maxMp();
        log('Ein Realitätskristall! Zwischen Disketten, CDs und alten Festplatten pulsiert er in Farben, die es hier unten nicht geben dürfte. Er heilt dich vollständig (+3 max. LP).', 'magic');
        fx.burst(p.x, p.y, 'licht', 50, 0); fx.burst(p.x, p.y, 'schatten', 30, 140); fx.sfx('secret');
        egg('g-dungeon-archiv');
    }

    /* ── Schaden & Tod ───────────────────────────────────────────────── */
    function wake(m) { m.asleep = false; m.aware = true; m.lost = 0; if (m.disguised) m.disguised = 0; }
    function damageMon(m, dmg, o) {
        o = o || {};
        const d = o.delay || 0;
        if (!m || m.hp <= 0 || D.MON[m.k].friendly) return;
        if (dmg <= 0) { fx.float(m.x, m.y, 'immun', '#9aa3c4', d, 'small'); wake(m); return; }
        m.hp -= dmg; S.stats.dmg += dmg;
        const col = o.crit ? '#ffd84a' : (o.el && D.EL[o.el] ? D.EL[o.el].c : (o.el === 'gift' ? '#7bd651' : '#ffffff'));
        fx.float(m.x, m.y, String(dmg), col, d, o.crit ? 'big' : '');
        fx.flash(m, d);
        wake(m);
        if (m.hp <= 0) { killMon(m, o); return; }
        if (m.k === 'schleim' && m.size > 1 && m.hp >= 4) splitSlime(m);
    }
    function splitSlime(m) {
        const spots = W.DIRS8.map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => monCanEnter(m, x, y));
        if (!spots.length) return;
        log(cap(nm(m)) + ' teilt sich!', 'bad');
        m.size = 1;
        const [x, y] = pick(spots), total = m.hp;
        m.hp = Math.ceil(total / 2); m.mhp = Math.max(m.hp, Math.ceil(m.mhp / 2)); m.xp = Math.ceil(m.xp / 2);
        const c = makeMon('schleim', x, y);
        Object.assign(c, { size: 1, hp: Math.floor(total / 2), mhp: m.mhp, xp: m.xp, aware: true, asleep: false, en: 0, elite: m.elite });
        S.mons.push(c);
        fx.burst(x, y, 'schleim', 10, vd);
    }
    function deathMsg(m) {
        const B = D.MON[m.k], n = cap(nm(m));
        if (B.boss) return n + ' ist besiegt!';
        if (m.k === 'schleim') return n + ' zerplatzt.';
        if (m.k === 'geist') return n + ' löst sich in Nebel auf.';
        if (m.k === 'flamme') return n + ' erlischt zischend.';
        if (m.k === 'golem') return n + ' zerbröckelt zu Lehm.';
        if (B.undead) return n + ' zerfällt zu Staub.';
        return 'Du besiegst ' + nm(m, 'a') + '.';
    }
    function killMon(m, o) {
        const B = D.MON[m.k], d = (o && o.delay) || 0;
        m.hp = 0;
        S.mons = S.mons.filter(x => x !== m);
        fx.die(m, d);
        fx.burst(m.x, m.y, B.undead ? 'staub' : m.k === 'schleim' ? 'schleim' : m.k === 'flamme' ? 'feuer' : m.k === 'geist' ? 'geist' : 'blut', B.boss ? 70 : 16, d);
        fx.sfx(B.boss ? 'bossdie' : 'kill');
        log(deathMsg(m), B.boss ? 'boss' : 'good');
        S.stats.kills++;
        if (m.gold) { dropAt(m.x, m.y, { k: 'gold', q: m.gold }); log('Das gestohlene Gold klimpert zu Boden.', 'gold'); }
        if (!m.minion) drops(m);
        gainXP(m.xp);
        if (B.boss) bossDown(m);
    }
    function drops(m) {
        const B = D.MON[m.k], depth = S.depth;
        if (B.boss) {
            dropAt(m.x, m.y, { k: 'gold', q: 60 + depth * 12 });
            dropAt(m.x, m.y, { k: 'tinte', q: 2 });
            dropAt(m.x, m.y, { k: 'heiltrank', q: 1 });
            dropAt(m.x, m.y, m.k === 'drache' ? { k: 'drachenpanzer', q: 1, p: 0 } : makeGear(MR, depth + 3, chance(.5) ? 'waffe' : 'ruestung'));
            return;
        }
        if (m.k === 'mimik') {
            dropAt(m.x, m.y, { k: 'gold', q: 10 + depth * 4 });
            dropAt(m.x, m.y, randomLoot(MR, depth + 1));
            dropAt(m.x, m.y, randomLoot(MR, depth + 1));
            if (chance(.4)) dropAt(m.x, m.y, { k: 'tinte', q: 1 });
            return;
        }
        if (chance(.33)) dropAt(m.x, m.y, { k: 'gold', q: ri(2, 5 + depth * 2) });
        if (chance(m.elite ? .6 : .07)) dropAt(m.x, m.y, randomLoot(MR, depth));
        if (m.elite && chance(.5)) dropAt(m.x, m.y, { k: 'tinte', q: 1 });
    }
    function bossDown(m) {
        S.stats.bosses++;
        if (m.k === S.bossKey) {
            S.bossDead = true;
            const st = S.map.stairs;
            if (st && W.tile(S.map, st.x, st.y) === T.SEALED) { W.setT(S.map, st.x, st.y, T.STAIRS); log('Das Siegel auf der Treppe zerbricht!', 'magic'); }
        }
        // Diener fliehen in die Dunkelheit
        S.mons.filter(o => o.owner === m.id).forEach(o => { o.st.fear = 12; });
        fx.shake(12);
        if (m.k === 'goblinkoenig') once('dungeon-boss5', 50, 'Erster Boss besiegt!');
        if (m.k === 'drache') { once('dungeon-boss10', 75, 'Ignifax ist gefallen!'); egg('g-dungeon-drache'); }
        if (m.k === 'lich') once('dungeon-boss15', 100, 'Lich Morgrath ist besiegt!');
        if (m.k === 'herz') once('dungeon-boss20', 150, 'Das Herz der Dunkelheit ist zerschlagen!');
        ui.boss(null);
        if (m.k === 'herz' && !S.won) { S.won = true; log('Die Dunkelheit weicht. Die Gilde wird von deiner Tat erfahren!', 'boss'); ui.victory(); }
    }
    function gainXP(n) {
        const p = S.p;
        p.xp += n;
        while (p.xp >= D.xpNext(p.lvl)) {
            p.xp -= D.xpNext(p.lvl); p.lvl++; S.pendingLevel++;
            p.mhp += 2;
            p.hp = Math.min(p.mhp, p.hp + Math.ceil(p.mhp * .3) + 2);
            p.mp = Math.min(G.maxMp(), p.mp + 5);
            log('Stufe ' + p.lvl + '! Wähle eine Stärke.', 'good');
            fx.burst(p.x, p.y, 'licht', 30, vd); fx.sfx('level');
            if (p.lvl === 5) once('dungeon-stufe5', 20, 'PIXMAG Mini: Stufe 5 erreicht');
        }
    }
    G.levelOptions = function () {
        if (!S || !S.pendingLevel) return null;
        if (!S.lvlOpts) {
            const extra = ['str', 'sp', 'dodge'];
            if (S.p.slots.length < 6) extra.push('slot', 'slot', 'slot');
            S.lvlOpts = ['hp', 'mp', pick(extra)];
        }
        return S.lvlOpts;
    };
    G.chooseLevel = function (k) {
        if (!S || !S.pendingLevel || !G.levelOptions().includes(k)) return false;
        const p = S.p;
        switch (k) {
            case 'hp': p.mhp += 7; p.hp += 7; break;
            case 'mp': p.mmp += 6; p.mp += 6; break;
            case 'slot': p.slots.push(null); autoSlot(); break;
            case 'str': p.str++; break;
            case 'sp': p.sp++; break;
            case 'dodge': p.dodge += .04; break;
        }
        S.pendingLevel--; S.lvlOpts = null;
        log('Gewählt: ' + D.LEVEL_OPTS[k].n + '.', 'good');
        ui.refresh();
        return true;
    };

    function healPlayer(h, quiet) {
        const p = S.p, before = p.hp;
        p.hp = Math.min(p.mhp, p.hp + h);
        const got = p.hp - before;
        if (got > 0) { fx.float(p.x, p.y, '+' + got, '#4ade80', vd); if (!quiet) log('Du heilst ' + got + ' LP.', 'good'); }
    }
    function armorReduce(dmg) {
        const def = G.defense();
        const d = dmg - Math.floor(def * (.5 + Math.random() * .5));
        if (d <= 0) return chance(.6) ? 1 : 0;
        return d;
    }
    function damagePlayer(dmg, src, o) {
        o = o || {};
        const p = S.p, d = o.delay || 0;
        if (o.el === 'feuer' && arm().fireRes) dmg = Math.ceil(dmg / 2);
        if (p.shield > 0) {
            const a = Math.min(p.shield, dmg);
            p.shield -= a; dmg -= a;
            fx.float(p.x, p.y, 'Schild ' + a, '#8ee8ff', d, 'small');
            if (p.shield <= 0) { p.shield = 0; p.st.shieldT = 0; log('Dein Frostschild zerspringt.', 'bad'); }
        }
        if (dmg <= 0) return;
        p.hp -= dmg; S.stats.taken += dmg;
        fx.float(p.x, p.y, '-' + dmg, '#ff5a5a', d);
        fx.flash(p, d);
        fx.sfx('hurt');
        if (dmg >= p.mhp * .2) fx.shake(Math.min(10, 3 + dmg / 2));
        if (p.hp <= 0) {
            if (p.st.revive > 0) {
                p.st.revive = 0; p.hp = Math.ceil(p.mhp * .5);
                ['poison', 'burn', 'soulburn', 'frozen', 'stun'].forEach(k => { p.st[k] = 0; });
                log('Ein Licht umhüllt dich – du erhebst dich wieder!', 'magic');
                fx.burst(p.x, p.y, 'licht', 50, d); fx.sfx('level');
                return;
            }
            p.hp = 0;
            die(src);
        }
    }
    function die(src) {
        if (S.over) return;
        S.over = true;
        S.stats.cause = typeof src === 'string' ? src : ((D.MON[src.k] || {}).n || '???');
        log('Du bist gefallen …', 'bad');
        fx.sfx('die');
        ui.death(G.summary());
    }
    G.summary = function () {
        const st = S.stats, p = S.p;
        const score = st.deepest * 100 + st.gold + st.kills * 10 + st.bosses * 250 + (S.won ? 1000 : 0);
        return {
            score, cls: S.cls, depth: S.depth, deepest: st.deepest, lvl: p.lvl, kills: st.kills, bosses: st.bosses,
            gold: st.gold, spells: st.spells, combos: st.combos.length, turns: S.turn, cause: st.cause, won: S.won,
            forged: S.forged ? S.forged.name : null
        };
    };
    G.finish = function (reason) {
        if (!S || S.over) return null;
        S.over = true; S.stats.cause = reason || 'Lauf beendet';
        return G.summary();
    };

    /* ── Statuseffekte ───────────────────────────────────────────────── */
    function applyStatus(e, k, t) {
        const isP = e === S.p, B = isP ? {} : D.MON[e.k];
        if (!e.st) e.st = {};
        if ((k === 'burn' || k === 'soulburn') && B.noBurn) return false;
        if ((k === 'burn' || k === 'soulburn') && isP && arm().fireRes && chance(.5)) return false;
        if (k === 'poison' && (B.noPoison || B.undead)) return false;
        if ((k === 'stun' || k === 'root') && B.noStun) return false;
        if (k === 'burn' && e.st.wet > 0) { e.st.wet = 0; fx.burst(e.x, e.y, 'dampf', 10, vd); return false; }
        if (k === 'wet' && e.st.burn > 0) e.st.burn = 0;
        if (k === 'frozen' && e.st.burn > 0) e.st.burn = 0;
        if (k === 'frozen' && e.st.wet > 0) t += 2;
        if (!isP && B.boss) {
            if (k === 'frozen' || k === 'stun' || k === 'root') {
                if (e.cd.cc > 0) return false;
                t = Math.max(1, Math.floor(t / 2)); e.cd.cc = t + 3;
            }
            if (k === 'fear') t = Math.min(t, 3);
        }
        const had = e.st[k] > 0;
        e.st[k] = Math.max(e.st[k] || 0, t);
        if (!had && ST_LABEL[k] && k !== 'wet') fx.float(e.x, e.y, ST_LABEL[k][0], ST_LABEL[k][1], vd + 120, 'small');
        if (isP && !had) {
            const msg = { burn: 'Du brennst!', poison: 'Du bist vergiftet!', frozen: 'Du bist eingefroren!', stun: 'Du bist betäubt!', soulburn: 'Schwarzes Feuer frisst an dir!' }[k];
            if (msg) log(msg, 'bad');
        }
        return true;
    }

    /* ── Zugende: Effekte, Gegner, Sicht ─────────────────────────────── */
    function endTurn() {
        if (S.over) return finishTurn();
        S.turn++;
        tickPlayer();
        if (S.over) return finishTurn();
        updateFov();
        const p = S.p;
        S.dist = W.distMap(S.map, p.x, p.y, (v, x, y) => W.walkable(v) && !fieldAt(x, y, 'eiswand'), 45);
        S.distFly = W.distMap(S.map, p.x, p.y, (v, x, y) => (W.walkable(v) || v === T.WATER) && !fieldAt(x, y, 'eiswand'), 45);
        const haste = p.st.haste > 0;
        for (const m of S.mons.slice()) {
            if (m.hp <= 0 || S.over) continue;
            let gain = m.spd;
            if (haste) gain /= 2;
            if (m.st.slow > 0) gain /= 2;
            m.en += gain;
            let guard = 0;
            while (m.en >= 100 && m.hp > 0 && !S.over && guard++ < 3) { m.en -= 100; monAct(m); }
        }
        if (S.over) return finishTurn();
        tickMonsters();
        S.fields.forEach(f => { f.t--; });
        S.fields = S.fields.filter(f => f.t > 0);
        updateFov();
        // Aus der Dunkelheit kommt Nachschub
        const every = Math.max(90, 170 - S.depth * 4);
        if (!S.forgedFloor && S.turn - S.spawnT >= every) { S.spawnT = S.turn; spawnWanderer(); }
        if (p.hp === 1) egg('g-dungeon-knapp');
        finishTurn();
    }
    function finishTurn() {
        fx.lock(vd + 40);
        ui.refresh();
        ui.turn();
    }
    function tickPlayer() {
        const p = S.p, st = p.st;
        if (st.burn > 0) damagePlayer(1 + Math.floor(S.depth / 5), 'Flammen', { el: 'feuer' });
        if (!S.over && st.soulburn > 0) damagePlayer(2 + Math.floor(S.depth / 5), 'Höllenfeuer', { el: 'feuer' });
        if (!S.over && st.poison > 0) damagePlayer(1 + Math.floor(S.depth / 6), 'Gift', { el: 'gift' });
        if (S.over) return;
        const f = fieldAt(p.x, p.y);
        if (f && f.k === 'gift') applyStatus(p, 'poison', 3);
        if (f && f.k === 'feuer') applyStatus(p, 'burn', 2);
        if (!st.poison && !st.burn && !st.soulburn && p.hp < p.mhp && ++p.rT >= p.hpRegen) { p.rT = 0; p.hp++; }
        if (p.mp < G.maxMp() && ++p.mT >= p.mpRegen) { p.mT = 0; p.mp++; }
        ['burn', 'soulburn', 'poison', 'frozen', 'stun', 'wet', 'haste', 'invis', 'revive', 'weak'].forEach(k => { if (st[k] > 0) st[k]--; });
        if (st.shieldT > 0 && --st.shieldT === 0 && p.shield > 0) { p.shield = 0; log('Dein Frostschild schmilzt.', 'info'); }
    }
    function tickMonsters() {
        const dot = (m, n, el) => damageMon(m, Math.max(1, Math.round(n * res(m, el === 'gift' ? 'gift' : el))), { el: el === 'gift' ? 'gift' : el, delay: vd + 60 });
        for (const m of S.mons.slice()) {
            if (m.hp <= 0 || D.MON[m.k].friendly) continue;
            const st = m.st, B = D.MON[m.k];
            if (st.burn > 0) dot(m, 2 + Math.floor(S.depth / 4), 'feuer');
            if (m.hp > 0 && st.soulburn > 0) damageMon(m, 3 + Math.floor(S.depth / 3), { el: 'schatten', delay: vd + 60 });
            if (m.hp > 0 && st.poison > 0) dot(m, 2 + Math.floor(S.depth / 5), 'gift');
            if (m.hp <= 0) continue;
            const f = fieldAt(m.x, m.y);
            if (f) {
                if (f.k === 'gift') applyStatus(m, 'poison', 3);
                if (f.k === 'feuer') applyStatus(m, 'burn', 2);
                if (f.k === 'dampf') m.st.blind = Math.max(m.st.blind || 0, 2);
                if (f.k === 'schlamm' && !B.fly) m.st.slow = Math.max(m.st.slow || 0, 2);
            }
            for (const k in st) if (st[k] > 0) st[k]--;
        }
    }
    function spawnWanderer() {
        const live = S.mons.filter(m => isHostile(m)).length;
        if (live >= 26) return;
        const pool = Object.values(D.MON).filter(B => B.w && B.d && S.depth >= B.d[0] && S.depth <= B.d[1]);
        const p = S.p;
        const s = randomFloor(Math.random, (x, y) => !S.map.vis[idx(x, y)] && cheb(x, y, p.x, p.y) >= 10 && !monAt(x, y) && !objAt(x, y));
        if (!s) return;
        const m = makeMon(weighted(Math.random, pool).id, s.x, s.y);
        m.asleep = false;
        S.mons.push(m);
    }

    /* ── Gegner-KI ───────────────────────────────────────────────────── */
    function monCanEnter(m, x, y) {
        if (!W.inB(S.map, x, y)) return false;
        if (x === S.p.x && y === S.p.y) return false;
        const B = D.MON[m.k], v = W.tile(S.map, x, y);
        if (!B.phase && !(W.walkable(v) || (B.fly && v === T.WATER))) return false;
        if (monAt(x, y)) return false;
        const o = objAt(x, y);
        if (o && !o.open) return false;
        return !fieldAt(x, y, 'eiswand');
    }
    function moveMon(m, x, y) {
        if (!D.MON[m.k].phase && W.tile(S.map, x, y) === T.DOOR) W.setT(S.map, x, y, T.OPEN);
        m.x = x; m.y = y;
    }
    function canSee(m) {
        const p = S.p;
        if (!S.map.vis[idx(m.x, m.y)]) return false;
        const d = cheb(m.x, m.y, p.x, p.y);
        if (d > 9) return false;
        if (m.st.blind > 0) return d <= 1 && chance(.5);
        if (p.st.invis > 0) return d <= 1 && chance(.25);
        if (fieldAt(p.x, p.y, 'dampf')) return d <= 1;
        return true;
    }
    function randomStep(m) {
        if (m.st.root > 0) return false;
        for (const [dx, dy] of shuffle(W.DIRS8.slice())) {
            if (monCanEnter(m, m.x + dx, m.y + dy)) { moveMon(m, m.x + dx, m.y + dy); return true; }
        }
        return false;
    }
    function chaseStep(m) {
        if (m.st.root > 0) return false;
        const B = D.MON[m.k], dm = B.fly ? S.distFly : S.dist, p = S.p;
        if (!dm) return false;
        const here = dm[idx(m.x, m.y)];
        let best = null, bd = here;
        for (const [dx, dy] of shuffle(W.DIRS8.slice())) {
            const nx = m.x + dx, ny = m.y + dy;
            if (!monCanEnter(m, nx, ny)) continue;
            const v = dm[idx(nx, ny)];
            if (v < bd) { bd = v; best = [nx, ny]; }
        }
        if (!best && here >= 32000) {
            const dx = Math.sign(p.x - m.x), dy = Math.sign(p.y - m.y);
            for (const [ax, ay] of [[dx, dy], [dx, 0], [0, dy]]) if ((ax || ay) && monCanEnter(m, m.x + ax, m.y + ay)) { best = [m.x + ax, m.y + ay]; break; }
        }
        if (best) { moveMon(m, best[0], best[1]); return true; }
        return false;
    }
    function fleeStep(m) {
        if (m.st.root > 0 || !S.dist) return false;
        const p = S.p, here = cheb(m.x, m.y, p.x, p.y);
        let best = null, bd = here + (S.dist[idx(m.x, m.y)] < 32000 ? S.dist[idx(m.x, m.y)] * .01 : 0);
        for (const [dx, dy] of shuffle(W.DIRS8.slice())) {
            const nx = m.x + dx, ny = m.y + dy;
            if (!monCanEnter(m, nx, ny)) continue;
            const dv = S.dist[idx(nx, ny)];
            const score = cheb(nx, ny, p.x, p.y) + (dv < 32000 ? dv * .01 : 0);
            if (score > bd) { bd = score; best = [nx, ny]; }
        }
        if (best) { moveMon(m, best[0], best[1]); return true; }
        return false;
    }
    function clearShot(x0, y0, x1, y1) {
        const pts = W.line(x0, y0, x1, y1);
        for (let i = 0; i < pts.length - 1; i++) {
            const q = pts[i];
            if (W.opaque(W.tile(S.map, q.x, q.y)) || monAt(q.x, q.y) || fieldAt(q.x, q.y, 'eiswand')) return false;
        }
        return true;
    }
    function monAct(m) {
        const B = D.MON[m.k], p = S.p;
        if (B.friendly || m.disguised) return;
        for (const k in m.cd) if (m.cd[k] > 0) m.cd[k]--;
        if (m.st.frozen > 0 || m.st.stun > 0) return;
        if (m.asleep) {
            const d = cheb(m.x, m.y, p.x, p.y);
            if (S.map.vis[idx(m.x, m.y)] && d <= 5 && !(p.st.invis > 0) && chance(S.cls === 'schurke' ? .12 : .3)) { m.asleep = false; m.aware = true; }
            return;
        }
        const sees = canSee(m);
        if (sees) { m.aware = true; m.lost = 0; }
        else if (m.aware && ++m.lost > 14) m.aware = false;
        if (B.regen && m.hp < m.mhp) m.hp = Math.min(m.mhp, m.hp + B.regen);
        const adj = cheb(m.x, m.y, p.x, p.y) <= 1;
        if (m.st.fear > 0) { if (!fleeStep(m) && adj) melee(m); return; }
        if (m.st.blind > 0) { if (adj && chance(.4)) melee(m); else randomStep(m); return; }
        switch (B.ai) {
            case 'goblin': return aiGoblin(m, sees, adj);
            case 'erratic': if (chance(.45)) { randomStep(m); return; } return aiBasic(m, sees, adj);
            case 'archer': return aiRanged(m, sees, adj, 'pfeil');
            case 'caster': return aiRanged(m, sees, adj, 'zauber');
            case 'ghost': return aiGhost(m, sees, adj);
            case 'boss_goblin': return aiGoblinKing(m, sees, adj);
            case 'boss_dragon': return aiDragon(m, sees, adj);
            case 'boss_lich': return aiLich(m, sees, adj);
            case 'boss_heart': return aiHeart(m, sees, adj);
            default: return aiBasic(m, sees, adj);
        }
    }
    function aiBasic(m, sees, adj) {
        if (adj && (m.aware || sees)) return melee(m);
        if (m.aware) return chaseStep(m);
        if (chance(.25)) randomStep(m);
    }
    function aiGoblin(m, sees, adj) {
        if (m.aware && (m.hp < m.mhp * .35 || m.gold)) { if (fleeStep(m)) return; if (adj) melee(m); return; }
        return aiBasic(m, sees, adj);
    }
    function aiGhost(m, sees, adj) {
        if (adj && (m.aware || sees)) return melee(m);
        if (!m.aware) { if (chance(.3)) randomStep(m); return; }
        const p = S.p, dx = Math.sign(p.x - m.x), dy = Math.sign(p.y - m.y);
        for (const [ax, ay] of [[dx, dy], [dx, 0], [0, dy]]) {
            if ((ax || ay) && monCanEnter(m, m.x + ax, m.y + ay)) { moveMon(m, m.x + ax, m.y + ay); return; }
        }
    }
    function aiRanged(m, sees, adj, kind) {
        const B = D.MON[m.k], p = S.p, d = cheb(m.x, m.y, p.x, p.y);
        if (kind === 'zauber' && adj && !m.cd.blink && chance(.5) && blinkAway(m)) { m.cd.blink = 6; log(cap(nm(m)) + ' verschwindet in einer Rauchwolke.', 'info'); return; }
        if (adj) { if (kind === 'pfeil' && chance(.5) && fleeStep(m)) return; return melee(m); }
        if (sees && d <= B.range && clearShot(m.x, m.y, p.x, p.y) && !m.cd.cast) return shoot(m, kind);
        if (m.aware) { if (kind === 'zauber' && d <= 2 && fleeStep(m)) return; return chaseStep(m); }
        if (chance(.25)) randomStep(m);
    }
    function shoot(m, kind) {
        const p = S.p;
        const el = kind === 'pfeil' ? 'pfeil' : ((m.cd.alt = !m.cd.alt) ? 'feuer' : 'eis');
        const dur = fx.proj(m.x, m.y, p.x, p.y, el, vd) || 0;
        const at = vd + dur; vd = at;
        if (kind === 'zauber') m.cd.cast = 2;
        if (chance(G.dodge())) { fx.float(p.x, p.y, 'ausgewichen', '#9aa3c4', at, 'small'); log(cap(nm(m)) + ' verfehlt dich.', 'info'); return; }
        let dmg = rr(m.shot);
        if (m.st.weak > 0) dmg = Math.ceil(dmg / 2);
        dmg = kind === 'pfeil' ? armorReduce(dmg) : Math.max(1, dmg - Math.floor(G.defense() / 2));
        if (dmg <= 0) { fx.float(p.x, p.y, 'geblockt', '#9aa3c4', at, 'small'); return; }
        log(cap(nm(m)) + (kind === 'pfeil' ? ' trifft dich mit einem Pfeil (' : (el === 'feuer' ? ' schleudert Feuer auf dich (' : ' schleudert Frost auf dich (')) + dmg + ').', 'bad');
        damagePlayer(dmg, m, { delay: at, el: el === 'pfeil' ? 'phys' : el });
        if (S.over) return;
        if (el === 'feuer' && chance(.4)) applyStatus(p, 'burn', 3);
        if (el === 'eis' && chance(.3)) applyStatus(p, 'frozen', 1);
    }
    function melee(m) {
        const p = S.p, B = D.MON[m.k];
        fx.bump(m, p.x - m.x, p.y - m.y);
        if (chance(G.dodge())) { fx.float(p.x, p.y, 'ausgewichen', '#9aa3c4', vd, 'small'); log(cap(nm(m)) + ' verfehlt dich.', 'info'); vd += 30; return; }
        let dmg = rr(m.atk);
        if (m.st.weak > 0) dmg = Math.ceil(dmg / 2);
        dmg = armorReduce(dmg);
        if (dmg <= 0) { fx.float(p.x, p.y, 'geblockt', '#9aa3c4', vd, 'small'); log('Deine Rüstung fängt den Schlag ab.', 'info'); vd += 30; return; }
        log(cap(nm(m)) + ' trifft dich (' + dmg + ').', 'bad');
        damagePlayer(dmg, m, { delay: vd, el: B.burnTouch ? 'feuer' : 'phys' });
        vd += 40;
        if (S.over) return;
        if (B.poison && chance(B.poison[0])) applyStatus(p, 'poison', B.poison[1]);
        if (B.burnTouch && chance(.5)) applyStatus(p, 'burn', 3);
        if (B.ai === 'goblin' && !m.gold && p.gold > 0 && chance(.22)) {
            const g = Math.min(p.gold, ri(3, 8 + S.depth * 2));
            p.gold -= g; m.gold = g;
            log(cap(nm(m)) + ' schnappt sich ' + g + ' Gold und rennt davon!', 'gold');
            fx.float(p.x, p.y, '-' + g + ' Gold', '#facc15', vd, 'small');
        }
    }
    function blinkAway(m) {
        const p = S.p, c = [];
        for (let y = m.y - 7; y <= m.y + 7; y++) for (let x = m.x - 7; x <= m.x + 7; x++) {
            if (!W.inB(S.map, x, y) || W.tile(S.map, x, y) !== T.FLOOR) continue;
            if (cheb(x, y, p.x, p.y) < 4 || !monCanEnter(m, x, y)) continue;
            c.push([x, y]);
        }
        if (!c.length) return false;
        const [x, y] = pick(c);
        fx.burst(m.x, m.y, 'schatten', 16, vd);
        m.x = x; m.y = y;
        fx.snap(m);
        fx.burst(x, y, 'schatten', 16, vd + 60);
        return true;
    }
    function minionsOf(m) { return S.mons.filter(o => o.owner === m.id).length; }
    function summon(m, k, n, msg) {
        let c = 0;
        for (const [dx, dy] of shuffle(W.DIRS8.slice())) {
            if (c >= n) break;
            const x = m.x + dx, y = m.y + dy;
            if (!monCanEnter({ k }, x, y)) continue;
            const s = makeMon(k, x, y, { minion: true });
            Object.assign(s, { owner: m.id, asleep: false, aware: true, en: 0, seen: 1 });
            S.mons.push(s);
            fx.burst(x, y, 'schatten', 14, vd);
            c++;
        }
        if (c && msg) { log(msg, 'boss'); fx.sfx('summon'); }
        return c;
    }
    const tier = () => Math.floor((S.depth - 1) / 20);
    function bossBolt(m, el, dmgR, msg, drain) {
        const p = S.p;
        const dur = fx.proj(m.x, m.y, p.x, p.y, el, vd) || 0;
        const at = vd + dur; vd = at;
        log(msg, 'boss');
        if (chance(G.dodge() * .7)) { fx.float(p.x, p.y, 'ausgewichen', '#9aa3c4', at, 'small'); return; }
        const dmg = Math.max(1, rr(dmgR) + tier() * 3 - Math.floor(G.defense() / 2));
        damagePlayer(dmg, m, { delay: at, el });
        if (drain && m.hp > 0) m.hp = Math.min(m.mhp, m.hp + dmg);
    }
    function aiGoblinKing(m, sees, adj) {
        if (m.aware && !m.cd.summon && minionsOf(m) < 4) {
            m.cd.summon = 7;
            if (summon(m, 'goblin', 2, '„Holt ihn euch, ihr Faulpelze!“, kreischt Grimmzahn.')) return;
        }
        if (m.hp < m.mhp * .5 && !m.enraged) { m.enraged = 1; m.spd = 130; log('Grimmzahn gerät in Raserei!', 'boss'); fx.glow(m, '#ff5a2a'); }
        return aiBasic(m, sees, adj);
    }
    function aiDragon(m, sees, adj) {
        const p = S.p;
        if (m.charge) { const c = m.charge; m.charge = null; m.cd.breath = 4; return breath(m, c.x, c.y); }
        const d = cheb(m.x, m.y, p.x, p.y);
        if (sees && !m.cd.breath && d <= 6 && clearShot(m.x, m.y, p.x, p.y)) {
            m.charge = { x: p.x, y: p.y };
            log('Ignifax holt tief Luft … Glut sammelt sich in seinem Rachen! Geh aus der Schusslinie!', 'boss');
            fx.glow(m, '#ff5a2a'); fx.sfx('charge');
            return;
        }
        return aiBasic(m, sees, adj);
    }
    function breath(m, tx, ty) {
        const p = S.p, dx = Math.sign(tx - m.x), dy = Math.sign(ty - m.y);
        const tiles = [], seen = new Set();
        const add = (x, y) => { const k = x + ',' + y; if (seen.has(k) || !W.inB(S.map, x, y) || W.opaque(W.tile(S.map, x, y))) return; seen.add(k); tiles.push({ x, y }); };
        const pts = W.ray(m.x, m.y, tx, ty, 7);
        let i = 0;
        for (const q of pts) {
            if (W.opaque(W.tile(S.map, q.x, q.y))) break;
            add(q.x, q.y);
            if (i++ >= 2) { add(q.x - dy, q.y + dx); add(q.x + dy, q.y - dx); }
        }
        log('Ignifax speit einen Feuersturm!', 'boss');
        fx.sfx('breath'); fx.shake(6);
        tiles.forEach((q, j) => { fx.burst(q.x, q.y, 'feuer', 10, vd + j * 18); if (chance(.45)) addField(q.x, q.y, 'feuer', 3); });
        const at = vd + 120;
        if (tiles.some(q => q.x === p.x && q.y === p.y)) {
            damagePlayer(ri(8, 12) + tier() * 4, m, { delay: at, el: 'feuer' });
            if (!S.over) applyStatus(p, 'burn', 3);
        } else log('Die Flammen verfehlen dich knapp!', 'good');
        S.mons.slice().forEach(o => { if (o !== m && o.hp > 0 && isHostile(o) && tiles.some(q => q.x === o.x && q.y === o.y)) damageMon(o, Math.round(ri(8, 12) * res(o, 'feuer')), { el: 'feuer', delay: at }); });
        vd = at;
    }
    function aiLich(m, sees, adj) {
        const p = S.p, d = cheb(m.x, m.y, p.x, p.y);
        if (m.aware && !m.cd.summon && minionsOf(m) < 3) {
            m.cd.summon = 8;
            if (summon(m, 'skelett', 2, 'Morgrath hebt die Knochenhand – Skelette erheben sich aus dem Staub!')) return;
        }
        if (adj && !m.cd.blink && chance(.5) && blinkAway(m)) { m.cd.blink = 5; log('Morgrath zerfällt zu Nebel und formt sich anderswo neu.', 'boss'); return; }
        if (sees && d <= 7 && d > 1 && !m.cd.bolt && clearShot(m.x, m.y, p.x, p.y)) { m.cd.bolt = 2; return bossBolt(m, 'schatten', [5, 9], 'Morgrath schleudert einen Schattenblitz!', true); }
        return aiBasic(m, sees, adj);
    }
    function aiHeart(m, sees, adj) {
        const p = S.p, d = cheb(m.x, m.y, p.x, p.y);
        if (!m.phase2 && m.hp < m.mhp * .5) { m.phase2 = 1; m.cd.nova = 2; log('Das Herz reisst sich aus seinen Wurzeln los!', 'boss'); fx.shake(10); fx.sfx('boss'); }
        if (m.charge) {
            m.charge = 0; m.cd.nova = 5;
            fx.ring(m.x, m.y, 2, 'schatten', vd);
            log('Eine Welle aus Finsternis bricht aus dem Herzen!', 'boss');
            if (d <= 2) damagePlayer(ri(9, 14) + tier() * 4, m, { delay: vd + 100, el: 'schatten' });
            else log('Du bist ausser Reichweite.', 'good');
            return;
        }
        if (m.aware && !m.cd.summon && minionsOf(m) < 3) {
            m.cd.summon = 7;
            if (summon(m, 'geist', 2, 'Schemen lösen sich aus dem pochenden Herzen.')) return;
        }
        if (m.phase2 && d <= 2 && !m.cd.nova) { m.charge = 1; log('Das Herz zieht sich zusammen … Finsternis sammelt sich! Weg da!', 'boss'); fx.glow(m, '#a065e8'); fx.sfx('charge'); return; }
        if (adj) return melee(m);
        if (sees && d <= 8 && !m.cd.bolt && clearShot(m.x, m.y, p.x, p.y)) { m.cd.bolt = m.phase2 ? 2 : 1; return bossBolt(m, 'schatten', [6, 10], 'Ein Strahl aus Finsternis schiesst auf dich zu!', false); }
        if (m.phase2 && m.aware) chaseStep(m);
    }

    /* ── Zauber wirken ───────────────────────────────────────────────── */
    G.spellRange = sp => sp.kind === 'beam' ? (sp.range || 9) : sp.kind === 'wall' ? 6 : 8;
    G.needsTarget = sp => !!(sp && D.NEEDS_TARGET[sp.kind]);
    G.validTarget = function (id, x, y) {
        const sp = D.SPELLS[id], p = S.p, m = S.map;
        if (!sp) return false;
        if (!G.needsTarget(sp)) return true;
        if (!W.inB(m, x, y) || !m.vis[idx(x, y)]) return false;
        if (x === p.x && y === p.y) return false;
        if (cheb(x, y, p.x, p.y) > G.spellRange(sp)) return false;
        const mon = monAt(x, y);
        if (sp.kind === 'zap' || sp.kind === 'chain' || sp.kind === 'grab') return !!(mon && isHostile(mon) && !mon.disguised);
        if (sp.kind === 'blink') return W.walkable(W.tile(m, x, y)) && !mon && !blockedForPlayer(x, y);
        if (sp.kind === 'wall') return W.walkable(W.tile(m, x, y));
        return true;
    };
    G.autoTarget = function (id) {
        const sp = D.SPELLS[id], p = S.p;
        if (!sp) return { x: p.x, y: p.y };
        const list = G.hostilesVisible().filter(m => cheb(m.x, m.y, p.x, p.y) <= G.spellRange(sp))
            .sort((a, b) => cheb(a.x, a.y, p.x, p.y) - cheb(b.x, b.y, p.x, p.y) || a.hp - b.hp);
        if (sp.kind === 'blink') return { x: p.x, y: p.y };
        if (sp.kind === 'wall' && list.length) {
            const t = list[0], dx = Math.sign(t.x - p.x), dy = Math.sign(t.y - p.y);
            if (cheb(t.x, t.y, p.x, p.y) > 1) return { x: p.x + dx, y: p.y + dy };
        }
        return list.length ? { x: list[0].x, y: list[0].y } : { x: p.x, y: p.y };
    };
    G.targetsFor = function (id) {
        const sp = D.SPELLS[id], p = S.p;
        return G.hostilesVisible().filter(m => cheb(m.x, m.y, p.x, p.y) <= G.spellRange(sp)).sort((a, b) => cheb(a.x, a.y, p.x, p.y) - cheb(b.x, b.y, p.x, p.y));
    };
    G.cast = function (slot, tx, ty) {
        if (!S || S.over || G.stuck()) return { ok: false };
        const p = S.p, id = p.slots[slot], sp = D.SPELLS[id];
        if (!sp) return { ok: false, msg: 'Dieser Zauberplatz ist leer.' };
        if (p.mp < sp.mp) { log('Nicht genug Mana für „' + sp.n + '“ (' + sp.mp + ' nötig).', 'bad'); return { ok: false }; }
        if (G.needsTarget(sp) && !G.validTarget(id, tx, ty)) return { ok: false, msg: 'Kein gültiges Ziel.' };
        vd = 0;
        p.mp -= sp.mp; S.stats.spells++;
        if (p.st.invis > 0 && sp.kind !== 'self') { p.st.invis = 0; log('Der Zauber verrät dich – du bist wieder sichtbar.', 'info'); }
        fx.sfx('cast', sp.el || sp.els[0]);
        castSpell(sp, tx, ty);
        endTurn();
        return { ok: true };
    };
    function runeFactor(sp) {
        let f = 0;
        sp.els.forEach(e => { f += 1 + .15 * ((S.p.runes[e] || 1) - 1); });
        return f / sp.els.length;
    }
    function roll(sp) { return Math.max(1, Math.round((rr(sp.dmg) + G.spellPower()) * runeFactor(sp))); }
    function losClear(x0, y0, x1, y1) {
        const pts = W.line(x0, y0, x1, y1);
        for (let i = 0; i < pts.length - 1; i++) if (W.opaque(W.tile(S.map, pts[i].x, pts[i].y))) return false;
        return true;
    }
    function areaTiles(cx, cy, r) {
        const out = [];
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
            if (!W.inB(S.map, x, y) || W.opaque(W.tile(S.map, x, y))) continue;
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r + r) continue;
            if (!losClear(cx, cy, x, y)) continue;
            out.push({ x, y });
        }
        return out;
    }
    function addField(x, y, k, t) {
        const v = W.tile(S.map, x, y);
        if (!W.walkable(v)) return;
        if (x === S.p.x && y === S.p.y && k !== 'dampf') return;
        const f = S.fields.find(o => o.x === x && o.y === y && o.k === k);
        if (f) f.t = Math.max(f.t, t); else S.fields.push({ x, y, k, t });
    }
    function spellHit(m, sp, dmg, delay, from) {
        if (!m || m.hp <= 0 || !isHostile(m)) return;
        const el = sp.el || 'arkan';
        let d = dmg;
        if (el === 'blitz' && m.st.wet > 0) { d *= 2; fx.float(m.x, m.y, 'leitet!', '#ffe95a', delay + 100, 'small'); }
        if (el === 'erde' && m.st.frozen > 0) { d = Math.round(d * 1.5); m.st.frozen = 0; fx.burst(m.x, m.y, 'eis', 16, delay); }
        if (el === 'feuer' && m.st.frozen > 0) m.st.frozen = 0;
        if ((el === 'eis' || el === 'wasser') && m.st.burn > 0) m.st.burn = 0;
        const r = res(m, el);
        d = r === 0 ? 0 : Math.max(1, Math.round(d * r));
        damageMon(m, d, { el, delay, crit: r > 1.2 });
        if (m.hp <= 0) return;
        if (sp.st) for (const k in sp.st) { const [t, ch] = sp.st[k]; if (chance(ch)) applyStatus(m, k, t); }
        if (sp.push && !m.boss) pushMon(m, sp.push, from || S.p);
        if (sp.drain && d > 0) healPlayer(Math.max(1, Math.round(d * sp.drain)), true);
    }
    function pushMon(m, n, from) {
        const dx = Math.sign(m.x - from.x), dy = Math.sign(m.y - from.y);
        if (!dx && !dy) return;
        for (let i = 0; i < n; i++) {
            const nx = m.x + dx, ny = m.y + dy;
            if (!monCanEnter(m, nx, ny) || W.tile(S.map, nx, ny) === T.DOOR) {
                if (W.opaque(W.tile(S.map, nx, ny)) && i === 0) damageMon(m, 2, { el: 'phys', delay: vd + 80 });
                break;
            }
            m.x = nx; m.y = ny;
        }
    }
    function explode(x, y, sp, delay) {
        fx.ring(x, y, sp.r, sp.el, delay);
        fx.burst(x, y, sp.el, 30, delay);
        areaTiles(x, y, sp.r).forEach(t => {
            const mm = monAt(t.x, t.y);
            if (mm && isHostile(mm)) spellHit(mm, sp, roll(sp), delay + 30, { x, y });
            if (sp.field) addField(t.x, t.y, sp.field, sp.ft);
        });
    }
    function crumbleAround(x0, y0, r) {
        for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
            if (W.tile(S.map, x, y) === T.SECRET) {
                W.setT(S.map, x, y, T.FLOOR);
                fx.burst(x, y, 'erde', 24, vd);
                log('Eine morsche Wand stürzt ein – dahinter liegt ein verborgener Raum!', 'magic');
            }
        }
    }
    function revealMap(sec) {
        const m = S.map;
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
            const v = m.t[y * m.w + x];
            if (v === T.WALL || v === T.SECRET) continue;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (W.inB(m, x + dx, y + dy)) m.seen[(y + dy) * m.w + x + dx] = 1;
        }
        if (sec) {
            m.secretKnown = 1;
            const hasSecret = m.t.some(v => v === T.SECRET);
            log(hasSecret ? 'Der Stein erzählt dir von einer morschen Wand … sie schimmert jetzt auf deiner Karte.' : 'Die Mauern dieser Etage haben keine Geheimnisse.', 'magic');
        }
        log('Der Plan dieser Etage brennt sich in dein Gedächtnis.', 'magic');
    }
    function teleportRandom() {
        const p = S.p;
        const s = randomFloor(Math.random, (x, y) => cheb(x, y, p.x, p.y) > 8 && !monAt(x, y) && !objAt(x, y) && !S.mons.some(m => isHostile(m) && cheb(m.x, m.y, x, y) < 4));
        if (!s) { log('Die Rolle zerfällt – nichts passiert.', 'info'); return; }
        fx.burst(p.x, p.y, 'schatten', 20, 0);
        p.x = s.x; p.y = s.y;
        fx.snap(p);
        fx.burst(p.x, p.y, 'licht', 20, 60);
        log('Die Welt dreht sich – du stehst plötzlich woanders.', 'magic');
        pickup();
        updateFov();
    }
    function castSpell(sp, tx, ty) {
        const p = S.p, m = S.map, elv = sp.el || sp.els[0];
        log('Du wirkst „' + sp.n + '“.', 'magic');
        switch (sp.kind) {
            case 'bolt': case 'ball': {
                const pts = W.line(p.x, p.y, tx, ty, 14);
                let end = { x: p.x, y: p.y }, hit = null;
                for (const q of pts) {
                    if (W.opaque(W.tile(m, q.x, q.y)) || fieldAt(q.x, q.y, 'eiswand')) break;
                    end = q;
                    const mm = monAt(q.x, q.y);
                    if (mm && isHostile(mm)) { hit = mm; break; }
                    if (q.x === tx && q.y === ty) break;
                }
                vd = fx.proj(p.x, p.y, end.x, end.y, elv, 0) || 0;
                if (sp.kind === 'bolt') { if (hit) spellHit(hit, sp, roll(sp), vd); else fx.burst(end.x, end.y, elv, 8, vd); }
                else explode(end.x, end.y, sp, vd);
                break;
            }
            case 'zap': {
                const mm = monAt(tx, ty);
                fx.zap(p.x, p.y, tx, ty, elv, 0); vd = 90;
                spellHit(mm, sp, roll(sp), vd);
                break;
            }
            case 'beam': {
                const pts = W.ray(p.x, p.y, tx, ty, sp.range || 9);
                let end = { x: p.x, y: p.y };
                const hits = [];
                for (const q of pts) {
                    if (W.opaque(W.tile(m, q.x, q.y)) || fieldAt(q.x, q.y, 'eiswand')) break;
                    end = q;
                    const mm = monAt(q.x, q.y);
                    if (mm && isHostile(mm)) hits.push(mm);
                }
                fx.zap(p.x, p.y, end.x, end.y, elv, 0, 'beam'); vd = 110;
                hits.forEach(mm => spellHit(mm, sp, roll(sp), vd));
                break;
            }
            case 'cloud': {
                vd = fx.proj(p.x, p.y, tx, ty, elv, 0) || 0;
                fx.ring(tx, ty, sp.r, elv, vd);
                areaTiles(tx, ty, sp.r).forEach(t => {
                    addField(t.x, t.y, sp.field, sp.ft);
                    const mm = monAt(t.x, t.y);
                    if (mm && isHostile(mm) && sp.dmg) spellHit(mm, sp, Math.max(1, Math.round(roll(sp) * .6)), vd);
                    if (mm && sp.field === 'gift') applyStatus(mm, 'poison', 4);
                    if (mm && sp.field === 'dampf') mm.st.blind = Math.max(mm.st.blind || 0, 3);
                });
                break;
            }
            case 'chain': {
                let cur = monAt(tx, ty), from = { x: p.x, y: p.y }, t = 0, dmg = roll(sp);
                const done = new Set();
                for (let i = 0; cur && i <= sp.jumps; i++) {
                    fx.zap(from.x, from.y, cur.x, cur.y, elv, t);
                    t += 90;
                    done.add(cur.id);
                    const at = { x: cur.x, y: cur.y };
                    spellHit(cur, sp, dmg, t);
                    dmg = Math.max(1, Math.round(dmg * .85));
                    from = at;
                    cur = G.hostilesVisible().filter(o => !done.has(o.id) && o.hp > 0 && cheb(o.x, o.y, at.x, at.y) <= sp.jr)
                        .sort((a, b) => cheb(a.x, a.y, at.x, at.y) - cheb(b.x, b.y, at.x, at.y))[0];
                }
                vd = t;
                break;
            }
            case 'nova': {
                fx.ring(p.x, p.y, sp.r, elv, 0); vd = 130;
                S.mons.filter(mm => isHostile(mm) && cheb(mm.x, mm.y, p.x, p.y) <= sp.r && m.vis[idx(mm.x, mm.y)])
                    .forEach(mm => spellHit(mm, sp, roll(sp), vd));
                if (sp.crumble) { crumbleAround(p.x, p.y, sp.r); fx.shake(8); }
                break;
            }
            case 'sight': {
                fx.ring(p.x, p.y, 8, elv, 0); vd = 160;
                G.hostilesVisible().forEach((mm, i) => spellHit(mm, sp, roll(sp), vd + i * 40));
                if (elv === 'arkan') fx.shake(6);
                break;
            }
            case 'storm': {
                let t = 0;
                for (let i = 0; i < sp.hits; i++) {
                    const list = G.hostilesVisible().filter(o => o.hp > 0);
                    if (!list.length) break;
                    const mm = pick(list);
                    fx.zap(mm.x, mm.y - 7, mm.x, mm.y, elv, t);
                    spellHit(mm, sp, roll(sp), t + 60);
                    t += 110;
                }
                vd = t;
                if (!t) log('Der Sturm grollt – aber hier ist niemand.', 'info');
                break;
            }
            case 'self': {
                if (sp.heal) healPlayer(Math.round((rr(sp.heal) + G.spellPower()) * runeFactor(sp)));
                if (sp.healPct) healPlayer(Math.round(p.mhp * sp.healPct + G.spellPower()));
                if (sp.cure) sp.cure.forEach(k => { p.st[k] = 0; });
                if (sp.shield) { p.shield = Math.round((sp.shield + G.spellPower() * 2) * runeFactor(sp)); p.st.shieldT = sp.t; log('Ein Frostschild umgibt dich (' + p.shield + ').', 'magic'); }
                if (sp.buff === 'revive') { p.st.revive = sp.t; log('Ein warmes Licht wacht über dich.', 'magic'); }
                if (sp.buff === 'invis') {
                    p.st.invis = sp.t;
                    S.mons.forEach(mm => { if (cheb(mm.x, mm.y, p.x, p.y) > 1) { mm.aware = false; mm.lost = 0; } });
                    log('Du verschmilzt mit den Schatten.', 'magic');
                }
                if (sp.reveal) revealMap(true);
                fx.burst(p.x, p.y, sp.els[sp.els.length - 1], 26, 0);
                fx.ring(p.x, p.y, 1, sp.els[0], 0);
                vd = 80;
                break;
            }
            case 'blink': {
                fx.burst(p.x, p.y, 'schatten', 22, 0);
                p.x = tx; p.y = ty;
                fx.snap(p);
                fx.burst(tx, ty, 'blitz', 22, 50);
                vd = 80;
                S.mons.filter(mm => isHostile(mm) && !mm.disguised && cheb(mm.x, mm.y, p.x, p.y) <= 1).forEach(mm => applyStatus(mm, 'stun', 1));
                pickup();
                updateFov();
                break;
            }
            case 'wall': {
                const dx = Math.sign(tx - p.x), dy = Math.sign(ty - p.y), px = -dy, py = dx;
                [[tx, ty], [tx + px, ty + py], [tx - px, ty - py]].forEach(([x, y]) => {
                    if (!W.inB(m, x, y) || !W.walkable(W.tile(m, x, y)) || (x === p.x && y === p.y)) return;
                    const o = objAt(x, y);
                    if (o && !o.open) return;
                    const mm = monAt(x, y);
                    if (mm) { if (isHostile(mm)) applyStatus(mm, 'frozen', 3); return; }
                    addField(x, y, 'eiswand', sp.ft);
                    fx.burst(x, y, 'eis', 12, 0);
                });
                vd = 60;
                break;
            }
            case 'grab': {
                const mm = monAt(tx, ty);
                fx.burst(tx, ty, 'erde', 20, 0); fx.burst(tx, ty, 'schatten', 14, 60);
                vd = 120;
                spellHit(mm, sp, roll(sp), vd);
                break;
            }
        }
    }

    /* ── Gegenstände benutzen ────────────────────────────────────────── */
    function consume(i) { const it = S.p.inv[i]; if (it.q > 1) it.q--; else S.p.inv.splice(i, 1); }
    G.use = function (i) {
        if (!S || S.over) return false;
        const p = S.p, it = p.inv[i];
        if (!it) return false;
        const d = IT(it.k);
        if (d.t === 'waffe' || d.t === 'ruestung') return G.equip(i);
        if (d.t === 'schrott') { log('Damit kannst du hier unten nichts anfangen. Ein Händler aber schon …', 'info'); return false; }
        if (G.stuck()) return false;
        vd = 0;
        switch (it.k) {
            case 'heiltrank': healPlayer(Math.max(8, Math.round(p.mhp * .4))); break;
            case 'manatrank': {
                const g = Math.min(G.maxMp() - p.mp, Math.max(8, Math.round(G.maxMp() * .6)));
                p.mp += g; fx.float(p.x, p.y, '+' + g + ' Mana', '#60a5fa', 0);
                log('Frisches Mana durchströmt dich.', 'good'); break;
            }
            case 'reinigung': ['poison', 'burn', 'soulburn', 'frozen', 'weak'].forEach(k => { p.st[k] = 0; }); healPlayer(4, true); log('Du fühlst dich rein und klar.', 'good'); break;
            case 'hast': p.st.haste = 12; log('Alles um dich herum wird langsam.', 'good'); break;
            case 'staerke': p.str++; log('Kraft schiesst in deine Arme (+1 Stärke).', 'good'); break;
            case 'leben': p.mhp += 5; p.hp += 5; log('Dein Herz schlägt kräftiger (+5 max. LP).', 'good'); break;
            case 'rolle_teleport': teleportRandom(); break;
            case 'rolle_karte': revealMap(false); break;
            case 'rolle_feuer': {
                fx.ring(p.x, p.y, 2, 'feuer', 0); vd = 120;
                log('Ein Feuersturm bricht los!', 'magic');
                S.mons.filter(mm => isHostile(mm) && cheb(mm.x, mm.y, p.x, p.y) <= 2).forEach(mm => spellHit(mm, { el: 'feuer', els: ['feuer'], st: { burn: [3, 1] } }, 8 + S.depth, vd));
                break;
            }
            case 'rolle_furcht': {
                const list = G.hostilesVisible();
                list.forEach(mm => applyStatus(mm, 'fear', 8));
                log(list.length ? 'Ein kalter Schrecken fährt in deine Feinde!' : 'Die Rolle kreischt – aber niemand hört zu.', 'magic');
                break;
            }
            case 'rolle_verzaubern': {
                const tgt = p.wpn || p.arm;
                if (tgt) { tgt.p = (tgt.p || 0) + 1; log(IT(tgt.k).n + ' glüht auf: jetzt +' + tgt.p + '.', 'magic'); fx.burst(p.x, p.y, 'licht', 20, 0); }
                break;
            }
            default: return false;
        }
        S.stats.potions++;
        consume(i);
        fx.sfx(d.t === 'trank' ? 'drink' : 'scroll');
        endTurn();
        return true;
    };
    G.equip = function (i) {
        if (!S || S.over) return false;
        const p = S.p, it = p.inv[i];
        if (!it) return false;
        const d = IT(it.k);
        if (d.t !== 'waffe' && d.t !== 'ruestung') return false;
        const slot = d.t === 'waffe' ? 'wpn' : 'arm', old = p[slot];
        p[slot] = { k: it.k, p: it.p || 0 };
        p.inv.splice(i, 1);
        if (old) p.inv.splice(i, 0, { k: old.k, q: 1, p: old.p || 0 });
        p.mp = Math.min(p.mp, G.maxMp());
        log('Ausgerüstet: ' + itemName(p[slot]) + '.', 'good');
        fx.sfx('equip');
        vd = 0; endTurn();
        return true;
    };
    G.drop = function (i) {
        if (!S || S.over) return false;
        const p = S.p, it = p.inv[i];
        if (!it) return false;
        p.inv.splice(i, 1);
        dropAt(p.x, p.y, it);
        log('Abgelegt: ' + itemName(it) + '.');
        ui.refresh();
        return true;
    };

    /* ── Händler ─────────────────────────────────────────────────────── */
    G.talk = function () {
        if (!S.shop) return;
        if (!S.shop.met) { S.shop.met = true; log('„Ah, Kundschaft! Krummfinger hat alles, was ein verbannter Magier braucht. Und ich kaufe Alt-Technik!“', 'gold'); }
        fx.sfx('coin');
        ui.shop();
    };
    G.buy = function (si) {
        const sh = S.shop, p = S.p, e = sh && sh.stock[si];
        if (!e) return { ok: false };
        if (p.gold < e.price) return { ok: false, msg: 'Dafür reicht dein Gold nicht.' };
        if (!canTake({ k: e.k })) return { ok: false, msg: 'Dein Rucksack ist voll.' };
        p.gold -= e.price;
        take({ k: e.k, q: 1, p: e.p || 0 });
        e.q--;
        if (e.q <= 0) sh.stock.splice(si, 1);
        log('Gekauft: ' + itemName({ k: e.k, p: e.p }) + ' für ' + e.price + ' Gold.', 'gold');
        fx.sfx('coin'); ui.refresh();
        return { ok: true };
    };
    G.sellPrice = it => Math.max(1, Math.floor((IT(it.k).val || 0) * (1 + (it.p || 0) * .35) * (IT(it.k).t === 'schrott' ? 1 : .4)));
    G.sell = function (i) {
        const sh = S.shop, p = S.p, it = p.inv[i];
        if (!it || !sh) return { ok: false };
        if (sh.purse <= 0) return { ok: false, msg: '„Ich bin pleite, Freund. Komm eine Etage tiefer wieder.“' };
        const price = G.sellPrice(it), pay = Math.min(price, sh.purse);
        sh.purse -= pay; p.gold += pay;
        log('Verkauft: ' + IT(it.k).n + ' für ' + pay + ' Gold.' + (pay < price ? ' Mehr hat er nicht.' : ''), 'gold');
        consume(i); fx.sfx('coin');
        if (sh.purse <= 0) {
            log('Krummfinger stülpt seine leeren Taschen um: „Du hast mich ausgenommen wie eine Weihnachtsgans!“', 'gold');
            egg('g-dungeon-ausverkauf');
        }
        ui.refresh();
        return { ok: true };
    };

    /* ── Automatik: Erkunden, Reisen, Rasten ─────────────────────────── */
    function firstStep(d, tx, ty) {
        const m = S.map, p = S.p;
        let x = tx, y = ty, guard = 0;
        if (d[idx(x, y)] >= 32000) return null;
        while (d[idx(x, y)] > 1 && guard++ < 4000) {
            let nb = null;
            for (const [dx, dy] of W.DIRS8) {
                const nx = x + dx, ny = y + dy;
                if (W.inB(m, nx, ny) && d[idx(nx, ny)] === d[idx(x, y)] - 1) { nb = [nx, ny]; break; }
            }
            if (!nb) return null;
            x = nb[0]; y = nb[1];
        }
        return { dx: x - p.x, dy: y - p.y };
    }
    function knownPass(v, x, y) {
        return S.map.seen[idx(x, y)] && (W.walkable(v) || v === T.SECRET && false) && !fieldAt(x, y, 'eiswand') && !(objAt(x, y) && !objAt(x, y).open);
    }
    G.exploreStep = function () {
        const p = S.p, m = S.map;
        const d = W.distMap(m, p.x, p.y, knownPass);
        let best = -1, bd = 32000;
        for (let i = 0; i < d.length; i++) {
            if (d[i] >= bd || d[i] === 0) continue;
            const x = i % m.w, y = (i / m.w) | 0;
            let target = S.items.some(o => o.x === x && o.y === y && canTake(o.it));
            if (!target) for (const [dx, dy] of W.DIRS8) {
                const nx = x + dx, ny = y + dy;
                if (W.inB(m, nx, ny) && !m.seen[idx(nx, ny)]) { target = true; break; }
            }
            if (target) { bd = d[i]; best = i; }
        }
        if (best < 0) return null;
        return firstStep(d, best % m.w, (best / m.w) | 0);
    };
    G.travelStep = function (tx, ty) {
        const p = S.p, m = S.map;
        if (tx === p.x && ty === p.y) return null;
        if (!W.inB(m, tx, ty) || !m.seen[idx(tx, ty)]) return null;
        const d = W.distMap(m, p.x, p.y, (v, x, y) => knownPass(v, x, y) || (x === tx && y === ty));
        return firstStep(d, tx, ty);
    };
    G.needsRest = () => S.p.hp < S.p.mhp || S.p.mp < G.maxMp();

    /* ── Beschreibung für Maus-Hinweise ──────────────────────────────── */
    G.describe = function (x, y) {
        if (!S || !W.inB(S.map, x, y)) return '';
        const m = S.map, i = idx(x, y);
        if (!m.seen[i]) return 'Unerforscht';
        if (x === S.p.x && y === S.p.y) return 'Du (' + D.CLASSES[S.cls].n + ')';
        if (m.vis[i]) {
            const mon = monAt(x, y);
            if (mon && mon.disguised) return 'Eine Truhe';
            if (mon) {
                if (mon.k === 'haendler') return 'Krummfinger, der Händler – lauf hinein, um zu handeln';
                const st = Object.keys(mon.st).filter(k => mon.st[k] > 0 && ST_LABEL[k]).map(k => ST_LABEL[k][0]);
                if (mon.asleep) st.unshift('schläft');
                return cap(D.MON[mon.k].n) + (mon.elite ? ' (wütend)' : '') + ' – ' + Math.max(0, mon.hp) + '/' + mon.mhp + ' LP' + (st.length ? ' · ' + st.join(', ') : '');
            }
        }
        const its = G.itemsAt(x, y);
        if (its.length) return its.map(o => itemName(o.it)).join(', ');
        const o = objAt(x, y);
        if (o) return o.open ? 'Offene Truhe' : 'Truhe';
        const f = fieldAt(x, y);
        if (f && m.vis[i]) return { dampf: 'Dampfwolke', gift: 'Giftnebel', feuer: 'Brennender Boden', schlamm: 'Schlamm', eiswand: 'Eiswand' }[f.k] || '';
        const v = m.t[i];
        return { 0: 'Wand', 1: 'Boden', 2: 'Tür', 3: 'Offene Tür', 4: 'Treppe nach unten', 5: 'Tiefes Wasser', 6: m.secretKnown ? 'Morsche Wand' : 'Rissige Wand', 7: 'Versiegelte Treppe' }[v] || '';
    };

    /* ── Speichern & Laden ───────────────────────────────────────────── */
    G.serialize = function () {
        if (!S || S.over) return null;
        const m = S.map;
        let t = '', seen = '';
        for (let i = 0; i < m.t.length; i++) { t += String.fromCharCode(48 + m.t[i]); seen += m.seen[i] ? '1' : '0'; }
        const mapO = { w: m.w, h: m.h, t, seen, torches: m.torches || [], start: m.start, stairs: m.stairs, lair: m.lair || null, archive: m.archive || null, zone: m.zone || 0, secretKnown: m.secretKnown || 0, forged: !!m.forged };
        const copy = Object.assign({}, S, { map: mapO, dist: null, distFly: null });
        return JSON.parse(JSON.stringify(copy, (k, v) => (k.charAt(0) === '_' ? undefined : v)));
    };
    G.load = function (o) {
        try {
            if (!o || o.v !== 1 || !o.map || !o.p || o.over) return false;
            const mo = o.map;
            if (!(mo.w > 2 && mo.h > 2) || typeof mo.t !== 'string' || mo.t.length !== mo.w * mo.h) return false;
            const m = W.makeMap(mo.w, mo.h);
            for (let i = 0; i < m.t.length; i++) { m.t[i] = Math.max(0, Math.min(7, mo.t.charCodeAt(i) - 48)); m.seen[i] = mo.seen && mo.seen.charCodeAt(i) === 49 ? 1 : 0; }
            Object.assign(m, { torches: mo.torches || [], start: mo.start, stairs: mo.stairs, lair: mo.lair, archive: mo.archive, zone: mo.zone || 0, secretKnown: mo.secretKnown, forged: mo.forged, rooms: [] });
            S = o; S.map = m;
            ['mons', 'items', 'objs', 'fields', 'log'].forEach(k => { if (!Array.isArray(S[k])) S[k] = []; });
            S.mons.forEach(mm => { mm.st = mm.st || {}; mm.cd = mm.cd || {}; });
            S.p.st = S.p.st || {};
            updateFov();
            S.dist = W.distMap(S.map, S.p.x, S.p.y, v => W.walkable(v), 45);
            S.distFly = W.distMap(S.map, S.p.x, S.p.y, v => W.walkable(v) || v === T.WATER, 45);
            fx.snap();
            return true;
        } catch (e) { console.warn('[PIXMAG] Spielstand unlesbar', e); return false; }
    };

    /* ── Entwickler-Hilfen (für Tests in der Konsole) ────────────────── */
    G.debug = {
        state: () => S,
        floor: n => { enterFloor(n); ui.refresh(); },
        give: (k, q, p) => { take({ k, q: q || 1, p: p || 0 }); ui.refresh(); },
        rune: el => { learnRune(el); ui.refresh(); },
        reveal: () => { revealMap(true); ui.refresh(); },
        heal: () => { S.p.hp = S.p.mhp; S.p.mp = G.maxMp(); ui.refresh(); },
        killAll: () => { S.mons.filter(m => isHostile(m)).forEach(m => damageMon(m, 9999, {})); ui.refresh(); },
        spawn: (k, dx, dy) => { const m = makeMon(k, S.p.x + (dx || 1), S.p.y + (dy || 0)); m.asleep = false; m.aware = true; S.mons.push(m); updateFov(); ui.refresh(); return m; },
        xp: n => { gainXP(n); ui.refresh(); }
    };
})();
