/* Lichter aus – 5×5, Level aus zufälligen Schalterfolgen (dadurch garantiert lösbar),
   Mindestzüge per Gauss-Elimination über GF(2), Lösungshilfe zeigt die kürzeste Lösung.
   Wertung: XIRU.score('lichter', sterneGesamt). */
XIRU.ready(function () {
    const G = XIRU.Game;
    const $ = id => document.getElementById(id);
    const boardEl = $('board'), ovEl = $('ov');
    const N = 5, ALL = (1 << 25) - 1, LEVELS = 40;

    /* ── Mathematik ─────────────────────────────────────────────────────── */
    const PAT = [];   // welche Lampen ein Schalter umdreht
    for (let i = 0; i < 25; i++) {
        const x = i % N, y = (i / N) | 0;
        let m = 1 << i;
        if (x > 0) m |= 1 << (i - 1);
        if (x < N - 1) m |= 1 << (i + 1);
        if (y > 0) m |= 1 << (i - N);
        if (y < N - 1) m |= 1 << (i + N);
        PAT.push(m);
    }
    const bits = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
    // Kürzeste Schalterfolge, die `state` ausschaltet (oder null, wenn unlösbar)
    function solve(state) {
        const rows = PAT.map((p, i) => p | (((state >>> i) & 1) * (1 << 25)));
        const piv = [];
        let r = 0;
        for (let c = 0; c < 25 && r < 25; c++) {
            let p = -1;
            for (let k = r; k < 25; k++) if ((rows[k] >>> c) & 1) { p = k; break; }
            if (p < 0) continue;
            [rows[r], rows[p]] = [rows[p], rows[r]];
            for (let k = 0; k < 25; k++) if (k !== r && ((rows[k] >>> c) & 1)) rows[k] ^= rows[r];
            piv.push(c); r++;
        }
        for (let k = r; k < 25; k++) if ((rows[k] >>> 25) & 1) return null;
        const free = [];
        for (let c = 0; c < 25; c++) if (!piv.includes(c)) free.push(c);
        let best = null;
        for (let mask = 0; mask < (1 << free.length); mask++) {
            let x = 0;
            free.forEach((f, j) => { if ((mask >> j) & 1) x |= 1 << f; });
            for (let k = 0; k < piv.length; k++) {
                const rhs = (rows[k] >>> 25) & 1;
                if ((rhs ^ (bits(rows[k] & x & ALL & ~(1 << piv[k])) & 1)) & 1) x |= 1 << piv[k];
            }
            if (best === null || bits(x) < bits(best)) best = x;
        }
        return best;
    }
    function makeLevel(n, rng) {
        const k = Math.min(15, 2 + Math.floor((n - 1) * .36));
        for (;;) {
            let s = 0;
            const used = new Set();
            while (used.size < k) used.add(Math.floor(rng() * 25));
            used.forEach(i => { s ^= PAT[i]; });
            if (!s) continue;
            const sol = solve(s);
            if (bits(sol) >= Math.min(k, 2 + Math.floor((n - 1) * .3))) return s;
        }
    }

    /* ── Zustand ────────────────────────────────────────────────────────── */
    const data = Object.assign({ stars: {}, cur: null }, XIRU.load('lichter') || {});
    const persist = () => XIRU.save('lichter', data);
    let level = 1, start = 0, state = 0, moves = 0, minMoves = 0, hintUsed = false, showHint = false;
    let cursor = 12, showCursor = false, won = false, lastPress = -1, samePress = 0;
    const levelState = n => n === 'zufall' ? null : makeLevel(n, G.rng('lichter-' + n));
    const totalStars = () => Object.values(data.stars).reduce((s, v) => s + v, 0);
    const highest = () => Math.max(0, ...Object.keys(data.stars).map(Number));
    const unlocked = n => n <= highest() + 3;

    const btns = [];
    for (let i = 0; i < 25; i++) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'la-b'; b.dataset.i = i;
        b.setAttribute('aria-label', 'Schalter ' + (i % N + 1) + '/' + (((i / N) | 0) + 1));
        boardEl.appendChild(b); btns.push(b);
    }

    function loadLevel(n, resume) {
        level = n; won = false; showHint = false;
        if (n === 'zufall') {
            if (resume && data.cur && data.cur.start) start = data.cur.start;
            else { let s; do { s = 0; for (let i = 0; i < 25; i++) if (Math.random() < .5) s ^= PAT[i]; } while (!s); start = s; }
        } else start = levelState(n);
        state = start; moves = 0; hintUsed = false;
        if (resume && data.cur && data.cur.level === n && data.cur.start === start) {
            state = data.cur.state; moves = data.cur.moves; hintUsed = !!data.cur.hint;
        }
        minMoves = bits(solve(start));
        boardEl.classList.remove('is-won');
        ovEl.hidden = true;
        saveCur(); render(); renderLevels();
        boardEl.animate([{ opacity: .3, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
    }
    function saveCur() { data.cur = { level, start, state, moves, hint: hintUsed }; persist(); }

    function render(flipMask) {
        const tip = showHint ? solve(state) || 0 : 0;
        btns.forEach((b, i) => {
            const on = (state >>> i) & 1;
            b.classList.toggle('on', !!on);
            b.classList.toggle('tip', !!((tip >>> i) & 1));
            b.classList.toggle('cur', showCursor && i === cursor);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (flipMask && ((flipMask >>> i) & 1)) { b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); }
        });
        $('h-level').textContent = level === 'zufall' ? 'Zufall' : level + ' / ' + LEVELS;
        $('h-moves').textContent = moves;
        $('h-min').textContent = minMoves + ' Züge';
        $('h-on').textContent = bits(state);
        $('btn-hint').setAttribute('aria-pressed', showHint);
        const nextOk = level !== 'zufall' && level < LEVELS && unlocked(level + 1);
        $('btn-next').disabled = !nextOk;
        const b = XIRU.best('lichter');
        $('best').textContent = b == null ? '–' : b + ' ★';
        $('best-sub').textContent = 'Sterne gesamt (max. ' + LEVELS * 3 + ') · ' + Object.keys(data.stars).length + ' von ' + LEVELS + ' Level gelöst';
    }
    function renderLevels() {
        let h = '';
        for (let n = 1; n <= LEVELS; n++) {
            const st = data.stars[n] || 0, lock = !unlocked(n);
            h += '<button type="button" class="la-lv' + (st ? ' is-done' : '') + (lock ? ' is-locked' : '') + (level === n ? ' is-active' : '') + '" data-lv="' + n + '"' + (lock ? ' disabled aria-disabled="true"' : '') + ' aria-label="Level ' + n + (st ? ', ' + st + ' Sterne' : '') + '">' + n + '<small>' + '★'.repeat(st) + '</small></button>';
        }
        $('levels').innerHTML = h;
    }

    /* ── Spielzug ───────────────────────────────────────────────────────── */
    function press(i) {
        if (won || !ovEl.hidden) return;
        XIRU.audio();
        state ^= PAT[i];
        moves++;
        const on = (state >>> i) & 1;
        XIRU.beep(on ? 880 : 520, .05, 'triangle', .05);
        if (i === lastPress) samePress++; else { lastPress = i; samePress = 1; }
        render(PAT[i]);
        if (state === ALL) XIRU.egg('g-lichter-stromrechnung');
        if (state === 0) { win(); return; }
        saveCur();
    }

    function win() {
        won = true;
        const stars = hintUsed ? 1 : moves <= minMoves ? 3 : moves <= minMoves + 4 ? 2 : 1;
        boardEl.classList.add('is-won');
        btns.forEach((b, i) => b.style.setProperty('--d', ((i % N) + ((i / N) | 0)) * .05 + 's'));
        G.sfx.win(); XIRU.confetti();
        let text = moves + ' Züge (mindestens ' + minMoves + ')' + (hintUsed ? ' · mit Lösungshilfe' : '');
        if (level !== 'zufall') {
            const before = data.stars[level] || 0;
            if (stars > before) data.stars[level] = stars;
            const perfect = Object.values(data.stars).filter(v => v === 3).length;
            if (perfect >= 10) XIRU.egg('g-lichter-perfekt');
            if (Object.keys(data.stars).length >= LEVELS) XIRU.egg('g-lichter-alle');
            if (stars > before) { const r = XIRU.score('lichter', totalStars()); if (r.isNew) text += ' · neuer Rekord: ' + totalStars() + ' ★'; }
        }
        data.cur = null; persist();
        render(); renderLevels();
        const hasNext = level !== 'zufall' && level < LEVELS;
        setTimeout(() => {
            G.overlay(ovEl).show({
                icon: '<span class="la-stars">' + '★'.repeat(stars) + '<span style="opacity:.25">' + '★'.repeat(3 - stars) + '</span></span>',
                title: level === 'zufall' ? 'Alles dunkel!' : 'Level ' + level + ' geschafft!',
                text, button: hasNext ? 'Nächstes Level' : (level === 'zufall' ? 'Neues Zufallsfeld' : 'Nochmal'),
                onClick: () => hasNext ? loadLevel(level + 1) : loadLevel(level)
            });
        }, 800);
    }

    /* ── Eingaben ───────────────────────────────────────────────────────── */
    boardEl.addEventListener('click', e => {
        const b = e.target.closest('.la-b'); if (!b) return;
        if (e.detail !== 0 && showCursor) { showCursor = false; }
        press(+b.dataset.i);
    });
    $('btn-restart').addEventListener('click', () => loadLevel(level));
    $('btn-hint').addEventListener('click', toggleHint);
    $('btn-next').addEventListener('click', () => { if (level !== 'zufall' && level < LEVELS && unlocked(level + 1)) loadLevel(level + 1); });
    $('btn-random').addEventListener('click', () => loadLevel('zufall'));
    $('levels').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (b && !b.disabled) loadLevel(+b.dataset.lv); });
    function toggleHint() {
        if (won) return;
        showHint = !showHint;
        if (showHint && !hintUsed) { hintUsed = true; saveCur(); XIRU.toast('Lösungshilfe', 'Drück die markierten Schalter – in beliebiger Reihenfolge. Dieses Level gibt jetzt nur noch ★.', { icon: '💡' }); }
        render();
    }

    G.keys.onPress((key, e) => {
        if (document.querySelector('.modal-backdrop')) return;
        const k = String(key).toLowerCase();
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (mv) {
            if (e) e.preventDefault();
            if (showCursor) cursor = ((((cursor / N) | 0) + mv[1] + N) % N) * N + ((cursor % N) + mv[0] + N) % N;
            showCursor = true; render(); return;
        }
        if ((k === ' ' || k === 'enter') && ovEl.hidden) {
            if (e) e.preventDefault();
            const f = document.activeElement;
            if (!showCursor && f && f.classList && f.classList.contains('la-b')) cursor = +f.dataset.i;
            showCursor = true; press(cursor);
        } else if (k === 'r') loadLevel(level);
        else if (k === 'h') toggleHint();
    });

    /* ── Start ──────────────────────────────────────────────────────────── */
    if (data.cur && (data.cur.level === 'zufall' || (data.cur.level >= 1 && data.cur.level <= LEVELS))) loadLevel(data.cur.level, true);
    else loadLevel(Math.min(LEVELS, highest() + 1));
});
