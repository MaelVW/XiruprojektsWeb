/* Passwort-Generator & -Prüfer. Zufall nur aus crypto.getRandomValues (über WZ.randInt).
   Es wird NICHTS gespeichert oder gesendet. */
XIRU.typedEggs = false;
XIRU.ready(function () {
    'use strict';
    const $ = XIRU.$, esc = XIRU.esc;
    if (!window.crypto || !crypto.getRandomValues) {
        $('#chars').textContent = 'Dein Browser bietet keinen sicheren Zufall (crypto.getRandomValues). Bitte einen aktuellen Browser verwenden.';
        return;
    }
    const WORDS = window.WZ_WORTE || [];
    let mode = 'pw', current = '', currentBits = 0;

    /* ── Gruppen ─────────────────────────────────────────────────────── */
    const GROUPS = {
        lower: 'abcdefghijklmnopqrstuvwxyz',
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        digit: '0123456789',
        symbol: '!#$%&*+-=?@_~',
        brackets: '()[]{}<>.,:;/^|'
    };
    const AMBIG = '0Oo1lI|';
    const PP_SYMBOLS = '!#$%&*+-=?@_~';

    function activeGroups() {
        const excl = new Set(Array.from($('#exclude').value));
        if ($('#g-ambig').checked) Array.from(AMBIG).forEach(c => excl.add(c));
        const out = [];
        [['lower', '#g-lower'], ['upper', '#g-upper'], ['digit', '#g-digit'], ['symbol', '#g-symbol'], ['brackets', '#g-brackets']].forEach(([k, sel]) => {
            if (!$(sel).checked) return;
            const chars = Array.from(GROUPS[k]).filter(c => !excl.has(c));
            if (chars.length) out.push(chars);
        });
        return out;
    }

    /* Anzahl gültiger Passwörter (Einschluss-Ausschluss) -> exakte Entropie */
    function pwBits(groups, len, each) {
        const P = groups.reduce((s, g) => s + g.length, 0);
        if (!P) return 0;
        let bits = len * Math.log2(P);
        if (each && len >= groups.length && groups.length > 1) {
            let ratio = 0;
            const n = groups.length;
            for (let mask = 0; mask < (1 << n); mask++) {
                let removed = 0, k = 0;
                for (let i = 0; i < n; i++) if (mask & (1 << i)) { removed += groups[i].length; k++; }
                ratio += (k % 2 ? -1 : 1) * Math.pow((P - removed) / P, len);
            }
            if (ratio > 0) bits += Math.log2(ratio);
        }
        return bits;
    }

    function genPassword() {
        const groups = activeGroups();
        const len = clampLen();
        const pool = [].concat.apply([], groups);
        const info = $('#pool-info');
        if (!pool.length) {
            info.textContent = 'Wähle mindestens eine Zeichengruppe.';
            return { tokens: [], text: '', bits: 0 };
        }
        info.textContent = pool.length + ' mögliche Zeichen · ' + WZ.fix(Math.log2(pool.length), 2) + ' Bit pro Zeichen';
        const each = $('#g-each').checked && len >= groups.length;
        let s;
        for (let tries = 0; tries < 2000; tries++) {
            s = [];
            for (let i = 0; i < len; i++) s.push(pool[WZ.randInt(pool.length)]);
            if (!each || groups.every(g => s.some(c => g.includes(c)))) break;
        }
        const tokens = s.map(c => ({ t: c, c: /\d/.test(c) ? 'd' : /[a-z]/.test(c) ? 'l' : /[A-Z]/.test(c) ? 'u' : 's' }));
        return { tokens, text: s.join(''), bits: pwBits(groups, len, each) };
    }

    function genPassphrase() {
        const n = Math.max(3, Math.min(12, parseInt($('#words').value, 10) || 5));
        const sep = $('#sep').value, cap = $('#pp-cap').checked;
        const tokens = [];
        let bits = n * Math.log2(WORDS.length);
        for (let i = 0; i < n; i++) {
            if (i > 0) {
                if (sep === '#digit') { tokens.push({ t: String(WZ.randInt(10)), c: 'd' }); bits += Math.log2(10); }
                else if (sep) tokens.push({ t: sep, c: 'sep' });
            }
            let w = WORDS[WZ.randInt(WORDS.length)];
            if (cap) w = w[0].toUpperCase() + w.slice(1);
            else if (!sep) w = i ? w[0].toUpperCase() + w.slice(1) : w;   // ohne Trenner: CamelCase, sonst unlesbar
            tokens.push({ t: w, c: i % 2 ? 'w2' : 'u' });
        }
        let extra = '';
        if ($('#pp-num').checked) { extra += String(WZ.randInt(100)); bits += Math.log2(100); }
        if ($('#pp-sym').checked) { extra += PP_SYMBOLS[WZ.randInt(PP_SYMBOLS.length)]; bits += Math.log2(PP_SYMBOLS.length); }
        if (extra) {
            if (sep && sep !== '#digit') tokens.push({ t: sep, c: 'sep' });
            Array.from(extra).forEach(ch => tokens.push({ t: ch, c: /\d/.test(ch) ? 'd' : 's' }));
        }
        $('#pp-info').textContent = WORDS.length + ' Wörter in der Liste · ' + WZ.fix(Math.log2(WORDS.length), 2) + ' Bit pro Wort';
        return { tokens, text: tokens.map(t => t.t).join(''), bits };
    }

    function clampLen() {
        let v = parseInt($('#len').value, 10);
        if (!isFinite(v)) v = 20;
        return Math.max(4, Math.min(128, v));
    }

    /* ── Stärke & Knackzeit ──────────────────────────────────────────── */
    function strength(bits) {
        if (bits < 28) return { l: 'sehr schwach', c: 'var(--danger)' };
        if (bits < 40) return { l: 'schwach', c: 'var(--danger)' };
        if (bits < 60) return { l: 'mittel', c: 'var(--warning)' };
        if (bits < 80) return { l: 'stark', c: 'var(--success)' };
        if (bits < 128) return { l: 'sehr stark', c: 'var(--success)' };
        return { l: 'absurd stark', c: 'var(--accent-2)' };
    }
    function fmtTime(sec) {
        if (!isFinite(sec) || sec > 1e300) return 'länger als das Universum alt ist';
        if (sec < 1) return 'sofort';
        const Y = 365.25 * 86400;
        const plural = (v, a, b) => WZ.fix(v, 0) + ' ' + (Math.round(v) === 1 ? a : b);
        if (sec < 60) return plural(sec, 'Sekunde', 'Sekunden');
        if (sec < 3600) return plural(sec / 60, 'Minute', 'Minuten');
        if (sec < 86400) return plural(sec / 3600, 'Stunde', 'Stunden');
        if (sec < Y) return plural(sec / 86400, 'Tag', 'Tage');
        const y = sec / Y;
        if (y < 1e3) return plural(y, 'Jahr', 'Jahre');
        if (y < 1e6) return WZ.fix(y / 1e3, 0) + ' Tsd. Jahre';
        if (y < 1e9) return WZ.fix(y / 1e6, 0) + ' Mio. Jahre';
        if (y < 1.38e10) return WZ.fix(y / 1e9, 1) + ' Mrd. Jahre';
        return WZ.fmt(y, 3) + ' Jahre – älter als das Universum';
    }
    const ATTACKS = [
        ['Online-Angriff (gebremst, 10/s)', 10],
        ['Offline, langsamer Hash (10’000/s)', 1e4],
        ['Offline, schneller Hash auf GPUs (100 Mrd./s)', 1e11]
    ];
    function showStrength(bits, prefix) {
        const s = strength(bits);
        const meter = $('#' + prefix + '-meter');
        meter.style.setProperty('--mc', s.c);
        meter.firstElementChild.style.setProperty('--v', Math.min(100, bits / 128 * 100) + '%');
        $('#' + prefix + '-label').textContent = s.l;
        $('#' + prefix + '-label').style.setProperty('--mc', s.c);
        $('#' + prefix + '-bits').textContent = WZ.fix(bits, bits < 10 ? 1 : 0);
        $('#' + prefix + '-times').innerHTML = '<div><span>Durchschnittliche Zeit zum Knacken:</span></div>' + ATTACKS.map(a =>
            '<div><span>' + esc(a[0]) + '</span><b>' + esc(fmtTime(Math.pow(2, Math.max(0, bits - 1)) / a[1])) + '</b></div>').join('');
    }

    /* ── Anzeige ─────────────────────────────────────────────────────── */
    function render(res) {
        current = res.text; currentBits = res.bits;
        const anim = res.tokens.length < 200;
        let i = 0, html = '';
        res.tokens.forEach(tok => {
            Array.from(tok.t).forEach(ch => {
                html += '<span class="' + tok.c + '"' + (anim ? ' style="--i:' + (i++) + '"' : '') + '>' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
            });
        });
        $('#chars').innerHTML = html || '<span class="muted">–</span>';
        $('#out-sr').textContent = res.text ? 'Neues ' + (mode === 'pw' ? 'Passwort' : 'Passphrase') + ' erzeugt' : '';
        showStrength(res.bits, 'gen');
        if (res.bits >= 256) XIRU.egg('t-passwort-256');
    }
    const gen = () => mode === 'pw' ? genPassword() : genPassphrase();
    function regenerate() { render(gen()); suggestions(); }
    function suggestions() {
        let html = '';
        for (let i = 0; i < 5; i++) {
            const r = gen();
            if (!r.text) break;
            html += '<li><code>' + esc(r.text) + '</code><button class="btn btn--sm btn--ghost" type="button" data-copy="' + esc(r.text) + '" aria-label="Vorschlag ' + (i + 1) + ' kopieren">📋</button></li>';
        }
        $('#sugg').innerHTML = html;
    }
    $('#sugg').addEventListener('click', e => {
        const b = e.target.closest('[data-copy]');
        if (b) WZ.copy(b.getAttribute('data-copy'), b);
    });

    WZ.tabs($('#mode-tabs'), { onChange: id => { mode = id; regenerate(); } });

    // Länge: Regler und Zahlenfeld synchron
    const lr = $('#len-range'), ln = $('#len');
    lr.addEventListener('input', () => { ln.value = lr.value; regenerate(); });
    ln.addEventListener('input', () => { if (ln.value !== '') { lr.value = clampLen(); regenerate(); } });
    ln.addEventListener('change', () => { ln.value = clampLen(); lr.value = ln.value; regenerate(); });
    const wr = $('#words-range'), wn = $('#words');
    wr.addEventListener('input', () => { wn.value = wr.value; regenerate(); });
    wn.addEventListener('input', () => { const v = parseInt(wn.value, 10); if (v >= 3 && v <= 12) { wr.value = v; regenerate(); } });
    wn.addEventListener('change', () => { wn.value = Math.max(3, Math.min(12, parseInt(wn.value, 10) || 5)); wr.value = wn.value; regenerate(); });
    XIRU.$$('#tab-pw input[type="checkbox"], #tab-pp input[type="checkbox"], #sep').forEach(el => el.addEventListener('change', regenerate));
    $('#exclude').addEventListener('input', WZ.debounce(regenerate, 200));

    $('#btn-new').addEventListener('click', regenerate);
    $('#btn-more').addEventListener('click', suggestions);
    $('#btn-copy').addEventListener('click', e => { if (current) WZ.copy(current, e.currentTarget); });
    const hideBtn = $('#btn-hide');
    function toggleHide() {
        const on = !$('#out').classList.contains('is-hidden');
        $('#out').classList.toggle('is-hidden', on);
        hideBtn.setAttribute('aria-pressed', on);
        hideBtn.textContent = on ? '👁 Anzeigen' : '👁 Verbergen';
    }
    hideBtn.addEventListener('click', toggleHide);
    document.addEventListener('keydown', e => {
        if (WZ.typing(e) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === 'n') { e.preventDefault(); regenerate(); }
        else if (k === 'k') { e.preventDefault(); if (current) WZ.copy(current, $('#btn-copy')); }
        else if (k === 'v') { e.preventDefault(); toggleHide(); }
    });

    /* ── Prüfer ──────────────────────────────────────────────────────── */
    const COMMON = ('123456 password 123456789 12345678 12345 qwerty 1234567 111111 1234567890 123123 abc123 password1 ' +
        'passwort 000000 iloveyou 1234 qwertz hallo 123321 654321 666666 dragon monkey letmein 696969 football baseball ' +
        'master sunshine princess shadow superman welcome admin login hallo123 passwort1 passwort123 schatz schatzi ' +
        'qwertzuiop qwertyuiop asdfgh asdfghjkl asdf yxcvbnm zxcvbnm 1q2w3e4r 1qaz2wsx zaq12wsx qwer1234 abcd1234 ' +
        'qwerty123 aa123456 987654321 7777777 121212 112233 000000000 killer internet computer sommer winter blume ' +
        'liebe geheim test test123 test1234 root guest gast hunter2 trustno1 starwars pokemon minecraft fortnite ' +
        'zuerich schweiz bern basel lol123 abcdef secret michael daniel thomas andreas stefan sandra nicole ' +
        'jessica marcel fussball hund katze schalke bayern xiru xiruprojekts diskette floppy changeme default ' +
        'pass1234 admin123 root123 ichliebedich 11111111 88888888 55555 1111 0000 2000 1990 2020 asd123 qwe123')
        .split(' ').filter(Boolean);
    const COMMON_RANK = new Map();
    COMMON.forEach((w, i) => { if (!COMMON_RANK.has(w)) COMMON_RANK.set(w, i + 1); });
    const EXTRA_WORDS = ('love dragon monkey master shadow sunshine princess summer winter admin welcome secret hello ' +
        'killer angel baby star super magic cookie cheese pepper flower orange purple banana chocolate coffee ' +
        'game gamer player power dark light fire water ice storm king queen lord boss pro noob ninja hero ' +
        'passwort password pass kennwort hallo sonne liebe schatz geheim gaming zocker ' +
        'sommer winter herbst fruehling januar februar maerz april juni juli august september oktober november dezember ' +
        'montag dienstag mittwoch donnerstag freitag samstag sonntag').split(' ');
    const DICT = new Set(WORDS.concat(EXTRA_WORDS).concat(COMMON.filter(w => /^[a-z]+$/.test(w))));
    const DICT_BITS = Math.log2(DICT.size);
    const KB_ROWS = ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx3edc4rfv', '147258369', '789456123'];
    const LEET = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' };

    function poolOf(chars) {
        let p = 0;
        if (chars.some(c => /[a-z]/.test(c))) p += 26;
        if (chars.some(c => /[A-Z]/.test(c))) p += 26;
        if (chars.some(c => /[0-9]/.test(c))) p += 10;
        if (chars.some(c => /[ -\/:-@\[-`{-~]/.test(c))) p += 33;
        if (chars.some(c => /[äöüÄÖÜéèàçß]/.test(c))) p += 15;
        if (chars.some(c => c.charCodeAt(0) > 127 && !/[äöüÄÖÜéèàçß]/.test(c))) p += 100;
        return Math.max(p, 10);
    }
    const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
    function capBits(tok) {
        const up = Array.from(tok).filter(c => c !== c.toLowerCase()).length;
        if (!up) return 0;
        if (up === tok.length || (up === 1 && tok[0] !== tok[0].toLowerCase())) return 1;
        let s = 0; for (let k = 1; k <= up; k++) s += binom(tok.length, k);
        return Math.log2(s);
    }

    function analyze(pw) {
        const ch = Array.from(pw), L = ch.length;
        const pool = poolOf(ch), per = Math.log2(pool);
        const low = ch.map(c => c.toLowerCase());
        const leetA = low.map(c => LEET[c] || c);
        const leetB = low.map(c => c === '1' ? 'l' : (LEET[c] || c));
        const best = new Array(L + 1).fill(Infinity), from = new Array(L + 1);
        best[0] = 0;
        const relax = (i, j, bits, m) => { if (best[i] + bits < best[j]) { best[j] = best[i] + bits; from[j] = { i, m }; } };
        for (let i = 0; i < L; i++) {
            if (best[i] === Infinity) continue;
            relax(i, i + 1, per, null);
            // Wörter & häufige Passwörter (auch mit Leetspeak)
            for (let j = i + 3; j <= Math.min(L, i + 24); j++) {
                const raw = ch.slice(i, j).join(''), a = low.slice(i, j).join(''), b = leetA.slice(i, j).join(''), c = leetB.slice(i, j).join('');
                const leet = a !== b ? Array.from(a).filter((x, k) => x !== b[k]).length : 0;
                const rank = COMMON_RANK.get(a) || COMMON_RANK.get(b) || COMMON_RANK.get(c);
                if (rank) relax(i, j, Math.log2(rank) + 1 + capBits(raw) + leet, { k: 'common', t: raw, full: i === 0 && j === L });
                else if (DICT.has(a) || DICT.has(b) || DICT.has(c)) relax(i, j, DICT_BITS + capBits(raw) + leet, { k: 'word', t: raw, w: DICT.has(a) ? a : DICT.has(b) ? b : c });
            }
            // Wiederholung aaa
            let r = i + 1; while (r < L && ch[r] === ch[i]) r++;
            for (let j = i + 3; j <= r; j++) relax(i, j, Math.log2(poolOf([ch[i]])) + Math.log2(j - i), { k: 'repeat', t: ch.slice(i, j).join('') });
            // Wiederholte Blöcke (abcabc)
            for (let size = 2; size <= 6 && i + size * 2 <= L; size++) {
                const unit = ch.slice(i, i + size).join('');
                let j = i + size; while (j + size <= L && ch.slice(j, j + size).join('') === unit) j += size;
                if (j - i >= size * 2) relax(i, j, size * per + Math.log2((j - i) / size), { k: 'block', t: ch.slice(i, j).join('') });
            }
            // Folgen abc, 123, 987
            if (i + 2 < L) {
                const step = low[i + 1].charCodeAt(0) - low[i].charCodeAt(0);
                if ((step === 1 || step === -1) && /[a-z0-9]/.test(low[i])) {
                    let j = i + 1; while (j < L && low[j].charCodeAt(0) - low[j - 1].charCodeAt(0) === step && /[a-z0-9]/.test(low[j])) j++;
                    for (let k = i + 3; k <= j; k++) relax(i, k, Math.log2(/\d/.test(low[i]) ? 10 : 26) + 1 + Math.log2(k - i), { k: 'seq', t: ch.slice(i, k).join('') });
                }
            }
            // Tastaturreihen
            for (const row of KB_ROWS) {
                for (const rr of [row, Array.from(row).reverse().join('')]) {
                    const p = rr.indexOf(low[i]);
                    if (p < 0) continue;
                    let j = i + 1; while (j < L && rr[p + (j - i)] === low[j]) j++;
                    for (let k = i + 3; k <= j; k++) relax(i, k, 4 + Math.log2(k - i) + capBits(ch.slice(i, k).join('')), { k: 'kb', t: ch.slice(i, k).join('') });
                }
            }
            // Jahreszahlen und Daten
            const four = ch.slice(i, i + 4).join('');
            if (/^(19\d\d|20[0-3]\d)$/.test(four)) relax(i, i + 4, Math.log2(140), { k: 'year', t: four });
            const eight = ch.slice(i, i + 8).join(''), six = ch.slice(i, i + 6).join('');
            if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d\d$/.test(eight)) relax(i, i + 8, Math.log2(31 * 12 * 120), { k: 'date', t: eight });
            if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d\d$/.test(six)) relax(i, i + 6, Math.log2(31 * 12 * 100), { k: 'date', t: six });
        }
        // Weg zurückverfolgen
        const found = [];
        for (let j = L; j > 0;) { const f = from[j]; if (f.m) found.unshift(f.m); j = f.i; }
        const segs = found.length + 1;
        let bits = best[L] + Math.log2(segs);
        bits = Math.min(bits, L * per);
        return { bits, found, pool, L };
    }

    const chk = $('#chk');
    let klassikerT;
    function runCheck() {
        const pw = chk.value;
        const list = $('#chk-findings');
        clearTimeout(klassikerT);
        if (!pw) {
            showStrength(0, 'chk'); $('#chk-label').textContent = '–'; $('#chk-times').innerHTML = '';
            list.innerHTML = '<li class="ok" data-i="·">Tipp oben etwas ein.</li>';
            return;
        }
        const a = analyze(pw);
        showStrength(a.bits, 'chk');
        const f = [];
        const add = (cls, txt) => f.push('<li class="' + cls + '" data-i="' + (cls === 'ok' ? '✓' : cls === 'warn' ? '!' : '✗') + '">' + txt + '</li>');
        if (a.L < 8) add('bad', 'Nur ' + a.L + ' Zeichen – viel zu kurz. Nimm mindestens 12, besser 16.');
        else if (a.L < 12) add('warn', a.L + ' Zeichen – geht so. Ab 12–16 Zeichen wird es richtig gut.');
        else add('ok', a.L + ' Zeichen – schöne Länge.');
        const ch = Array.from(pw);
        const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(re => ch.some(c => re.test(c))).length;
        if (/^\d+$/.test(pw)) add('bad', 'Nur Ziffern – das ist eher eine PIN.');
        else add(classes >= 3 ? 'ok' : 'warn', classes + ' von 4 Zeichenarten (klein, gross, Ziffern, Sonderzeichen).');
        const seen = new Set();
        a.found.forEach(m => {
            const key = m.k + m.t; if (seen.has(key)) return; seen.add(key);
            const t = '„' + esc(m.t) + '“';
            if (m.k === 'common') add('bad', m.full ? 'Steht auf der Liste der häufigsten Passwörter – wird als Erstes ausprobiert.' : 'Enthält ein sehr häufiges Passwort: ' + t);
            else if (m.k === 'word') add('warn', 'Wörterbuch-Wort: ' + t + (m.w !== m.t.toLowerCase() ? ' (= „' + esc(m.w) + '“ – Leetspeak hilft kaum)' : ''));
            else if (m.k === 'repeat') add('warn', 'Wiederholung: ' + t);
            else if (m.k === 'block') add('warn', 'Wiederholtes Muster: ' + t);
            else if (m.k === 'seq') add('warn', 'Folge: ' + t);
            else if (m.k === 'kb') add('warn', 'Tastaturmuster: ' + t);
            else if (m.k === 'year') add('warn', 'Jahreszahl: ' + t + ' – Geburtsjahre sind beliebt.');
            else if (m.k === 'date') add('warn', 'Sieht nach einem Datum aus: ' + t);
        });
        if (/^\s|\s$/.test(pw)) add('warn', 'Leerzeichen am Anfang oder Ende – manche Seiten schneiden die stillschweigend ab.');
        if (a.bits >= 80 && !a.found.length) add('ok', 'Keine bekannten Muster gefunden. Sehr gut!');
        list.innerHTML = f.join('');
        // Kristall: einen echten Klassiker eingetippt
        const lowPw = pw.toLowerCase();
        if (COMMON_RANK.has(lowPw) && COMMON_RANK.get(lowPw) <= 60) {
            klassikerT = setTimeout(() => XIRU.egg('t-passwort-klassiker'), 600);
        }
    }
    chk.addEventListener('input', runCheck);
    $('#chk-show').addEventListener('click', e => {
        const show = chk.type === 'password';
        chk.type = show ? 'text' : 'password';
        e.currentTarget.textContent = show ? 'Verbergen' : 'Anzeigen';
        e.currentTarget.setAttribute('aria-pressed', show);
        chk.focus();
    });
    // Beim Verlassen der Seite das Prüffeld leeren (kein Wiederherstellen durch den Browser)
    addEventListener('pagehide', () => { chk.value = ''; });

    regenerate();
});
