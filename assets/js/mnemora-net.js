/* ==========================================================================
   Mnemora-MMO – Verbindung zum Xiru-Server (nach mnemora.js laden; braucht „Online“)

   Alles, was das Mini-MMO auf Mnemora mit dem Server austauscht, läuft hier durch. Die Oberfläche
   (mnemora-mmo.js) hört nur auf Ereignisse und ruft Aktionen auf – woher die Daten kommen, weiss sie nicht.
     HEUTE „halb-live“: Listen werden im Takt von EVERY abgefragt; nur neue Einträge im Mnemora-Funk
       (Tabelle mn_feed) kommen zusätzlich sofort über PocketBase-Realtime (XIRU.online.subscribe).
     SPÄTER Echtzeit: die Abfragen in PULL durch Abos ersetzen (players, mn_trades …) – die Ereignisse bleiben gleich.

   XIRU.mnNet
     .ok()                  Online an und Abenteuer-Modus
     .start()               Verbinden, eigenen Spieler melden, Abfragen starten
     .on(ev, fn)            'travellers' Reisende auf Mnemora (letzte 3 min)   'party'  Truppmitglieder (auch offline)
                            'feed'  Mnemora-Funk (Chronik, Schnellchat …)        'live'   ein neuer Funk-Eintrag, gerade eben
                            'msg'   Nachricht an dich (Einladung, Hilfe, Duell …) 'boss'   Weltboss-Treffer dieser Woche
                            'trades' offene Tauschangebote                       'settled' deine Angebote wurden angenommen
     .me .travellers .party .feed .boss .trades           letzte Daten
     Aktionen (→ Promise): say(satz, wort) · log(art, daten) · invite(spieler) · join(trupp, von) · leave() · help(kameraden, strasse, taler)
       hit(schaden) · duel(geist, sieg) · ghosts() · ranks() · offer(gib, will) · take(angebot) · cancel(angebot) · refresh(was)
   Server-Tabellen: players (+ party, kit, mn, mns), mn_feed, mn_trades, mn_takes – siehe docs/ONLINE.md
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, MN = X.mnemora;
    const N = X.mnNet = { me: null, travellers: [], party: [], feed: [], boss: { key: '', hits: [], total: 0, hp: MN.WB_HP }, trades: [] };
    const fns = {};
    N.on = (ev, fn) => { (fns[ev] = fns[ev] || []).push(fn); };
    const emit = (ev, d) => (fns[ev] || []).forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });
    N.ok = () => !X.easy() && !!(X.online && X.online.on && X.online.on());

    /* Halb-live: so oft wird nachgeschaut (ms) */
    const EVERY = { travellers: 20e3, feed: 25e3, party: 30e3, boss: 60e3, trades: 45e3 };
    const RECENT = 3 * 60e3, DAY = 864e5;
    const KINDS = ['say', 'inv', 'join', 'leave', 'help', 'road', 'place', 'gc', 'wb', 'wbdown', 'arrive', 'duel', 'trade'];
    let O = null;
    const q = s => encodeURIComponent(s);
    const pbDate = t => new Date(t).toISOString().replace('T', ' ');
    const time = d => Date.parse(String(d || '').replace(' ', 'T')) || 0;
    const str = (v, n) => String(v == null ? '' : v).replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 40);
    const id = v => /^[a-z0-9]{5,20}$/.test(String(v || '')) ? String(v) : '';   // PocketBase-IDs (sicher für Filter)
    const api = (path, opt) => O.api(path, opt);
    async function me() { const m = await O.ensure(); N.me = { id: m.id, nick: m.nick }; return m; }

    /* ── Fremde Daten säubern ── */
    function player(p) {
        return { id: id(p.id), nick: str(p.nick, 20) || '?', level: X.clamp(+p.level || 1, 1, 999), place: String(p.place || '').slice(0, 40), mech: str(p.mech, 30),
            party: id(p.party), kit: MN.cleanKit(p.kit), mns: X.clamp(+p.mns || 0, 0, 1e6), mn: p.mn && typeof p.mn === 'object' ? { r: +p.mn.r || 0, p: +p.mn.p || 0, b: +p.mn.b || 0, c: +p.mn.c || 0 } : {}, at: time(p.updated) };
    }
    function entry(r) {
        return { id: id(r.id), player: id(r.player), nick: str(r.nick, 20) || '?', kind: String(r.kind || ''), place: str(r.place, 40), to: id(r.to), a: str(r.a, 40), b: str(r.b, 40), n: +r.n || 0, at: time(r.created), raw: String(r.created || '') };
    }
    function trade(r) {
        const t = { id: id(r.id), player: id(r.player), nick: str(r.nick, 20) || '?', give: r.give, want: r.want, at: time(r.created) };
        if (t.give && t.give.k === 'card') t.give = { k: 'card', id: t.give.id, n: 1 };
        if (t.want && t.want.k === 'card') t.want = { k: 'card', id: t.want.id, n: 1 };
        return t.id && MN.itemOk(t.give) && MN.itemOk(t.want) ? t : null;
    }

    /* ── Funk: zusammenführen, Nachrichten an mich zustellen (jede nur einmal, auch über Geräte hinweg) ── */
    function merge(list, live) {
        const known = new Set(N.feed.map(e => e.id)), fresh = [];
        list.forEach(e => { if (!e || !e.id || known.has(e.id) || !KINDS.includes(e.kind)) return; known.add(e.id); N.feed.push(e); fresh.push(e); });
        if (!fresh.length) return;
        N.feed.sort((a, b) => b.at - a.at); if (N.feed.length > 250) N.feed.length = 250;
        fresh.sort((a, b) => a.at - b.at).forEach(e => {
            if (N.me && e.to === N.me.id && e.player !== N.me.id) deliver(e);
            if (live && (!N.me || e.player !== N.me.id)) emit('live', e);
        });
        emit('feed', N.feed);
    }
    function deliver(e) {
        const seen = MN.mark('fx') || [];
        if (seen.includes(e.id)) return;
        MN.mark('fx', seen.concat(e.id).slice(-150));
        emit('msg', e);
    }

    /* ── Abfragen (halb-live) ── */
    const last = {};
    const PULL = {
        async travellers() {
            const res = await api('/collections/players/records?perPage=80&sort=-updated&filter=' + q('updated >= "' + pbDate(Date.now() - RECENT) + '" && place ~ "mnemora:"'));
            N.travellers = (res.items || []).map(player).filter(p => p.id && p.id !== (N.me && N.me.id) && p.place.startsWith('mnemora:') && MN.place(p.place.slice(8)));
            N.travellers.forEach(p => { p.place = p.place.slice(8); });
            emit('travellers', N.travellers);
        },
        async party() {
            const pid = id(MN.party());
            if (!pid) N.party = [];
            else {
                const res = await api('/collections/players/records?perPage=10&sort=-updated&filter=' + q('party = "' + pid + '" && updated >= "' + pbDate(Date.now() - 14 * DAY) + '"'));
                N.party = (res.items || []).map(player).filter(p => p.id).slice(0, 3);
                N.party.forEach(p => { if (p.place.startsWith('mnemora:')) p.place = p.place.slice(8); });
            }
            emit('party', N.party);
        },
        async feed() {
            const m = await me();
            const newest = N.feed.length ? N.feed[0].raw : pbDate(Date.now() - 3 * DAY);
            const [all, mine] = await Promise.all([
                api('/collections/mn_feed/records?perPage=100&sort=-created&filter=' + q('created >= "' + newest + '"')),
                api('/collections/mn_feed/records?perPage=40&sort=-created&filter=' + q('to = "' + id(m.id) + '" && created >= "' + pbDate(Date.now() - 14 * DAY) + '"'))
            ]);
            merge((all.items || []).concat(mine.items || []).map(entry), false);
        },
        async boss() {
            const b = MN.worldBoss();
            const res = await api('/collections/mn_feed/records?perPage=500&fields=player,nick,n&filter=' + q('kind = "wb" && a = "' + b.key + '"'));
            const by = {};
            (res.items || []).forEach(r => {
                const k = id(r.player); if (!k) return;
                const h = by[k] = by[k] || { player: k, nick: str(r.nick, 20) || '?', n: 0, hits: 0 };
                h.n += X.clamp(Math.round(+r.n || 0), 0, 4000); h.hits++;
            });
            const hits = Object.values(by).sort((a, c) => c.n - a.n);
            N.boss = { key: b.key, hits, total: hits.reduce((a, h) => a + h.n, 0), hp: b.hp };
            emit('boss', N.boss);
        },
        async trades() {
            const [res, taken] = await Promise.all([
                api('/collections/mn_trades/records?perPage=60&sort=-created&filter=' + q('status = "open"')),
                // schon angenommen, aber die anbietende Person war seither nicht online → nicht mehr anzeigen
                api('/collections/mn_takes/records?perPage=60&fields=offer&filter=' + q('offer.status = "open"'))
            ]);
            const gone = new Set((taken.items || []).map(t => t.offer));
            N.trades = (res.items || []).filter(r => !gone.has(r.id)).map(trade).filter(Boolean);
            emit('trades', N.trades);
            await settle();
        }
    };
    async function pull(what) {
        if (!O || !N.ok() || !PULL[what]) return;
        last[what] = Date.now();
        try { await PULL[what](); } catch (e) { emit('error', { what, e }); }
    }
    N.refresh = what => what ? pull(what) : Promise.all(Object.keys(PULL).map(pull));

    /* ── Funk schreiben ── */
    async function post(kind, d) {
        const m = await me();
        const body = Object.assign({ secret: m.secret, player: m.id, nick: m.nick, kind, place: MN.at(), to: '', a: '', b: '', n: 0 }, d || {});
        const r = await api('/collections/mn_feed/records', { method: 'POST', body });
        merge([entry(r)], false);
        return r;
    }
    N.say = (phrase, arg) => post('say', { a: str(phrase, 20), b: str(arg, 20) });
    /* Chronik-Eintrag (still: Fehler egal) */
    N.log = (kind, d) => N.ok() && O ? post(kind, d).catch(() => { }) : Promise.resolve();

    /* ── Trupp ── */
    N.invite = async p => {
        const m = await me();
        // Neuer Trupp: eigene, zufällige Kennung (nicht die Spieler-ID – sonst landete man nach dem Verlassen wieder im alten Trupp)
        if (!MN.party()) { MN.setParty(Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-4)); await O.nudge(); }
        await post('inv', { to: id(p.id), a: MN.party(), b: str(p.nick, 20) });
        pull('party');
    };
    N.join = async (pid, from) => {
        pid = id(pid); if (!pid) throw new Error('Diesen Trupp gibt es nicht.');
        const m = await me();
        const res = await api('/collections/players/records?perPage=6&fields=id&filter=' + q('party = "' + pid + '" && updated >= "' + pbDate(Date.now() - 14 * DAY) + '"'));
        if ((res.items || []).filter(x => x.id !== m.id).length >= 3) throw new Error('Der Trupp ist schon voll – höchstens drei Reisende.');
        MN.setParty(pid); await O.nudge();
        await post('join', { to: from ? id(from.id) : '', a: pid, b: from ? str(from.nick, 20) : '' });
        await pull('party');
    };
    N.leave = async () => {
        const pid = MN.party(); MN.setParty(''); N.party = []; emit('party', N.party);
        await O.nudge();
        if (pid) post('leave', { a: pid }).catch(() => { });
    };
    /* Nach einem Kampf: Kamerad:innen bekommen einen Anteil (wird bei ihnen gutgeschrieben, sobald sie online sind) */
    N.help = (allies, road, n) => Promise.all(allies.map(a => post('help', { to: id(a.id), a: str(road, 40), b: str(a.nick, 20), n: Math.round(n) }))).catch(() => { });

    /* ── Weltboss ── */
    N.hit = async dmg => {
        const b = MN.worldBoss();
        await post('wb', { a: b.key, b: b.def.id, n: X.clamp(Math.round(dmg), 1, 4000) });
        await pull('boss');
        return N.boss;
    };

    /* ── Duelle gegen Geister (KI-Kopien echter Mechs) ── */
    N.ghosts = async () => {
        const m = await me();
        const res = await api('/collections/players/records?perPage=40&sort=-mns&filter=' + q('mns > 0 && updated >= "' + pbDate(Date.now() - 30 * DAY) + '"'));
        return (res.items || []).map(player).filter(p => p.id && p.id !== m.id && p.kit);
    };
    N.duel = (g, win) => post('duel', { to: id(g.id), b: str(g.nick, 20), a: (MN.active() || {}).id || '', n: win ? 1 : 0 });

    /* ── Ranglisten: Entdecker (Fortschritt), Duelle (dieser Monat), Weltboss (diese Woche) ── */
    N.ranks = async () => {
        const d = new Date(), month = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const [pl, du] = await Promise.all([
            api('/collections/players/records?perPage=20&sort=-mns&filter=' + q('mns > 0')),
            api('/collections/mn_feed/records?perPage=500&fields=player,nick,to,b,n,created&filter=' + q('kind = "duel" && created >= "' + pbDate(month) + '"'))
        ]);
        // Sieg als Herausforderer +3 (je Gegner und Tag nur einmal), gehaltene Verteidigung +1
        const pts = {}, once = {};
        const add = (pid, nick, n, k) => { if (!pid) return; const p = pts[pid] = pts[pid] || { id: pid, nick, n: 0, w: 0, d: 0 }; p.n += n; p[k]++; };
        (du.items || []).forEach(r => {
            const a = id(r.player), b = id(r.to);
            if (+r.n === 1) { const k = a + '>' + b + '@' + String(r.created).slice(0, 10); if (once[k]) return; once[k] = 1; add(a, str(r.nick, 20), 3, 'w'); }
            else add(b, str(r.b, 20), 1, 'd');
        });
        await pull('boss');
        return { explorers: (pl.items || []).map(player).filter(p => p.id), duels: Object.values(pts).sort((a, b) => b.n - a.n).slice(0, 20), boss: N.boss.hits.slice(0, 20) };
    };

    /* ── Tauschbörse: Angebot liegt im „Treuhandfach“ (sofort aus deinem Lager), mn_takes hat einen eindeutigen Index je Angebot → nur eine:r bekommt es ── */
    const closeOffer = async (tid, status) => { const m = await me(); return api('/collections/mn_trades/records/' + id(tid), { method: 'PATCH', body: { secret: m.secret, status } }); };
    N.offer = async (give, want) => {
        if (!MN.itemOk(give) || !MN.itemOk(want)) throw new Error('Das Angebot ist unvollständig.');
        if (!MN.takeItem(give)) throw new Error('Das hast du nicht (mehr) im Lager.');
        try {
            const m = await me();
            const r = await api('/collections/mn_trades/records', { method: 'POST', body: { secret: m.secret, player: m.id, nick: m.nick, give, want, status: 'open', place: MN.at() } });
            pull('trades'); return r;
        } catch (e) { MN.giveItem(give); throw new Error(e.status ? 'Der Xiru-Server hat das Angebot nicht angenommen.' : 'Der Xiru-Server antwortet gerade nicht.'); }
    };
    N.take = async t => {
        if (!MN.hasItem(t.want)) throw new Error('Dafür fehlt dir: ' + MN.itemName(t.want) + '.');
        const m = await me();
        try { await api('/collections/mn_takes/records', { method: 'POST', body: { secret: m.secret, offer: id(t.id), player: m.id, nick: m.nick } }); }
        catch (e) { pull('trades'); throw e.status && e.status < 500 ? new Error('Zu spät – jemand war schneller, oder das Angebot wurde zurückgezogen.') : e; }
        MN.takeItem(t.want); MN.giveItem(t.give);
        post('trade', { to: id(t.player), b: str(t.nick, 20), a: str(MN.itemName(t.give), 40) }).catch(() => { });
        pull('trades');
    };
    N.cancel = async t => {
        await closeOffer(t.id, 'cancel');
        // Genau jetzt noch angenommen? Dann gilt der Tausch, sonst kommt die Ware zurück
        const res = await api('/collections/mn_takes/records?perPage=1&fields=id&filter=' + q('offer = "' + id(t.id) + '"'));
        if ((res.items || []).length) await settle(); else MN.giveItem(t.give);
        pull('trades');
    };
    /* Eigene Angebote, die jemand angenommen hat: gewünschte Ware gutschreiben, Angebot abschliessen */
    async function settle() {
        const m = await me();
        const res = await api('/collections/mn_takes/records?perPage=30&expand=offer&filter=' + q('offer.player = "' + id(m.id) + '" && offer.status != "done"'));
        const out = [];
        for (const t of res.items || []) {
            const o = t.expand && t.expand.offer; if (!o || o.player !== m.id) continue;
            const done = MN.mark('tk') || [];
            if (!done.includes(t.id)) {
                const want = o.want && o.want.k === 'card' ? { k: 'card', id: o.want.id, n: 1 } : o.want;
                if (MN.itemOk(want)) MN.giveItem(want);
                MN.mark('tk', done.concat(t.id).slice(-80));
                out.push({ nick: str(t.nick, 20) || '?', give: o.give, want });
            }
            await closeOffer(o.id, 'done').catch(() => { });
            N.trades = N.trades.filter(x => x.id !== o.id);
        }
        if (out.length) { emit('settled', out); emit('trades', N.trades); }
    }

    /* ── Start ── */
    let started = false;
    N.start = function () {
        if (started || !N.ok()) return;
        started = true;
        X.online.load().then(o => {
            O = o;
            // Eigener Spieler-Datensatz: Trupp, Kampfprofil (für Geister und Trupp), Fortschritt (Rangliste)
            o.beatExtra = () => { const pr = MN.progress(); return { party: MN.party(), kit: MN.kit(), mn: { r: pr.r, p: pr.p, b: pr.b, c: pr.c }, mns: pr.v }; };
            o.subscribe('mn_feed', d => { if (d && d.action === 'create' && d.record) { merge([entry(d.record)], true); if (d.record.kind === 'wb' || d.record.kind === 'wbdown') pull('boss'); } });
            return me().then(() => { o.nudge(); Object.keys(PULL).forEach(pull); });
        }).catch(() => { started = false; });
        setInterval(() => {
            if (document.hidden || !O) return;
            const now = Date.now();
            Object.keys(EVERY).forEach(k => { if (now - (last[k] || 0) >= EVERY[k]) pull(k); });
        }, 5000);
    };
    /* Nach Reisen/Kämpfen: Ort und Werte sofort melden, Reisende neu holen */
    N.nudge = () => { if (O && N.ok()) O.nudge().then(() => setTimeout(() => pull('travellers'), 800)); };
})();
