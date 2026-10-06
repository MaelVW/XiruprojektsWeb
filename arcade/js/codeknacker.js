/* Codeknacker – Mastermind mit 4 aus 6 (Normal) oder 5 aus 8 mit Doppelten (Profi) */
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$, $$ = XIRU.$$;
    const TRIES = 10;
    const NAMES = ['Rot', 'Orange', 'Gelb', 'Grün', 'Türkis', 'Blau', 'Violett', 'Pink'];
    const MODES = {
        normal: { P: 4, N: 6, dup: false, mult: 10, desc: '4 Stellen aus 6 Farben. Im Code kommt jede Farbe höchstens einmal vor.' },
        profi: { P: 5, N: 8, dup: true, mult: 25, desc: '5 Stellen aus 8 Farben – und Farben dürfen sich wiederholen. Viel Spass!' }
    };
    const ck = $('#ck'), rowsEl = $('#rows'), secretEl = $('#secret'), paletteEl = $('#palette');
    const ov = G.overlay('#ov');

    let mode = 'normal', M = MODES.normal;
    let secret, guesses, cur, cursor, over, overAt = 0, justSubmitted = -1, justPlaced = -1;
    let wins = 0, games = 0;

    function newGame() {
        M = MODES[mode];
        if (M.dup) secret = Array.from({ length: M.P }, () => XIRU.rand(1, M.N));
        else {
            const pool = Array.from({ length: M.N }, (_, i) => i + 1);
            for (let i = pool.length - 1; i > 0; i--) { const j = XIRU.rand(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
            secret = pool.slice(0, M.P);
        }
        guesses = []; cur = Array(M.P).fill(0); cursor = 0; over = false; justSubmitted = -1; justPlaced = -1;
        ck.classList.toggle('is-profi', mode === 'profi');
        ck.classList.toggle('is-normal', mode !== 'profi');
        ov.hide();
        buildPalette();
        render(false);
    }

    function feedback(g, s) {
        let black = 0;
        const cg = {}, cs = {};
        for (let i = 0; i < g.length; i++) {
            if (g[i] === s[i]) black++;
            else { cg[g[i]] = (cg[g[i]] || 0) + 1; cs[s[i]] = (cs[s[i]] || 0) + 1; }
        }
        let white = 0;
        Object.keys(cg).forEach(k => { white += Math.min(cg[k], cs[k] || 0); });
        return { black, white };
    }

    const peg = (k, extra, attrs) => '<span class="ck-peg' + (extra ? ' ' + extra : '') + '"' + (k ? ' data-k="' + k + '"' : '') + (attrs || '') + '>' + (k || '') + '</span>';

    function buildPalette() {
        let h = '';
        for (let k = 1; k <= M.N; k++) h += '<button type="button" class="ck-peg" data-k="' + k + '" aria-label="' + NAMES[k - 1] + ' (' + k + ')">' + k + '</button>';
        paletteEl.innerHTML = h;
    }

    function render(reveal) {
        // Geheimcode
        secretEl.innerHTML = '<span class="ck-secret__lock" aria-hidden="true">' + (reveal ? '🔓' : '🔒') + '</span>' +
            secret.map((k, i) => reveal ? peg(k, 'is-reveal', ' style="--d:' + (i * .12) + 's"') : peg(0, 'is-hidden').replace('></span>', '>?</span>')).join('');
        // Reihen
        let h = '';
        for (let r = 0; r < TRIES; r++) {
            const g = guesses[r];
            const isCur = !over && r === guesses.length;
            const cls = 'ck-row' + (isCur ? ' is-current' : '') + (!g && !isCur ? ' is-future' : '');
            h += '<li class="' + cls + '" data-r="' + r + '"><span class="ck-row__n">' + (r + 1) + '</span><span class="ck-row__pegs">';
            for (let i = 0; i < M.P; i++) {
                if (g) h += peg(g.code[i]);
                else if (isCur) h += '<button type="button" class="ck-peg' + (i === cursor ? ' is-cursor' : '') + (i === justPlaced ? ' is-pop' : '') + '"' + (cur[i] ? ' data-k="' + cur[i] + '"' : '') + ' data-slot="' + i + '" aria-label="Loch ' + (i + 1) + (cur[i] ? ': ' + NAMES[cur[i] - 1] : ', leer') + '">' + (cur[i] || '') + '</button>';
                else h += peg(0);
            }
            h += '</span><span class="ck-fb" aria-label="' + (g ? g.fb.black + ' richtig platziert, ' + g.fb.white + ' richtige Farbe' : 'noch keine Rückmeldung') + '">';
            for (let i = 0; i < M.P; i++) {
                let c = '';
                if (g) c = i < g.fb.black ? 'is-black' : i < g.fb.black + g.fb.white ? 'is-white' : '';
                const isNew = r === justSubmitted && c;
                h += '<i class="' + c + (isNew ? ' is-new' : '') + '"' + (isNew ? ' style="--d:' + (i * .09) + 's"' : '') + '></i>';
            }
            h += '</span></li>';
        }
        rowsEl.innerHTML = h;
        justPlaced = -1;
        updateHud();
    }

    function updateHud() {
        G.hud('#hud', { Versuch: Math.min(guesses.length + (over ? 0 : 1), TRIES) + '/' + TRIES, Modus: mode === 'profi' ? 'Profi' : 'Normal', Geknackt: wins + '/' + games });
        const b = XIRU.best('codeknacker');
        $('#best').textContent = b == null ? '–' : XIRU.fmt(b);
    }

    /* ── Eingabe-Logik ── */
    function nextEmpty(from) {
        for (let k = 0; k < M.P; k++) { const i = (from + k) % M.P; if (!cur[i]) return i; }
        return -1;
    }
    function add(k) {
        if (over || k < 1 || k > M.N) return;
        const at = cursor >= 0 && cursor < M.P ? cursor : nextEmpty(0);
        if (at < 0) { G.sfx.hit(); return; }
        cur[at] = k; justPlaced = at;
        const ne = nextEmpty(at + 1);
        cursor = ne < 0 ? M.P : ne;
        XIRU.beep(330 + k * 55, .05, 'triangle', .05);
        render(false);
    }
    function removeLast() {
        if (over) return;
        for (let i = M.P - 1; i >= 0; i--) if (cur[i]) { cur[i] = 0; cursor = i; G.sfx.click(); render(false); return; }
    }
    function clickSlot(i) {
        if (over) return;
        if (cur[i]) { cur[i] = 0; G.sfx.click(); }
        cursor = i;
        render(false);
    }
    function moveCursor(d) {
        if (over) return;
        cursor = ((cursor >= M.P ? (d > 0 ? -1 : M.P) : cursor) + d + M.P) % M.P;
        render(false);
    }

    function submit() {
        if (over) return;
        if (cur.some(k => !k)) {
            const row = rowsEl.querySelector('.ck-row.is-current');
            if (row) { row.classList.remove('is-shake'); void row.offsetWidth; row.classList.add('is-shake'); }
            G.sfx.hit();
            return;
        }
        const code = cur.slice();
        const fb = feedback(code, secret);
        guesses.push({ code, fb });
        justSubmitted = guesses.length - 1;
        if (code.every((k, i) => k === i + 1)) XIRU.egg('g-codeknacker-1234');
        cur = Array(M.P).fill(0); cursor = 0;
        if (fb.black === M.P) return finish(true);
        if (guesses.length >= TRIES) return finish(false);
        fb.black || fb.white ? XIRU.beep(520 + fb.black * 80, .08, 'square', .04) : XIRU.beep(200, .1, 'sawtooth', .04);
        render(false);
    }

    function finish(won) {
        over = true; overAt = performance.now(); games++;
        const n = guesses.length;
        const pts = won ? (TRIES + 1 - n) * M.mult : 0;
        render(true);
        const r = XIRU.score('codeknacker', pts);
        if (won) {
            wins++;
            XIRU.confetti(); G.sfx.win();
            if (mode === 'profi') XIRU.egg('g-codeknacker-profi');
            else if (n <= 4) XIRU.egg('g-codeknacker-vier');
        } else G.sfx.die();
        updateHud();
        const secretTxt = secret.map(k => k + ' ' + NAMES[k - 1]).join(' · ');
        setTimeout(() => ov.show({
            icon: won ? (n <= 3 ? '🧠' : '🔓') : '🔒',
            title: won ? 'Geknackt!' : 'Tresor bleibt zu',
            text: won
                ? 'In ' + n + (n === 1 ? ' Versuch' : ' Versuchen') + ' – ' + pts + ' Punkte' + (r.isNew ? '. Neuer Rekord!' : '.')
                : 'Der Code war: ' + secretTxt + '.',
            button: 'Neuer Code', onClick: newGame, hint: 'Enter startet ein neues Spiel.'
        }), won ? 900 : 1100);
    }

    /* ── Ereignisse ── */
    paletteEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { XIRU.audio(); add(+b.dataset.k); } });
    rowsEl.addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (b) clickSlot(+b.dataset.slot); });
    $('#btn-del').addEventListener('click', removeLast);
    $('#btn-check').addEventListener('click', submit);
    $('#btn-new').addEventListener('click', newGame);

    G.keys.onPress((k, e) => {
        const t = e && e.target;
        const onButton = t && t.closest && t.closest('button, a, input, select, textarea');
        if (over) { if ((k === 'Enter' || k === ' ') && !onButton && performance.now() - overAt > 1200) { if (e) e.preventDefault(); newGame(); } return; }
        if (/^[1-8]$/.test(k)) { add(+k); return; }
        if (k === 'Backspace' || k === 'Delete') { if (e) e.preventDefault(); removeLast(); return; }
        if (k === 'ArrowLeft') { moveCursor(-1); return; }
        if (k === 'ArrowRight') { moveCursor(1); return; }
        if (k === 'Enter' && !onButton) { if (e) e.preventDefault(); submit(); }
    });

    $('#modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]'); if (!b) return;
        mode = b.dataset.mode;
        $$('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        $('#mode-desc').textContent = MODES[mode].desc;
        newGame();
    });

    $('#mode-desc').textContent = MODES[mode].desc;
    newGame();
});
