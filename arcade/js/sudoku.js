/* Sudoku – Generator mit eindeutiger Lösung (Backtracking mit Bitmasken), drei Stufen,
   Notizen, Konflikt-Hervorhebung, Zahlenblock, Tastatur und Hinweise.
   Wertung: Punkte = Grundwert der Stufe − Sekunden − 120 je Hinweis (mind. 10 % des Grundwerts). */
XIRU.typedEggs = false;   // hier wird viel getippt – Wort-Disketten aus
XIRU.ready(function () {
    const G = XIRU.Game;
    const $ = id => document.getElementById(id);
    const boardEl = $('board'), stage = $('stage'), ovEl = $('ov');

    /* ── Generator ──────────────────────────────────────────────────────── */
    const R = [], C = [], B = [];
    for (let i = 0; i < 81; i++) { R[i] = (i / 9) | 0; C[i] = i % 9; B[i] = ((R[i] / 3) | 0) * 3 + ((C[i] / 3) | 0); }
    const UNITS = [];
    for (let k = 0; k < 9; k++) {
        UNITS.push(Array.from({ length: 9 }, (_, j) => k * 9 + j));
        UNITS.push(Array.from({ length: 9 }, (_, j) => j * 9 + k));
        const br = ((k / 3) | 0) * 3, bc = (k % 3) * 3;
        UNITS.push(Array.from({ length: 9 }, (_, j) => (br + ((j / 3) | 0)) * 9 + bc + j % 3));
    }
    const PEERS = Array.from({ length: 81 }, (_, i) => {
        const s = new Set();
        for (let j = 0; j < 81; j++) if (j !== i && (R[j] === R[i] || C[j] === C[i] || B[j] === B[i])) s.add(j);
        return [...s];
    });
    const pop = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

    // Zählt Lösungen (bis limit); mit rng: zufällige Reihenfolge, liefert erste Lösung
    function search(grid, limit, rng) {
        const g = grid.slice();
        const rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
        for (let i = 0; i < 81; i++) if (g[i]) {
            const b = 1 << g[i];
            if ((rows[R[i]] | cols[C[i]] | boxes[B[i]]) & b) return { count: 0, first: null };
            rows[R[i]] |= b; cols[C[i]] |= b; boxes[B[i]] |= b;
        }
        let count = 0, first = null;
        (function rec() {
            let best = -1, bestMask = 0, bestN = 10;
            for (let i = 0; i < 81; i++) if (!g[i]) {
                const m = ~(rows[R[i]] | cols[C[i]] | boxes[B[i]]) & 0x3FE;
                const n = pop(m);
                if (n < bestN) { best = i; bestMask = m; bestN = n; if (n <= 1) break; }
            }
            if (best === -1) { count++; if (!first) first = g.slice(); return; }
            if (bestN === 0) return;
            const ds = [];
            for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) ds.push(d);
            if (rng) for (let k = ds.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [ds[k], ds[j]] = [ds[j], ds[k]]; }
            for (const d of ds) {
                const b = 1 << d;
                g[best] = d; rows[R[best]] |= b; cols[C[best]] |= b; boxes[B[best]] |= b;
                rec();
                g[best] = 0; rows[R[best]] &= ~b; cols[C[best]] &= ~b; boxes[B[best]] &= ~b;
                if (count >= limit) return;
            }
        })();
        return { count, first };
    }
    function usedMask(g, i) {
        let m = 0;
        for (const p of PEERS[i]) m |= 1 << g[p];
        return m & 0x3FE;
    }
    // Lösbar nur mit „Einzelnen" (Naked & Hidden Singles)?
    function singlesOnly(grid) {
        const g = grid.slice();
        let progress = true;
        while (progress) {
            progress = false;
            for (let i = 0; i < 81; i++) if (!g[i]) {
                const m = ~usedMask(g, i) & 0x3FE;
                if (!m) return false;
                if (pop(m) === 1) { g[i] = Math.log2(m); progress = true; }
            }
            for (const u of UNITS) for (let d = 1; d <= 9; d++) {
                if (u.some(i => g[i] === d)) continue;
                const pos = u.filter(i => !g[i] && !(usedMask(g, i) & (1 << d)));
                if (pos.length === 1) { g[pos[0]] = d; progress = true; }
            }
        }
        return g.every(v => v);
    }
    function generate(seed, diff) {
        const rng = G.rng(seed);
        const target = { leicht: 38, mittel: 31, schwer: 24 }[diff];
        let fallback = null;
        for (let attempt = 0; attempt < 40; attempt++) {
            const sol = search(Array(81).fill(0), 1, rng).first;
            const puz = sol.slice();
            const order = Array.from({ length: 41 }, (_, k) => k);
            for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
            let givens = 81;
            for (const i of order) {            // symmetrisch paarweise entfernen
                if (givens <= target) break;
                const j = 80 - i, a = puz[i], b = puz[j];
                puz[i] = 0; puz[j] = 0;
                if (search(puz, 2).count !== 1) { puz[i] = a; puz[j] = b; }
                else givens -= i === j ? 1 : 2;
            }
            const easy = singlesOnly(puz);
            const res = { puz, sol };
            if (diff === 'leicht' && !easy) continue;
            if (diff === 'mittel' && (givens > 33 || !easy)) { fallback = fallback || res; continue; }
            if (diff === 'schwer' && (easy || givens > 27)) { fallback = fallback || res; continue; }
            return res;
        }
        return fallback;
    }

    /* ── Zustand ────────────────────────────────────────────────────────── */
    const DIFFS = {
        leicht: { name: 'Leicht', base: 1000, desc: 'Rund 38 Vorgaben – mit einfachen Schlüssen lösbar.' },
        mittel: { name: 'Mittel', base: 2000, desc: 'Rund 30 Vorgaben – hier wird es kniffliger.' },
        schwer: { name: 'Schwer', base: 3500, desc: 'Rund 25 Vorgaben – einfache Schlüsse reichen nicht mehr. Notizen helfen!' }
    };
    const stats = Object.assign({}, XIRU.load('sudoku-stats') || {});
    let game = null, chosen = 'leicht';
    let sel = -1, notesMode = false, undoStack = [], justPlaced = -1, placedTimer = 0;
    let tStart = 0, timerId = 0, running = false;

    function newPuzzle(diff) {
        const seed = XIRU.rand(10000, 999999);
        const p = generate(seed, diff);
        game = {
            diff, seed, puz: p.puz.join(''), sol: p.sol.join(''),
            vals: p.puz.slice(), notes: Array(81).fill(0), hinted: [], hints: 0, time: 0, done: false
        };
        chosen = diff;
        sel = -1; undoStack = []; ovEl.hidden = true;
        stage.classList.remove('is-paused');
        boardEl.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
        startTimer(); persist(); render();
    }
    const isGiven = i => game.puz[i] !== '0';
    const solAt = i => +game.sol[i];
    function persist() { if (game) XIRU.save('sudoku', game); }

    /* ── Zeit ───────────────────────────────────────────────────────────── */
    const fmtTime = s => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
    function startTimer() {
        if (game.done) return;
        tStart = performance.now() - game.time * 1000; running = true;
        clearInterval(timerId);
        let n = 0;
        timerId = setInterval(() => { game.time = (performance.now() - tStart) / 1000; $('h-time').textContent = fmtTime(game.time); if (++n % 10 === 0) persist(); }, 500);
    }
    function stopTimer() { if (running) game.time = (performance.now() - tStart) / 1000; running = false; clearInterval(timerId); }

    /* ── Darstellung ────────────────────────────────────────────────────── */
    const cellEls = [];
    for (let i = 0; i < 81; i++) {
        const d = document.createElement('div');
        d.dataset.i = i; d.setAttribute('role', 'gridcell');
        d.innerHTML = '<span class="sd-v"></span><div class="sd-notes">' + '<span></span>'.repeat(9) + '</div>';
        boardEl.appendChild(d); cellEls.push(d);
    }
    const digitsEl = $('digits');
    for (let d = 1; d <= 9; d++) digitsEl.insertAdjacentHTML('beforeend', '<button type="button" data-d="' + d + '" aria-label="Zahl ' + d + '">' + d + '<small></small></button>');

    function conflicts() {
        const bad = new Set();
        for (const u of UNITS) {
            const seen = {};
            for (const i of u) { const v = game.vals[i]; if (v) (seen[v] = seen[v] || []).push(i); }
            for (const v in seen) if (seen[v].length > 1) seen[v].forEach(i => bad.add(i));
        }
        return bad;
    }

    function render() {
        const bad = conflicts();
        const sv = sel >= 0 ? game.vals[sel] : 0;
        const hinted = new Set(game.hinted);
        for (let i = 0; i < 81; i++) {
            const el = cellEls[i], v = game.vals[i];
            let cls = 'sd-c';
            if (C[i] === 2 || C[i] === 5) cls += ' bx';
            if (R[i] === 2 || R[i] === 5) cls += ' by';
            if (isGiven(i)) cls += ' is-given';
            else if (hinted.has(i)) cls += ' is-hint';
            if (sel >= 0) {
                if (i === sel) cls += ' is-sel';
                else if (sv && v === sv) cls += ' is-same';
                else if (R[i] === R[sel] || C[i] === C[sel] || B[i] === B[sel]) cls += ' is-peer';
            }
            if (bad.has(i)) cls += ' is-bad';
            if (i === justPlaced) cls += ' is-placed';
            el.className = cls;
            el.firstChild.textContent = v || '';
            const notes = el.lastChild;
            notes.hidden = !!v || !game.notes[i];
            if (!notes.hidden) {
                for (let d = 1; d <= 9; d++) {
                    const s = notes.children[d - 1];
                    const on = game.notes[i] & (1 << d);
                    s.textContent = on ? d : '';
                    s.className = on && d === sv ? 'is-match' : '';
                }
            }
            el.setAttribute('aria-label', 'Zeile ' + (R[i] + 1) + ', Spalte ' + (C[i] + 1) + ': ' + (v || 'leer'));
        }
        const counts = Array(10).fill(0);
        game.vals.forEach(v => counts[v]++);
        digitsEl.querySelectorAll('button').forEach(b => {
            const d = +b.dataset.d;
            b.classList.toggle('is-done', counts[d] >= 9);
            b.classList.toggle('is-active', sv === d);
            b.lastChild.textContent = Math.max(0, 9 - counts[d]);
        });
        $('pad').classList.toggle('is-notes', notesMode);
        $('btn-notes').setAttribute('aria-pressed', notesMode);
        $('btn-undo').disabled = !undoStack.length || game.done;
        $('h-diff').textContent = DIFFS[game.diff].name;
        $('h-hints').textContent = game.hints;
        $('h-seed').textContent = 'Nr. ' + game.seed;
        $('h-time').textContent = fmtTime(game.time);
        $('diffs').querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.diff === chosen));
        $('diff-desc').textContent = DIFFS[chosen].desc;
        const b = XIRU.best('sudoku');
        $('best').textContent = b == null ? '–' : XIRU.fmt(b) + ' Punkte';
        $('records').innerHTML = Object.keys(DIFFS).map(k => {
            const s = stats[k];
            return '<li><span>' + DIFFS[k].name + '</span><b>' + (s && s.solved ? s.solved + '× gelöst' + (s.bestTime != null ? ' · ' + fmtTime(s.bestTime) : '') : '–') + '</b></li>';
        }).join('');
        if (bad.size >= 10) XIRU.egg('g-sudoku-chaos');
    }

    /* ── Eingaben ───────────────────────────────────────────────────────── */
    function editable() { return game && !game.done && sel >= 0 && !isGiven(sel) && ovEl.hidden; }
    function snapshotCells(idx) { return idx.map(i => ({ i, v: game.vals[i], n: game.notes[i], h: game.hinted.includes(i) })); }
    function pushUndo(idx) { undoStack.push(snapshotCells(idx)); if (undoStack.length > 300) undoStack.shift(); }
    function flashPlaced(i) {
        justPlaced = i; clearTimeout(placedTimer);
        placedTimer = setTimeout(() => { justPlaced = -1; cellEls[i].classList.remove('is-placed'); }, 260);
    }

    function setValue(i, d, viaHint) {
        const affected = [i].concat(PEERS[i].filter(p => !game.vals[p] && (game.notes[p] & (1 << d))));
        pushUndo(affected);
        game.vals[i] = d; game.notes[i] = 0;
        affected.slice(1).forEach(p => { game.notes[p] &= ~(1 << d); });
        if (viaHint) { if (!game.hinted.includes(i)) game.hinted.push(i); }
        else game.hinted = game.hinted.filter(x => x !== i);
        flashPlaced(i);
    }

    function input(d, asNote) {
        if (!editable()) { if (sel < 0 && game && !game.done) pulseBoard(); return; }
        XIRU.audio();
        if (notesMode || asNote) {
            if (game.vals[sel]) return;
            pushUndo([sel]);
            game.notes[sel] ^= 1 << d;
            XIRU.beep(1200, .02, 'square', .02);
        } else if (game.vals[sel] === d) {
            pushUndo([sel]);
            game.vals[sel] = 0;
            G.sfx.click();
        } else {
            setValue(sel, d, false);
            const bad = conflicts().has(sel);
            bad ? XIRU.beep(180, .09, 'sawtooth', .04) : XIRU.beep(520 + d * 40, .05, 'triangle', .05);
        }
        afterChange();
    }
    function erase() {
        if (!editable() || (!game.vals[sel] && !game.notes[sel])) return;
        pushUndo([sel]);
        game.vals[sel] = 0; game.notes[sel] = 0;
        game.hinted = game.hinted.filter(x => x !== sel);
        G.sfx.click(); afterChange();
    }
    function undo() {
        if (!game || game.done || !undoStack.length) return;
        const snap = undoStack.pop();
        snap.forEach(s => {
            game.vals[s.i] = s.v; game.notes[s.i] = s.n;
            game.hinted = game.hinted.filter(x => x !== s.i);
            if (s.h) game.hinted.push(s.i);
        });
        sel = snap[0].i;
        G.sfx.jump(); persist(); render();
    }
    function hint() {
        if (!game || game.done || !ovEl.hidden) return;
        let target = -1;
        if (sel >= 0 && !isGiven(sel) && game.vals[sel] !== solAt(sel)) target = sel;
        if (target < 0) {
            const wrong = [];
            for (let i = 0; i < 81; i++) if (game.vals[i] && game.vals[i] !== solAt(i)) wrong.push(i);
            if (wrong.length) target = wrong[0];
        }
        if (target < 0) {   // leeres Feld mit den wenigsten Kandidaten
            let bestN = 10;
            for (let i = 0; i < 81; i++) if (!game.vals[i]) {
                const n = pop(~usedMask(game.vals, i) & 0x3FE);
                if (n < bestN) { bestN = n; target = i; }
            }
        }
        if (target < 0) return;
        sel = target;
        game.hints++;
        setValue(target, solAt(target), true);
        G.sfx.power();
        afterChange();
    }
    function afterChange() {
        persist(); render();
        if (game.vals.every((v, i) => v === solAt(i))) win();
    }
    function pulseBoard() { boardEl.animate([{ boxShadow: '0 0 0 0 var(--rc)' }, { boxShadow: '0 0 0 4px var(--rc)' }, { boxShadow: '0 0 0 0 var(--rc)' }], { duration: 450 }); }

    function select(i) { sel = i; render(); }
    function moveSel(dx, dy) {
        if (sel < 0) { sel = 40; render(); return; }
        const r = (R[sel] + dy + 9) % 9, c = (C[sel] + dx + 9) % 9;
        select(r * 9 + c);
    }

    boardEl.addEventListener('pointerdown', e => {
        const el = e.target.closest('.sd-c'); if (!el || !ovEl.hidden) return;
        select(+el.dataset.i);
    });
    digitsEl.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) input(+b.dataset.d, false); });
    $('btn-notes').addEventListener('click', () => { notesMode = !notesMode; render(); });
    $('btn-erase').addEventListener('click', erase);
    $('btn-undo').addEventListener('click', undo);
    $('btn-hint').addEventListener('click', hint);

    G.keys.onPress((key, e) => {
        if (document.querySelector('.modal-backdrop') || !game) return;
        const k = String(key).toLowerCase();
        const code = e && e.code || '';
        const dm = /^(?:Digit|Numpad)([0-9])$/.exec(code);
        const digit = dm ? +dm[1] : (/^[0-9]$/.test(k) ? +k : -1);
        if (e && (e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        if (digit > 0) { input(digit, !!(e && e.shiftKey)); return; }
        if (digit === 0 || k === 'backspace' || k === 'delete') { if (e) e.preventDefault(); erase(); return; }
        const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (mv) { if (e) e.preventDefault(); if (ovEl.hidden) moveSel(mv[0], mv[1]); return; }
        if (k === 'n') { notesMode = !notesMode; render(); }
        else if (k === 'h') hint();
        else if (k === 'z') undo();
        else if (k === 'escape') select(-1);
    });

    /* ── Gewonnen ───────────────────────────────────────────────────────── */
    function win() {
        stopTimer();
        game.done = true; sel = -1;
        const t = Math.round(game.time);
        const D = DIFFS[game.diff];
        const points = Math.max(Math.round(D.base * .1), Math.round(D.base - t - game.hints * 120));
        const st = stats[game.diff] || (stats[game.diff] = { solved: 0, bestTime: null });
        st.solved++;
        if (!game.hints && (st.bestTime == null || t < st.bestTime)) st.bestTime = t;   // Bestzeit nur ohne Hinweise
        XIRU.save('sudoku-stats', stats);
        const r = XIRU.score('sudoku', points);
        if (game.diff === 'schwer' && !game.hints) XIRU.egg('g-sudoku-schwer');
        if (game.diff === 'leicht' && !game.hints && t < 300) XIRU.egg('g-sudoku-blitz');
        persist(); render();
        cellEls.forEach((el, i) => { el.style.setProperty('--d', ((R[i] + C[i]) * 0.04) + 's'); el.classList.add('is-wave'); });
        G.sfx.win(); XIRU.confetti();
        setTimeout(() => {
            cellEls.forEach(el => el.classList.remove('is-wave'));
            G.overlay(ovEl).show({
                icon: '🧩', title: 'Gelöst!',
                text: D.name + ' in ' + fmtTime(t) + (game.hints ? ' mit ' + game.hints + ' Hinweis' + (game.hints > 1 ? 'en' : '') : ' ohne Hinweise') +
                    ' · ' + XIRU.fmt(points) + ' Punkte' + (r.isNew ? ' – neuer Rekord!' : ''),
                button: 'Nächstes Rätsel', onClick: () => newPuzzle(chosen)
            });
        }, 1400);
    }

    /* ── Neues Rätsel / Stufe ───────────────────────────────────────────── */
    function hasProgress() { return game && !game.done && game.vals.some((v, i) => v && !isGiven(i)); }
    function askNew(diff) {
        if (!hasProgress()) { newPuzzle(diff); return; }
        const m = XIRU.modal('<h2>Neues Rätsel?</h2><p>Dein aktuelles Sudoku geht dabei verloren.</p>' +
            '<div class="row mt-2"><button class="btn btn--primary" type="button" data-ok>Ja, neues Rätsel</button><button class="btn" type="button" data-close>Weiterknobeln</button></div>');
        m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); newPuzzle(diff); });
    }
    $('diffs').addEventListener('click', e => {
        const b = e.target.closest('[data-diff]'); if (!b) return;
        chosen = b.dataset.diff; XIRU.save('sudoku-pref', chosen);
        askNew(chosen);
    });
    $('btn-new').addEventListener('click', () => askNew(chosen));

    /* ── Pause ──────────────────────────────────────────────────────────── */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && running && game && !game.done) {
            stopTimer(); persist();
            stage.classList.add('is-paused');
            G.overlay(ovEl).show({ icon: '⏸', title: 'Pause', text: 'Die Uhr steht still. Die Zahlen warten auf dich.', button: 'Weiter', onClick: () => { ovEl.hidden = true; stage.classList.remove('is-paused'); startTimer(); } });
        }
    });
    addEventListener('pagehide', () => { if (running) { stopTimer(); persist(); } });

    /* ── Start ──────────────────────────────────────────────────────────── */
    const pref = XIRU.load('sudoku-pref');
    if (DIFFS[pref]) chosen = pref;
    const saved = XIRU.load('sudoku');
    if (saved && saved.puz && saved.puz.length === 81 && !saved.done && Array.isArray(saved.vals)) {
        game = Object.assign({ notes: Array(81).fill(0), hinted: [], hints: 0, time: 0 }, saved);
        chosen = game.diff;
        render();
        stage.classList.add('is-paused');
        G.overlay(ovEl).show({ icon: '🧩', title: 'Weiterknobeln?', text: DIFFS[game.diff].name + ' · ' + fmtTime(game.time) + ' bisher. Dein Rätsel wartet noch auf dich.', button: 'Weiter', onClick: () => { ovEl.hidden = true; stage.classList.remove('is-paused'); startTimer(); render(); } });
    } else {
        newPuzzle(chosen);
    }
});
