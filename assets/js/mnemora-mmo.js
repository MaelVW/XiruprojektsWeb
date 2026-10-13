/* ==========================================================================
   Mnemora-MMO – Oberfläche (nach mnemora-net.js laden; eingebunden von mnemora.html)
   Trupp & Koop-Kampf, Weltboss der Woche, Duelle gegen Geister, Tauschbörse, Chronik am Treffpunkt,
   Schnellchat (nur vorgefertigte Sätze, kein Freitext) und Ranglisten. Daten und Server: XIRU.mnNet.

   XIRU.mnMMO.init(ctx)    ctx aus mnemora.html: { pxAt, svgOf, refresh, side, map }
     .side(at) → HTML      Karten für die Seitenleiste (Trupp, Weltboss, Schnellchat)
     .marks() → SVG        Weltboss auf der Karte
     .allies() · .scale(foe, n) · .helped(allies, strasse, stufe)   Trupp im Strassenkampf
     .log(art, daten)      Eintrag in die Chronik (still)
     .click(e) / .change(e) → true, wenn erledigt (Klicks in der Seitenleiste)
     .renderTab(box)       Reiter „Treffpunkt“ (Chronik, Tauschbörse, Duellring, Ranglisten)
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, MN = X.mnemora, N = X.mnNet, M = X.mech, esc = X.esc;
    const PX = (n, s) => X.pix.svg(n, s || 16);
    const MMO = X.mnMMO = {};
    let C = { pxAt: () => '', svgOf: () => '', refresh() { }, side() { }, map() { } };
    const on = () => N.ok();
    const meId = () => (N.me && N.me.id) || '';
    const placeName = id => (MN.place(id) || {}).n || '???';
    const ONLINE_MS = 3 * 60e3;
    const ago = t => { const s = (Date.now() - t) / 1000; return s < 90 ? 'gerade eben' : s < 3600 ? 'vor ' + Math.round(s / 60) + ' min' : s < 86400 ? 'vor ' + Math.round(s / 3600) + ' h' : 'vor ' + Math.round(s / 86400) + ' T.'; };
    const later = ms => { const m = Math.max(1, Math.ceil(ms / 60e3)); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
    const fail = (t, txt) => X.toast(t, txt || 'Der Xiru-Server antwortet gerade nicht.', { iconHtml: PX('ev-sturm', 26), type: 'error' });

    /* ── Schnellchat: nur diese Sätze (plus ein Wort aus festen Listen) ── */
    const SAY = [
        { id: 'hallo', t: 'Hallo zusammen!' }, { id: 'mit', t: 'Wer kommt mit nach {}?', arg: 'place' }, { id: 'trupp', t: 'Mein Trupp sucht noch Leute.' },
        { id: 'boss', t: 'Auf zum Weltboss – wer hilft mit?' }, { id: 'brauche', t: 'Brauche {}.', arg: 'item' }, { id: 'biete', t: 'Biete {} zum Tausch.', arg: 'item' },
        { id: 'tipp', t: '{} ist hart – nehmt gute Karten mit.', arg: 'terr' }, { id: 'duell', t: 'Wer traut sich ein Duell?' }, { id: 'danke', t: 'Danke!' },
        { id: 'gg', t: 'Starker Kampf!' }, { id: 'gleich', t: 'Bin gleich da.' }, { id: 'bis', t: 'Bis bald!' }
    ];
    const ARGS = {
        place: () => MN.PLACES.filter(p => MN.seen(p.id)).map(p => [p.id, p.n]),
        item: () => (X.materials || []).filter(m => M.mat(m.id)).map(m => ['m:' + m.id, m.n]).concat(MN.CARDS.map(c => ['k:' + c.id, c.n])),
        terr: () => Object.keys(MN.TERRAIN).map(k => [k, MN.TERRAIN[k].n])
    };
    function argName(type, v) {
        v = String(v || '');
        if (type === 'place') return MN.place(v) ? MN.place(v).n : null;
        if (type === 'terr') return MN.TERRAIN[v] ? MN.TERRAIN[v].n : null;
        if (type === 'item') { const k = v.slice(0, 2), i = v.slice(2); if (k === 'm:') return M.mat(i) ? M.mat(i).n : null; if (k === 'k:') return MN.card(i) ? MN.card(i).n : null; }
        return null;
    }
    /* Text eines Funkspruchs – Unbekanntes wird nicht angezeigt */
    function sayText(e) {
        const s = SAY.find(x => x.id === e.a); if (!s) return null;
        if (!s.arg) return s.t;
        const w = argName(s.arg, e.b); return w ? s.t.replace('{}', w) : null;
    }

    /* ── Seitenleiste ── */
    MMO.side = at => X.easy() || !on() ? '' : partyCard() + bossCard(at) + chatCard(at);
    function partyCard() {
        const list = N.party, mine = meId();
        if (!MN.party()) return '<div class="card mn-card mn-mmo"><span class="eyebrow">' + PX('ic-trupp') + ' Trupp</span><p class="small mb-0">Allein unterwegs. Lade Reisende am gleichen Ort in deinen Trupp ein (bis zu drei). Ihre Mechs kämpfen dann auf den Strassen als KI-Kopien mit – auch wenn sie gerade offline sind.</p></div>';
        const others = list.filter(p => p.id !== mine);
        return '<div class="card mn-card mn-mmo"><span class="eyebrow">' + PX('ic-trupp') + ' Dein Trupp · ' + Math.max(1, list.length) + '/3</span>' +
            (list.length ? '<ul class="mn-roads">' + list.map(p => {
                const live = Date.now() - p.at < ONLINE_MS, pl = MN.place(p.place);
                return '<li>' + PX(p.kit ? p.kit.id : 'gh-itx', 24) + '<div><b>' + esc(p.nick) + (p.id === mine ? ' (du)' : '') + '</b><div class="small muted">' + (live ? '<span class="mn-dot" title="online"></span>' : '') +
                    esc(pl ? pl.n : 'in Sektaria') + (p.kit ? ' · ' + esc(MN.casing(p.kit.id).n) : '') + '</div></div><span></span></li>';
            }).join('') + '</ul>' : '') +
            (others.length ? '<p class="small muted mb-1">Auf den Strassen kämpf' + (others.length > 1 ? 'en ' : 't ') + others.map(p => esc(p.nick)).join(' und ') + ' mit. Wer mitkämpft, bekommt für jeden Sieg einen Anteil.</p>'
                : '<p class="small muted mb-1">Noch niemand beigetreten. Einladungen gelten 15 Minuten.</p>') +
            '<button class="btn btn--sm btn--ghost" type="button" data-mmo="leave">Trupp verlassen</button></div>';
    }
    function bossCard(at) {
        const wb = MN.worldBoss(), B = N.boss.key === wb.key ? N.boss : { hits: [], total: 0 }, left = Math.max(0, wb.hp - B.total), down = left <= 0;
        const mine = B.hits.find(h => h.player === meId()), rank = mine ? B.hits.indexOf(mine) : -1, w = MN.wbState(), here = at === wb.place, seen = MN.seen(wb.place);
        let h = '<div class="card mn-card mn-mmo mn-wb' + (here && !down ? ' is-here' : '') + '"><span class="eyebrow">' + PX('ic-weltboss') + ' Weltboss der Woche</span><h3 class="mb-1">' + esc(wb.def.n) + '</h3>' +
            '<p class="small mb-1">' + (here ? esc(wb.def.d) : 'Diese Woche ' + (seen ? 'in <b>' + esc(placeName(wb.place)) + '</b>' : 'an einem Ort, den du noch nicht kennst') + '. Alle Reisenden kämpfen gegen dieselben Lebenspunkte.') + '</p>' +
            '<div class="bar bar--sm mn-wb__bar"><div class="bar__fill" style="--v:' + (left / wb.hp * 100).toFixed(1) + '%"></div></div>' +
            '<span class="small muted">' + (down ? 'Besiegt!' : X.fmt(left) + ' / ' + X.fmt(wb.hp) + ' Struktur') + ' · ' + B.hits.length + ' Reisende dabei</span>';
        if (mine) h += '<p class="small mb-1 mt-1">Dein Schaden: <b>' + X.fmt(mine.n) + '</b> (' + mine.hits + ' Angriff' + (mine.hits > 1 ? 'e' : '') + ', Platz ' + (rank + 1) + ')</p>';
        if (B.hits.length) h += '<ol class="mn-top small">' + B.hits.slice(0, 3).map(x => '<li' + (x.player === meId() ? ' class="is-me"' : '') + '><b>' + esc(x.nick) + '</b> <span class="muted">' + X.fmt(x.n) + '</span></li>').join('') + '</ol>';
        if (down) h += mine && !w.claimed ? '<button class="btn btn--primary btn--sm" type="button" data-mmo="claim">' + PX('box-gold') + ' Beute abholen</button>'
            : '<p class="small ' + (mine ? 'text-success' : 'muted') + ' mb-0">' + (mine ? 'Beute abgeholt. ' : 'Diesmal warst du nicht dabei. ') + 'Nächste Woche kommt ein neuer.</p>';
        else if (here) {
            const ready = MN.wbReady(), cas = MN.active();
            h += '<button class="btn btn--primary btn--sm mt-1" type="button" data-mmo="wb"' + (ready && cas && cas.c > 0 ? '' : ' disabled') + '>' + PX('st-atk') + ' Angreifen · ' + MN.WB_ROUNDS + ' Runden</button>' +
                (ready ? '' : '<p class="small muted mb-0">Dein Gehäuse kühlt noch ab – wieder bereit in ' + later(w.last + MN.WB_COOLDOWN - Date.now()) + '.</p>');
        } else if (seen && MN.path(wb.place)) h += '<button class="btn btn--sm mt-1" type="button" data-go="' + wb.place + '">' + PX('st-spd') + ' Hinreisen</button>';
        return h + '</div>';
    }
    function chatCard(at) {
        const list = N.feed.filter(e => e.kind === 'say' && e.place === at && Date.now() - e.at < 6 * 3600e3).map(e => [e, sayText(e)]).filter(x => x[1]).slice(0, 6).reverse();
        return '<div class="card mn-card mn-mmo"><span class="eyebrow">' + PX('ic-chat') + ' Schnellchat · ' + esc(placeName(at)) + '</span>' +
            (list.length ? '<ul class="mn-chat">' + list.map(([e, t]) => '<li' + (e.player === meId() ? ' class="is-me"' : '') + '><b>' + esc(e.nick) + '</b> ' + esc(t) + ' <span class="muted">' + ago(e.at) + '</span></li>').join('') + '</ul>'
                : '<p class="small muted">Noch still hier. Alle am gleichen Ort sehen, was du sagst.</p>') +
            '<div class="mn-say"><select class="select" id="mn-say" aria-label="Satz wählen">' + SAY.map(s => '<option value="' + s.id + '">' + esc(s.t.replace('{}', '…')) + '</option>').join('') + '</select>' +
            '<select class="select" id="mn-say-arg" aria-label="Wort wählen" hidden></select><button class="btn btn--sm" type="button" data-mmo="say">Senden</button></div></div>';
    }
    function fillArg(root) {
        const s = root.querySelector('#mn-say'), a = root.querySelector('#mn-say-arg'); if (!s || !a) return;
        const def = SAY.find(x => x.id === s.value), opts = def && def.arg ? ARGS[def.arg]() : [];
        a.hidden = !opts.length;
        a.innerHTML = opts.map(([v, n]) => '<option value="' + esc(v) + '">' + esc(n) + '</option>').join('');
    }

    /* ── Karte: Weltboss an seinem Ort ── */
    MMO.marks = function () {
        if (X.easy() || !on()) return '';
        const wb = MN.worldBoss(), p = MN.place(wb.place); if (!p || !MN.seen(p.id)) return '';
        const down = N.boss.key === wb.key && N.boss.total >= wb.hp;
        return '<g class="mn-wbmark' + (down ? ' is-down' : '') + '" data-place="' + p.id + '">' + C.pxAt('ic-weltboss', p.x - 120, p.y + 20, 88) + '<title>Weltboss: ' + esc(wb.def.n) + (down ? ' (besiegt)' : '') + '</title></g>';
    };

    /* ── Trupp im Strassenkampf ── */
    MMO.allies = () => !on() ? [] : N.party.filter(p => p.id !== meId() && p.kit).slice(0, 2).map(p => {
        const lo = MN.kitArt(p.kit);
        return { id: p.id, nick: p.nick, name: p.nick, icon: p.kit.id, c: Object.assign({}, p.kit.c), art: f => C.svgOf(lo, f) };
    });
    /* Mehr Mechs → zäherer Gegner */
    MMO.scale = (foe, n) => { if (n) { foe.c.hp = Math.round(foe.c.hp * (1 + .55 * n)); foe.c.atk = Math.round(foe.c.atk * (1 + .15 * n)); } return foe; };
    MMO.helped = (allies, road, lvl) => { if (allies.length) N.help(allies, road, 6 + lvl * 3); };
    MMO.log = (kind, d) => N.log(kind, d);

    /* ── Weltboss-Kampf ── */
    function fightWorld() {
        const wb = MN.worldBoss(), cas = MN.active();
        if (!cas || cas.c <= 0) { fail('Kein einsatzbereites Gehäuse', 'Repariere dein Gehäuse in der Feldwerkstatt.'); return; }
        if (MN.at() !== wb.place || !MN.wbReady()) return;
        const B = N.boss.key === wb.key ? N.boss : { total: 0 }, left = wb.hp - B.total;
        if (left <= 0) return;
        const def = MN.casing(cas.id), foe = MN.worldFoe(), meC = MN.combat(cas), meLo = MN.loadout(cas);
        X.kampf.fight({
            label: 'Weltboss: ' + wb.def.n, scene: 'weltboss', rounds: MN.WB_ROUNDS,
            me: { name: def.n, icon: cas.id, c: meC, art: f => C.svgOf(meLo, f) },
            foe: { name: wb.def.n, icon: 'ic-weltboss', c: foe.c, hp: left, art: f => C.svgOf(foe.lo, f, true) },
            intro: PX('ic-weltboss') + ' <b>' + esc(wb.def.n) + '</b> – ' + esc(wb.def.d) + ' Du hast ' + MN.WB_ROUNDS + ' Runden, jeder Treffer zählt für alle.',
            finish(win, info) {
                const dmg = Math.max(0, Math.min(left, info.dmg)), worn = MN.wear(cas, true, foe.lvl * .6);
                const lines = dmg > 0 ? MN.loot(Math.max(1, foe.lvl * .6), false) : [];
                X.addXP(Math.round(10 + dmg / 25), 'Weltboss angegriffen');
                MN.wbHit(dmg);
                if (dmg > 0) N.hit(dmg).then(b => { if (B.total < wb.hp && b.total >= wb.hp) N.log('wbdown', { a: wb.key, b: wb.def.id }); C.refresh(); })
                    .catch(() => { const w = MN.wbState(); w.last = 0; w.hits = Math.max(0, w.hits - 1); w.dmg = Math.max(0, w.dmg - dmg); MN.mark('wb', w); fail('Treffer nicht gemeldet', 'Der Xiru-Server antwortet gerade nicht. Versuch es gleich noch einmal.'); C.refresh(); });
                return {
                    title: win ? 'Weltboss besiegt!' : 'Angriff beendet', cheer: 'Der letzte Schlag!', leave: 'Zurück zur Karte',
                    html: '<p class="mb-1">Dein Schaden: <b>' + X.fmt(dmg) + '</b>' + (win ? ' – ' + esc(wb.def.n) + ' fällt!' : ' · Übrig: etwa ' + X.fmt(Math.max(0, left - dmg)) + ' Struktur.') + '</p>' +
                        (lines.length ? '<p class="mb-1">Beute: ' + lines.join(' · ') + '</p>' : '') + '<p class="small muted mb-1">Nächster Angriff in 2 Stunden. Zustand ' + esc(def.n) + ': −' + worn + ' %</p>'
                };
            }
        }).then(() => C.refresh());
    }
    function claim() {
        const B = N.boss, mine = B.hits.findIndex(h => h.player === meId());
        const lines = MN.wbClaim(mine >= 0 && mine < 3);
        if (!lines) return;
        X.confetti(120);
        X.modal('<span class="eyebrow">' + PX('ic-weltboss') + ' Weltboss besiegt</span><h2>Deine Beute</h2><p>' + lines.join(' · ') + '</p>' + (mine >= 0 && mine < 3 ? '<p class="small text-success">Extra für Platz ' + (mine + 1) + ' beim Schaden!</p>' : '') +
            '<div class="row mt-2"><button class="btn btn--primary" type="button" data-close>Super!</button></div>');
        C.refresh();
    }

    /* ── Duell gegen einen Geist ── */
    function duel(g) {
        const cas = MN.active(); if (!cas || !g || !g.kit) return;
        const def = MN.casing(cas.id), meC = MN.combat(cas), meLo = MN.loadout(cas), k = g.kit, lo = MN.kitArt(k), gd = MN.casing(k.id);
        X.kampf.fight({
            label: 'Duell gegen den Geist von ' + g.nick, scene: 'arena',
            me: { name: def.n, icon: cas.id, c: meC, art: f => C.svgOf(meLo, f) },
            foe: { name: 'Geist von ' + g.nick, icon: k.id, c: Object.assign({}, k.c), art: f => C.svgOf(lo, f) },
            intro: PX('ic-duell') + ' Im Ring flackert ein Abbild von <b>' + esc(g.nick) + 's ' + esc(gd.n) + '</b> auf. Es kämpft genau so, wie der echte Mech gebaut ist.',
            finish(win) {
                const day = new Date().toISOString().slice(0, 10), dr = Object.assign({}, MN.mark('dr') || {});
                let html = '';
                if (win && dr[g.id] !== day) {
                    dr[g.id] = day; const keys = Object.keys(dr); if (keys.length > 60) delete dr[keys[0]]; MN.mark('dr', dr);
                    const lines = X.werft.grant([{ type: 'taler', n: 20 + Math.round(X.kampf.power(k.c) / 20) }]); X.addXP(12, 'Duell gewonnen');
                    html = '<p class="mb-1">Preisgeld: ' + lines.join(' · ') + '</p>';
                } else if (win) html = '<p class="small muted mb-1">Gegen diesen Geist gab es heute schon Preisgeld. Punkte für die Duell-Rangliste gibt es auch nur einmal pro Tag und Gegner.</p>';
                else html = '<p class="mb-1">Der Geist war stärker. Im Duell geht nichts kaputt – probier es mit anderen Karten noch einmal.</p>';
                N.duel(g, win).catch(() => { });
                return { title: win ? 'Duell gewonnen!' : 'Duell verloren', html, cheer: 'Der Geist verblasst.', leave: 'Zurück' };
            }
        }).then(() => C.refresh());
    }

    /* ── Nachrichten an dich und Live-Funk ── */
    function invited(e) {
        if (document.querySelector('.modal [data-inv]')) return;
        const cur = MN.party();
        const m = X.modal('<div class="npc"><div class="npc__face">' + PX('ic-trupp', 48) + '</div><div><span class="eyebrow">Einladung</span><h2 class="mb-1">' + esc(e.nick) + ' lädt dich in den Trupp ein</h2>' +
            '<p class="small">Im Trupp kämpfen eure Mechs auf den Strassen gemeinsam – als KI-Kopien, auch wenn jemand offline ist. Wer mithilft, bekommt einen Anteil der Beute.</p>' +
            (cur ? '<p class="small text-danger mb-0">Du verlässt dafür deinen jetzigen Trupp.</p>' : '') + '</div></div>' +
            '<div class="row mt-2" data-inv><button class="btn btn--primary" type="button" data-yes>Beitreten</button><button class="btn" type="button" data-close>Nein danke</button></div>');
        m.el.querySelector('[data-yes]').addEventListener('click', () => {
            m.close();
            N.join(e.a, { id: e.player, nick: e.nick }).then(() => { X.toast('Willkommen im Trupp', 'Du reist jetzt mit ' + e.nick + '.', { iconHtml: PX('ic-trupp', 26) }); C.refresh(); })
                .catch(err => fail('Beitritt ging nicht', err.message));
        });
    }
    N.on('msg', e => {
        const fresh = Date.now() - e.at < 15 * 60e3;
        if (e.kind === 'inv' && fresh && e.a !== MN.party()) invited(e);
        else if (e.kind === 'join' && fresh) { X.toast(e.nick + ' ist in deinem Trupp', 'Ab jetzt kämpft ' + e.nick + ' auf den Strassen mit.', { iconHtml: PX('ic-trupp', 26) }); N.refresh('party'); }
        else if (e.kind === 'help') {
            const n = X.clamp(Math.round(e.n), 0, 80), r = MN.road(e.a); if (!n) return;
            const lines = X.werft.grant([{ type: 'taler', n }]);
            X.toast('Trupp-Anteil', e.nick + ' hat ' + (r ? 'auf ' + MN.roadDat(r) : 'auf Mnemora') + ' mit deinem Mech gesiegt: ' + lines.join(' ').replace(/<[^>]+>/g, ''), { iconHtml: PX('ic-trupp', 26) });
        }
        else if (e.kind === 'duel' && fresh) X.toast('Dein Geist im Duellring', e.nick + (e.n ? ' hat deinen Geist besiegt.' : ' hat gegen deinen Geist verloren!'), { iconHtml: PX('ic-duell', 26) });
        else if (e.kind === 'trade' && fresh) X.toast('Angebot angenommen', e.nick + ' tauscht mit dir. Die Ware ist unterwegs.', { iconHtml: PX('ic-tausch', 26) });
    });
    N.on('live', e => {
        if (e.kind === 'say' && e.place === MN.at()) { const t = sayText(e); if (t) { X.toast(e.nick, t, { iconHtml: PX('ic-chat', 26) }); X.beep(660, .05, 'square', .03); } }
        else if (e.kind === 'wbdown') X.toast('Weltboss besiegt!', e.nick + ' hat den letzten Schlag gesetzt. Wer mitgekämpft hat, holt jetzt die Beute ab.', { iconHtml: PX('ic-weltboss', 26) });
    });
    N.on('settled', list => {
        list.forEach(t => X.toast('Tausch abgeschlossen', t.nick + ' hat getauscht – du bekommst ' + MN.itemName(t.want) + '.', { iconHtml: MN.itemIcon(t.want, 26) }));
        C.refresh();
    });
    N.on('feed', () => { C.side(); if (tabOpen()) MMO.renderTab(); });
    N.on('party', () => C.side());
    N.on('boss', () => { C.side(); C.map(); });
    N.on('trades', () => { if (tabOpen()) MMO.renderTab(); });

    /* ── Klicks in der Seitenleiste ── */
    let sayAt = 0;
    MMO.click = function (e) {
        const b = e.target.closest('[data-mmo],[data-inv-p],[data-duel-p]'); if (!b || b.disabled) return false;
        const act = b.dataset.mmo;
        if (b.dataset.invP) {
            const p = N.travellers.find(x => x.id === b.dataset.invP); if (!p) return true;
            b.disabled = true;
            N.invite(p).then(() => X.toast('Einladung verschickt', p.nick + ' kann jetzt deinem Trupp beitreten.', { iconHtml: PX('ic-trupp', 26) })).catch(() => fail('Einladung ging nicht durch'));
        } else if (b.dataset.duelP) duel(N.travellers.find(x => x.id === b.dataset.duelP));
        else if (act === 'leave') N.leave().then(() => { X.toast('Trupp verlassen', 'Du bist wieder allein unterwegs.', { iconHtml: PX('ic-trupp', 26) }); C.side(); }).catch(() => fail('Das ging nicht'));
        else if (act === 'wb') fightWorld();
        else if (act === 'claim') claim();
        else if (act === 'say') {
            const root = b.closest('.mn-say'), s = root.querySelector('#mn-say').value, a = root.querySelector('#mn-say-arg');
            const def = SAY.find(x => x.id === s); if (!def) return true;
            if (Date.now() - sayAt < 4000) { X.toast('Langsam', 'Warte kurz vor dem nächsten Satz.', { iconHtml: PX('ic-chat', 26) }); return true; }
            sayAt = Date.now();
            N.say(s, def.arg ? a.value : '').then(() => C.side()).catch(() => fail('Nachricht ging nicht durch'));
        } else return false;
        return true;
    };
    MMO.change = function (e) { if (e.target.id === 'mn-say') { fillArg(e.target.closest('.mn-say')); return true; } return e.target.id === 'mn-say-arg'; };

    /* ── Reiter „Treffpunkt“ ── */
    let tabBox = null, ghosts = null, ranks = null, rankTab = 'explorers', busy = false;
    const tabOpen = () => !!tabBox && !tabBox.hidden;
    const CHRON = ['arrive', 'place', 'road', 'gc', 'wbdown', 'duel', 'trade', 'join'];
    function chronText(e) {
        const who = '<b>' + esc(e.nick) + '</b>', pl = MN.place(e.a), r = MN.road(e.a);
        switch (e.kind) {
            case 'arrive': return PX('ic-arche') + ' ' + who + ' ist mit der Arche in Port Puffer angekommen.';
            case 'place': return pl ? PX(MN.KIND_ICON[pl.kind]) + ' ' + who + ' hat <b>' + esc(pl.n) + '</b> entdeckt.' : null;
            case 'road': return r ? MN.terrIcon(r.terr) + ' ' + who + ' hat ' + (r.f ? 'die' : 'den') + ' <b>' + esc(r.n) + '</b> freigekämpft.' : null;
            case 'gc': return PX('ic-gc') + ' ' + who + ' hat den <b>Garbage Collector</b> besiegt!';
            case 'wbdown': { const d = MN.WORLD.find(w => w.id === e.b); return d ? PX('ic-weltboss') + ' ' + who + ' hat dem Weltboss <b>' + esc(d.n) + '</b> den letzten Schlag versetzt!' : null; }
            case 'duel': return PX('ic-duell') + ' ' + (e.n ? who + ' besiegt den Geist von <b>' + esc(e.b) + '</b>.' : 'Der Geist von <b>' + esc(e.b) + '</b> hält ' + who + ' stand.');
            case 'trade': return PX('ic-tausch') + ' ' + who + ' und <b>' + esc(e.b) + '</b> haben getauscht.';
            case 'join': return PX('ic-trupp') + ' ' + who + (e.b ? ' reist jetzt im Trupp von <b>' + esc(e.b) + '</b>.' : ' hat sich einem Trupp angeschlossen.');
        }
        return null;
    }
    function chronik() {
        const list = N.feed.filter(e => CHRON.includes(e.kind)).map(e => [e, chronText(e)]).filter(x => x[1]).slice(0, 15);
        return list.length ? '<ul class="mn-chron">' + list.map(([e, t]) => '<li><span>' + t + '</span> <span class="small muted">' + ago(e.at) + '</span></li>').join('') + '</ul>'
            : '<p class="small muted mb-0">Noch ist nichts passiert. Was Reisende auf Mnemora erreichen, steht hier.</p>';
    }
    function tradesHtml(meet) {
        const list = N.trades, mine = meId();
        if (!list.length) return '<p class="small muted mb-0">Gerade keine Angebote.' + (meet ? ' Mach das erste!' : '') + '</p>';
        return '<ul class="mn-trades">' + list.map(t => {
            const own = t.player === mine, can = meet && !own && MN.hasItem(t.want);
            return '<li><div class="mn-trade"><span>' + MN.itemIcon(t.give, 24) + ' ' + esc(MN.itemName(t.give)) + '</span><span class="muted small">gegen</span><span>' + MN.itemIcon(t.want, 24) + ' ' + esc(MN.itemName(t.want)) + '</span></div>' +
                '<span class="small muted">' + (own ? 'dein Angebot' : esc(t.nick)) + ' · ' + ago(t.at) + '</span>' +
                (own ? '<button class="btn btn--sm btn--ghost" type="button" data-cancel="' + t.id + '">Zurückziehen</button>'
                    : '<button class="btn btn--sm' + (can ? ' btn--primary' : '') + '" type="button" data-take="' + t.id + '"' + (can ? '' : ' disabled title="' + esc(meet ? 'Dafür fehlt dir: ' + MN.itemName(t.want) : 'Nur an Treffpunkten') + '"') + '>Tauschen</button>') + '</li>';
        }).join('') + '</ul>';
    }
    function ghostsHtml(meet) {
        if (!ghosts) return '<p class="small muted mb-0">Im Duellring kämpfst du gegen Geister: KI-Kopien der Mechs anderer Reisender, mit genau ihren Werten. Im Duell geht nichts kaputt, Siege zählen für die Duell-Rangliste.</p>';
        if (!ghosts.length) return '<p class="small muted mb-0">Noch keine Geister – andere Reisende müssen erst einmal auf Mnemora gewesen sein.</p>';
        const cas = MN.active(), myP = cas ? X.kampf.power(MN.combat(cas)) : 0;
        return '<ul class="mn-roads">' + ghosts.map(g => '<li>' + PX(g.kit.id, 26) + '<div><b>' + esc(g.nick) + '</b><div class="small muted">' + esc(MN.casing(g.kit.id).n) + ' · Stärke ' + X.kampf.power(g.kit.c) + (myP ? ' (du: ' + myP + ')' : '') + '</div></div>' +
            '<button class="btn btn--sm' + (meet && cas ? ' btn--primary' : '') + '" type="button" data-duel="' + g.id + '"' + (meet && cas ? '' : ' disabled') + '>Herausfordern</button></li>').join('') + '</ul>';
    }
    function ranksHtml() {
        if (!ranks) return '<p class="small muted mb-0">Entdecker (Fortschritt auf Mnemora), Duelle (dieser Monat) und Weltboss (diese Woche).</p>';
        const T = [['explorers', 'Entdecker'], ['duels', 'Duelle'], ['boss', 'Weltboss']], mine = meId();
        const row = (i, pid, nick, val, sub) => '<li' + (pid === mine ? ' class="is-me"' : '') + '><span>' + (i + 1) + '.</span><b>' + esc(nick) + '</b><span class="small muted">' + sub + '</span><span>' + val + '</span></li>';
        let list = '';
        if (rankTab === 'explorers') list = ranks.explorers.map((p, i) => row(i, p.id, p.nick, X.fmt(p.mns), p.mn.r + ' Strassen · ' + p.mn.p + ' Orte' + (p.mn.b ? ' · GC' : ''))).join('');
        else if (rankTab === 'duels') list = ranks.duels.map((p, i) => row(i, p.id, p.nick, p.n + ' P.', p.w + ' Siege · ' + p.d + ' gehalten')).join('');
        else list = ranks.boss.map((p, i) => row(i, p.player, p.nick, X.fmt(p.n), p.hits + ' Angriffe')).join('');
        return '<div class="mn-ranktabs" role="tablist">' + T.map(([k, t]) => '<button type="button" role="tab" aria-selected="' + (rankTab === k) + '" data-rank="' + k + '">' + t + '</button>').join('') + '</div>' +
            (list ? '<ol class="mn-rank">' + list + '</ol>' : '<p class="small muted mb-0">Noch keine Einträge.</p>');
    }
    MMO.renderTab = function (box) {
        if (box) { tabBox = box; if (!box.dataset.bound) { box.dataset.bound = '1'; box.addEventListener('click', tabClick); } }
        if (!tabBox) return;
        if (!on()) {
            tabBox.innerHTML = '<div class="card easy-note"><div>' + PX('ic-trupp', 56) + '</div><h3>Treffpunkt der Reisenden</h3><p class="muted">Trupps, der Weltboss der Woche, Duelle gegen Geister anderer Reisender, Tauschbörse, Schnellchat und Ranglisten gibt es mit <b>Online</b>. ' +
                'Geteilt werden dabei nur dein Spitzname, Level, Ort und die Werte deines aktiven Gehäuses.</p><a class="btn btn--primary" href="' + X.url('konto/einstellungen.html') + '#online">Online einschalten</a></div>';
            return;
        }
        const at = MN.at(), meet = MN.MEET.includes(at);
        tabBox.innerHTML = '<p class="small muted">' + (meet ? PX('ic-krug') + ' Du bist am Treffpunkt <b>' + esc(placeName(at)) + '</b>: Hier kannst du tauschen und Geister zum Duell fordern.'
            : 'Tauschen und Duelle gehen nur an den Treffpunkten <b>Port Puffer</b> und <b>Registra</b>. Chronik und Ranglisten siehst du überall.') + '</p>' +
            '<div class="mn-treff">' +
            '<section class="card mn-card"><h3>' + PX('ic-chronik', 20) + ' Chronik</h3>' + chronik() + '</section>' +
            '<section class="card mn-card"><div class="row mb-1"><h3 class="mb-0">' + PX('ic-tausch', 20) + ' Tauschbörse</h3><span class="spacer"></span>' + (meet ? '<button class="btn btn--sm btn--primary" type="button" data-t="offer">Angebot machen</button>' : '') + '</div>' + tradesHtml(meet) + '</section>' +
            '<section class="card mn-card"><div class="row mb-1"><h3 class="mb-0">' + PX('ic-duell', 20) + ' Duellring</h3><span class="spacer"></span><button class="btn btn--sm" type="button" data-t="ghosts">' + (ghosts ? 'Neu laden' : 'Geister rufen') + '</button></div>' + ghostsHtml(meet) + '</section>' +
            '<section class="card mn-card"><div class="row mb-1"><h3 class="mb-0">' + PX('ic-rang', 20) + ' Ranglisten</h3><span class="spacer"></span><button class="btn btn--sm" type="button" data-t="ranks">' + (ranks ? 'Aktualisieren' : 'Laden') + '</button></div>' + ranksHtml() + '</section>' +
            '</div>';
    };
    function tabClick(e) {
        const b = e.target.closest('[data-t],[data-take],[data-cancel],[data-duel],[data-rank]'); if (!b || b.disabled || busy) return;
        const t = b.dataset.t;
        if (t === 'offer') offerModal();
        else if (t === 'ghosts') { busy = true; b.disabled = true; N.ghosts().then(list => { ghosts = list; }).catch(() => fail('Keine Geister erreichbar')).finally(() => { busy = false; MMO.renderTab(); }); }
        else if (t === 'ranks') { busy = true; b.disabled = true; N.ranks().then(r => { ranks = r; }).catch(() => fail('Ranglisten nicht erreichbar')).finally(() => { busy = false; MMO.renderTab(); }); }
        else if (b.dataset.rank) { rankTab = b.dataset.rank; MMO.renderTab(); }
        else if (b.dataset.duel) duel((ghosts || []).find(g => g.id === b.dataset.duel));
        else if (b.dataset.take) confirmTake(N.trades.find(x => x.id === b.dataset.take));
        else if (b.dataset.cancel) {
            const tr = N.trades.find(x => x.id === b.dataset.cancel); if (!tr) return;
            busy = true; b.disabled = true;
            N.cancel(tr).then(() => { X.toast('Angebot zurückgezogen', MN.itemName(tr.give) + ' ist wieder in deinem Lager (ausser es wurde gerade noch getauscht).', { iconHtml: MN.itemIcon(tr.give, 26) }); C.refresh(); })
                .catch(() => fail('Zurückziehen ging nicht')).finally(() => { busy = false; MMO.renderTab(); });
        }
    }
    function confirmTake(t) {
        if (!t) return;
        const m = X.modal('<span class="eyebrow">' + PX('ic-tausch') + ' Tauschbörse</span><h2>Tauschen mit ' + esc(t.nick) + '?</h2>' +
            '<div class="mn-trade mn-trade--big"><span>Du gibst<br>' + MN.itemIcon(t.want, 32) + ' <b>' + esc(MN.itemName(t.want)) + '</b></span><span>' + PX('ic-tausch', 32) + '</span><span>Du bekommst<br>' + MN.itemIcon(t.give, 32) + ' <b>' + esc(MN.itemName(t.give)) + '</b></span></div>' +
            '<div class="row mt-2"><button class="btn btn--primary" type="button" data-yes>Tauschen</button><button class="btn" type="button" data-close>Abbrechen</button></div>');
        m.el.querySelector('[data-yes]').addEventListener('click', ev => {
            ev.target.disabled = true;
            N.take(t).then(() => { m.close(); X.toast('Getauscht!', 'Du bekommst ' + MN.itemName(t.give) + '.', { iconHtml: MN.itemIcon(t.give, 26) }); X.confetti(40); C.refresh(); MMO.renderTab(); })
                .catch(err => { m.close(); fail('Tausch ging nicht', err.message); MMO.renderTab(); });
        });
    }
    function offerModal() {
        const inv = MN.tradeables();
        if (!inv.length) { X.toast('Nichts zum Anbieten', 'Freie Steckkarten oder Material im Lager kannst du anbieten.', { iconHtml: PX('ic-tausch', 26) }); return; }
        const gOpt = inv.map(x => '<option value="' + x.k + ':' + x.id + '">' + esc(x.k === 'card' ? MN.card(x.id).n + ' (Steckkarte, ' + x.have + '× frei)' : M.mat(x.id).n + ' (' + x.have + ' im Lager)') + '</option>').join('');
        const wOpt = '<option value="taler:">Taler</option>' + (X.materials || []).filter(x => M.mat(x.id)).map(x => '<option value="mat:' + x.id + '">' + esc(x.n) + '</option>').join('') +
            MN.CARDS.map(c => '<option value="card:' + c.id + '">' + esc(c.n) + ' (Steckkarte)</option>').join('');
        const m = X.modal('<span class="eyebrow">' + PX('ic-tausch') + ' Tauschbörse</span><h2>Angebot machen</h2><form data-offer>' +
            '<div class="field"><label for="of-g">Du gibst</label><div class="row"><select class="select" id="of-g">' + gOpt + '</select><input class="input mn-num" type="number" id="of-gn" min="1" max="999" value="1" aria-label="Menge, die du gibst"></div></div>' +
            '<div class="field"><label for="of-w">Du willst dafür</label><div class="row"><select class="select" id="of-w">' + wOpt + '</select><input class="input mn-num" type="number" id="of-wn" min="1" max="99999" value="50" aria-label="Menge, die du willst"></div></div>' +
            '<p class="small muted">Was du anbietest, kommt sofort aus deinem Lager ins Treuhandfach der Börse. Nimmt jemand an, bekommst du das Gewünschte, sobald du das nächste Mal online auf Mnemora bist. Zurückziehen geht jederzeit.</p>' +
            '<p class="form-msg" data-msg role="alert"></p><div class="row"><button class="btn btn--primary" type="submit">Anbieten</button><button class="btn" type="button" data-close>Abbrechen</button></div></form>');
        const el = m.el, $ = s => el.querySelector(s), msg = $('[data-msg]');
        const sync = () => { $('#of-gn').hidden = $('#of-g').value.startsWith('card:'); $('#of-wn').hidden = $('#of-w').value.startsWith('card:'); };
        el.addEventListener('change', sync); sync();
        $('[data-offer]').addEventListener('submit', ev => {
            ev.preventDefault();
            const [gk, gid] = $('#of-g').value.split(':'), [wk, wid] = $('#of-w').value.split(':'), gn = Math.floor(+$('#of-gn').value || 0), wn = Math.floor(+$('#of-wn').value || 0);
            const give = gk === 'card' ? { k: 'card', id: gid, n: 1 } : { k: 'mat', id: gid, n: gn };
            const want = wk === 'card' ? { k: 'card', id: wid, n: 1 } : wk === 'taler' ? { k: 'taler', n: wn } : { k: 'mat', id: wid, n: wn };
            const err = t => { msg.className = 'form-msg is-error'; msg.textContent = t; };
            if (!MN.itemOk(give) || !MN.hasItem(give)) return err('So viel davon hast du nicht.');
            if (!MN.itemOk(want)) return err('Gib eine gültige Menge an (Material bis 999, Taler bis 99 999).');
            if (give.k === want.k && give.id === want.id) return err('Das Gleiche gegen das Gleiche? Lieber nicht.');
            const btn = $('[type=submit]'); btn.disabled = true;
            N.offer(give, want).then(() => { m.close(); X.toast('Angebot steht', MN.itemName(give) + ' gegen ' + MN.itemName(want), { iconHtml: PX('ic-tausch', 26) }); C.refresh(); MMO.renderTab(); })
                .catch(e2 => { btn.disabled = false; err(e2.message || 'Der Xiru-Server antwortet gerade nicht.'); });
        });
    }

    MMO.init = function (ctx) { C = Object.assign(C, ctx); N.start(); };
})();
