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

    /* ── Speicher (localStorage, abgesichert) ───────────────────────────── */
    const mem = {};
    X.store = {
        get(key, def) {
            try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); }
            catch (e) { return key in mem ? mem[key] : def; }
        },
        set(key, val) {
            try { localStorage.setItem(key, JSON.stringify(val)); }
            catch (e) { mem[key] = val; }
        },
        remove(key) { try { localStorage.removeItem(key); } catch (e) { delete mem[key]; } }
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
    function readSession() {
        return sessionGet(SESSION_KEY) || X.store.get(SESSION_KEY, null);
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
    function persist() { X.store.set(profileKey(X.user), P); }
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
            if (remember) X.store.set(SESSION_KEY, name); else X.store.remove(SESSION_KEY);
            X.user = name;
            P = loadProfile(name);
            emit('login', name);
        },
        logout() {
            sessionSet(SESSION_KEY, null);
            X.store.remove(SESSION_KEY);
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
            try { Object.keys(localStorage).filter(k => k.startsWith('xiru:save:' + key + ':')).forEach(k => localStorage.removeItem(k)); } catch (e) { }
            this.logout();
        }
    };

    /* ── Einstellungen ──────────────────────────────────────────────────── */
    const DEFAULTS = { theme: null, anim: true, sound: true, visitToasts: true };
    X.setting = function (key, val) {
        if (arguments.length === 1) return key in P.settings ? P.settings[key] : DEFAULTS[key];
        P.settings[key] = val; persist(); applySettings(); emit('setting', { key, val });
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
    X.hasSkill = id => !!(X.user && P.skills[id]);
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
        X.toast('Skill gelernt: ' + s.n, s.d, { icon: '✦', type: 'level' });
        X.egg('b-skill');
        const branch = X.skills.filter(k => k.b === s.b);
        if (branch.every(k => P.skills[k.id])) X.egg('b-ast');
        emit('skill', id); renderHud();
        return true;
    };


    /* ── Werft: Mech, Bauteile, Inseln ──────────────────────────────────── */
    const partMap = {};
    (X.mechParts || []).forEach(p => { partMap[p.id] = p; });
    const FREE_PARTS = ['r-schrott', 'a-paddel', 'k-batterie'];
    function mechState() {
        const m = P.data.mech || (P.data.mech = { parts: {}, built: {}, cond: {}, islands: {}, spent: 0, tutorial: 0 });
        ['parts', 'built', 'cond', 'islands'].forEach(k => { if (!m[k] || typeof m[k] !== 'object') m[k] = {}; });
        m.spent = +m.spent || 0; m.tutorial = +m.tutorial || 0;
        return m;
    }
    X.mech = {
        state: mechState,
        part: id => partMap[id] || null,
        /* Schrott: 1 pro 4 XP, minus Ausgaben */
        scrap() { return Math.max(0, Math.floor(P.xp / 4) - mechState().spent); },
        progress() {
            return { level: X.levelInfo().level, eggs: X.eggCount(), pages: Object.keys(P.visited).filter(q => pageMap[q]).length, games: Object.keys(P.scores).length };
        },
        available(part) {
            if (FREE_PARTS.includes(part.id)) return mechState().tutorial >= 1;
            const r = part.req || {}, pr = this.progress();
            return (!r.level || pr.level >= r.level) && (!r.eggs || pr.eggs >= r.eggs) && (!r.pages || pr.pages >= r.pages) && (!r.games || pr.games >= r.games);
        },
        reqText(part) {
            if (FREE_PARTS.includes(part.id)) return 'Startausrüstung (Tutorial)';
            const r = part.req || {}, out = [];
            if (r.level) out.push('Level ' + r.level);
            if (r.eggs) out.push(r.eggs + ' Realitätskristalle');
            if (r.pages) out.push(r.pages + ' entdeckte Orte');
            if (r.games) out.push(r.games + ' verschiedene Spiele gespielt');
            return out.join(' · ') || 'frei';
        },
        isBuilt: id => !!mechState().built[id],
        cond: id => { const c = mechState().cond[id]; return c == null ? 100 : c; },
        installed(slot) { const id = mechState().parts[slot]; return id ? partMap[id] : null; },
        build(id) {
            const pt = partMap[id], m = mechState();
            if (!pt || m.built[id] || !this.available(pt) || this.scrap() < pt.cost) return false;
            m.spent += pt.cost; m.built[id] = Date.now(); m.cond[id] = 100; persist(); emit('mech', 'build');
            return true;
        },
        install(id) {
            const pt = partMap[id], m = mechState();
            if (!pt || !m.built[id]) return false;
            m.parts[pt.slot] = id; persist(); emit('mech', 'install');
            if (X.mechSlots.every(sl => m.parts[sl.id])) X.egg('m-vollausbau');
            if (id === 'a-beine') X.egg('m-beine');
            return true;
        },
        uninstall(slot) { const m = mechState(); delete m.parts[slot]; persist(); emit('mech', 'uninstall'); },
        /* Effektive Werte: unter 40 % Zustand halbiert, bei 0 % fällt das Teil aus */
        stats() {
            const out = { R: 0, E: 0, S: 0, P: 0, rep: 0 };
            X.mechSlots.forEach(sl => {
                const pt = this.installed(sl.id); if (!pt) return;
                const c = this.cond(pt.id);
                Object.keys(pt.s || {}).forEach(k => {
                    const v = pt.s[k];
                    out[k] += v < 0 ? v : c <= 0 ? 0 : c < 40 ? Math.floor(v / 2) : v;
                });
                if (pt.rep && c > 0) out.rep = pt.rep;
            });
            return out;
        },
        ready() { return ['rahmen', 'antrieb', 'kern'].every(sl => { const pt = this.installed(sl); return pt && this.cond(pt.id) > 0; }); },
        repairCost(id) { return Math.ceil((100 - this.cond(id)) * .6 * (1 - this.stats().rep)); },
        repair(id) {
            const cost = this.repairCost(id), m = mechState();
            if (!m.built[id] || cost <= 0 || this.scrap() < cost) return false;
            m.spent += cost; m.cond[id] = 100; persist(); emit('mech', 'repair');
            X.egg('m-reparatur');
            return true;
        },
        damage(id, amount) {
            const m = mechState(); if (!m.built[id]) return 0;
            const before = this.cond(id);
            m.cond[id] = Math.max(0, before - Math.round(amount)); persist();
            if (m.cond[id] === 0) X.egg('m-kaputt');
            return before - m.cond[id];
        },
        req: r => (X.islandReq || {})[r] || null,
        discovered(r) { return !this.req(r) || !!mechState().islands[r]; },
        missing(r) {
            const need = this.req(r) || {}, st = this.stats(), out = [];
            const names = { R: 'Reichweite', E: 'Energie', S: 'Sensor', P: 'Panzerung' };
            Object.keys(need).forEach(k => { if (st[k] < need[k]) out.push(names[k] + ' ' + st[k] + '/' + need[k]); });
            if (!this.ready()) out.unshift('Rahmen, Antrieb und Energiekern müssen eingebaut und intakt sein');
            return out;
        },
        canReach(r) { return this.missing(r).length === 0; },
        islandReqText(r) {
            const need = this.req(r); if (!need) return 'frei zugänglich';
            const names = { R: 'Reichweite', E: 'Energie', S: 'Sensor', P: 'Panzerung' };
            return Object.keys(need).map(k => names[k] + ' ' + need[k]).join(' · ');
        },
        /* Expedition: schaltet eine Insel frei – und beansprucht das Material */
        expedition(r) {
            if (this.discovered(r) || !this.canReach(r)) return null;
            const m = mechState(), st = this.stats(), report = [];
            ['antrieb', 'rahmen', X.pick(['kern', 'sensor', 'panzer', 'arm'])].forEach(sl => {
                const pt = this.installed(sl); if (!pt) return;
                const dmg = this.damage(pt.id, Math.max(0, X.rand(6, 24) - st.P * 3));
                if (dmg > 0) report.push({ part: pt, dmg });
            });
            m.islands[r] = Date.now(); persist();
            X.addXP(40, 'Expedition');
            X.egg('m-erste-reise');
            if (Object.keys(X.islandReq).filter(k => X.islandReq[k]).every(k => m.islands[k])) X.egg('m-alle-inseln');
            emit('mech', 'expedition');
            return report;
        }
    };

    X.addXP = function (n, reason) {
        n = Math.round(n || 0);
        if (!n) return;
        const before = X.levelInfo().level;
        P.xp += n; persist();
        const after = X.levelInfo().level;
        emit('xp', { n, reason });
        if (after > before) {
            X.toast('Level ' + after + '!', X.user ? 'Du hast einen neuen Skillpunkt.' : 'Erstelle ein Konto, um Skillpunkte zu nutzen.', { icon: '⬆', type: 'level' });
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
        if (!X.mech.discovered(pg.r)) return false;
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
        if (X.regions.filter(r => r.id !== 'geheim').every(r => regionsSeen.has(r.id))) X.egg('b-regionen');
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
        const fixed = LOGO_INNER.replace(/var\(--rc\)/g, '#5eead4').replace(/var\(--accent-2\)/g, '#a78bfa')
            .replace(/var\(--bg\)/g, '#0b0e1a').replace(/var\(--surface-3\)/g, '#232b4f');
        const link = document.createElement('link');
        link.rel = 'icon'; link.type = 'image/svg+xml';
        link.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' + fixed + '</svg>');
        document.head.appendChild(link);
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
              '<span aria-hidden="true">⚓</span>' + X.esc(X.user) + (pts ? ' <span class="badge badge--accent" title="Freie Skillpunkte">' + pts + '</span>' : '') + '</button>' +
              '<div class="nav__menu nav__menu--right">' +
              X.pages.filter(p => p.r === 'konto' && p.p !== 'konto/login.html').map(p => navLink(p, p.p === 'konto/skilltree.html' && pts ? pts + ' frei' : '')).join('') +
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
        if (!X.mech.discovered(pg.r)) {
            const reg = regionMap[pg.r], miss = X.mech.missing(pg.r), can = X.mech.canReach(pg.r);
            return '<div class="lock-screen"><div class="lock-screen__icon">🌫</div>' +
                '<h1 style="font-size:1.8rem">' + X.esc(reg.name) + ' liegt im Nebel</h1>' +
                '<p class="muted">Diese Insel hast du noch nicht erreicht. Bau in der Werft einen Mech, der stark genug ist, und starte eine Expedition.</p>' +
                '<p>Benötigt: <strong>' + X.esc(X.mech.islandReqText(pg.r)) + '</strong></p>' +
                (can ? '<p class="text-success">Dein Mech schafft das schon – starte die Expedition!</p>' : '<p class="small muted">Es fehlt: ' + X.esc(miss.join(' · ')) + '</p>') +
                '<div class="row"><a class="btn btn--primary" href="' + X.url('konto/skilltree.html') + '#reisen">⚙ Zur Werft</a><a class="btn" href="' + X.url('weltkarte.html') + '">Weltkarte</a></div></div>';
        }
        const s = skillMap[pg.skill];
        const br = s && X.branches.find(b => b.id === s.b);
        const secret = pg.hidden;
        return '<div class="lock-screen">' +
            '<div class="lock-screen__icon">' + (secret ? '🌫' : '🔒') + '</div>' +
            '<h1 style="font-size:1.8rem">' + (secret ? 'Ein Ort im Nebel' : X.esc(pg.t) + ' ist versiegelt') + '</h1>' +
            '<p class="muted">' + (secret ? 'Du spürst, dass hier etwas ist – aber du kannst es noch nicht betreten.' : 'Diese Seite wird über den Skilltree freigeschaltet.') + '</p>' +
            (s ? '<p>Benötigt: <strong style="color:' + (br ? br.color : 'inherit') + '">' + X.esc(s.n) + '</strong> (' + X.esc(br ? br.name : '') + ', ' + s.c + ' Punkt' + (s.c > 1 ? 'e' : '') + ')</p>' : '') +
            '<div class="row">' + (X.user
                ? '<a class="btn btn--primary" href="' + X.url('konto/skilltree.html') + '">Zum Skilltree</a>'
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
        booted = true;
        readyQueue.splice(0).forEach(fn => { if (!X.locked) safe(fn); });
        safe(initReveal);
        safe(initTilt);
        safe(initCounters);
        X.$$('table[data-sortable]').forEach(t => safe(() => X.sortable(t)));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
