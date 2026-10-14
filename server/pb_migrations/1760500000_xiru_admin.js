/// <reference path="../pb_data/types.d.ts" />
/* ==========================================================================
   Xiru-Server · Admin-Rolle (PocketBase 0.23) – läuft beim Start einmal, darf mehrfach laufen
     users + role   ('admin' = Zugang zu konto/admin.html; setzen nur Superuser oder andere Admins über die Admin-Seite)
     users + pardon (Zeitpunkt, an dem ein Admin die Sperre aufgehoben hat – der Browser hebt dann auch sein Siegel-Merkmal auf)
   Ersten Admin festlegen: Admin-Oberfläche → users → eigenes Konto → role = admin.
   ========================================================================== */
migrate((app) => {
    const users = app.findCollectionByNameOrId('users');
    if (!users.fields.getByName('role')) users.fields.add(new TextField({ name: 'role', max: 20 }));
    if (!users.fields.getByName('pardon')) users.fields.add(new NumberField({ name: 'pardon', min: 0, onlyInt: true }));
    app.save(users);
}, (app) => { });
