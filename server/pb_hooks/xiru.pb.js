/// <reference path="../pb_data/types.d.ts" />
/* ==========================================================================
   Xiru-Server · Anti-Cheat (PocketBase 0.23, JS-Hooks)
   Liegt auf dem Server in /pb_hooks (Unraid: appdata/pocketbase/pb_hooks), zusammen mit xiru_lib.js
   und xiru_data.js. Tabellen/Felder dazu: ../pb_migrations. Erklärung: docs/ONLINE.md → Anti-Cheat.

   Grundsatz: Was andere sehen oder was andere betrifft (Level, Rekorde, Mech im Duell/Trupp,
   Ranglisten, Weltboss, Tausch), kommt aus dem GEPRÜFTEN Spielstand des Kontos (users.ac).
   Unmögliche Sprünge im Spielstand sperren das Konto (users.locked); entsperren: Fortschritt
   zurücksetzen (frischer Spielstand) oder ein Superuser leert das Feld in der Admin-Oberfläche.
   Jede Hook-Funktion läuft für sich – gemeinsamer Code kommt per require().
   ========================================================================== */

/* ── Geräte-Sync: jeder neue Spielstand wird geprüft ───────────────────── */
onRecordCreateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).save(e); }, "saves");
onRecordUpdateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).save(e); }, "saves");

/* ── Spieler-Datensatz: Konto verknüpfen, öffentliche Werte aus dem geprüften Stand ── */
onRecordCreateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).player(e, true); }, "players");
onRecordUpdateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).player(e, false); }, "players");

/* ── Weltranglisten: nur Rekorde, die im geprüften Spielstand stehen ── */
onRecordCreateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).score(e); }, "scores");

/* ── Mnemora: Funk (Weltboss, Duelle, Chronik …), Tauschbörse ── */
onRecordCreateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).feed(e); }, "mn_feed");
onRecordCreateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).offer(e); }, "mn_trades");
onRecordCreateRequest((e) => { require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).take(e); }, "mn_takes");

/* ── Sperre und Prüfdaten darf nur ein Superuser ändern ── */
onRecordUpdateRequest((e) => {
    if (!e.hasSuperuserAuth()) {
        const o = e.record.original();
        if (e.record.getString("locked") !== o.getString("locked") || e.record.getString("role") !== o.getString("role") || e.record.getInt("pardon") !== o.getInt("pardon"))
            throw new ForbiddenError("Sperre und Rolle kann nur ein Admin ändern.");
    }
    e.next();
}, "users");

/* ── Der Browser meldet eine erkannte Manipulation (gebrochenes Siegel) ── */
routerAdd("POST", "/api/xiru/taint", (e) => {
    const user = $app.findRecordById("users", e.auth.id);
    const body = e.requestInfo().body || {};
    if (!user.getString("locked")) {
        user.set("locked", ("Manipulation im Browser erkannt" + (body.why ? " (" + String(body.why).slice(0, 120) + ")" : "")).slice(0, 280));
        $app.save(user);
    }
    return e.json(200, { locked: user.getString("locked") });
}, $apis.requireAuth("users"));

/* ── Eigener Prüfstatus (für die Einstellungen) ── */
routerAdd("GET", "/api/xiru/me", (e) => {
    const H = require(`${__hooks}/xiru_hooks.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/'));
    const user = $app.findRecordById("users", e.auth.id), ac = H.json(user, "ac");
    return e.json(200, { locked: user.getString("locked"), role: user.getString("role"), pardon: user.getInt("pardon"), checked: ac ? ac.t : 0, level: ac ? ac.level : 0, mns: ac ? ac.mns : 0, data: H.lib().D.version });
}, $apis.requireAuth("users"));

/* ── Admin-Seite (konto/admin.html): nur Konten mit role = admin ── */
routerAdd("GET", "/api/xiru/admin/users", (e) => require(`${__hooks}/xiru_admin.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).users(e), $apis.requireAuth("users"));
routerAdd("POST", "/api/xiru/admin/act", (e) => require(`${__hooks}/xiru_admin.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).act(e), $apis.requireAuth("users"));
routerAdd("POST", "/api/xiru/admin/create", (e) => require(`${__hooks}/xiru_admin.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).create(e), $apis.requireAuth("users"));
routerAdd("POST", "/api/xiru/admin/purge", (e) => require(`${__hooks}/xiru_admin.js`.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')).purge(e), $apis.requireAuth("users"));
