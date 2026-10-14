/* ==========================================================================
   Xiru-Server · Admin-Schnittstellen (geladen von xiru.pb.js) – für konto/admin.html
   Jede Anfrage braucht die Anmeldung eines Kontos mit users.role = 'admin'; der Server prüft das selbst.
     GET  /api/xiru/admin/users?q=&f=all|locked|admins   Konten mit Prüfstand
     POST /api/xiru/admin/act    { id, act, reason }      lock | unlock | accept (entsperren + Stand neu annehmen) | admin | unadmin
     POST /api/xiru/admin/create { username, password }   neues Admin-Konto
     POST /api/xiru/admin/purge  { what }                 scores-unverified | feed-old
   ========================================================================== */
const json = (rec, f) => { const v = rec.get(f); if (v === null || v === undefined) return null; let s; try { s = toString(v); } catch (x) { s = String(v); } try { return s && s !== 'null' ? JSON.parse(s) : null; } catch (x) { return null; } };
function need(e) {
    const a = e.auth;
    if (!a || a.collection().name !== 'users' || a.getString('role') !== 'admin') throw new ForbiddenError('Nur für Admins.');
    return a;
}
const row = u => {
    const ac = json(u, 'ac') || {};
    return { id: u.id, username: u.getString('username'), created: u.getString('created'), locked: u.getString('locked'), role: u.getString('role'),
        level: ac.level || 0, xp: ac.xp || 0, checked: ac.t || 0, mns: ac.mns || 0, eggs: (ac.eggs || []).length, scores: Object.keys(ac.scores || {}).length };
};
function users(e) {
    need(e);
    const q = String(e.requestInfo().query.q || '').replace(/[^A-Za-z0-9ÄÖÜäöüß_.\-]/g, '').slice(0, 20), f = String(e.requestInfo().query.f || 'all');
    let filter = "id != ''";
    if (q) filter += ' && username ~ {:q}';
    if (f === 'locked') filter += " && locked != ''";
    if (f === 'admins') filter += " && role = 'admin'";
    const list = $app.findRecordsByFilter('users', filter, '-updated', 300, 0, { q });
    return e.json(200, { items: list.map(row) });
}
function act(e) {
    const me = need(e), b = e.requestInfo().body || {};
    const u = $app.findRecordById('users', String(b.id || ''));
    const reason = String(b.reason || '').replace(/[<>]/g, '').slice(0, 200);
    switch (b.act) {
        case 'lock': u.set('locked', ('Von einem Admin gesperrt' + (reason ? ': ' + reason : '')).slice(0, 280)); break;
        case 'unlock': u.set('locked', ''); u.set('pardon', Date.now()); break;
        // Entsperren und den nächsten Spielstand als neuen Ausgangspunkt annehmen (nur grobe Obergrenzen)
        case 'accept': u.set('locked', ''); u.set('pardon', Date.now()); u.set('ac', null); break;
        case 'admin': u.set('role', 'admin'); break;
        case 'unadmin': if (u.id === me.id) throw new BadRequestError('Du kannst dir die Admin-Rolle nicht selbst wegnehmen.'); u.set('role', ''); break;
        default: throw new BadRequestError('Unbekannte Aktion.');
    }
    $app.save(u);
    return e.json(200, row(u));
}
function create(e) {
    need(e);
    const b = e.requestInfo().body || {}, name = String(b.username || '').trim(), pw = String(b.password || '');
    if (!/^[A-Za-z0-9ÄÖÜäöüß_.\-]{3,20}$/.test(name)) throw new BadRequestError('Name: 3–20 Zeichen (Buchstaben, Ziffern, _ . -).');
    if (pw.length < 6) throw new BadRequestError('Passwort: mindestens 6 Zeichen.');
    const r = new Record($app.findCollectionByNameOrId('users'));
    r.set('username', name); r.setPassword(pw); r.set('verified', true); r.set('role', 'admin');
    try { $app.save(r); } catch (x) { throw new BadRequestError('Den Namen gibt es schon (oder er ist ungültig).'); }
    return e.json(200, row(r));
}
function purge(e) {
    need(e);
    const what = String((e.requestInfo().body || {}).what || '');
    let n = 0;
    if (what === 'scores-unverified') {
        // Weltranglisten-Einträge von Spielern ohne verbundenes Konto (vor dem Anti-Cheat ungeprüft)
        $app.findRecordsByFilter('scores', "id != ''", '', 5000, 0).forEach(s => {
            let p = null; try { p = $app.findRecordById('players', s.getString('player')); } catch (x) { }
            if (!p || !p.getString('user')) { $app.delete(s); n++; }
        });
    } else if (what === 'feed-old') {
        const t = new Date(Date.now() - 60 * 864e5).toISOString().replace('T', ' ');
        $app.findRecordsByFilter('mn_feed', 'created < {:t}', '', 5000, 0, { t }).forEach(f => { $app.delete(f); n++; });
    } else throw new BadRequestError('Unbekannt.');
    return e.json(200, { deleted: n });
}
module.exports = { users, act, create, purge };
