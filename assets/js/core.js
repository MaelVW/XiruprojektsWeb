/* ==========================================================================
   Xiruprojekts – Kern (core.js)
   --------------------------------------------------------------------------
   Wird auf JEDER Seite im <head> nach site.js geladen (ohne defer).
   Stellt das globale Objekt XIRU bereit:

     XIRU.ready(fn)            Seitencode starten (nur wenn die Seite nicht gesperrt ist)
     XIRU.url(pfad)            Link relativ zur Website-Wurzel
     XIRU.user                 angemeldeter Name oder null
     XIRU.egg(id)              Realitätskristall (Easter Egg) freischalten
     XIRU.addXP(n, grund)      XP vergeben
     XIRU.hasSkill(id)         Skill gelernt?
     XIRU.score(spiel, wert)   Spielergebnis melden -> { best, isNew }
     XIRU.once(key, xp, text)  einmalige Belohnung
     XIRU.load(key) / XIRU.save(key, obj)   Spielstände pro Nutzer
     XIRU.toast(titel, text, {icon, type})
     XIRU.beep(freq, dauer, typ)            kurzer Ton (respektiert Einstellungen)
     XIRU.confetti()  XIRU.modal(html)  XIRU.esc(text)  XIRU.fmt(zahl)

   Alles bleibt im localStorage dieses Browsers. Es gibt keinen Server.
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU = window.XIRU || {};
    X.version = '1.0';

    /* ── Pfade ──────────────────────────────────────────────────────────── */
    const scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
    const rootURL = new URL('../../', scriptSrc).href;
    X.root = rootURL;
    X.url = p => rootURL + String(p || '').replace(/^\/+/, '');

    function currentPath() {
        const forced = document.documentElement.getAttribute('data-page');
        if (forced) return forced;
        let href = location.href.split('#')[0].split('?')[0];
        let rel = href.startsWith(rootURL) ? href.slice(rootURL.length) : href.replace(/^.*\//, '');
        try { rel = decodeURIComponent(rel); } catch (e) { /* bleibt roh */ }
        if (rel === '' || rel.endsWith('/')) rel += 'index.html';
        return rel;
    }
    X.path = currentPath();

    /* ── Speicher mit Einwilligung ──────────────────────────────────────────
       Ohne Einwilligung („Nur notwendige" oder noch nicht entschieden) landet
       alles im sessionStorage und ist nach dem Schliessen des Browsers weg.
       Mit „Alles erlauben" dauerhaft im localStorage.
       Einzig die Einwilligung selbst wird immer dauerhaft gespeichert.          */
    const CONSENT_KEY = 'xiru:consent';
    const SESSION_ONLY = ['xiru:session', 'xiru:start'];   // rohe Sitzungswerte, nie verschieben
    let consent = null;
    try { consent = JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch (e) { consent = null; }
    let backend = null;
    function pickBackend() {
        try { backend = consent && consent.all ? localStorage : sessionStorage; backend.getItem('xiru:probe'); }
        catch (e) { backend = null; }
    }
    pickBackend();
    const mem = {};
    X.store = {
        get(key, def) {
            try { const v = backend.getItem(key); return v === null ? def : JSON.parse(v); }
            catch (e) { return key in mem ? mem[key] : def; }
        },
        set(key, val) {
            try { backend.setItem(key, JSON.stringify(val)); }
            catch (e) { mem[key] = val; }
        },
        remove(key) { try { backend.removeItem(key); } catch (e) { delete mem[key]; } },
        keys(prefix) {
            try { return Object.keys(backend).filter(k => k.startsWith(prefix || 'xiru:') && k !== CONSENT_KEY && !SESSION_ONLY.includes(k)); }
            catch (e) { return Object.keys(mem).filter(k => k.startsWith(prefix || 'xiru:')); }
        },
        persistent: () => backend === (function () { try { return localStorage; } catch (e) { return null; } })()
    };
    function moveData(from, to) {
        try {
            Object.keys(from).filter(k => k.startsWith('xiru:') && k !== CONSENT_KEY && !SESSION_ONLY.includes(k)).forEach(k => {
                if (to.getItem(k) === null) to.setItem(k, from.getItem(k));   // vorhandene Daten im Ziel gewinnen
                from.removeItem(k);
            });
        } catch (e) { /* Speicher gesperrt – dann bleibt es, wie es ist */ }
    }
    X.consent = {
        get: () => consent,
        legacyData() { try { return Object.keys(localStorage).filter(k => k.startsWith('xiru:') && k !== CONSENT_KEY).length; } catch (e) { return 0; } },
        set(all) {
            const before = backend;
            consent = { v: 1, all: !!all, at: Date.now() };
            try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch (e) { }
            pickBackend();
            if (before && backend && before !== backend) moveData(before, backend);
            emit('consent', consent);
        },
        open() { showConsent(true); }
    };
    function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function sessionSet(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { } }

    /* ── Hilfen ─────────────────────────────────────────────────────────── */
    X.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    X.fmt = (n, d) => Number(n).toLocaleString('de-CH', d == null ? undefined : { minimumFractionDigits: d, maximumFractionDigits: d });
    X.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    X.$ = (s, el) => (el || document).querySelector(s);
    X.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
    X.rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    X.pick = arr => arr[Math.floor(Math.random() * arr.length)];
    X.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const listeners = {};
    X.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
    function emit(ev, data) { (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

    /* ── Register-Nachschlagen ──────────────────────────────────────────── */
    const pageMap = {};
    (X.pages || []).forEach(p => { pageMap[p.p] = p; });
    const regionMap = {};
    (X.regions || []).forEach(r => { regionMap[r.id] = r; });
    const eggMap = {};
    (X.eggs || []).forEach(e => { eggMap[e.id] = e; });
    const skillMap = {};
    (X.skills || []).forEach(s => { skillMap[s.id] = s; });
    X.pageFor = p => pageMap[p] || null;
    X.region = id => regionMap[id] || null;
    X.eggInfo = id => eggMap[id] || null;
    X.skillInfo = id => skillMap[id] || null;
    X.page = pageMap[X.path] || null;

    /* ── Konto & Profil ─────────────────────────────────────────────────── */
    const GUEST = '~gast';
    const SESSION_KEY = 'xiru:session';
    const REMEMBER_KEY = 'xiru:remember';
    function readSession() {
        return sessionGet(SESSION_KEY) || X.store.get(REMEMBER_KEY, null);
    }
    X.user = readSession();
    const accounts = X.store.get('xiru:accounts', {});
    if (X.user && !accounts[X.user.toLowerCase()]) X.user = null;   // Konto gelöscht

    function profileKey(name) { return 'xiru:p:' + (name ? name.toLowerCase() : GUEST); }
    function blankProfile(name) {
        return {
            v: 1, name: name || null, created: Date.now(),
            xp: 0, bonus: 0, skills: {}, eggs: {}, visited: {}, days: {},
            scores: {}, rewards: {}, settings: {}, data: {}
        };
    }
    function loadProfile(name) {
        const p = X.store.get(profileKey(name), null) || blankProfile(name);
        ['skills', 'eggs', 'visited', 'days', 'scores', 'rewards', 'settings', 'data'].forEach(k => { if (!p[k] || typeof p[k] !== 'object') p[k] = {}; });
        p.xp = +p.xp || 0; p.bonus = +p.bonus || 0;
        return p;
    }
    let P = loadProfile(X.user);
    X.profile = () => P;
    function persist() { X.store.set(profileKey(X.user), P); if (typeof scheduleBackup === 'function') scheduleBackup(); }
    X.persist = persist;

    X.auth = {
        accounts: () => X.store.get('xiru:accounts', {}),
        async hash(password, saltB64, iter) {
            const enc = new TextEncoder();
            const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
            const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
            const b64 = u8 => btoa(String.fromCharCode.apply(null, Array.from(u8)));
            return { salt: b64(salt), hash: b64(new Uint8Array(bits)), iter };
        },
        validName(name) { return /^[A-Za-z0-9ÄÖÜäöüß_\-.]{3,20}$/.test(name); },
        async register(name, password, remember) {
            name = String(name || '').trim();
            if (!this.validName(name)) throw new Error('Name: 3–20 Zeichen (Buchstaben, Zahlen, _ - .).');
            if (String(password || '').length < 6) throw new Error('Das Passwort braucht mindestens 6 Zeichen.');
            if (!window.crypto || !crypto.subtle) throw new Error('Dein Browser unterstützt keine sichere Verschlüsselung (bitte über http://localhost oder https öffnen).');
            const all = this.accounts();
            if (all[name.toLowerCase()]) throw new Error('Diesen Namen gibt es in diesem Browser schon.');
            const h = await this.hash(password, null, 150000);
            all[name.toLowerCase()] = { name, salt: h.salt, hash: h.hash, iter: h.iter, created: Date.now() };
            X.store.set('xiru:accounts', all);
            // Gast-Fortschritt übernehmen
            const guest = loadProfile(null);
            const fresh = blankProfile(name);
            ['xp', 'eggs', 'visited', 'days', 'scores', 'rewards', 'settings', 'data'].forEach(k => { fresh[k] = guest[k]; });
            X.store.set(profileKey(name), fresh);
            X.store.remove(profileKey(null));
            this._start(name, remember);
            X.egg('b-konto');
            return name;
        },
        async login(name, password, remember) {
            const acc = this.accounts()[String(name || '').trim().toLowerCase()];
            if (!acc) throw new Error('Name oder Passwort stimmt nicht.');
            if (!window.crypto || !crypto.subtle) throw new Error('Dein Browser unterstützt keine sichere Verschlüsselung.');
            const h = await this.hash(password, acc.salt, acc.iter);
            if (h.hash !== acc.hash) throw new Error('Name oder Passwort stimmt nicht.');
            this._start(acc.name, remember);
            return acc.name;
        },
        _start(name, remember) {
            sessionSet(SESSION_KEY, name);
            if (remember) X.store.set(REMEMBER_KEY, name); else X.store.remove(REMEMBER_KEY);
            X.user = name;
            P = loadProfile(name);
            lastUserCookie();
            emit('login', name);
        },
        logout() {
            sessionSet(SESSION_KEY, null);
            X.store.remove(REMEMBER_KEY);
            X.user = null;
            P = loadProfile(null);
            emit('logout');
        },
        async changePassword(oldPw, newPw) {
            if (!X.user) throw new Error('Nicht angemeldet.');
            const all = this.accounts();
            const acc = all[X.user.toLowerCase()];
            const h = await this.hash(oldPw, acc.salt, acc.iter);
            if (h.hash !== acc.hash) throw new Error('Das alte Passwort stimmt nicht.');
            if (String(newPw || '').length < 6) throw new Error('Das neue Passwort braucht mindestens 6 Zeichen.');
            const n = await this.hash(newPw, null, 150000);
            Object.assign(acc, { salt: n.salt, hash: n.hash, iter: n.iter });
            X.store.set('xiru:accounts', all);
        },
        async remove(password) {
            if (!X.user) throw new Error('Nicht angemeldet.');
            const all = this.accounts();
            const key = X.user.toLowerCase();
            const h = await this.hash(password, all[key].salt, all[key].iter);
            if (h.hash !== all[key].hash) throw new Error('Das Passwort stimmt nicht.');
            delete all[key];
            X.store.set('xiru:accounts', all);
            X.store.remove(profileKey(X.user));
            X.store.remove('xiru:keys:' + key);
            X.store.keys('xiru:save:' + key + ':').forEach(k => X.store.remove(k));
            X.cookie.del(backupName());
            const last = X.cookie.getJSON('xiru_zuletzt'); if (last && String(last.n).toLowerCase() === key) X.cookie.del('xiru_zuletzt');
            this.logout();
        }
    };

    /* ── Einstellungen ──────────────────────────────────────────────────── */
    const DEFAULTS = { theme: null, anim: true, sound: true, visitToasts: true, promos: true, modus: 'abenteuer' };
    X.setting = function (key, val) {
        if (arguments.length === 1) return key in P.settings ? P.settings[key] : DEFAULTS[key];
        P.settings[key] = val; persist(); applySettings(); emit('setting', { key, val });
        if (key === 'modus') { lastUserCookie(); renderHud(); }
    };
    function applySettings() {
        const root = document.documentElement;
        const theme = X.setting('theme');
        if (theme && X.themeUnlocked(theme)) root.setAttribute('data-theme', theme); else root.removeAttribute('data-theme');
        root.classList.toggle('no-anim', X.setting('anim') === false);
    }
    X.themeUnlocked = id => {
        const t = (X.themes || []).find(x => x.id === id);
        if (!t) return false;
        if (t.skill) return X.hasSkill(t.skill);
        if (t.egg) return X.hasEgg(t.egg);
        return true;
    };

    /* ── Spielstände ────────────────────────────────────────────────────── */
    const saveKey = k => 'xiru:save:' + (X.user ? X.user.toLowerCase() : GUEST) + ':' + k;
    X.load = (k, def) => X.store.get(saveKey(k), def === undefined ? null : def);
    X.save = (k, v) => X.store.set(saveKey(k), v);
    X.promoAllowed = () => !X.user || X.setting('promos') !== false;
    X.activity = {
        arcadeSeconds() {
            const usage = X.load('local-usage', {});
            const seconds = Number(usage && usage.arcadeSeconds);
            return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
        }
    };


    /* ── Cookies (nur mit „Alles erlauben" und nur über http/https) ─────────
       xiru_zuletzt             zuletzt benutztes Konto + Modus (für den Login-Screen)
       xiru_sicherung_<hash>    kompakte Notfall-Sicherung des Fortschritts
       Beide enthalten keine Passwörter. Werte sind Base64url-kodiertes JSON.    */
    const cookiePath = (() => { try { return new URL(rootURL).pathname || '/'; } catch (e) { return '/'; } })();
    const b64e = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const b64d = str => decodeURIComponent(escape(atob(String(str).replace(/-/g, '+').replace(/_/g, '/'))));
    X.cookie = {
        ok() { try { return !!(consent && consent.all) && /^https?:$/.test(location.protocol) && navigator.cookieEnabled !== false; } catch (e) { return false; } },
        get(name) { try { const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; } catch (e) { return null; } },
        set(name, val, days) {
            if (!this.ok()) return false;
            try {
                document.cookie = name + '=' + encodeURIComponent(val) + '; max-age=' + Math.round((days || 365) * 86400) + '; path=' + cookiePath + '; SameSite=Strict' + (location.protocol === 'https:' ? '; Secure' : '');
                return this.get(name) === val;
            } catch (e) { return false; }
        },
        del(name) { try { document.cookie = name + '=; max-age=0; path=' + cookiePath + '; SameSite=Strict'; } catch (e) { } },
        getJSON(name) { try { const v = this.get(name); return v ? JSON.parse(b64d(v)) : null; } catch (e) { return null; } },
        setJSON(name, obj, days) { return this.set(name, b64e(JSON.stringify(obj)), days); }
    };
    const fnv = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
    const toBits = (ids, has) => { const b = new Uint8Array(Math.ceil(ids.length / 8)); ids.forEach((id, i) => { if (has(id)) b[i >> 3] |= 1 << (i & 7); }); return btoa(String.fromCharCode.apply(null, Array.from(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
    const fromBits = (ids, str) => { try { const raw = atob(String(str || '').replace(/-/g, '+').replace(/_/g, '/')); return ids.filter((id, i) => (raw.charCodeAt(i >> 3) >> (i & 7)) & 1); } catch (e) { return []; } };
    function lastUserCookie() { if (X.user) X.cookie.setJSON('xiru_zuletzt', { n: X.user, m: X.mode(), t: Date.now() }, 400); }
    const backupName = () => 'xiru_sicherung_' + fnv(X.user ? X.user.toLowerCase() : GUEST);
    /* Notfall-Sicherung: passt in ein Cookie (< 4 KB). Kristalle, Orte, Module und Inseln als Bitmasken
       über die Register-Reihenfolge – mit Prüfsumme, damit nach einem Update nichts Falsches zurückkommt. */
    X.backup = {
        name: backupName,
        make() {
            const E = X.eggs.map(e => e.id), PG = X.pages.map(p => p.p), SK = X.skills.map(k => k.id), IS = (X.islands || []).map(i => i.id);
            const m = mechState();
            const eqU = Object.values(m.eq), inv = m.inv.slice().sort((a, b) => (eqU.includes(b.u) - eqU.includes(a.u)) || (b.q - a.q) || ((b.up || 0) - (a.up || 0))).slice(0, 24);
            return {
                v: 1, t: Date.now(), n: X.user || '', xp: P.xp, bo: P.bonus,
                e: toBits(E, id => P.eggs[id]), eh: fnv(E.join()), pv: toBits(PG, p => P.visited[p]), ph: fnv(PG.join()),
                sk: toBits(SK, id => P.skills[id]), sh: fnv(SK.join()),
                m: { sp: m.spent, ta: m.taler, po: m.pos, tu: m.tutorial, is: toBits(IS, id => m.islands[id]), ih: fnv(IS.join()), mt: m.mat,
                     it: inv.map(x => [x.id, x.q, x.up || 0, x.c, eqU.includes(x.u) ? 1 : 0]), ar: m.arena && m.arena.rank || 0 }
            };
        },
        /* Ist eine Sicherung deutlich weiter als der aktuelle Stand? Dann nicht überschreiben (ausser force),
           bis die Person sich entschieden hat (Wiederherstellen oder „Nein“). */
        ahead(b) { b = b || this.read(); if (!b) return false; return b.xp > P.xp + 60 || fromBits(X.eggs.map(e => e.id), b.e).length > X.eggCount() + 2; },
        write(force) {
            if (!X.cookie.ok() || document.documentElement.hasAttribute('data-bare')) return false;
            if (!force && !sessionGet('xiru:restore-skip') && this.ahead()) return false;
            const b = this.make();
            while (b64e(JSON.stringify(b)).length > 3300 && b.m.it.length) b.m.it.pop();
            return X.cookie.setJSON(backupName(), b, 400);
        },
        read() { return X.cookie.getJSON(backupName()); },
        /* Zusammenführen: nichts geht verloren – es wird nur ergänzt */
        restore() {
            const b = this.read(); if (!b) return null;
            const E = X.eggs.map(e => e.id), PG = X.pages.map(p => p.p), SK = X.skills.map(k => k.id), IS = (X.islands || []).map(i => i.id), out = { xp: 0, eggs: 0, pages: 0, items: 0 };
            if (b.xp > P.xp) { out.xp = b.xp - P.xp; P.xp = b.xp; }
            P.bonus = Math.max(P.bonus, +b.bo || 0);
            if (b.eh === fnv(E.join())) fromBits(E, b.e).forEach(id => { if (!P.eggs[id]) { P.eggs[id] = b.t; out.eggs++; } });
            if (b.ph === fnv(PG.join())) fromBits(PG, b.pv).forEach(p => { if (!P.visited[p]) { P.visited[p] = b.t; out.pages++; } });
            if (X.user && b.sh === fnv(SK.join())) fromBits(SK, b.sk).forEach(id => { if (!P.skills[id]) P.skills[id] = b.t; });
            const m = mechState(), bm = b.m || {};
            if (bm.ih === fnv(IS.join())) fromBits(IS, bm.is).forEach(id => { if (!m.islands[id]) m.islands[id] = b.t; });
            m.spent = Math.min(m.spent || Infinity, +bm.sp || 0) || m.spent; m.taler = Math.max(m.taler, +bm.ta || 0); m.tutorial = Math.max(m.tutorial, +bm.tu || 0);
            if (!m.inv.length && Array.isArray(bm.it)) bm.it.forEach(r => { if (partMap[r[0]]) { const it = { u: newUid(), id: r[0], q: X.clamp(+r[1] || 1, 1, 6), up: X.clamp(+r[2] || 0, 0, 5), c: X.clamp(+r[3] || 0, 0, 100), at: b.t }; m.inv.push(it); if (r[4]) m.eq[partMap[r[0]].slot] = it.u; out.items++; } });
            if (bm.mt && typeof bm.mt === 'object') Object.keys(bm.mt).forEach(k => { if (matMap[k]) m.mat[k] = Math.max(m.mat[k] || 0, Math.min(99999, +bm.mt[k] || 0)); });
            if (bm.ar) m.arena.rank = Math.max(m.arena.rank || 0, +bm.ar || 0);
            persist(); emit('restore', out); renderHud();
            return out;
        }
    };
    var backupT = 0;
    function scheduleBackup() { clearTimeout(backupT); backupT = setTimeout(() => X.backup.write(), 3000); }
    /* Ist die Sicherung deutlich weiter als der aktuelle Stand (z. B. weil der Browser-Speicher geleert wurde)? */
    function offerRestore() {
        const b = X.backup.read();
        if (!b || sessionGet('xiru:restore-skip') || !X.backup.ahead(b)) return;
        const t = X.toast('Spielstand-Sicherung gefunden', 'Ein Cookie hat einen weiteren Stand gespeichert (Level ' + X.levelInfo(b.xp).level + ', ' + new Date(b.t).toLocaleDateString('de-CH') + '). ' +
            '<br><button class="btn btn--sm btn--primary" type="button" data-restore>Wiederherstellen</button> <button class="btn btn--sm btn--ghost" type="button" data-restore-no>Nein</button>', { icon: '🍪', html: true, time: 30000 });
        if (!t) return;
        t.addEventListener('click', e => {
            if (e.target.closest('[data-restore]')) { const r = X.backup.restore(); X.backup.write(true); X.toast('Wiederhergestellt', '+' + r.xp + ' XP · ' + r.eggs + ' Kristalle · ' + r.pages + ' Orte · ' + r.items + ' Teile', { icon: '🍪' }); }
            if (e.target.closest('[data-restore-no]')) sessionSet('xiru:restore-skip', '1');
        });
    }

    /* ── Risse: versteckte Eingänge in den Liminal-Teil (Why.html, why/) ──
       Riss n wirkt nur, solange man genau (n-1)-mal ausgeschlossen wurde.
       why-eingang = zuletzt benutzter Riss, why-ausschluss = wie oft rausgeworfen. */
    X.riss = {
        max: 3,
        out() { return Math.max(X.load('why-ausschluss', 0) || 0, X.load('why-abdrift-locked', false) === true ? 1 : 0); },
        open() { const o = this.out(); return o < this.max && (X.load('why-eingang', 0) || 0) > o; },
        lock() { X.save('why-ausschluss', Math.max(this.out(), X.load('why-eingang', 0) || 0)); },
        bind(n, el, clicks) {
            if (!el) return;
            let count = 0, last = 0;
            el.addEventListener('click', () => {
                if (this.out() !== n - 1) return;          // dieser Riss ist (noch) zu oder schon verbraucht
                const now = Date.now();
                count = now - last < 2000 ? count + 1 : 1; last = now;
                if (count < clicks) return;
                X.save('why-eingang', n);
                location.href = X.url('Why.html');
            });
        }
    };

    /* ── API-Schlüssel (getrennt vom Profil, nie im Export) ─────────────── */
    X.keys = {
        all() { return X.store.get('xiru:keys:' + (X.user ? X.user.toLowerCase() : GUEST), {}); },
        set(obj) { X.store.set('xiru:keys:' + (X.user ? X.user.toLowerCase() : GUEST), obj); emit('keys', obj); }
    };

    /* ── XP, Level, Skills ──────────────────────────────────────────────── */
    X.xpForNext = lvl => 100 + 40 * (lvl - 1);
    X.levelInfo = function (xp) {
        xp = xp == null ? P.xp : xp;
        let lvl = 1, rest = xp;
        while (rest >= X.xpForNext(lvl)) { rest -= X.xpForNext(lvl); lvl++; }
        return { level: lvl, into: rest, need: X.xpForNext(lvl), pct: Math.round(rest / X.xpForNext(lvl) * 100) };
    };
    X.hasSkill = id => (X.easy && X.easy()) || !!(X.user && P.skills[id]);
    X.skillPoints = function () {
        const total = X.levelInfo().level + P.bonus;          // 1 Punkt ab Start + 1 pro Level + Bonus
        const spent = Object.keys(P.skills).reduce((s, id) => s + ((skillMap[id] && skillMap[id].c) || 0), 0);
        return { total, spent, free: Math.max(0, total - spent) };
    };
    X.canLearn = function (id) {
        const s = skillMap[id];
        if (!s || !X.user || P.skills[id]) return false;
        if (!s.req.every(r => P.skills[r])) return false;
        return X.skillPoints().free >= s.c;
    };
    X.learn = function (id) {
        if (!X.canLearn(id)) return false;
        P.skills[id] = Date.now(); persist();
        const s = skillMap[id];
        X.toast('Modul eingebaut: ' + s.n, s.d, { icon: '✦', type: 'level' });
        X.egg('b-skill');
        const branch = X.skills.filter(k => k.b === s.b);
        if (branch.every(k => P.skills[k.id])) X.egg('b-ast');
        emit('skill', id); renderHud();
        return true;
    };


    /* ── Spielmodus ─────────────────────────────────────────────────────────
       abenteuer (Standard): Werft, Reisen und Module schalten die Welt frei.
       entdecker: alles ist offen, es gibt keinen Mech – nur zum Erkunden.        */
    X.mode = () => X.setting('modus') === 'entdecker' ? 'entdecker' : 'abenteuer';
    X.easy = () => X.mode() === 'entdecker';

    /* ── Werft: Mech, Inventar, Inseln, Reisen ──────────────────────────────
       Daten in P.data.mech (Version 2). Jedes Teil ist ein Gegenstand:
       { u: ID, id: Bauplan, q: Seltenheit 1–6, c: Zustand 0–100, up: Aufwertung 0–5 }
       eq = Bauplatz → Gegenstands-ID, mat = Materialien, taler = Währung,
       pos = Insel, auf der der Mech gerade steht.                               */
    const partMap = {}, isleMap = {}, matMap = {};
    (X.mechParts || []).forEach(p => { partMap[p.id] = p; });
    (X.islands || []).forEach(i => { isleMap[i.id] = i; });
    (X.materials || []).forEach(m => { matMap[m.id] = m; });
    const fishMap = {}, spotMap = {};
    (X.fish || []).forEach(f => { fishMap[f.id] = f; });
    (X.fishSpots || []).forEach(f => { spotMap[f.id] = f; });
    const SPOT_STOCK = 4, SPOT_REGEN = 4 * 60 * 1000;   // Angelplatz: Vorrat und Nachwachsen
    const SLOT_IDS = (X.mechSlots || []).map(s => s.id);
    const RAR = X.rarities || [null, { n: 'Gewöhnlich', c: '#9ca3af', m: 1 }];
    const INV_MAX = 80;
    let uidSeq = 0;
    const newUid = () => Date.now().toString(36).slice(-6) + (uidSeq++).toString(36) + Math.random().toString(36).slice(2, 5);
    function migrateMech(m) {   // Version 1: parts {Platz: Teil}, built {Teil: Zeit}, cond {Teil: %}
        const inv = [], eq = {};
        Object.keys(m.built || {}).forEach(id => {
            if (!partMap[id]) return;
            const c = m.cond && m.cond[id] != null ? +m.cond[id] : 100;
            inv.push({ u: newUid(), id, q: 1, c: Math.max(0, Math.min(100, c || 0)), up: 0, at: +m.built[id] || Date.now() });
        });
        Object.keys(m.parts || {}).forEach(sl => { const it = inv.find(x => x.id === m.parts[sl]); if (it) eq[sl] = it.u; });
        if (m.job && m.job.id) { const it = inv.find(x => x.id === m.job.id); if (it) m.job = { u: it.u, start: m.job.start, end: m.job.end }; else delete m.job; }
        m.inv = inv; m.eq = eq; delete m.parts; delete m.built; delete m.cond;
        m.v = 2;
    }
    function mechState() {
        let m = P.data.mech;
        if (!m || typeof m !== 'object' || Array.isArray(m)) m = P.data.mech = { v: 2, tutorial: 0 };
        if (m.v !== 2) migrateMech(m);
        ['eq', 'mat', 'islands', 'arena', 'stats', 'bp', 'scan', 'fish', 'fishing', 'fishbook'].forEach(k => { if (!m[k] || typeof m[k] !== 'object' || Array.isArray(m[k])) m[k] = {}; });
        if (!Array.isArray(m.inv)) m.inv = [];
        // Baupläne gibt es seit Okt. 2026: wer schon Teile besitzt, kennt deren Pläne
        if (!m.bpv) { m.inv.forEach(it => { if (partMap[it.id] && !m.bp[it.id]) m.bp[it.id] = it.at || Date.now(); }); m.bpv = 1; }
        m.spent = +m.spent || 0; m.taler = Math.max(0, +m.taler || 0); m.tutorial = +m.tutorial || 0;
        if (!isleMap[m.pos]) m.pos = 'konto';
        return m;
    }
    const rarOf = q => RAR[X.clamp(+q || 1, 1, RAR.length - 1)];
    /* Effektive Werte eines Gegenstands: Seltenheit multipliziert, Aufwertung legt etwas drauf */
    function itemStats(it) {
        const b = partMap[it.id], out = {};
        if (!b) return out;
        const q = X.clamp(+it.q || 1, 1, 6), up = X.clamp(+it.up || 0, 0, 5), mul = rarOf(q).m;
        Object.keys(b.s || {}).forEach(k => {
            const v = b.s[k];
            if (v <= 0) { out[k] = v; return; }
            const base = v * mul + (q - 1) * .5;
            out[k] = Math.round(base) + Math.floor(base * .12 * up + up * .34);
        });
        return out;
    }
    const repOf = it => { const b = partMap[it.id]; return b && b.rep ? Math.min(.85, b.rep + ((it.q || 1) - 1) * .03 + (it.up || 0) * .01) : 0; };
    function fxOf(it) {
        const b = partMap[it.id], out = {};
        if (b && b.fx) Object.keys(b.fx).forEach(k => { out[k] = +(b.fx[k] * (1 + ((it.q || 1) - 1) * .2 + (it.up || 0) * .05)).toFixed(3); });
        return out;
    }
    /* Rezept eines Bauplans: Schrott + Materialien. Jeder Bauplatz hat zwei typische
       Materialien, höhere Stufen brauchen zusätzlich Chips, Kristallsplitter und Nebelkerne.
       Ein Teil kann mit p.recipe ein eigenes Rezept festlegen. */
    const SIG = { rahmen: ['zahnrad', 'platine'], antrieb: ['zahnrad', 'oel'], kern: ['kabel', 'platine'], sensor: ['kabel', 'chip'], arm: ['zahnrad', 'kabel'], panzer: ['oel', 'zahnrad'], waffe: ['kabel', 'oel'], zubehoer: ['platine', 'kabel'] };
    function recipeOf(p) {
        if (!p) return null;
        if (p.recipe) return p.recipe;
        const sig = SIG[p.slot] || ['kabel', 'zahnrad'], t = p.t || 1, mats = {};
        const add = (k, n) => { if (n > 0) mats[k] = (mats[k] || 0) + n; };
        add(sig[0], t + 1);
        if (t >= 2) add(sig[1], t - 1);
        if (t >= 3) add('chip', t - 2);
        if (t >= 4) add('splitter', t === 4 ? 1 : 3);
        if (t >= 5) add('nebelkern', 1);
        return { scrap: Math.max(10, Math.round((p.cost || 0) * .4 / 5) * 5), mats };
    }
    const SCAN_CD = 3 * 60 * 1000;   // Sonar-Peilung: Pause je Insel
    const STOP = 3;                   // Zwischenstopp auf einer Route (Sekunden)
    /* Abstand eines Punkts (Mitte eines Gewässers) zur Strecke A → B */
    function segDist(A, B, P) {
        const dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / l2));
        return Math.hypot(A.x + dx * t - P.x, A.y + dy * t - P.y);
    }
    const viewOf = it => { const b = it && partMap[it.id]; return b ? Object.assign({}, b, { u: it.u, q: it.q || 1, c: it.c, up: it.up || 0, s: itemStats(it), rep: repOf(it), fx: fxOf(it), base: b }) : null; };

    X.mech = {
        state: mechState,
        INV_MAX,
        part: id => partMap[id] || null,
        isle: id => isleMap[id] || null,
        mat: id => matMap[id] || null,
        rarity: rarOf,
        itemStats, view: viewOf,

        /* Währungen: Schrott (1 pro 4 XP, minus Ausgaben) und Taler */
        scrap() { return Math.max(0, Math.floor(P.xp / 4) - mechState().spent); },
        spendScrap(n) { if (n < 0 || this.scrap() < n) return false; mechState().spent += n; persist(); emit('mech', 'scrap'); return true; },
        taler: () => mechState().taler,
        addTaler(n) {
            const m = mechState(); n = Math.round(n > 0 ? n * (1 + (this.stats().fx.taler || 0)) : n);
            m.taler = Math.max(0, m.taler + n); persist(); emit('mech', 'taler'); return n;
        },
        spendTaler(n) { const m = mechState(); if (n < 0 || m.taler < n) return false; m.taler -= n; persist(); emit('mech', 'taler'); return true; },
        mats: () => mechState().mat,
        addMat(id, n) {
            if (!matMap[id] || !n) return; const m = mechState();
            m.mat[id] = Math.max(0, (m.mat[id] || 0) + Math.round(n)); if (!m.mat[id]) delete m.mat[id];
            persist(); emit('mech', 'mat');
        },
        hasMats(cost) { const m = mechState(); return Object.keys(cost || {}).every(k => (m.mat[k] || 0) >= cost[k]); },
        spendMats(cost) { if (!this.hasMats(cost)) return false; Object.keys(cost || {}).forEach(k => this.addMat(k, -cost[k])); return true; },

        /* Inventar */
        items: () => mechState().inv,
        item: u => mechState().inv.find(x => x.u === u) || null,
        full: () => mechState().inv.length >= INV_MAX,
        add(id, q, extra) {
            if (!partMap[id]) return null;
            const m = mechState();
            if (m.inv.length >= INV_MAX) { X.toast('Inventar voll', 'Verkaufe oder zerlege Teile, um Platz zu schaffen.', { icon: '🎒', type: 'error' }); return null; }
            const it = Object.assign({ u: newUid(), id, q: X.clamp(Math.round(q || 1), 1, 6), c: 100, up: 0, at: Date.now(), neu: 1 }, extra || {});
            m.inv.push(it); persist();
            if (it.q >= 5) X.egg('m-legendaer');
            if (it.q >= 6) X.egg('m-mythisch');
            emit('mech', 'add'); return it;
        },
        remove(u) {
            const m = mechState(), i = m.inv.findIndex(x => x.u === u); if (i < 0) return null;
            const it = m.inv.splice(i, 1)[0];
            Object.keys(m.eq).forEach(sl => { if (m.eq[sl] === u) delete m.eq[sl]; });
            if (m.job && m.job.u === u) delete m.job;
            persist(); emit('mech', 'remove'); return it;
        },
        equipped(u) { const m = mechState(); return Object.keys(m.eq).find(sl => m.eq[sl] === u) || null; },
        installed(slot) { const u = mechState().eq[slot]; return u ? viewOf(this.item(u)) : null; },
        loadout() { const out = {}; SLOT_IDS.forEach(sl => { const v = this.installed(sl); if (v) out[sl] = v; }); return out; },
        equip(u) {
            const it = this.item(u); if (!it) return false;
            const m = mechState(); m.eq[partMap[it.id].slot] = u; delete it.neu; persist(); emit('mech', 'equip');
            if (SLOT_IDS.every(sl => m.eq[sl])) X.egg('m-vollausbau');
            if (it.id === 'a-beine') X.egg('m-beine');
            return true;
        },
        install(u) { return this.equip(u); },
        uninstall(slot) { const m = mechState(); delete m.eq[slot]; persist(); emit('mech', 'uninstall'); },
        /* Verkaufswert in Talern */
        value(it) { const b = partMap[it.id]; if (!b) return 0; return Math.max(2, Math.round((b.cost / 3 + 6 + b.t * 4) * Math.pow(rarOf(it.q).m, 1.6) * (1 + (it.up || 0) * .25) * (.4 + (it.c / 100) * .6))); },

        /* Baupläne: muss man auf den Inseln finden (oder als Beute), dann in der Werft
           aus Schrott und Materialien bauen */
        progress() {
            return { level: X.levelInfo().level, eggs: X.eggCount(), pages: Object.keys(P.visited).filter(q => pageMap[q]).length, games: Object.keys(P.scores).length };
        },
        knows(id) { return X.easy() || (X.starterBlueprints || []).includes(id) || !!mechState().bp[id]; },
        bpSpot(id) { const sp = X.blueprintSpots || {}; return Object.keys(sp).find(k => sp[k].includes(id)) || null; },
        bpLeft(isle) { return ((X.blueprintSpots || {})[isle] || []).filter(id => partMap[id] && !this.knows(id)); },
        bpCount() { const all = X.mechParts || []; return { known: all.filter(p => this.knows(p.id)).length, total: all.length }; },
        learnBp(id) {
            if (!partMap[id] || this.knows(id)) return false;
            const m = mechState(); m.bp[id] = Date.now(); persist();
            X.egg('m-bauplan');
            if ((X.mechParts || []).every(p => this.knows(p.id))) X.egg('m-bauplaene');
            emit('mech', 'bp'); return true;
        },
        /* Zufälliger unbekannter Bauplan bis Stufe maxT (niedrige Stufen häufiger) */
        randomBp(maxT) {
            const pool = (X.mechParts || []).filter(p => p.t <= (maxT || 5) && !this.knows(p.id)); if (!pool.length) return null;
            let r = Math.random() * pool.reduce((a, p) => a + 1 / p.t, 0);
            for (const p of pool) { r -= 1 / p.t; if (r <= 0) return p.id; }
            return pool[0].id;
        },
        recipe: id => recipeOf(partMap[id]),
        available(part) {
            if ((X.starterSet || []).includes(part.id)) return mechState().tutorial >= 1;
            return this.knows(part.id);
        },
        reqText(part) {
            if ((X.starterSet || []).includes(part.id) && mechState().tutorial < 1) return 'Startausrüstung (Tutorial)';
            if (this.knows(part.id)) return 'Bauplan bekannt';
            const isle = this.bpSpot(part.id);
            return isle ? 'Bauplan verschollen – irgendwo auf ' + (this.discovered(isle) ? isleMap[isle].n : 'einer unentdeckten Insel') : 'Bauplan verschollen';
        },
        owned: id => mechState().inv.some(x => x.id === id),
        isBuilt(id) { return this.owned(id); },
        canBuild(id) {
            const pt = partMap[id], r = recipeOf(pt);
            if (!pt || !this.available(pt)) return false;
            return this.scrap() >= r.scrap && this.hasMats(r.mats) && !this.full();
        },
        build(id) {
            if (!this.canBuild(id)) return null;
            const r = recipeOf(partMap[id]);
            if (!this.spendMats(r.mats)) return null;
            mechState().spent += r.scrap;
            return this.add(id, 1);
        },
        /* Schrottpresse: n Stück eines Materials aus Schrott (und einfachen Materialien) */
        pressRecipe: id => (X.pressRecipes || []).find(r => r.id === id) || null,
        pressCost(id, n) {
            const r = this.pressRecipe(id); if (!r) return null; n = Math.max(1, Math.floor(n || 1));
            const mats = {}; Object.keys(r.mats || {}).forEach(k => { mats[k] = r.mats[k] * n; });
            return { scrap: r.scrap * n, mats };
        },
        canPress(id, n) { const c = this.pressCost(id, n); return !!c && this.scrap() >= c.scrap && this.hasMats(c.mats); },
        press(id, n) {
            n = Math.max(1, Math.floor(n || 1));
            if (!this.canPress(id, n)) return false;
            const c = this.pressCost(id, n);
            if (!this.spendMats(c.mats)) return false;
            mechState().spent += c.scrap; this.addMat(id, n);
            X.egg('m-presse'); return true;
        },
        /* ── Angeln ── */
        rod: () => X.clamp(+mechState().rod || 1, 1, Math.max(1, (X.rods || []).length - 1)),
        rodInfo(l) { return (X.rods || [])[l || this.rod()] || null; },
        canUpgradeRod() { const nx = this.rodInfo(this.rod() + 1); return !!nx && this.taler() >= nx.taler && this.hasMats(nx.mats); },
        upgradeRod() {
            const nx = this.rodInfo(this.rod() + 1);
            if (!nx || !this.canUpgradeRod() || !this.spendMats(nx.mats) || !this.spendTaler(nx.taler)) return false;
            mechState().rod = this.rod() + 1; persist(); emit('mech', 'rod'); return true;
        },
        fishInfo: id => fishMap[id] || null,
        spot: id => spotMap[id] || null,
        fishes: () => mechState().fish,
        caught: id => !!mechState().fishbook[id],
        addFish(id, n) {
            const f = fishMap[id]; if (!f || !n) return;
            const m = mechState(); m.fish[id] = Math.max(0, (m.fish[id] || 0) + Math.round(n)); if (!m.fish[id]) delete m.fish[id];
            if (n > 0) {
                if (!m.fishbook[id]) m.fishbook[id] = Date.now();
                X.egg('m-angler'); if (f.abart) X.egg('m-abart'); if (id === 'leviathan') X.egg('m-leviathan');
            }
            persist(); emit('mech', 'fish');
        },
        /* Sichtbar ab dem Sensor-Wert des Platzes (im Entdecker-Modus gibt es kein Angeln) */
        spotSeen(id) { const sp = spotMap[id]; return !!sp && !X.easy() && this.stats().S >= sp.s; },
        spotStock(id) {
            const st = mechState().fishing[id]; if (!st) return SPOT_STOCK;
            return Math.min(SPOT_STOCK, (+st.n || 0) + Math.floor((Date.now() - (+st.t || 0)) / SPOT_REGEN));
        },
        spotNext(id) { const st = mechState().fishing[id]; if (!st || this.spotStock(id) >= SPOT_STOCK) return 0; return SPOT_REGEN - (Date.now() - st.t) % SPOT_REGEN; },
        useSpot(id) {
            const m = mechState(), c = this.spotStock(id); if (c <= 0) return false;
            const st = m.fishing[id], now = Date.now();
            m.fishing[id] = { n: c - 1, t: !st || c >= SPOT_STOCK ? now : st.t + Math.floor((now - st.t) / SPOT_REGEN) * SPOT_REGEN };
            persist(); return true;
        },
        SPOT_STOCK,
        /* Was fehlt, um hier zu angeln? (leer = los) */
        fishMissing(id) {
            const sp = spotMap[id], out = []; if (!sp) return ['unbekannter Platz'];
            if (this.pos() !== sp.near) out.push('Dein Mech muss in ' + (isleMap[sp.near] || {}).n + ' vor Anker liegen');
            if (this.rod() < sp.tier) out.push('Angel Stufe ' + sp.tier + ' nötig (du hast ' + this.rodInfo().n + ')');
            if (this.spotStock(id) <= 0) out.push('Hier ist gerade alles weggefischt');
            return out;
        },

        /* Sonar-Peilung auf einer Insel: alle paar Minuten möglich */
        scanWait(isle) { const t = mechState().scan[isle] || 0; return Math.max(0, t + SCAN_CD - Date.now()); },
        scanUsed(isle) { mechState().scan[isle] = Date.now(); persist(); emit('mech', 'scan'); },
        /* Sensor-Wert, den man braucht, um einen Bauplan der Stufe t aufzuspüren */
        scanNeed: t => Math.max(0, (t || 1) - 2),

        /* Zustand & Werte */
        cond(u) { const it = this.item(u) || this.items().find(x => x.id === u && this.equipped(x.u)) || this.items().find(x => x.id === u); return it ? it.c : 100; },
        stats() {
            const out = { R: 0, E: 0, S: 0, P: 0, A: 0, rep: 0, fx: {} };
            SLOT_IDS.forEach(sl => {
                const v = this.installed(sl); if (!v) return;
                Object.keys(v.s).forEach(k => { const x = v.s[k]; out[k] = (out[k] || 0) + (x < 0 ? x : v.c <= 0 ? 0 : v.c < 40 ? Math.floor(x / 2) : x); });
                if (v.c > 0) { out.rep = Math.max(out.rep, v.rep || 0); Object.keys(v.fx || {}).forEach(k => { out.fx[k] = (out.fx[k] || 0) + v.fx[k]; }); }
            });
            return out;
        },
        ready() { return ['rahmen', 'antrieb', 'kern'].every(sl => { const v = this.installed(sl); return v && v.c > 0; }); },
        repairCost(u) { const it = this.item(u); if (!it || it.c >= 100) return 0; return Math.max(1, Math.ceil((100 - it.c) * .6 * (1 + ((it.q || 1) - 1) * .25) * (1 - this.stats().rep))); },
        repair(u, withTaler) {
            const it = this.item(u), cost = this.repairCost(u);
            if (!it || cost <= 0) return false;
            if (withTaler ? !this.spendTaler(cost) : !this.spendScrap(cost)) return false;
            it.c = 100; persist(); emit('mech', 'repair'); X.egg('m-reparatur');
            return true;
        },
        damage(u, amount) {
            const it = this.item(u) || this.items().find(x => x.id === u && this.equipped(x.u)); if (!it) return 0;
            const before = it.c; it.c = Math.max(0, before - Math.max(0, Math.round(amount))); persist();
            if (it.c === 0 && before > 0) X.egg('m-kaputt');
            return before - it.c;
        },
        /* Abnutzung der eingebauten Teile (Reisen, Kämpfe): Panzerung dämpft */
        wear(min, max, slots) {
            const st = this.stats(), report = [];
            (slots || SLOT_IDS).forEach(sl => {
                const v = this.installed(sl); if (!v) return;
                const dmg = this.damage(v.u, Math.max(0, X.rand(min, max) - st.P * .6));
                if (dmg > 0) report.push({ part: v, dmg });
            });
            return report;
        },

        /* ── Inseln & Reisen ──
           Die Reichweite gilt pro Strecke: legNeed(a, b) wächst mit der Entfernung, schwierige
           Gewässer (XIRU.seaZones) legen etwas drauf. Reicht sie für die direkte Fahrt nicht,
           plant route() eine Reise über bekannte Inseln mit Zwischenstopps (STOP Sekunden).
           Weitere Werte (E, S, P, A aus islands[].req) braucht nur die erste Reise. */
        STOP,
        baseReq: r => (X.islandReq || {})[r] || null,
        req(r) { const b = this.baseReq(r); return b ? Object.assign({ R: this.needR(r) }, b) : null; },
        discovered(r) { return X.easy() || !this.baseReq(r) || !!mechState().islands[r]; },
        pos: () => mechState().pos,
        dist(a, b) { const A = isleMap[a], B = isleMap[b]; return A && B ? Math.hypot(A.x - B.x, A.y - B.y) : 0; },
        /* Schwierige Gewässer, durch die die Strecke a → b führt */
        legZones(a, b) {
            const A = isleMap[a], B = isleMap[b]; if (!A || !B) return [];
            return (X.seaZones || []).filter(z => segDist(A, B, z) < z.r);
        },
        /* Nötige Reichweite für die direkte Strecke a → b */
        legNeed(a, b) {
            if (a === b || !isleMap[a] || !isleMap[b]) return 0;
            return Math.max(1, Math.ceil((this.dist(a, b) - 160) / 200)) + this.legZones(a, b).reduce((n, z) => n + (z.add || 0), 0);
        },
        /* Inseln, über die eine Route führen darf: bekannt, nicht geheim */
        stops() { return (X.islands || []).filter(i => !i.secret && this.discovered(i.id)).map(i => i.id); },
        /* Kleinste Reichweite, mit der man (notfalls mit Zwischenstopps) ans Ziel kommt */
        needR(to, from) {
            from = from || this.pos(); if (from === to) return 0;
            const nodes = Array.from(new Set(this.stops().concat([from, to]))), best = {}, done = {};
            nodes.forEach(n => { best[n] = Infinity; }); best[from] = 0;
            for (;;) {
                let u = null; nodes.forEach(n => { if (!done[n] && (u === null || best[n] < best[u])) u = n; });
                if (u === null || best[u] === Infinity) break;
                if (u === to) return best[u];
                done[u] = true;
                nodes.forEach(v => { if (!done[v]) { const c = Math.max(best[u], this.legNeed(u, v)); if (c < best[v]) best[v] = c; } });
            }
            return best[to] === Infinity ? 99 : best[to];
        },
        /* Schnellste Route mit der aktuellen Reichweite: [Start, Stopp…, Ziel] oder null */
        route(to, from, R) {
            from = from || this.pos(); R = R == null ? this.stats().R : R;
            if (from === to) return [to];
            const nodes = Array.from(new Set(this.stops().concat([from, to]))), dist = {}, prev = {}, done = {};
            nodes.forEach(n => { dist[n] = Infinity; }); dist[from] = 0;
            for (;;) {
                let u = null; nodes.forEach(n => { if (!done[n] && (u === null || dist[n] < dist[u])) u = n; });
                if (u === null || dist[u] === Infinity || u === to) break;
                done[u] = true;
                nodes.forEach(v => {
                    if (done[v] || this.legNeed(u, v) > R) return;
                    const c = dist[u] + this.legSecs(u, v) + (v === to ? 0 : STOP);
                    if (c < dist[v]) { dist[v] = c; prev[v] = u; }
                });
            }
            if (dist[to] === Infinity) return null;
            const out = [to]; while (out[0] !== from) out.unshift(prev[out[0]]);
            return out;
        },
        /* Fahrzeit einer einzelnen Strecke: je weiter und je schwächer der Antrieb, desto länger */
        legSecs(a, b) {
            const st = this.stats(), speed = (40 + Math.max(1, st.R) * 14) * (1 + (st.fx.speed || 0));
            return X.clamp(this.dist(a, b) / speed, 2.5, 20);
        },
        /* Ganze Reise in Sekunden (Strecken + Zwischenstopps); ohne Route: direkte Fahrzeit */
        travelSecs(to, from) {
            from = from || this.pos(); const r = this.route(to, from);
            if (!r) return this.legSecs(from, to);
            let t = 0; for (let i = 1; i < r.length; i++) t += this.legSecs(r[i - 1], r[i]);
            return t + (r.length - 2) * STOP;
        },
        missing(r) {
            const st = this.stats(), out = [], names = { R: 'Reichweite', E: 'Energie', S: 'Sensor', P: 'Panzerung', A: 'Angriff' };
            if (!this.ready()) out.push('Rahmen, Antrieb und Energiekern müssen eingebaut und intakt sein');
            if (this.pos() !== r) { const nr = this.needR(r); if (st.R < nr) out.push('Reichweite ' + st.R + '/' + nr + ' (ab ' + (isleMap[this.pos()] || {}).n + ')'); }
            if (!this.discovered(r)) { const need = this.baseReq(r) || {}; Object.keys(need).forEach(k => { if (st[k] < need[k]) out.push(names[k] + ' ' + st[k] + '/' + need[k]); }); }
            return out;
        },
        canReach(r) { return this.missing(r).length === 0; },
        islandReqText(r) {
            const b = this.baseReq(r), names = { E: 'Energie', S: 'Sensor', P: 'Panzerung', A: 'Angriff' }, out = [];
            if (this.pos() !== r && isleMap[r]) out.push('Reichweite ' + this.needR(r) + ' ab ' + (isleMap[this.pos()] || {}).n);
            if (b && !this.discovered(r)) Object.keys(b).forEach(k => out.push((names[k] || k) + ' ' + b[k]));
            return out.join(' · ') || 'frei zugänglich';
        },
        /* Ankunft nach einer Reise: neue Inseln werden entdeckt, der Antrieb nutzt sich ab */
        arrive(to) {
            const m = mechState(), isle = isleMap[to]; if (!isle) return null;
            const first = !!this.baseReq(to) && !m.islands[to], km = Math.round(this.dist(m.pos, to));
            const report = this.wear(1, 2 + Math.round(km / 220), ['antrieb']);
            m.pos = to; m.stats.trips = (m.stats.trips || 0) + 1; m.stats.km = (m.stats.km || 0) + km;
            if (first) {
                m.islands[to] = Date.now();
                X.addXP(40, 'Expedition'); X.egg('m-erste-reise');
                const content = (X.islands || []).filter(i => i.req && !i.game).map(i => i.id), all = (X.islands || []).filter(i => i.req).map(i => i.id);
                if (content.every(k => m.islands[k])) X.egg('m-alle-inseln');
                if (all.every(k => m.islands[k])) X.egg('m-weltreise');
            }
            persist(); emit('mech', 'arrive');
            return { first, report, km };
        },
        /* Notruf: ein Schlepper bringt den fahruntüchtigen Mech nach Hause */
        tow() { const m = mechState(); m.pos = 'konto'; persist(); emit('mech', 'tow'); },
        expedition(r) { if (this.discovered(r) || !this.canReach(r)) return null; return (this.arrive(r) || {}).report || []; }
    };

    X.addXP = function (n, reason) {
        n = Math.round(n || 0);
        if (!n) return;
        const before = X.levelInfo().level;
        P.xp += n; persist();
        const after = X.levelInfo().level;
        emit('xp', { n, reason });
        if (after > before) {
            X.toast('Level ' + after + '!', X.user ? 'Du hast einen neuen Modulpunkt.' : 'Erstelle ein Konto, um Modulpunkte zu nutzen.', { icon: '⬆', type: 'level' });
            X.confetti();
            X.beep(660, .08); setTimeout(() => X.beep(880, .12), 90);
            if (after >= 5) X.egg('b-level5');
            if (after >= 10) X.egg('b-level10');
            if (after >= 20) X.egg('b-level20');
            emit('level', after);
        }
        renderHud();
    };

    X.once = function (key, xp, text) {
        if (P.rewards[key]) return false;
        P.rewards[key] = Date.now(); persist();
        if (xp) X.addXP(xp, key);
        if (text) X.toast(text, xp ? '+' + xp + ' XP' : '', { icon: '★' });
        return true;
    };

    /* Spielergebnis: opts.lower = true, wenn kleiner besser ist (z. B. Zeit) */
    X.score = function (game, value, opts) {
        opts = opts || {};
        const s = P.scores[game] || (P.scores[game] = { best: null, plays: 0 });
        s.plays++; s.last = value; s.at = Date.now();
        const better = s.best == null || (opts.lower ? value < s.best : value > s.best);
        if (better) s.best = value;
        persist();
        if (s.plays === 1) X.addXP(15, 'Erstes Spiel: ' + game);
        else if (better) X.addXP(5, 'Neuer Rekord');
        emit('score', { game, value, best: s.best, isNew: better });
        return { best: s.best, isNew: better, plays: s.plays };
    };
    X.best = game => (P.scores[game] && P.scores[game].best != null) ? P.scores[game].best : null;

    /* ── Realitätskristalle (Easter Eggs) ───────────────────────────────── */
    X.rarity = ['', 'Splitter', 'Kristall', 'Prisma', 'Kernkristall'];
    X.rarityColor = ['', '#60a5fa', '#a78bfa', '#f472b6', '#facc15'];
    let crystalId = 0;
    /* Facettierter Kristall als SVG. r = Seltenheit 1–4, locked = grau */
    X.crystalSVG = function (r, size, locked) {
        const c = locked ? '#5b6383' : (X.rarityColor[r] || X.rarityColor[1]);
        const id = 'xc' + (++crystalId);
        return '<svg class="crystal' + (locked ? ' crystal--locked' : '') + '" width="' + (size || 32) + '" height="' + Math.round((size || 32) * 1.25) + '" viewBox="0 0 32 40" aria-hidden="true">' +
            '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="' + c + '"/><stop offset="1" stop-color="' + c + '" stop-opacity=".55"/></linearGradient></defs>' +
            '<polygon points="16,1 28,12 24,31 16,39 8,31 4,12" fill="url(#' + id + ')" stroke="' + c + '" stroke-width="1"/>' +
            '<polygon points="16,1 21,13 16,37 11,13" fill="#fff" opacity=".22"/>' +
            '<path d="M4 12 H28 M11 13 L8 31 M21 13 L24 31 M16 1 L11 13 M16 1 L21 13" stroke="#fff" stroke-opacity=".45" stroke-width=".8" fill="none"/>' +
            (r >= 3 && !locked ? '<circle cx="22" cy="8" r="1.6" fill="#fff" class="crystal__spark"/>' : '') + '</svg>';
    };
    X.hasEgg = id => !!P.eggs[id];
    X.eggCount = () => Object.keys(P.eggs).filter(id => eggMap[id]).length;
    X.egg = function (id, silent) {
        const e = eggMap[id];
        if (!e) { console.warn('[XIRU] Unbekannter Realitätskristall:', id); return false; }
        if (P.eggs[id]) return false;
        P.eggs[id] = Date.now();
        if (e.r === 4) P.bonus++;
        persist();
        if (!silent) {
            X.toast('Realitätskristall gefunden: ' + e.n, e.m || '', { iconHtml: X.crystalSVG(e.r, 26), type: 'egg', time: 6500 });
            X.beep(523, .07); setTimeout(() => X.beep(784, .07), 80); setTimeout(() => X.beep(1046, .1), 160);
        }
        if (e.fx) X.fx(e.fx);
        X.addXP(e.x || 20, 'Kristall ' + id);
        const c = X.eggCount();
        if (c >= 10) X.egg('b-eier10');
        if (c >= 50) X.egg('b-eier50');
        if (c >= 100) X.egg('b-eier100');
        emit('egg', id);
        renderHud(); renderFooterHint();
        return true;
    };

    /* ── Seitenbesuch & Entdeckung ──────────────────────────────────────── */
    X.isVisited = p => !!P.visited[p];
    X.isUnlocked = function (pg) {
        if (!pg) return true;
        if (!X.mech.discovered(pg.isle || pg.r)) return false;
        if (pg.skill && !X.hasSkill(pg.skill)) return false;
        return true;
    };
    X.locked = !!(X.page && !X.isUnlocked(X.page));

    function trackVisit() {
        const today = X.today();
        if (!P.days[today]) {
            const first = Object.keys(P.days).length === 0;
            P.days[today] = 1; persist();
            if (!first) X.addXP(20, 'Tagesbonus');
            if (!first && X.setting('visitToasts')) X.toast('Tagesbonus', 'Schön, dass du wieder da bist. +20 XP', { icon: '☀' });
        }
        const dayCount = Object.keys(P.days).length;
        if (dayCount >= 7) X.egg('b-treue');
        if (dayCount >= 30) X.egg('b-treue30');

        if (!X.page || X.locked) return;
        if (!P.visited[X.path]) {
            P.visited[X.path] = Date.now(); persist();
            const xp = X.page.hidden ? 40 : 10;
            X.addXP(xp, 'Neuer Ort');
            if (X.setting('visitToasts')) X.toast('Neuer Ort entdeckt', X.page.t + ' · +' + xp + ' XP', { icon: '🧭', time: 3000 });
        }
        // Geheime Orte geben ihren Kristall beim ersten Besuch
        X.eggs.forEach(e => { if (e.pg === X.path && e.id.startsWith('o-') && !e.manual) X.egg(e.id); });
        const visibleTotal = X.pages.length;
        const count = Object.keys(P.visited).filter(p => pageMap[p]).length;
        if (count >= 10) X.egg('b-seiten10');
        if (count >= 50) X.egg('b-seiten50');
        if (count >= 100) X.egg('b-seiten100');
        if (count >= visibleTotal) X.egg('b-seiten-alle');
        const regionsSeen = new Set(Object.keys(P.visited).map(p => pageMap[p] && pageMap[p].r).filter(Boolean));
        if (X.regions.filter(r => r.id !== 'geheim' && r.id !== 'meer').every(r => regionsSeen.has(r.id))) X.egg('b-regionen');
    }

    function trackArcadeTime() {
        if (!X.page || X.page.r !== 'arcade' || !X.page.game || X.locked) return;
        let last = document.visibilityState === 'visible' ? Date.now() : 0;
        const tick = () => {
            const now = Date.now();
            if (last && document.visibilityState === 'visible') {
                const seconds = Math.max(0, Math.min(15, Math.floor((now - last) / 1000)));
                if (seconds) {
                    const saved = X.load('local-usage', {});
                    const usage = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
                    usage.arcadeSeconds = Math.max(0, Number(usage.arcadeSeconds) || 0) + seconds;
                    X.save('local-usage', usage);
                }
            }
            last = document.visibilityState === 'visible' ? now : 0;
        };
        setInterval(tick, 10000);
        document.addEventListener('visibilitychange', () => { last = document.visibilityState === 'visible' ? Date.now() : 0; });
        addEventListener('pagehide', tick);
    }

    /* ── Töne ───────────────────────────────────────────────────────────── */
    let actx = null;
    X.audio = function () {
        if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
        if (actx.state === 'suspended') actx.resume();
        return actx;
    };
    X.beep = function (freq, dur, type, vol) {
        if (X.setting('sound') === false) return;
        const ctx = X.audio(); if (!ctx || ctx.state !== 'running') return;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'square'; o.frequency.value = freq || 440;
        g.gain.setValueAtTime(vol || .05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + (dur || .1));
        o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + (dur || .1) + .02);
    };

    /* ── Toasts, Modal, Konfetti ────────────────────────────────────────── */
    function toastStack() {
        let s = document.querySelector('.toast-stack');
        if (!s && document.body) { s = document.createElement('div'); s.className = 'toast-stack'; s.setAttribute('aria-live', 'polite'); document.body.appendChild(s); }
        return s;
    }
    const pendingToasts = [];
    X.toast = function (title, text, opts) {
        opts = opts || {};
        if (document.documentElement.hasAttribute('data-bare')) return null;   // leere Seiten bleiben still
        const stack = toastStack();
        if (!stack) { pendingToasts.push([title, text, opts]); return; }
        const t = document.createElement('div');
        t.className = 'toast' + (opts.type ? ' toast--' + opts.type : '');
        t.innerHTML = '<div class="toast__icon">' + (opts.iconHtml || X.esc(opts.icon || 'ℹ')) + '</div><div><div class="toast__title">' + X.esc(title) + '</div>' +
            (text ? '<div class="toast__text">' + (opts.html ? text : X.esc(text)) + '</div>' : '') + '</div>';
        stack.appendChild(t);
        while (stack.children.length > 5) stack.firstChild.remove();
        const close = () => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 350); };
        t.addEventListener('click', close);
        setTimeout(close, opts.time || 4500);
        return t;
    };

    X.modal = function (html, opts) {
        opts = opts || {};
        const bd = document.createElement('div');
        bd.className = 'modal-backdrop';
        bd.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
        document.body.appendChild(bd);
        const close = () => { bd.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
        const onKey = e => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) close(); });
        const f = bd.querySelector('input, button, [href]'); if (f) f.focus({ preventScroll: true });
        return { el: bd.firstChild, close };
    };

    X.confetti = function (count) {
        if (X.setting('anim') === false || matchMedia('(prefers-reduced-motion: reduce)').matches || !document.body) return;
        const c = document.createElement('canvas');
        c.className = 'fx-overlay'; c.width = innerWidth; c.height = innerHeight;
        document.body.appendChild(c);
        const ctx = c.getContext('2d');
        const colors = ['#5eead4', '#a78bfa', '#f472b6', '#facc15', '#fb923c', '#60a5fa', '#4ade80'];
        const parts = Array.from({ length: count || 140 }, () => ({
            x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35,
            vx: (Math.random() - .5) * 16, vy: Math.random() * -14 - 4,
            s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
            c: X.pick(colors)
        }));
        let t = 0;
        (function frame() {
            ctx.clearRect(0, 0, c.width, c.height);
            parts.forEach(p => {
                p.vy += .38; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
                ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
            });
            if (++t < 160) requestAnimationFrame(frame); else c.remove();
        })();
    };

    /* ── Effekte für Kristalle ──────────────────────────────────────────── */
    function tempClass(el, cls, ms) { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
    X.fx = function (name) {
        if (!document.body) return;
        const b = document.body, root = document.documentElement;
        const calm = X.setting('anim') === false;
        switch (name) {
            case 'roll': if (!calm) tempClass(b, 'fx-roll', 1300); break;
            case 'flip': if (!calm) tempClass(b, 'fx-flip', 3000); break;
            case 'mirror': if (!calm) tempClass(b, 'fx-mirror', 3500); break;
            case 'rainbow': if (!calm) tempClass(root, 'fx-rainbow', 6000); break;
            case 'shake': if (!calm) tempClass(b, 'fx-shake', 1600); break;
            case 'glitch': if (!calm) tempClass(b, 'fx-glitch', 2100); break;
            case 'blank': tempClass(b, 'fx-blank', 1200); break;
            case 'confetti': X.confetti(); break;
            case 'sparkle': X.confetti(60); break;
            case 'door': renderFooterHint(); { const d = document.querySelector('.footer-door'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'center' }); } break;
            case 'retro': {
                const prev = root.getAttribute('data-theme');
                root.setAttribute('data-theme', 'klassik');
                setTimeout(() => { if (prev) root.setAttribute('data-theme', prev); else root.removeAttribute('data-theme'); applySettings(); }, 6000);
                break;
            }
            case 'disco': {
                if (calm) break;
                const o = document.createElement('div'); o.className = 'fx-overlay';
                b.appendChild(o); let i = 0;
                const cols = ['#ff3df255', '#3dd8ff55', '#9dff3d55', '#facc1555'];
                const iv = setInterval(() => { o.style.background = cols[i++ % cols.length]; if (i > 24) { clearInterval(iv); o.remove(); } }, 150);
                break;
            }
            case 'snow': {
                if (calm) break;
                for (let i = 0; i < 60; i++) {
                    const f = document.createElement('span'); f.className = 'fx-flake'; f.textContent = X.pick(['❄', '❅', '•', '❆']);
                    f.style.left = Math.random() * 100 + 'vw'; f.style.fontSize = (8 + Math.random() * 16) + 'px';
                    f.style.animationDuration = (4 + Math.random() * 5) + 's'; f.style.animationDelay = (Math.random() * 3) + 's';
                    b.appendChild(f); setTimeout(() => f.remove(), 12500);
                }
                break;
            }
            case 'bsod': {
                const o = document.createElement('div'); o.className = 'fx-bsod';
                o.innerHTML = '<big>:)</big><p style="font-size:1.4rem;max-width:40ch">Deine Website ist auf ein Problem gestossen und … nein, Spass. Alles in Ordnung.</p><p style="opacity:.8">0 % abgeschlossen · Klicken zum Schliessen</p>';
                b.appendChild(o); o.addEventListener('click', () => o.remove()); setTimeout(() => o.remove(), 4000);
                break;
            }
            case 'cat': {
                if (calm) break;
                const c = document.createElement('div'); c.className = 'fx-overlay';
                c.innerHTML = '<span style="position:absolute;bottom:8px;left:-80px;font-size:48px;transition:left 6s linear">🐈</span>';
                b.appendChild(c); requestAnimationFrame(() => requestAnimationFrame(() => { c.firstChild.style.left = '110vw'; }));
                setTimeout(() => c.remove(), 6500);
                break;
            }
            case 'floppy': {
                if (calm) break;
                const c = document.createElement('div'); c.className = 'fx-overlay';
                c.style.display = 'grid'; c.style.placeItems = 'center';
                c.innerHTML = '<div style="font-size:120px;animation:spinIn .8s var(--ease), float 2s ease-in-out infinite">💾</div>';
                b.appendChild(c); setTimeout(() => c.remove(), 2200);
                break;
            }
            case 'gravity': {
                if (calm) break;
                const els = X.$$('main .card, main .tile, main h1, main p').slice(0, 40);
                els.forEach((el, i) => {
                    el.style.transition = 'transform ' + (0.8 + Math.random() * .6) + 's cubic-bezier(.5,0,1,1) ' + (i * 0.02) + 's';
                    el.style.transform = 'translateY(' + (innerHeight + 200) + 'px) rotate(' + ((Math.random() - .5) * 60) + 'deg)';
                });
                setTimeout(() => els.forEach(el => { el.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; }), 2800);
                setTimeout(() => els.forEach(el => { el.style.transition = ''; }), 3800);
                break;
            }
            case 'matrix': {
                if (calm) break;
                const cv = document.createElement('canvas'); cv.className = 'fx-overlay';
                cv.width = innerWidth; cv.height = innerHeight; b.appendChild(cv);
                const ctx = cv.getContext('2d'), size = 16, cols = Math.ceil(cv.width / size);
                const drops = Array(cols).fill(0).map(() => Math.random() * -50);
                const chars = 'アイウエオカキクケコサシスセソ01XIRU'; let frames = 0;
                const iv = setInterval(() => {
                    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, cv.width, cv.height);
                    ctx.fillStyle = '#39ff6a'; ctx.font = size + 'px monospace';
                    drops.forEach((y, i) => { ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size); drops[i] = y * size > cv.height && Math.random() > .97 ? 0 : y + 1; });
                    if (++frames > 140) { clearInterval(iv); cv.style.transition = 'opacity .6s'; cv.style.opacity = 0; setTimeout(() => cv.remove(), 700); }
                }, 33);
                break;
            }
        }
    };

    /* ── Layout: Kopf, Navigation, Fuss ─────────────────────────────────── */
    /* Logo: ein isometrisches Gerüst – oben eine CD, links eine Diskette, rechts ein Prozessor.
       Alt trifft neu: Retro-Datenträger in einem leuchtenden Rahmen. */
    const LOGO_INNER =
        '<polygon points="24,3 43,14 24,25 5,14" fill="var(--rc)" fill-opacity=".14"/>' +
        '<polygon points="5,14 24,25 24,45 5,34" fill="var(--accent-2)" fill-opacity=".16"/>' +
        '<polygon points="24,25 43,14 43,34 24,45" fill="var(--rc)" fill-opacity=".08"/>' +
        // CD auf der Oberseite
        '<g transform="matrix(1.9,-1.1,1.9,1.1,5,14)"><circle cx="5" cy="5" r="3.7" fill="#d6dcf5" stroke="var(--rc)" stroke-width=".35"/>' +
        '<path d="M5 1.6 A3.4 3.4 0 0 1 8.4 5" fill="none" stroke="#f472b6" stroke-width=".5" opacity=".8"/><path d="M1.6 5 A3.4 3.4 0 0 1 5 1.6" fill="none" stroke="#60a5fa" stroke-width=".5" opacity=".8"/>' +
        '<circle cx="5" cy="5" r="1.2" fill="var(--bg)"/></g>' +
        // Diskette auf der linken Seite
        '<g transform="matrix(1.9,1.1,0,2,5,14)"><rect x="1.6" y="1.4" width="6.8" height="7" rx=".4" fill="var(--accent-2)"/>' +
        '<rect x="3.3" y="1.4" width="3.2" height="2.6" fill="var(--bg)" opacity=".75"/><rect x="2.6" y="5.2" width="4.8" height="2.6" fill="#fff" opacity=".85"/></g>' +
        // Prozessor auf der rechten Seite
        '<g transform="matrix(1.9,-1.1,0,2,24,25)"><path d="M2.6 1.2v1M4.2 1.2v1M5.8 1.2v1M7.4 1.2v1M2.6 7.8v1M4.2 7.8v1M5.8 7.8v1M7.4 7.8v1" stroke="var(--rc)" stroke-width=".35"/>' +
        '<rect x="1.8" y="2.2" width="6.4" height="5.6" rx=".5" fill="var(--surface-3)" stroke="var(--rc)" stroke-width=".35"/><rect x="3.6" y="3.7" width="2.8" height="2.6" fill="var(--rc)"/></g>' +
        // Gerüst
        '<path d="M24 3 L43 14 L24 25 L5 14 Z M5 14 V34 L24 45 V25 M43 14 V34 L24 45" fill="none" stroke="var(--rc)" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<g fill="var(--bg)" stroke="var(--rc)" stroke-width="1.1"><circle cx="24" cy="3" r="1.7"/><circle cx="43" cy="14" r="1.7"/><circle cx="5" cy="14" r="1.7"/><circle cx="24" cy="25" r="1.7"/>' +
        '<circle cx="5" cy="34" r="1.7"/><circle cx="43" cy="34" r="1.7"/><circle cx="24" cy="45" r="1.7"/></g>';
    const LOGO_SVG = '<svg class="brand__logo" viewBox="0 0 48 48" aria-hidden="true">' + LOGO_INNER + '</svg>';
    X.logoSVG = LOGO_SVG;
    const DISK_SVG = LOGO_SVG;   // ältere Seiten nutzen noch diesen Namen
    X.diskSVG = LOGO_SVG;
    // Favicon mit festen Farben (CSS-Variablen gibt es im Tab-Symbol nicht)
    (function () {
        const bare = document.documentElement.hasAttribute('data-bare');   // Liminal-Teil: blutrot und verschmiert
        const c = bare ? { rc: '#9b0f0b', a2: '#5c0806', bg: '#120403', s3: '#2b0806' } : { rc: '#5eead4', a2: '#a78bfa', bg: '#0b0e1a', s3: '#232b4f' };
        let fixed = LOGO_INNER.replace(/var\(--rc\)/g, c.rc).replace(/var\(--accent-2\)/g, c.a2)
            .replace(/var\(--bg\)/g, c.bg).replace(/var\(--surface-3\)/g, c.s3);
        if (bare) fixed = fixed.replace(/#d6dcf5/g, '#6e1612').replace(/#f472b6|#60a5fa/g, '#c3221b').replace(/#fff/g, '#b48a82');
        // Verzogen, mit einem Wisch quer darüber und Tropfen an den unteren Ecken
        const bloody = worse => '<defs><filter id="b" x="-15%" y="-15%" width="130%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="' + (worse ? .22 : .14) + '" numOctaves="2" seed="7"/>' +
            '<feDisplacementMap in="SourceGraphic" scale="' + (worse ? 5 : 2.6) + '" xChannelSelector="R" yChannelSelector="G"/></filter></defs>' +
            '<g filter="url(#b)" transform="rotate(' + (worse ? -8 : -3) + ' 24 24)">' + fixed +
            '<path d="M5 9 C15 15 27 22 43 35 L40 40 C27 29 15 21 3 15Z" fill="#7a0b08" opacity="' + (worse ? .75 : .5) + '"/>' +
            (worse ? '<path d="M38 6 C32 14 22 24 10 40 L7 37 C19 23 29 13 35 4Z" fill="#5e0806" opacity=".6"/>' : '') +
            '<g fill="#9b0f0b"><path d="M4.2 34V' + (worse ? 46 : 42) + 'q.8 3 1.6 0V34Z"/><path d="M23.3 25V' + (worse ? 36 : 31) + 'q.7 2.6 1.4 0V25Z"/><path d="M42.3 34V' + (worse ? 45 : 39) + 'q.7 2.6 1.4 0V34Z"/></g></g>';
        const icon = inner => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' + inner + '</svg>');
        const link = document.createElement('link');
        link.rel = 'icon'; link.type = 'image/svg+xml';
        link.href = icon(bare ? bloody(false) : fixed);
        document.head.appendChild(link);
        if (bare) {   // Schaut man weg, wird es im Tab schlimmer – und bleibt es noch einen Moment, wenn man zurückkommt
            let back;
            document.addEventListener('visibilitychange', () => {
                clearTimeout(back);
                if (document.hidden) link.href = icon(bloody(true));
                else back = setTimeout(() => { link.href = icon(bloody(false)); }, 2200);
            });
        }
    })();

    function navLink(p, extra) {
        const locked = !X.isUnlocked(p);
        return '<a href="' + X.url(p.p) + '"' + (locked ? ' class="is-locked"' : '') + '>' +
            '<span>' + (locked ? (X.mech.discovered(p.r) ? '🔒 ' : '🌫 ') : '') + X.esc(p.t) + '</span>' + (extra ? '<small>' + extra + '</small>' : '') + '</a>';
    }
    function buildNav() {
        const groups = [
            { r: 'zentrum', label: 'Entdecken' },
            { r: 'hardware', label: 'Hardware' }, { r: 'arcade' }, { r: 'ki' }, { r: 'mixer', label: 'Mixer' },
            { r: 'werkzeuge', label: 'Werkzeuge' }, { r: 'studio' }
        ];
        return groups.map(g => {
            const reg = regionMap[g.r];
            let items;
            if (g.r === 'arcade') {
                items = X.pages.filter(p => p.r === 'arcade' && (!p.hidden || P.visited[p.p]));
                const index = items.shift();
                const html = navLink(index, 'Alle') + '<div class="nav__menu-title">Spiele</div>' +
                    items.map(p => navLink(p, X.best(p.p.replace(/^arcade\/|\.html$/g, '')) != null ? '★' : '')).join('');
                return navItem(g, reg, html);
            }
            items = X.pages.filter(p => p.r === g.r && (p.nav || (p.skill && !p.hidden)) && (!p.hidden || P.visited[p.p]));
            return navItem(g, reg, items.map(p => navLink(p)).join(''));
        }).join('');
    }
    function navItem(g, reg, inner) {
        const current = X.page && X.page.r === g.r;
        return '<div class="nav__item" style="--nc:' + reg.color + '">' +
            '<button class="nav__link" type="button" aria-haspopup="true"' + (current ? ' aria-current="true"' : '') + '>' +
            '<span class="nav__icon">' + reg.icon + '</span>' + X.esc(g.label || reg.name) + '</button>' +
            '<div class="nav__menu">' + inner + '</div></div>';
    }
    function hudHTML() {
        const li = X.levelInfo();
        const pts = X.user ? X.skillPoints().free : 0;
        const acc = X.user
            ? '<div class="nav__item" id="hud-account"><button class="hud__btn" type="button" aria-haspopup="true">' +
              '<span aria-hidden="true">⚓</span>' + X.esc(X.user) + (pts ? ' <span class="badge badge--accent" title="Freie Modulpunkte">' + pts + '</span>' : '') + '</button>' +
              '<div class="nav__menu nav__menu--right">' +
              X.pages.filter(p => p.r === 'konto' && p.p !== 'konto/login.html' && !(X.easy() && p.p === 'konto/skilltree.html')).map(p => navLink(p, p.p === 'konto/skilltree.html' && pts ? pts + ' frei' : '')).join('') +
              '<a href="#" data-logout><span>Abmelden</span></a></div></div>'
            : '<a class="hud__btn" href="' + X.url('konto/login.html') + '"><span aria-hidden="true">⚓</span>Anmelden</a>';
        return '<a class="hud__btn" href="' + X.url('suche.html') + '" title="Suche" aria-label="Suche">⌕</a>' +
            '<a class="hud__level" href="' + X.url('konto/profil.html') + '" title="' + X.fmt(P.xp) + ' XP gesamt" style="color:inherit">' +
            '<div class="hud__level-row"><span>Level ' + li.level + '</span><span>' + li.into + '/' + li.need + '</span></div>' +
            '<div class="bar bar--sm"><div class="bar__fill" style="--v:' + li.pct + '%"></div></div></a>' +
            acc +
            '<button class="hud__btn hud__burger" type="button" aria-label="Menü öffnen" aria-expanded="false">☰</button>';
    }
    function renderHud() {
        const hud = document.querySelector('.site-header .hud');
        if (hud) { hud.innerHTML = hudHTML(); wireHud(hud); }
    }
    function wireHud(hud) {
        const burger = hud.querySelector('.hud__burger');
        const nav = document.getElementById('site-nav');
        if (burger && nav) burger.addEventListener('click', () => {
            const open = nav.classList.toggle('is-open');
            burger.setAttribute('aria-expanded', open); burger.textContent = open ? '✕' : '☰';
            document.body.style.overflow = open ? 'hidden' : '';
        });
        const lo = hud.querySelector('[data-logout]');
        if (lo) lo.addEventListener('click', e => { e.preventDefault(); X.auth.logout(); location.href = X.url('index.html'); });
        const acc = hud.querySelector('#hud-account');
        if (acc) acc.querySelector('button').addEventListener('click', () => acc.classList.toggle('is-open'));
    }

    function footerHTML() {
        const col = (title, list) => '<div><h4>' + title + '</h4><ul>' + list.map(([p, t]) => '<li><a href="' + X.url(p) + '">' + X.esc(t) + '</a></li>').join('') + '</ul></div>';
        return '<div class="site-footer__inner">' +
            '<div><a class="brand" href="' + X.url('index.html') + '">' + DISK_SVG + '<span>Xiruprojekts</span></a>' +
            '<p class="mt-2">Ein kleines Indie-Hobby-Gamestudio von zwei Freunden – und eine Website, auf der man sich verlaufen darf.</p></div>' +
            col('Entdecken', [['weltkarte.html', 'Weltkarte'], ['suche.html', 'Suche'], ['hilfe.html', 'Hilfe & FAQ'], ['ueber-uns.html', 'Über uns']]) +
            col('Bereiche', [['hardware/index.html', 'Hardware-Archiv'], ['arcade/index.html', 'Spielhalle'], ['ki/index.html', 'KI-Labor'], ['mixer/index.html', 'Mixer-Studio'], ['werkzeuge/index.html', 'Werkzeugkasten']]) +
            col('Studio', [['studio/index.html', 'Downloads'], ['studio/beta.html', 'Beta-Programm'], ['datenschutz.html', 'Datenschutz'], ['nutzungsbedingungen.html', 'Nutzungsbedingungen']]) +
            '</div><div class="site-footer__bottom">' +
            '<span>© <span class="footer-year">2026</span> Xiruprojekts. Kaum Rechte vorbehalten, da wir broke sind ;)</span>' +
            '<span class="footer-hint" id="footer-hint"></span></div>';
    }
    function renderFooterHint() {
        const el = document.getElementById('footer-hint');
        if (!el) return;
        let html = '';
        if (X.hasSkill('e2')) {
            const here = X.eggs.filter(e => e.pg === X.path);
            if (here.length) {
                const found = here.filter(e => P.eggs[e.id]).length;
                html += '◆ Spürnase: ' + found + '/' + here.length + ' Realitätskristalle auf dieser Seite';
            } else html += '◆ Spürnase: Hier funkelt nichts.';
        }
        if (X.hasSkill('e4') || X.hasEgg('w-sesam')) {
            html += ' <a class="footer-door" href="' + X.url('geheim/keller.html') + '" title="Eine kleine Tür …" aria-label="Kellertür"></a>';
        }
        el.innerHTML = html;
    }

    function lockScreenHTML() {
        const pg = X.page;
        const key = pg.isle || pg.r;
        if (!X.mech.discovered(key)) {
            const isle = X.mech.isle(key), name = isle ? isle.n : regionMap[pg.r].name, miss = X.mech.missing(key), can = X.mech.canReach(key);
            return '<div class="lock-screen"><div class="lock-screen__icon">🌫</div>' +
                '<h1 style="font-size:1.8rem">' + X.esc(name) + ' liegt im Nebel</h1>' +
                '<p class="muted">Diese Insel hast du noch nicht erreicht. Rüste deinen Mech in der Werft aus und reise auf der Weltkarte dorthin – die erste Fahrt ist eine Expedition.</p>' +
                '<p>Benötigt: <strong>' + X.esc(X.mech.islandReqText(key)) + '</strong></p>' +
                (can ? '<p class="text-success">Dein Mech schafft das schon – auf zur Weltkarte!</p>' : '<p class="small muted">Es fehlt: ' + X.esc(miss.join(' · ')) + '</p>') +
                '<div class="row"><a class="btn btn--primary" href="' + X.url('weltkarte.html') + '#' + X.esc(key) + '">Zur Weltkarte</a><a class="btn" href="' + X.url('konto/skilltree.html') + '">Werft</a>' +
                '<a class="btn btn--ghost" href="' + X.url('konto/einstellungen.html') + '">Entdecker-Modus</a></div></div>';
        }
        const s = skillMap[pg.skill];
        const br = s && X.branches.find(b => b.id === s.b);
        const secret = pg.hidden;
        return '<div class="lock-screen">' +
            '<div class="lock-screen__icon">' + (secret ? '🌫' : '🔒') + '</div>' +
            '<h1 style="font-size:1.8rem">' + (secret ? 'Ein Ort im Nebel' : X.esc(pg.t) + ' ist versiegelt') + '</h1>' +
            '<p class="muted">' + (secret ? 'Du spürst, dass hier etwas ist – aber du kannst es noch nicht betreten.' : 'Diese Seite wird über ein Modul in der Werft freigeschaltet.') + '</p>' +
            (s ? '<p>Benötigt: <strong style="color:' + (br ? br.color : 'inherit') + '">' + X.esc(s.n) + '</strong> (' + X.esc(br ? br.name : '') + ', ' + s.c + ' Punkt' + (s.c > 1 ? 'e' : '') + ')</p>' : '') +
            '<div class="row">' + (X.user
                ? '<a class="btn btn--primary" href="' + X.url('konto/skilltree.html#module') + '">Zu den Modulen</a>'
                : '<a class="btn btn--primary" href="' + X.url('konto/login.html') + '?weiter=' + encodeURIComponent(X.path) + '">Anmelden</a><a class="btn" href="' + X.url('hilfe.html') + '">Wie funktioniert das?</a>') +
            '</div></div>';
    }

    function autoBreadcrumb(main) {
        if (!X.page || X.path === 'index.html' || document.body.hasAttribute('data-no-crumbs') || main.querySelector('.breadcrumb')) return;
        const reg = regionMap[X.page.r];
        const parts = ['<a href="' + X.url('index.html') + '">Start</a>'];
        const idx = reg && X.pages.find(p => p.r === reg.id && /index\.html$/.test(p.p) && p.p !== 'index.html');
        if (idx && idx.p !== X.path) parts.push('<span><a href="' + X.url(idx.p) + '">' + X.esc(idx.t) + '</a></span>');
        const seg = X.path.split('/');
        if (seg.length === 3) { // z. B. hardware/cpu/xyz.html -> Kategorie
            const cat = X.pages.find(p => p.p === seg[0] + '/' + seg[1] + '.html');
            if (cat) parts.push('<span><a href="' + X.url(cat.p) + '">' + X.esc(cat.t) + '</a></span>');
        }
        parts.push('<span aria-current="page">' + X.esc(X.page.t) + '</span>');
        const nav = document.createElement('nav'); nav.className = 'breadcrumb'; nav.setAttribute('aria-label', 'Brotkrumen');
        nav.innerHTML = parts.join('');
        main.prepend(nav);
    }

    /* ── Animationen & Interaktion ──────────────────────────────────────── */
    function initReveal() {
        const els = X.$$('[data-reveal]');
        if (!els.length) return;
        if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-visible')); return; }
        const io = new IntersectionObserver(entries => entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
        }), { threshold: .12 });
        els.forEach(e => io.observe(e));
    }
    X.initReveal = initReveal;
    function initTilt() {
        if (!matchMedia('(pointer: fine)').matches) return;
        document.addEventListener('pointermove', e => {
            const t = e.target.closest && e.target.closest('.tile');
            if (!t || X.setting('anim') === false) return;
            const r = t.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
            t.style.setProperty('--ry', ((px - .5) * 8).toFixed(2) + 'deg');
            t.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
            t.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
            t.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
        document.addEventListener('pointerout', e => {
            const t = e.target.closest && e.target.closest('.tile');
            if (t && !t.contains(e.relatedTarget)) { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); }
        });
    }
    function initCounters() {
        const els = X.$$('[data-count]');
        if (!els.length) return;
        const run = el => {
            const target = +el.getAttribute('data-count'), dur = 1200, t0 = performance.now();
            const step = now => {
                const k = Math.min(1, (now - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
                el.textContent = X.fmt(v); if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        if (!('IntersectionObserver' in window) || X.setting('anim') === false) { els.forEach(el => el.textContent = X.fmt(+el.getAttribute('data-count'))); return; }
        const io = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }));
        els.forEach(el => io.observe(el));
    }
    X.initCounters = initCounters;

    /* Sortierbare Tabellen: <table data-sortable> + <th data-sort="num|text"> + optional <td data-v="..."> */
    X.sortable = function (table) {
        const ths = X.$$('th[data-sort]', table);
        ths.forEach((th, ci) => th.addEventListener('click', () => {
            const idx = Array.from(th.parentNode.children).indexOf(th);
            const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
            ths.forEach(h => h.removeAttribute('aria-sort')); th.setAttribute('aria-sort', dir);
            const tb = table.tBodies[0], rows = Array.from(tb.rows), num = th.getAttribute('data-sort') === 'num';
            const val = r => { const c = r.cells[idx]; const v = c.getAttribute('data-v') != null ? c.getAttribute('data-v') : c.textContent.trim(); return num ? parseFloat(v) || 0 : v.toLowerCase(); };
            rows.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'ascending' ? 1 : -1); });
            rows.forEach(r => tb.appendChild(r));
        }));
    };

    /* Elemente mit data-egg="id": Klick (oder data-egg-clicks="n" Klicks) schaltet frei */
    function initEggSpots() {
        document.addEventListener('click', e => {
            const el = e.target.closest && e.target.closest('[data-egg]');
            if (!el) return;
            const need = +(el.getAttribute('data-egg-clicks') || 1);
            el._eggClicks = (el._eggClicks || 0) + 1;
            if (el._eggClicks >= need) X.egg(el.getAttribute('data-egg'));
        });
    }

    /* ── Verhaltens-Kristalle ───────────────────────────────────────────── */
    function initBehaviourEggs() {
        const now = new Date(), h = now.getHours(), m = now.getMinutes(), d = now.getDate(), mo = now.getMonth() + 1;
        if (h < 4) X.egg('b-nacht');
        if (h >= 5 && h < 7) X.egg('b-frueh');
        if (h === 13 && m === 37) X.egg('b-1337');
        if (h === 0 && m === 0) X.egg('b-mitternacht');
        if (now.getDay() === 5 && d === 13) X.egg('b-freitag13');
        if (mo === 12 && d >= 24 && d <= 26) X.egg('b-weihnacht');
        if ((mo === 12 && d === 31) || (mo === 1 && d === 1)) X.egg('b-silvester');
        if (mo === 10 && d === 31) X.egg('b-halloween');
        if (mo === 4 && d === 1) X.egg('b-april');
        if (mo === 10 && d === 5) X.egg('b-geburtstag');
        if (location.hash.toLowerCase() === '#geheim') X.egg('b-hash');
        if (innerWidth > 2500) X.egg('b-gross');

        // Getippte Wörter & Konami-Code
        const wordEggs = X.eggs.filter(e => e.w);
        const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
        let buf = '', seq = [];
        const keysDown = X._keysDown = {};
        document.addEventListener('keydown', e => {
            const k = (e.key || '').toLowerCase();
            keysDown[k] = true;
            seq.push(k); if (seq.length > konami.length) seq.shift();
            if (seq.join() === konami.join() && X.egg('b-konami')) {
                setTimeout(() => X.toast('Ein Licht am Horizont', '<a href="' + X.url('geheim/leuchtturm.html') + '">Folge dem Licht →</a>', { icon: '🗼', html: true, time: 10000 }), 600);
            }
            const t = e.target;
            if (X.typedEggs === false || (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName)))) return;
            if (k.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
            buf = (buf + k).slice(-24);
            for (const egg of wordEggs) if (buf.endsWith(egg.w)) { X.egg(egg.id); buf = ''; break; }
        });
        document.addEventListener('keyup', e => { keysDown[(e.key || '').toLowerCase()] = false; });

        // Logo
        let logoClicks = 0, logoTimer;
        document.addEventListener('click', e => {
            const logo = e.target.closest && e.target.closest('.site-header .brand');
            if (!logo) return;
            if (keysDown.f) {
                e.preventDefault(); X.egg('b-floppy');
                X.setting('theme', X.setting('theme') === 'floppy' ? null : 'floppy');
                return;
            }
            if (X.path === 'index.html') e.preventDefault();
            logoClicks++; clearTimeout(logoTimer); logoTimer = setTimeout(() => { logoClicks = 0; }, 2500);
            if (logoClicks >= 7) { X.egg('b-logo'); logoClicks = 0; }
        });

        // Fusszeilen-Jahr
        let yearClicks = 0;
        document.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('footer-year') && ++yearClicks >= 5) X.egg('b-footer'); });

        // Überschrift doppelklicken
        let dbl = 0;
        document.addEventListener('dblclick', e => { if (e.target.closest && e.target.closest('main h1') && ++dbl >= 5) X.egg('b-titel'); });

        // Rechtsklick
        let rc = 0;
        document.addEventListener('contextmenu', () => { if (++rc >= 10) X.egg('b-rechts'); });

        // Kopieren, Drucken, Offline
        document.addEventListener('copy', () => X.egg('b-kopieren'));
        addEventListener('beforeprint', () => X.egg('b-drucken'));
        addEventListener('offline', () => X.egg('b-offline'));
        addEventListener('resize', () => { if (innerWidth < 380) X.egg('b-klein'); if (innerWidth > 2500) X.egg('b-gross'); });

        // Scroll-Sturm
        let scrollAcc = 0, lastY = scrollY;
        addEventListener('scroll', () => { scrollAcc += Math.abs(scrollY - lastY); lastY = scrollY; if (scrollAcc > 20000) X.egg('b-scroll'); }, { passive: true });
        setInterval(() => { scrollAcc = 0; }, 4000);

        // Untätig
        let idleT;
        const resetIdle = () => { clearTimeout(idleT); idleT = setTimeout(() => X.egg('b-idle'), 180000); };
        ['pointermove', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, resetIdle, { passive: true }));
        resetIdle();

        // Tab gewechselt
        let hiddenAt = 0;
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) hiddenAt = Date.now();
            else if (hiddenAt && Date.now() - hiddenAt > 60000) X.egg('b-zurueck');
        });

        // Marathon (Sitzungsdauer)
        let start = +sessionGet('xiru:start');
        if (!start) { start = Date.now(); sessionSet('xiru:start', String(start)); }
        setInterval(() => { if (Date.now() - start > 30 * 60000) X.egg('b-marathon'); }, 60000);
    }

    /* ── Browser-Konsole ────────────────────────────────────────────────── */
    function initConsole() {
        const style = 'font: 700 14px monospace; color: #5eead4;';
        try {
            console.log('%c\n  ██╗  ██╗██╗██████╗ ██╗   ██╗\n  ╚██╗██╔╝██║██╔══██╗██║   ██║\n   ╚███╔╝ ██║██████╔╝██║   ██║\n   ██╔██╗ ██║██╔══██╗██║   ██║\n  ██╔╝ ██╗██║██║  ██║╚██████╔╝\n  ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ \n', style);
            console.log('%cNeugierig? Tippe  xiru.hilfe()', 'font: 600 13px monospace; color: #a78bfa;');
        } catch (e) { }
        window.xiru = {
            hilfe() {
                X.egg('b-konsole');
                console.log('%cBefehle:\n  xiru.status()        – dein Fortschritt\n  xiru.geheimnis(wort) – flüstere der Maschine ein Wort\n\nTipp: Das Wort ist ein Speichermedium mit 1,44 MB.', 'font: 13px monospace; color: #5eead4;');
                return '◆';
            },
            status() {
                const li = X.levelInfo();
                return { name: X.user || 'Gast', level: li.level, xp: P.xp, kristalle: X.eggCount() + '/' + X.eggs.length, orte: Object.keys(P.visited).length + '/' + X.pages.length };
            },
            geheimnis(w) {
                if (String(w || '').toLowerCase() === 'diskette') { X.egg('b-konsole2'); return 'Die Maschine nickt zufrieden.'; }
                return 'Die Maschine schweigt.';
            }
        };
    }

    /* ── Einwilligungs-Banner ───────────────────────────────────────────── */
    function showConsent(force) {
        if (!document.body || document.querySelector('.consent')) return;
        if (!force && consent) return;
        const legacy = !consent && X.consent.legacyData();
        const box = document.createElement('section');
        box.className = 'consent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Speicher-Einwilligung');
        box.innerHTML = '<div class="consent__icon">🍪</div><div class="consent__body"><h2>Krümel im Browser?</h2>' +
            '<p>Diese Website merkt sich deinen Fortschritt, dein lokales Konto und deine Einstellungen in deinem Browser (localStorage und zwei kleine technische Cookies als Sicherung). ' +
            'Eine lokale Übersicht zählt Spielrunden und ungefähre aktive Zeit auf Spielseiten. Keine Drittanbieter-Tracker; in der Spielhalle gibt es gelegentlich schliessbare Eigenwerbung für Xiru-Spiele.</p>' +
            '<p class="small"><strong>Alles erlauben:</strong> dein Fortschritt bleibt dauerhaft gespeichert. <strong>Nur notwendige:</strong> alles funktioniert, wird aber beim Schliessen des Browsers vergessen.</p>' +
            (legacy ? '<p class="small text-warning">Du hast bereits gespeicherten Fortschritt. Mit „Nur notwendige" wird er nur noch bis zum Schliessen des Browsers behalten.</p>' : '') +
            '<div class="consent__actions"><button class="btn" type="button" data-consent="all">Alles erlauben</button>' +
            '<button class="btn" type="button" data-consent="min">Nur notwendige</button>' +
            '<a class="small" href="' + X.url('datenschutz.html') + '">Mehr erfahren</a></div></div>';
        document.body.appendChild(box);
        box.addEventListener('click', e => {
            const b = e.target.closest('[data-consent]'); if (!b) return;
            X.consent.set(b.dataset.consent === 'all');
            box.classList.add('is-leaving'); setTimeout(() => box.remove(), 300);
            if (b.dataset.consent === 'all') X.toast('Danke!', 'Dein Fortschritt wird ab jetzt dauerhaft gespeichert.', { icon: '🍪' });
            if (force) setTimeout(() => location.reload(), 350);
        });
    }

    /* ── Start ──────────────────────────────────────────────────────────── */
    // Design sofort setzen (kein Aufblitzen)
    applySettings();
    if (X.page) document.documentElement.style.setProperty('--rc-raw', (regionMap[X.page.r] || {}).color || '');
    const prefix = document.documentElement.getAttribute('data-region');
    if (prefix && regionMap[prefix]) document.documentElement.style.setProperty('--rc-raw', regionMap[prefix].color);

    const readyQueue = [];
    let booted = false;
    X.ready = function (fn) {
        if (booted) { if (!X.locked) fn(); }
        else readyQueue.push(fn);
    };

    function boot() {
        const body = document.body;
        if (document.documentElement.hasAttribute('data-bare')) {   // Liminal-Teil (Why): eigene Welt – keine XP, Kristalle, Besuche
            const safe0 = fn => { try { fn(); } catch (e) { console.error('[XIRU]', e); } };
            booted = true;
            readyQueue.splice(0).forEach(fn => { if (!X.locked) safe0(fn); });
            return;
        }
        body.classList.add('page-enter');

        // Kopf
        const header = document.createElement('header');
        header.className = 'site-header';
        header.innerHTML = '<a class="brand" href="' + X.url('index.html') + '" aria-label="Xiruprojekts Startseite">' + DISK_SVG + '<span class="brand__name">Xiruprojekts</span></a>' +
            '<nav class="nav" id="site-nav" aria-label="Hauptnavigation">' + buildNav() + '</nav><div class="hud"></div>';
        const skip = document.createElement('a');
        skip.className = 'skip-link'; skip.href = '#main'; skip.textContent = 'Zum Inhalt springen';
        body.prepend(header); body.prepend(skip);
        renderHud();
        // Mobile Untermenüs per Tipp öffnen
        header.querySelectorAll('.nav .nav__link').forEach(btn => btn.addEventListener('click', () => {
            const it = btn.parentElement, open = !it.classList.contains('is-open');
            header.querySelectorAll('.nav__item.is-open').forEach(x => x.classList.remove('is-open'));
            if (open) it.classList.add('is-open');
        }));
        document.addEventListener('click', e => { if (!e.target.closest('.nav__item')) header.querySelectorAll('.nav__item.is-open').forEach(x => x.classList.remove('is-open')); });

        // Inhalt
        let main = document.querySelector('main');
        if (!main) { main = document.createElement('main'); body.insertBefore(main, header.nextSibling); }
        if (!main.id) main.id = 'main';
        if (!main.classList.contains('content')) main.classList.add('content');
        if (X.locked) main.innerHTML = lockScreenHTML();
        autoBreadcrumb(main);

        // Fuss
        const footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML = footerHTML();
        body.appendChild(footer);
        toastStack();
        pendingToasts.splice(0).forEach(a => X.toast.apply(null, a));
        renderFooterHint();

        if (X.page && !document.title.includes('Xiruprojekts')) document.title = X.page.t + ' · Xiruprojekts';

        const safe = fn => { try { fn(); } catch (e) { console.error('[XIRU]', e); } };
        safe(initEggSpots);
        safe(initBehaviourEggs);
        safe(initConsole);
        safe(trackVisit);
        safe(trackArcadeTime);
        booted = true;
        readyQueue.splice(0).forEach(fn => { if (!X.locked) safe(fn); });
        safe(initReveal);
        safe(initTilt);
        safe(initCounters);
        safe(() => showConsent(false));
        safe(offerRestore);
        safe(() => X.backup.write());
        safe(lastUserCookie);
        addEventListener('pagehide', () => { try { X.backup.write(); } catch (e) { } });
        X.$$('table[data-sortable]').forEach(t => safe(() => X.sortable(t)));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
