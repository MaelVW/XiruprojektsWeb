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
   Gespeichert lokal: xiru:online:<konto> = { id, secret, nick, sent: { spiel: wert } }
   Server-Tabellen: players (öffentlich lesbar, ändern nur mit passendem keys.secret), keys (nur anlegen,
   nie lesbar), scores, greets – Regeln siehe docs/ONLINE.md.
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
    let beatT = 0, retryT = 0, es = null, panel = null, pill = null, lastWho = [];

    async function api(path, opt) {
        opt = opt || {};
        const r = await fetch(O.url() + path, {
            method: opt.method || 'GET', credentials: 'omit', cache: 'no-store',
            headers: opt.body ? { 'Content-Type': 'application/json' } : undefined,
            body: opt.body ? JSON.stringify(opt.body) : undefined
        });
        if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
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
    /* Spieler-Datensatz anlegen (einmal je Konto), ein geheimer Schlüssel erlaubt späteres Aktualisieren */
    async function ensure() {
        let m = load();
        if (m && m.id) return m;
        const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        const nick = (m && m.nick) || defaultNick();
        // Schlüssel liegt in einer nicht lesbaren Tabelle; nur wer ihn kennt, darf den Spieler ändern
        const key = await api('/api/collections/keys/records', { method: 'POST', body: { secret } });
        const rec = await api('/api/collections/players/records', { method: 'POST', body: { nick, key: key.id, place: place(), level: X.levelInfo().level, mech: myMech() } });
        m = { id: rec.id, secret, nick, sent: (m && m.sent) || {} }; save(m);
        return m;
    }
    async function beat(force) {
        if (!O.on() || (document.hidden && !force)) return;
        try {
            const m = await ensure();
            await api('/api/collections/players/records/' + m.id, { method: 'PATCH', body: { secret: m.secret, nick: m.nick, place: place(), area: (X.page && X.page.t) || '', level: X.levelInfo().level, mech: myMech() } });
            setStatus('online');
        } catch (e) {
            if (e.status === 404) { const m = load(); if (m) { delete m.id; save(m); } }   // Datensatz auf dem Server gelöscht → neu anlegen
            setStatus('error');
        }
    }
    O.who = async () => {
        const since = pbDate(Date.now() - ONLINE_MS);
        const res = await api('/api/collections/players/records?perPage=60&sort=-updated&filter=' + q('updated >= "' + since + '"'));
        lastWho = res.items || [];
        return lastWho;
    };
    O.top = async (game, n) => {
        const res = await api('/api/collections/scores/records?perPage=200&filter=' + q('game = "' + clean(game) + '"'));
        const lower = (res.items || []).some(r => r.lower);
        const best = {};   // je Spieler nur der beste Wert
        (res.items || []).forEach(r => { const k = r.player || r.nick, b = best[k]; if (!b || (lower ? r.value < b.value : r.value > b.value)) best[k] = r; });
        return Object.values(best).sort((a, b) => lower ? a.value - b.value : b.value - a.value).slice(0, n || 10);
    };
    O.submit = async (game, value, lower) => {
        if (!O.on() || typeof value !== 'number' || !isFinite(value)) return;
        const m = await ensure(), prev = m.sent[game];
        if (prev != null && (lower ? value >= prev : value <= prev)) return;
        await api('/api/collections/scores/records', { method: 'POST', body: { game: clean(game).slice(0, 40), value, lower: !!lower, nick: m.nick, player: m.id } });
        m.sent[game] = value; save(m);
    };
    O.greet = async (toId, kind) => {
        const g = O.GREETS.find(x => x.id === kind); if (!g) return;
        const m = await ensure();
        await api('/api/collections/greets/records', { method: 'POST', body: { from: m.id, nick: m.nick, to: toId || '', place: place(), kind } });
    };
    O.setNick = async nick => {
        nick = clean(nick).slice(0, 20); if (nick.length < 2) throw new Error('Mindestens 2 Zeichen.');
        const m = load() || { sent: {} }; m.nick = nick; save(m);
        if (m.id) await api('/api/collections/players/records/' + m.id, { method: 'PATCH', body: { secret: m.secret, nick } });
        return nick;
    };
    O.ping = () => api('/api/health');

    /* Live: Grüsse kommen sofort an (PocketBase-Realtime über Server-Sent Events) */
    function live() {
        if (es || typeof EventSource === 'undefined') return;
        es = new EventSource(O.url() + '/api/realtime');
        es.addEventListener('PB_CONNECT', ev => {
            const id = JSON.parse(ev.data).clientId;
            api('/api/realtime', { method: 'POST', body: { clientId: id, subscriptions: ['greets'] } }).catch(() => { });
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
    };
    O.stop = function () {
        clearInterval(beatT); clearTimeout(retryT); if (es) { es.close(); es = null; }
        if (pill) { pill.remove(); pill = null; } if (panel) { panel.remove(); panel = null; }
        O.status = 'off';
    };
    X.on('score', ev => { if (ev.isNew) O.submit(ev.game, ev.value, ev.lower).catch(() => { }); });
})();
