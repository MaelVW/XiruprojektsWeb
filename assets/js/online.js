/* ==========================================================================
   Xiruprojekts – Online (freiwillig)
   --------------------------------------------------------------------------
   Wird von core.js nur geladen, wenn „Online“ eingeschaltet ist. Spricht per
   fetch und EventSource mit dem Xiru-Server (PocketBase, siehe docs/ONLINE.md) –
   kein fremdes SDK, keine Cookies, keine E-Mail.

     XIRU.online.start() / stop()          Herzschlag, Live-Verbindung, Anzeige
     XIRU.online.status                     'off' | 'connecting' | 'online' | 'error'
     XIRU.online.me()                       { id, nick } oder null
     XIRU.online.who()                      → Promise<[ { id, nick, place, area, level, mech } ]> (letzte 3 min)
     XIRU.online.top(game, n)               → Promise<[ { nick, value } ]>
     XIRU.online.submit(game, value, lower)  Rekord melden
     XIRU.online.greet(toId, kind)          Gruss schicken (kind aus XIRU.online.GREETS)
     XIRU.online.setNick(nick)              Spitzname ändern
     XIRU.online.placeName(id)              Anzeigename einer Gegend
     XIRU.online.cloud.*                    Geräte-Sync: connect(pw), fetch(name, pw), adopt(s), sync(), password(), remove()
   Gespeichert lokal: xiru:online:<konto> = { id, secret, nick, sent: { spiel: wert } }
                      xiru:cloud:<konto>  = { uid, token, tAt, sid, srv, at }  (Geräte-Sync, siehe unten)
   Server-Tabellen: players (öffentlich lesbar, ändern nur mit passendem keys.secret), keys (nur anlegen,
   nie lesbar), scores, greets, users (Konten für den Geräte-Sync), saves – Regeln siehe docs/ONLINE.md.
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, O = X.online;
    const KEY = () => 'xiru:online:' + (X.user ? X.user.toLowerCase() : 'gast');
    const load = () => X.store.get(KEY(), null);
    const save = v => X.store.set(KEY(), v);
    const ONLINE_MS = 3 * 60 * 1000, BEAT_MS = 45 * 1000;
    O.GREETS = [
        { id: 'hallo', t: 'Hallo!', i: '👋' }, { id: 'reise', t: 'Gute Reise!', i: '⛵' }, { id: 'insel', t: 'Schöne Insel hier!', i: '🏝' },
        { id: 'gg', t: 'Starkes Spiel!', i: '🏆' }, { id: 'petri', t: 'Petri Heil!', i: '🎣' }, { id: 'kristall', t: 'Viel Glück beim Kristallesuchen!', i: '💎' },
        { id: 'mech', t: 'Schicker Mech!', i: '🤖' }, { id: 'bis', t: 'Bis bald!', i: '🌙' }
    ];
    O.status = 'off';
    const LOWER = ['minen', 'reaktion', 'memory', 'memory-gross'];   // Spiele, bei denen weniger besser ist (Zeit, Züge)
    let beatT = 0, retryT = 0, syncT = 0, es = null, panel = null, pill = null, lastWho = [];

    async function api(path, opt) {
        opt = opt || {};
        const headers = {};
        if (opt.body) headers['Content-Type'] = 'application/json';
        if (opt.token) headers.Authorization = opt.token;
        const r = await fetch(O.url() + path, {
            method: opt.method || 'GET', credentials: 'omit', cache: 'no-store', headers,
            body: opt.body ? JSON.stringify(opt.body) : undefined,
            signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
        });
        if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; try { e.data = await r.json(); } catch (x) { } throw e; }
        return r.status === 204 ? null : r.json();
    }
    const q = s => encodeURIComponent(s);
    const pbDate = d => new Date(d).toISOString().replace('T', ' ');
    const clean = s => String(s || '').replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim();

    /* Wo bin ich gerade? Im Abenteuer-Modus die Insel des Mechs, sonst die Region der Seite */
    function place() {
        if (!X.easy() && X.mech && X.mech.pos) return X.mech.pos();
        return (X.page && X.page.r) || 'zentrum';
    }
    O.placeName = id => { const i = X.mech && X.mech.isle(id); if (i && !i.secret) return i.n; const r = X.region(id); return r ? r.name : 'irgendwo im Nebel'; };
    function myMech() { try { const k = X.mech.installed('kern'); return k ? k.id : ''; } catch (e) { return ''; } }
    function defaultNick() { return clean(X.user || 'Reisende:r ' + Math.floor(Math.random() * 900 + 100)).slice(0, 20); }

    O.me = () => { const m = load(); return m && m.id ? { id: m.id, nick: m.nick } : null; };
    /* Spieler-Datensatz anlegen (einmal je Konto), ein geheimer Schlüssel erlaubt späteres Aktualisieren.
       Gleichzeitige Aufrufe (Herzschlag + Liste beim Start) teilen sich denselben Vorgang – sonst entstünden zwei Spieler. */
    let ensuring = null;
    function ensure() {
        if (!ensuring) ensuring = createMe().finally(() => { ensuring = null; });
        return ensuring;
    }
    async function createMe() {
        let m = load();
        if (m && m.id) return m;
        const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        const nick = (m && m.nick) || defaultNick();
        // Schlüssel liegt in einer nicht lesbaren Tabelle; nur wer ihn kennt, darf den Spieler ändern
        const key = await api('/collections/keys/records', { method: 'POST', body: { secret } });
        const rec = await api('/collections/players/records', { method: 'POST', body: { nick, key: key.id, place: place(), level: X.levelInfo().level, mech: myMech() } });
        m = { id: rec.id, secret, nick, sent: (m && m.sent) || {} }; save(m);
        return m;
    }
    async function beat(force) {
        if (!O.on() || (document.hidden && !force)) return;
        try {
            const m = await ensure();
            await api('/collections/players/records/' + m.id, { method: 'PATCH', body: { secret: m.secret, nick: m.nick, place: place(), area: (X.page && X.page.t) || '', level: X.levelInfo().level, mech: myMech() } });
            setStatus('online');
        } catch (e) {
            if (e.status === 404) { const m = load(); if (m) { delete m.id; save(m); } }   // Datensatz auf dem Server gelöscht → neu anlegen
            setStatus('error');
        }
    }
    O.who = async () => {
        const since = pbDate(Date.now() - ONLINE_MS);
        const res = await api('/collections/players/records?perPage=60&sort=-updated&filter=' + q('updated >= "' + since + '"'));
        lastWho = res.items || [];
        return lastWho;
    };
    O.top = async (game, n) => {
        const res = await api('/collections/scores/records?perPage=200&filter=' + q('game = "' + clean(game) + '"'));
        const lower = (res.items || []).some(r => r.lower);
        const best = {};   // je Spieler nur der beste Wert
        (res.items || []).forEach(r => { const k = r.player || r.nick, b = best[k]; if (!b || (lower ? r.value < b.value : r.value > b.value)) best[k] = r; });
        return Object.values(best).sort((a, b) => lower ? a.value - b.value : b.value - a.value).slice(0, n || 10);
    };
    O.submit = async (game, value, lower) => {
        if (!O.on() || typeof value !== 'number' || !isFinite(value)) return;
        const m = await ensure(), prev = m.sent[game];
        if (prev != null && (lower ? value >= prev : value <= prev)) return;
        await api('/collections/scores/records', { method: 'POST', body: { game: clean(game).slice(0, 40), value, lower: !!lower, nick: m.nick, player: m.id } });
        m.sent[game] = value; save(m);
    };
    O.greet = async (toId, kind) => {
        const g = O.GREETS.find(x => x.id === kind); if (!g) return;
        const m = await ensure();
        await api('/collections/greets/records', { method: 'POST', body: { from: m.id, nick: m.nick, to: toId || '', place: place(), kind } });
    };
    O.setNick = async nick => {
        nick = clean(nick).slice(0, 20); if (nick.length < 2) throw new Error('Mindestens 2 Zeichen.');
        const m = load() || { sent: {} }; m.nick = nick; save(m);
        if (m.id) await api('/collections/players/records/' + m.id, { method: 'PATCH', body: { secret: m.secret, nick } });
        return nick;
    };
    O.ping = () => api('/health');

    /* Live: Grüsse kommen sofort an (PocketBase-Realtime über Server-Sent Events) */
    function live() {
        if (es || typeof EventSource === 'undefined') return;
        es = new EventSource(O.url() + '/realtime');
        es.addEventListener('PB_CONNECT', ev => {
            const id = JSON.parse(ev.data).clientId;
            api('/realtime', { method: 'POST', body: { clientId: id, subscriptions: ['greets'] } }).catch(() => { });
        });
        es.addEventListener('greets', ev => {
            const d = JSON.parse(ev.data), r = d.record || {}, m = load();
            if (d.action !== 'create' || !m || r.from === m.id) return;
            if (r.to && r.to !== m.id) return;
            if (!r.to && r.place !== place()) return;
            const g = O.GREETS.find(x => x.id === r.kind); if (!g) return;
            X.toast(clean(r.nick) + (r.to ? ' grüsst dich' : ' ruft in die Runde'), g.i + ' ' + g.t, { icon: '🌐' });
            X.beep(880, .08, 'sine', .04); X.beep(1175, .1, 'sine', .04);
        });
        es.onerror = () => { setStatus('error'); };
    }

    /* ── Geräte-Sync: Konto und Spielstand auf dem Xiru-Server ────────────────
       users: Anmeldung mit Name + Passwort (PocketBase speichert nur einen Hash), saves: ein Datensatz je Konto,
       nur für den Besitzer lesbar. Lokal in xiru:cloud:<konto>:
         uid/token/tAt  Server-Konto und Anmeldung (wird täglich aufgefrischt, gilt 30 Tage)
         sid/srv        Spielstand-Datensatz und sein „updated“ beim letzten Abgleich
         at             Zeitpunkt des letzten Abgleichs – neuere Änderungen (xiru:mod:<konto>, core.js) sind noch nicht oben
       Regel: Wer zuletzt gespeichert hat, gewinnt. Haben beide Seiten Neues, wird gefragt; der verworfene Stand
       bleibt als Sicherung in xiru:cloudbak:<konto> (Profil → „Stand vor dem letzten Abgleich“).               */
    const CLOUD = () => 'xiru:cloud:' + X.user.toLowerCase();
    const link = () => X.user ? X.store.get(CLOUD(), null) : null;
    const setLink = l => X.store.set(CLOUD(), l);
    const modAt = () => +X.store.get('xiru:mod:' + X.user.toLowerCase(), 0) || 0;
    const backup = (from, data) => X.store.set('xiru:cloudbak:' + X.user.toLowerCase(), { at: Date.now(), from, data });
    let syncing = null, paused = false;
    function device() {
        const ua = navigator.userAgent;
        const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Gerät';
        const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
        return os + ' · ' + br;
    }
    const when = d => new Date(String(d).replace(' ', 'T')).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    async function signIn(name, password) {
        const r = await api('/collections/users/auth-with-password', { method: 'POST', body: { identity: name, password } });
        return { uid: r.record.id, name: r.record.username, token: r.token, tAt: Date.now() };
    }
    const offline = () => new Error('Der Xiru-Server ist gerade nicht erreichbar.');

    function sync(opts) {
        if (!syncing) syncing = runSync(opts || {}).finally(() => { syncing = null; });
        return syncing;
    }
    async function runSync(opts) {
        const l = link();
        if (!l || !O.on() || paused) return 'aus';
        if (l.stale) return 'anmelden';
        if (Date.now() - (l.tAt || 0) > 864e5) {   // Anmeldung auffrischen, solange sie noch gilt
            try { const r = await api('/collections/users/auth-refresh', { method: 'POST', token: l.token }); l.token = r.token; l.tAt = Date.now(); setLink(l); }
            catch (e) { if (e.status >= 400 && e.status < 500) { l.stale = true; setLink(l); setTimeout(() => linkPrompt(true), 600); return 'anmelden'; } throw e; }
        }
        const t0 = Date.now();
        const res = await api('/collections/saves/records?perPage=1&fields=id,updated,device', { token: l.token });
        const srv = (res.items || [])[0];
        const dirty = modAt() > (l.at || 0);
        if (srv && srv.updated !== l.srv) {   // inzwischen auf einem anderen Gerät gespeichert
            if (dirty || !l.srv) {             // … und hier gibt es eigenes Neues → fragen
                const pick = await choose(srv);
                if (pick === 'here') { const old = await api('/collections/saves/records/' + srv.id, { token: l.token }); backup(old.device || 'Server', old.data); return upload(l, srv.id, t0); }
                if (pick !== 'srv') { paused = true; return 'offen'; }
            }
            return download(l, srv.id, opts);
        }
        if (!srv || dirty) return upload(l, srv && srv.id, t0);
        return 'gleich';
    }
    async function upload(l, sid, t0) {
        const body = { data: X.savegame.collect(true), device: device() };
        const rec = sid ? await api('/collections/saves/records/' + sid + '?fields=id,updated', { method: 'PATCH', token: l.token, body })
            : await api('/collections/saves/records?fields=id,updated', { method: 'POST', token: l.token, body: Object.assign({ owner: l.uid }, body) });
        Object.assign(l, { sid: rec.id, srv: rec.updated, at: t0 }); setLink(l);
        return 'hoch';
    }
    async function download(l, sid, opts) {
        const rec = await api('/collections/saves/records/' + sid, { token: l.token });
        if (!X.savegame.valid(rec.data)) return 'kaputt';
        backup('hier', X.savegame.collect(true));
        X.savegame.apply(rec.data, true);
        Object.assign(l, { sid: rec.id, srv: rec.updated, at: Date.now() }); setLink(l);
        if (!opts.quiet) { X.toast('Spielstand geladen', 'Neuester Stand von ' + (rec.device || 'einem anderen Gerät') + ' · ' + when(rec.updated), { icon: '🔄' }); setTimeout(() => location.reload(), 1200); }
        return 'runter';
    }
    function choose(srv) {
        return new Promise(res => {
            let done = false;
            const fin = v => { if (!done) { done = true; res(v); } };
            const m = X.modal('<span class="eyebrow">Geräte-Sync</span><h2>Zwei Spielstände</h2>' +
                '<p>Auf dem Xiru-Server liegt ein Stand von <b>' + X.esc(srv.device || 'einem anderen Gerät') + '</b> (' + when(srv.updated) + '). Hier hast du aber auch gespielt, und das ist noch nicht oben.</p>' +
                '<p class="small muted">Welchen willst du weiterspielen? Der andere geht nicht verloren: Er bleibt als Sicherung im <a href="' + X.url('konto/profil.html') + '">Profil</a>.</p>' +
                '<div class="row mt-2"><button class="btn btn--primary" type="button" data-p="srv">Server-Stand laden</button><button class="btn" type="button" data-p="here">Diesen Stand behalten</button></div>',
                { onClose: () => fin(null) });
            m.el.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { fin(b.dataset.p); m.close(); } });
        });
    }
    /* Bestehendes Konto dieses Browsers verbinden – Passwort wird vorher lokal geprüft */
    function linkPrompt(force) {
        if (!X.user || document.documentElement.hasAttribute('data-bare') || (X.page && X.page.p === 'konto/login.html') || document.querySelector('.modal [data-cloud]')) return;
        const l = link(), later = 'xiru:cloud-later:' + X.user.toLowerCase();
        if (l && !l.stale) return;
        if (!force && !l && X.store.get(later, 0)) return;
        const m = X.modal('<span class="eyebrow">' + (l ? 'Geräte-Sync' : 'Neu · Geräte-Sync') + '</span><h2>' + (l ? 'Bitte kurz neu anmelden' : 'Auf allen Geräten spielen?') + '</h2>' +
            (l ? '<p>Deine Anmeldung beim Xiru-Server ist abgelaufen oder dein Passwort wurde geändert. Bestätige dein Passwort, dann gleichen wir deinen Spielstand wieder ab.</p>'
                : '<p>Bestätige dein Passwort, dann legen wir dein Konto <b>' + X.esc(X.user) + '</b> auch auf dem Xiru-Server an. Danach meldest du dich auf jedem Gerät mit Name und Passwort an – dein Spielstand ist überall derselbe.</p>') +
            '<form data-cloud class="mt-2"><div class="field"><label for="cl-pw">Passwort</label><input class="input" type="password" id="cl-pw" autocomplete="current-password" required></div>' +
            '<p class="form-msg" data-msg role="alert"></p><div class="row"><button class="btn btn--primary" type="submit">Verbinden</button><button class="btn" type="button" data-later>Später</button></div></form>' +
            '<p class="small muted mt-2">Dein Spielstand liegt dann zusätzlich auf dem Xiru-Server, lesbar nur mit deinem Konto. Ausschalten kannst du das jederzeit unter Einstellungen → Online.</p>');
        const f = m.el.querySelector('[data-cloud]'), msg = m.el.querySelector('[data-msg]');
        m.el.querySelector('[data-later]').addEventListener('click', () => { if (!l) X.store.set(later, Date.now()); m.close(); });
        f.addEventListener('submit', async e => {
            e.preventDefault();
            const pw = m.el.querySelector('#cl-pw').value, btn = f.querySelector('[type=submit]');
            msg.className = 'form-msg'; msg.textContent = '';
            if (!(await X.auth.verify(pw))) { msg.className = 'form-msg is-error'; msg.textContent = 'Das Passwort stimmt nicht.'; return; }
            btn.disabled = true; btn.textContent = 'Verbinde …';
            try {
                m.close();
                const r = await O.cloud.connect(pw);
                if (r !== 'runter') X.toast('Geräte-Sync an', 'Melde dich auf anderen Geräten einfach mit „' + X.user + '“ an.', { icon: '🔄' });
                emitChange();
            } catch (err) { X.toast('Geräte-Sync klappt noch nicht', err.message, { icon: '⚠', type: 'error' }); }
        });
    }
    const changeFns = [];
    const emitChange = () => changeFns.forEach(fn => { try { fn(); } catch (e) { } });

    O.cloud = {
        info: () => link(),
        onChange: fn => changeFns.push(fn),
        prompt: () => linkPrompt(true),
        sync: opts => sync(opts),
        /* Konto dieses Browsers mit dem Server verbinden: dort anmelden oder neu anlegen, danach abgleichen */
        async connect(password, opts) {
            if (!X.user) throw new Error('Nicht angemeldet.');
            let s;
            try { s = await signIn(X.user, password); }
            catch (e) {
                if (e.status !== 400) throw offline();
                try { await api('/collections/users/records?fields=id', { method: 'POST', body: { username: X.user, password, passwordConfirm: password } }); }
                catch (e2) {
                    if (e2.data && e2.data.data && e2.data.data.username) throw new Error('Den Namen „' + X.user + '“ gibt es auf dem Xiru-Server schon – mit einem anderen Passwort. Für den Geräte-Sync braucht dein Konto einen eigenen Namen (neues Konto anlegen und den Spielstand per Export/Import mitnehmen).');
                    throw e2.status ? new Error('Das Konto konnte auf dem Server nicht angelegt werden.') : offline();
                }
                s = await signIn(X.user, password);
            }
            const prev = link() || {}, same = prev.uid === s.uid;
            setLink({ uid: s.uid, token: s.token, tAt: s.tAt, sid: same ? prev.sid : '', srv: same ? prev.srv : '', at: same ? prev.at : 0 });
            X.store.remove('xiru:cloud-later:' + X.user.toLowerCase());
            paused = false;
            return sync(opts);
        },
        /* Neues Gerät: das Konto gibt es hier noch nicht → beim Server anmelden und den Spielstand holen */
        async fetch(name, password) {
            let s;
            try { s = await signIn(name, password); }
            catch (e) { throw e.status === 400 ? new Error('Name oder Passwort stimmt nicht – auch nicht auf dem Xiru-Server.') : offline(); }
            const res = await api('/collections/saves/records?perPage=1', { token: s.token });
            s.save = (res.items || [])[0] || null;
            return s;
        },
        /* … nach XIRU.auth.adopt(): Verbindung merken und den Spielstand übernehmen */
        adopt(s) {
            if (s.save && X.savegame.valid(s.save.data)) X.savegame.apply(s.save.data, true);
            X.setting('online', true); X.setting('onlineAsked', true);
            setLink({ uid: s.uid, token: s.token, tAt: s.tAt, sid: s.save ? s.save.id : '', srv: s.save ? s.save.updated : '', at: Date.now() });
        },
        /* Passwort wurde lokal geändert → auch auf dem Server (neue Anmeldung danach) */
        async password(oldPw, newPw) {
            const l = link(); if (!l) return;
            await api('/collections/users/records/' + l.uid + '?fields=id', { method: 'PATCH', token: l.token, body: { oldPassword: oldPw, password: newPw, passwordConfirm: newPw } });
            const s = await signIn(X.user, newPw); Object.assign(l, { token: s.token, tAt: s.tAt, stale: false }); setLink(l);
        },
        /* Konto samt Spielstand vom Server löschen (vor XIRU.auth.remove aufrufen) */
        async remove(password) {
            if (!link()) return;
            let s;
            try { s = await signIn(X.user, password); } catch (e) { throw e.status === 400 ? new Error('Das Online-Konto nimmt dieses Passwort nicht an.') : offline(); }
            await api('/collections/users/records/' + s.uid, { method: 'DELETE', token: s.token });
        },
        /* Online aus: Verbindung vergessen (das Server-Konto bleibt, bis man es im Profil löscht) */
        forget() { if (X.user) X.store.remove(CLOUD()); }
    };

    /* Anzeige: kleine Plakette unten links, Klick öffnet die Liste der Reisenden */
    function setStatus(s) {
        O.status = s;
        if (!pill) return;
        pill.dataset.s = s;
        pill.querySelector('b').textContent = s === 'online' ? (lastWho.length || 1) : s === 'error' ? '!' : '…';
        pill.title = s === 'error' ? 'Xiru-Server nicht erreichbar' : 'Online';
    }
    function ui() {
        if (pill || document.documentElement.hasAttribute('data-bare')) return;
        pill = document.createElement('button');
        pill.className = 'online-pill'; pill.type = 'button'; pill.setAttribute('aria-label', 'Wer ist online?');
        pill.innerHTML = '<span class="online-pill__dot"></span><b>…</b><span>online</span>';
        pill.addEventListener('click', togglePanel);
        document.body.appendChild(pill);
    }
    async function togglePanel() {
        if (panel) { panel.remove(); panel = null; return; }
        panel = document.createElement('section'); panel.className = 'online-panel'; panel.setAttribute('aria-label', 'Reisende online');
        panel.innerHTML = '<div class="row"><h3 class="mb-0">🌐 Gerade unterwegs</h3><span class="spacer"></span><button class="btn btn--ghost btn--sm" type="button" data-x aria-label="Schliessen">×</button></div><div class="online-panel__list"><p class="small muted">Lade …</p></div>' +
            '<p class="small muted mb-0">Grüsse gehen an eine Person – oder mit „Allen hier“ an alle in deiner Gegend.</p>';
        document.body.appendChild(panel);
        panel.querySelector('[data-x]').addEventListener('click', togglePanel);
        try {
            const list = await O.who(), me = O.me(), here = place();
            setStatus('online');
            const greetSel = (to) => '<select class="select online-greet" data-to="' + to + '" aria-label="Gruss wählen"><option value="">Grüssen …</option>' + O.GREETS.map(g => '<option value="' + g.id + '">' + g.i + ' ' + X.esc(g.t) + '</option>').join('') + '</select>';
            panel.querySelector('.online-panel__list').innerHTML = (list.length ? list.map(p => '<div class="online-row' + (me && p.id === me.id ? ' is-me' : '') + '"><span class="online-row__lvl">' + (+p.level || 1) + '</span><span><b>' + X.esc(clean(p.nick)) + (me && p.id === me.id ? ' (du)' : '') + '</b><small>' + X.esc(O.placeName(p.place)) + (p.place === here && !(me && p.id === me.id) ? ' · in deiner Nähe' : '') + '</small></span>' +
                (me && p.id === me.id ? '' : greetSel(p.id)) + '</div>').join('') : '<p class="small muted">Gerade ist niemand sonst unterwegs.</p>') +
                '<div class="online-row online-row--all"><span></span><span><b>Allen hier</b><small>' + X.esc(O.placeName(here)) + '</small></span>' + greetSel('') + '</div>';
            X.$$('.online-greet', panel).forEach(sel => sel.addEventListener('change', () => {
                if (!sel.value) return;
                O.greet(sel.dataset.to, sel.value).then(() => { X.toast('Gruss verschickt', O.GREETS.find(g => g.id === sel.value).t, { icon: '🌐' }); sel.value = ''; }).catch(() => X.toast('Gruss ging nicht durch', 'Der Xiru-Server antwortet gerade nicht.', { icon: '⚠', type: 'error' }));
            }));
        } catch (e) {
            setStatus('error');
            panel.querySelector('.online-panel__list').innerHTML = '<p class="small">Der Xiru-Server ist gerade nicht erreichbar. <a href="' + X.url('konto/einstellungen.html') + '#online">Einstellungen</a></p>';
        }
    }

    /* Spielhalle: Weltrangliste in der Seitenleiste jedes Spiels */
    async function leaderboard() {
        if (!X.page || X.page.r !== 'arcade' || !X.page.game) return;
        const side = document.querySelector('.game__side'); if (!side || side.querySelector('.online-board')) return;
        const game = X.page.p.split('/').pop().replace(/\.html$/, '');
        const card = document.createElement('div'); card.className = 'card online-board';
        card.innerHTML = '<h3>🌐 Weltrangliste</h3><ol class="online-board__list"><li class="small muted">Lade …</li></ol>';
        side.appendChild(card);
        const draw = async () => {
            try {
                const top = await O.top(game, 10), me = O.me();
                card.querySelector('ol').innerHTML = top.length ? top.map((r, i) => '<li class="' + (me && r.player === me.id ? 'is-me' : '') + '"><span>' + (i + 1) + '.</span><b>' + X.esc(clean(r.nick)) + '</b><span>' + X.fmt(r.value) + '</span></li>').join('')
                    : '<li class="small muted">Noch kein Eintrag – sei die erste Person!</li>';
            } catch (e) { card.querySelector('ol').innerHTML = '<li class="small muted">Server nicht erreichbar.</li>'; }
        };
        draw();
        X.on('score', ev => { if (ev.game === game && ev.isNew) setTimeout(draw, 800); });
    }

    O.start = function () {
        if (!O.on() || O.status === 'online' || O.status === 'connecting') return;
        setStatus('connecting'); ui(); setStatus('connecting');
        beat(true).then(() => O.who().then(() => setStatus(O.status)).catch(() => { }));
        // Bisherige Rekorde einmal nachmelden
        ensure().then(m => Object.keys(X.profile().scores).forEach(g => { const s = X.profile().scores[g]; if (s && s.best != null && m.sent[g] == null) O.submit(g, s.best, LOWER.includes(g)).catch(() => { }); })).catch(() => { });
        clearInterval(beatT); beatT = setInterval(beat, BEAT_MS);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
        live(); leaderboard();
        // Geräte-Sync: beim Laden abgleichen, danach Neues jede Minute und beim Verlassen hochladen
        if (X.user) {
            if (link()) sync().catch(() => { });
            else setTimeout(() => linkPrompt(false), 1500);
            clearInterval(syncT); syncT = setInterval(() => { const l = link(); if (l && modAt() > (l.at || 0)) sync().catch(() => { }); }, 60 * 1000);
            document.addEventListener('visibilitychange', () => { const l = link(); if (document.hidden && l && modAt() > (l.at || 0)) sync().catch(() => { }); });
        }
    };
    O.stop = function () {
        clearInterval(beatT); clearInterval(syncT); clearTimeout(retryT); if (es) { es.close(); es = null; }
        if (pill) { pill.remove(); pill = null; } if (panel) { panel.remove(); panel = null; }
        O.status = 'off';
    };
    X.on('score', ev => { if (ev.isNew) O.submit(ev.game, ev.value, ev.lower).catch(() => { }); });
})();
