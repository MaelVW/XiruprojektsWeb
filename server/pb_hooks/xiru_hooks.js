/* ==========================================================================
   Xiru-Server · Anti-Cheat – Hook-Logik mit Datenbankzugriff (geladen von xiru.pb.js)
   Fehlermeldungen mit Kennung vorne, damit die Website reagieren kann:
     xiru-locked: …  Konto gesperrt (Grund folgt)        xiru-auth: …  verbundenes Konto nötig
     xiru-sync: …    Spielstand noch nicht geprüft → erst abgleichen, dann noch einmal
   ========================================================================== */
const L = require(`${__hooks}/xiru_lib.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/'));
const WB_HP = 15000, WB_COOLDOWN = 115 * 60e3;

/* JSON-Feld lesen (PocketBase liefert Rohbytes) */
function json(rec, f) {
    if (!rec) return null;
    let v = rec.get(f);
    if (v === null || v === undefined) return null;
    let s; try { s = toString(v); } catch (x) { s = String(v); }
    if (!s || s === 'null') return null;
    try { return JSON.parse(s); } catch (x) { return null; }
}
const pbDate = t => new Date(t).toISOString().replace('T', ' ');
const authUser = e => (e.auth && e.auth.collection().name === 'users') ? e.auth : null;
const fail = msg => { throw new BadRequestError(msg); };
const locked = why => { throw new BadRequestError('xiru-locked: ' + why); };
const needAuth = msg => { throw new ForbiddenError('xiru-auth: ' + (msg || 'Dafür brauchst du ein verbundenes Konto (Geräte-Sync).')); };
const notYet = msg => { throw new ApiError(409, 'xiru-sync: ' + (msg || 'Erst den Spielstand abgleichen.')); };
function find(coll, filter, params, limit, sort) { try { return $app.findRecordsByFilter(coll, filter, sort || '', limit || 200, 0, params || {}); } catch (x) { return []; } }
function byId(coll, id) { try { return $app.findRecordById(coll, id); } catch (x) { return null; } }
function freshUser(id) { return $app.findRecordById('users', id); }
function lockUser(id, why) { const u = freshUser(id); if (!u.getString('locked')) { u.set('locked', String(why).slice(0, 280)); $app.save(u); } return u.getString('locked'); }

/* Was ist seit der letzten Prüfung von anderen dazugekommen? (Tausch, zurückgezogene Angebote, Trupp-Anteile) */
function inflow(uid, since) {
    const t = pbDate(since), out = { taler: 0, mats: 0, cards: 0 };
    const add = it => { if (!it) return; if (it.k === 'taler') out.taler += +it.n || 0; else if (it.k === 'mat') out.mats += +it.n || 0; else if (it.k === 'card') out.cards += 1; };
    find('mn_takes', 'player.user = {:u} && created > {:t}', { u: uid, t }).forEach(k => add(json(byId('mn_trades', k.getString('offer')), 'give')));
    find('mn_takes', 'offer.player.user = {:u} && created > {:t}', { u: uid, t }).forEach(k => add(json(byId('mn_trades', k.getString('offer')), 'want')));
    find('mn_trades', 'player.user = {:u} && status = "cancel" && updated > {:t}', { u: uid, t }).forEach(o => add(json(o, 'give')));
    const mine = find('players', 'user = {:u}', { u: uid }, 20).map(p => p.id);
    if (mine.length) find('mn_feed', 'kind = "help" && created > {:t}', { t }, 1000).forEach(f => { if (mine.indexOf(f.getString('to')) >= 0) out.taler += Math.min(40, f.getInt('n')); });
    return out;
}
/* Eigene offene Angebote, die nach der letzten Prüfung entstanden sind (Ware liegt im Treuhandfach) */
function offered(uid, since) {
    const out = { cards: {}, mats: {}, taler: 0 };
    find('mn_trades', 'player.user = {:u} && status = "open" && created > {:t}', { u: uid, t: pbDate(since || 0) }).forEach(o => {
        const g = json(o, 'give'); if (!g) return;
        if (g.k === 'card') out.cards[g.id] = (out.cards[g.id] || 0) + 1; else if (g.k === 'mat') out.mats[g.id] = (out.mats[g.id] || 0) + (+g.n || 0);
    });
    return out;
}

/* ── saves: Geräte-Sync ── */
function save(e) {
    const user = authUser(e);
    if (!user || e.record.getString('owner') !== user.id) { e.next(); return; }   // Superuser in der Admin-Oberfläche
    const data = json(e.record, 'data');
    if (!data || data.format !== 'xiru-export' || !data.profile) fail('Kein gültiger Spielstand.');
    const now = Date.now(), old = json(user, 'ac');
    if (user.getString('locked')) {
        // Gesperrt: nur ein frisch zurückgesetzter Spielstand entsperrt
        if (!L.isFresh(data)) locked(user.getString('locked'));
        const r = L.check(null, data, now);
        e.next();
        const u = freshUser(user.id); u.set('locked', ''); u.set('ac', r.ac); $app.save(u);
        return;
    }
    const r = L.check(old, data, now, old && old.t ? inflow(user.id, old.t) : {});
    if (!r.ok) locked(lockUser(user.id, 'Spielstand ' + new Date(now).toISOString().slice(0, 10) + ': ' + r.why));
    e.next();
    const u = freshUser(user.id); u.set('ac', r.ac); $app.save(u);
}

/* ── players: Konto verknüpfen, öffentliche Werte aus dem geprüften Stand ── */
function player(e, create) {
    if (e.hasSuperuserAuth()) { e.next(); return; }
    const user = authUser(e), rec = e.record, prev = create ? '' : rec.original().getString('user');
    if (user) {
        if (user.getString('locked')) locked(user.getString('locked'));
        if (prev && prev !== user.id) throw new ForbiddenError('Dieser Spieler gehört zu einem anderen Konto.');
        const ac = json(user, 'ac');
        rec.set('user', user.id);
        rec.set('level', ac ? ac.level : 0);
        rec.set('mns', ac ? ac.mns : 0);
        rec.set('mn', ac ? ac.mn : null);
        rec.set('kit', ac && ac.kit ? ac.kit : null);
        if (!/^([a-z0-9]{5,20})?$/.test(rec.getString('party'))) rec.set('party', '');
    } else {
        if (prev) needAuth('Dieser Spieler gehört zu einem Konto – bitte neu anmelden.');
        // Ohne Konto: nichts Geprüftes – also nichts, was andere als echt sehen könnten
        rec.set('user', ''); rec.set('level', 0); rec.set('mns', 0); rec.set('mn', null); rec.set('kit', null); rec.set('party', '');
    }
    e.next();
}

/* Noch nicht verknüpfter Spieler (gerade erst verbunden): mit passendem Schlüssel jetzt dem Konto zuordnen */
function adopt(p, user, e) {
    const body = e.requestInfo().body || {}, k = byId('keys', p.getString('key'));
    if (k && body.secret && k.getString('secret') === String(body.secret)) { p.set('user', user.id); $app.save(p); }
}

/* ── scores: nur der Rekord, der im geprüften Spielstand steht ── */
function score(e) {
    if (e.hasSuperuserAuth()) { e.next(); return; }
    const user = authUser(e); if (!user) needAuth('Für die Weltrangliste brauchst du ein verbundenes Konto (Geräte-Sync).');
    if (user.getString('locked')) locked(user.getString('locked'));
    const rec = e.record, p = byId('players', rec.getString('player'));
    if (p && !p.getString('user')) adopt(p, user, e);
    if (!p || p.getString('user') !== user.id) throw new ForbiddenError('Fremder Spieler.');
    const ac = json(user, 'ac'), game = rec.getString('game'), v = rec.getFloat('value');
    const best = ac && ac.scores ? ac.scores[game] : undefined;
    if (best === undefined || best === null || Math.abs(best - v) > 1e-6 * Math.max(1, Math.abs(best))) notYet('Dieser Rekord steht noch nicht im geprüften Spielstand.');
    const cap = L.SCORE_CAP[game];
    rec.set('nick', p.getString('nick'));
    if (cap && cap.lower) rec.set('lower', true);
    e.next();
}

/* ── mn_feed: Mnemora-Funk ── */
function feed(e) {
    if (e.hasSuperuserAuth()) { e.next(); return; }
    const rec = e.record, kind = rec.getString('kind'), user = authUser(e);
    const p = byId('players', rec.getString('player')); if (!p) fail('Unbekannter Spieler.');
    const owner = p.getString('user');
    if (owner && (!user || user.id !== owner)) needAuth('Bitte neu anmelden.');
    if (user && user.getString('locked')) locked(user.getString('locked'));
    rec.set('nick', p.getString('nick'));
    if (kind === 'say') { e.next(); return; }
    if (!user || owner !== user.id) needAuth();
    const ac = json(user, 'ac'); if (!ac) notYet('Noch kein geprüfter Spielstand.');
    const a = rec.getString('a'), n = rec.getInt('n'), now = Date.now();
    if (kind === 'wb') {
        if ([L.weekKey(now - 14 * 36e5), L.weekKey(now + 14 * 36e5)].indexOf(a) < 0) fail('Falsche Woche.');
        if (n > L.wbCap(ac.kit)) fail('So viel Schaden schafft dein Gehäuse nicht.');
        if (find('mn_feed', 'kind = "wb" && player.user = {:u} && created > {:t}', { u: user.id, t: pbDate(now - WB_COOLDOWN) }, 1).length) fail('Dein Gehäuse kühlt noch ab.');
    } else if (kind === 'wbdown') {
        if (find('mn_feed', 'kind = "wb" && a = {:a}', { a }, 5000).reduce((s, h) => s + h.getInt('n'), 0) < WB_HP) fail('Der Weltboss steht noch.');
    } else if (kind === 'help') {
        if (n > 40) fail('Zu grosser Anteil.');
    } else if (kind === 'duel') {
        if (n === 1) {
            const g = byId('players', rec.getString('to')), gk = json(g, 'kit'), mk = ac.kit;
            if (!mk) fail('Kein Gehäuse im geprüften Spielstand.');
            if (gk && gk.c && L.power(mk.c) < .55 * L.power(gk.c)) fail('Dieser Sieg ist mit deinem Gehäuse nicht möglich.');
        }
    } else if (kind === 'road') { if ((ac.roads || []).indexOf(a) < 0) notYet('Strasse noch nicht im geprüften Spielstand.'); }
    else if (kind === 'place') { if ((ac.seen || []).indexOf(a) < 0) notYet('Ort noch nicht im geprüften Spielstand.'); }
    else if (kind === 'gc') { if (!ac.boss) notYet('Garbage Collector noch nicht im geprüften Spielstand.'); }
    else if (kind === 'arrive') { if ((ac.seen || []).indexOf('port') < 0) notYet('Ankunft noch nicht im geprüften Spielstand.'); }
    e.next();
}

/* ── Tauschbörse: Ware muss im geprüften Spielstand frei sein ── */
function offer(e) {
    if (e.hasSuperuserAuth()) { e.next(); return; }
    const user = authUser(e); if (!user) needAuth();
    if (user.getString('locked')) locked(user.getString('locked'));
    const ac = json(user, 'ac'); if (!ac) notYet();
    const p = byId('players', e.record.getString('player'));
    if (!p || p.getString('user') !== user.id) throw new ForbiddenError('Fremder Spieler.');
    if (!L.has(ac, json(e.record, 'give'), offered(user.id, ac.t))) notYet('Das steht (noch) nicht frei in deinem geprüften Spielstand.');
    e.record.set('nick', p.getString('nick'));
    e.next();
}
function take(e) {
    if (e.hasSuperuserAuth()) { e.next(); return; }
    const user = authUser(e); if (!user) needAuth();
    if (user.getString('locked')) locked(user.getString('locked'));
    const ac = json(user, 'ac'); if (!ac) notYet();
    const o = byId('mn_trades', e.record.getString('offer')); if (!o) fail('Angebot gibt es nicht mehr.');
    if (!L.has(ac, json(o, 'want'), offered(user.id, ac.t))) notYet('Das hast du (noch) nicht frei in deinem geprüften Spielstand.');
    const p = byId('players', e.record.getString('player'));
    if (p) e.record.set('nick', p.getString('nick'));
    e.next();
}

module.exports = { save, player, score, feed, offer, take, json, lib: () => L };
