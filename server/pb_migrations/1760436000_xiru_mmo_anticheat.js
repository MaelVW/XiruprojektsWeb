/// <reference path="../pb_data/types.d.ts" />
/* ==========================================================================
   Xiru-Server · Tabellen für Mnemora-MMO und Anti-Cheat (PocketBase 0.23)
   Läuft beim Start von PocketBase automatisch einmal (Ordner /pb_migrations). Darf mehrfach laufen:
   legt nur an, was fehlt, und setzt die Regeln auf den aktuellen Stand – vorhandene Daten bleiben.
     users    + locked (Sperrgrund, leer = in Ordnung), + ac (geprüfte Zusammenfassung, nur Superuser)
     players  + user (verbundenes Konto), party, kit, mn, mns
     scores   anlegen nur mit Konto
     mn_feed, mn_trades, mn_takes   (Mnemora: Funk, Tauschbörse, Annahmen)
   ========================================================================== */
migrate((app) => {
    const get = name => { try { return app.findCollectionByNameOrId(name); } catch (e) { return null; } };
    const has = (c, name) => !!c.fields.getByName(name);
    const AUTH = '@request.auth.collectionName = "users" && @request.auth.locked = ""';

    // ── users: Sperre und Prüfdaten ──
    const users = get('users');
    if (!has(users, 'locked')) users.fields.add(new TextField({ name: 'locked', max: 300 }));
    if (!has(users, 'ac')) users.fields.add(new JSONField({ name: 'ac', maxSize: 300000, hidden: true }));
    app.save(users);

    // ── players: verbundenes Konto + Mnemora-Felder ──
    const players = get('players');
    if (!has(players, 'user')) players.fields.add(new RelationField({ name: 'user', collectionId: users.id, maxSelect: 1, cascadeDelete: false }));
    if (!has(players, 'party')) players.fields.add(new TextField({ name: 'party', max: 20 }));
    if (!has(players, 'kit')) players.fields.add(new JSONField({ name: 'kit', maxSize: 4000 }));
    if (!has(players, 'mn')) players.fields.add(new JSONField({ name: 'mn', maxSize: 1000 }));
    if (!has(players, 'mns')) players.fields.add(new NumberField({ name: 'mns', min: 0, max: 1000000, onlyInt: true }));
    app.save(players);

    // ── scores: Weltrangliste nur mit Konto (der Hook prüft den Wert) ──
    const scores = get('scores');
    if (scores) { scores.createRule = AUTH + ' && @request.body.value >= 0 && @request.body.value <= 100000000'; app.save(scores); }

    // ── Mnemora ──
    const autodate = (name, upd) => new AutodateField({ name, onCreate: true, onUpdate: !!upd });
    const rel = (name, collectionId) => new RelationField({ name, collectionId, maxSelect: 1, cascadeDelete: true, required: true });
    function ensure(id, name, build) {
        let c = get(name), fresh = !c;
        if (fresh) { c = new Collection({ id, name, type: 'base' }); }
        build(c, fresh);
        app.save(c);
        return c;
    }
    const feed = ensure('xirumnfeed00001', 'mn_feed', (c, fresh) => {
        if (fresh) {
            c.fields.add(rel('player', players.id));
            c.fields.add(new TextField({ name: 'nick', max: 20 }));
            c.fields.add(new SelectField({ name: 'kind', required: true, maxSelect: 1, values: ['say', 'inv', 'join', 'leave', 'help', 'road', 'place', 'gc', 'wb', 'wbdown', 'arrive', 'duel', 'trade'] }));
            c.fields.add(new TextField({ name: 'place', max: 40 }));
            c.fields.add(new TextField({ name: 'to', max: 20 }));
            c.fields.add(new TextField({ name: 'a', max: 40 }));
            c.fields.add(new TextField({ name: 'b', max: 40 }));
            c.fields.add(new NumberField({ name: 'n', min: 0, max: 1000000, onlyInt: true }));
            c.fields.add(autodate('created'));
            c.indexes = ['CREATE INDEX `idx_mnfeed_created` ON `mn_feed` (`created`)', 'CREATE INDEX `idx_mnfeed_kind_a` ON `mn_feed` (`kind`, `a`)', 'CREATE INDEX `idx_mnfeed_to` ON `mn_feed` (`to`)'];
        }
        c.listRule = ''; c.viewRule = ''; c.updateRule = null; c.deleteRule = null;
        // Schnellchat geht auch ohne Konto, alles andere nur mit (Hook prüft Weltboss, Duelle, Chronik)
        c.createRule = '(@request.body.kind = "say" && player.key.secret = @request.body.secret) || (' + AUTH + ' && player.user = @request.auth.id)';
    });
    const trades = ensure('xirumntrades001', 'mn_trades', (c, fresh) => {
        if (fresh) {
            c.fields.add(rel('player', players.id));
            c.fields.add(new TextField({ name: 'nick', max: 20 }));
            c.fields.add(new JSONField({ name: 'give', maxSize: 400 }));
            c.fields.add(new JSONField({ name: 'want', maxSize: 400 }));
            c.fields.add(new SelectField({ name: 'status', required: true, maxSelect: 1, values: ['open', 'done', 'cancel'] }));
            c.fields.add(new TextField({ name: 'place', max: 40 }));
            c.fields.add(autodate('created'));
            c.fields.add(autodate('updated', true));
            c.indexes = ['CREATE INDEX `idx_mntrades_status` ON `mn_trades` (`status`)'];
        }
        c.listRule = ''; c.viewRule = ''; c.deleteRule = null;
        c.createRule = AUTH + ' && player.user = @request.auth.id && @request.body.status = "open"';
        c.updateRule = '@request.auth.collectionName = "users" && player.user = @request.auth.id && (@request.body.status = "done" || @request.body.status = "cancel")' +
            ' && @request.body.player:isset = false && @request.body.give:isset = false && @request.body.want:isset = false && @request.body.nick:isset = false';
    });
    ensure('xirumntakes0001', 'mn_takes', (c, fresh) => {
        if (fresh) {
            c.fields.add(rel('offer', trades.id));
            c.fields.add(rel('player', players.id));
            c.fields.add(new TextField({ name: 'nick', max: 20 }));
            c.fields.add(autodate('created'));
            c.indexes = ['CREATE UNIQUE INDEX `idx_mntakes_offer` ON `mn_takes` (`offer`)'];
        }
        c.listRule = ''; c.viewRule = ''; c.updateRule = null; c.deleteRule = null;
        c.createRule = AUTH + ' && player.user = @request.auth.id && offer.status = "open" && offer.player != player';
    });
}, (app) => {
    // Kein automatisches Zurück: Daten sollen nie durch eine Migration verloren gehen.
});
