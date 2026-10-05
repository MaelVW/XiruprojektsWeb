/* Vier gewinnt – 7×6, fallende Steine, KI mit Alpha-Beta-Suche */
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$, $$ = XIRU.$$;
    const COLS = 7, ROWS = 6;
    const board = $('#board'), discsEl = $('#discs'), colsEl = $('#cols'), ghost = $('#ghost');
    const turnEl = $('#turn'), btnNew = $('#btn-new');
    const ORDER = [3, 2, 4, 1, 5, 0, 6];
    const DEPTH = { leicht: 2, mittel: 4, schwer: 7 };
    const LEVEL_PTS = { leicht: 1, mittel: 2, schwer: 3 };
    const DESC = {
        leicht: 'Die KI schaut zwei Züge voraus und wirft gern mal daneben.',
        mittel: 'Die KI rechnet vier Züge voraus – sie stellt dir schon kleine Fallen.',
        schwer: 'Die KI rechnet sieben Züge voraus. Viel Glück!',
        '2p': 'Zu zweit an einem Gerät. Wer beginnt, wechselt jede Partie.'
    };
    const NAME = { 1: 'Pink', 2: 'Gelb' };

    // Brett: cell[c * ROWS + h], h = 0 ist unten. 0 leer, 1 Mensch/Pink, 2 KI/Gelb
    let cell, height, count, turn, over, starter = 1, opp = 'mittel';
    let cursor = 3, locked = false, aiTimer = 0, lastIdx = -1;
    const tally = { win: 0, draw: 0, loss: 0, 1: 0, 2: 0 };
    let streak = +XIRU.load('vier-gewinnt-serie', 0) || 0;

    /* Alle 69 Viererfenster (für die Bewertung) */
    const WINDOWS = [];
    for (let c = 0; c < COLS; c++) for (let h = 0; h < ROWS; h++)
        for (const [dc, dh] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const ec = c + dc * 3, eh = h + dh * 3;
            if (ec < 0 || ec >= COLS || eh < 0 || eh >= ROWS) continue;
            WINDOWS.push([0, 1, 2, 3].map(k => (c + dc * k) * ROWS + (h + dh * k)));
        }

    /* Längste Reihe von p durch (c, h) – liefert die Zellen pro Richtung */
    function runsAt(c, h, p) {
        const res = [];
        for (const [dc, dh] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
            const cells = [c * ROWS + h];
            for (const s of [1, -1]) {
                let x = c + dc * s, y = h + dh * s;
                while (x >= 0 && x < COLS && y >= 0 && y < ROWS && cell[x * ROWS + y] === p) { cells.push(x * ROWS + y); x += dc * s; y += dh * s; }
            }
            res.push(cells);
        }
        return res;
    }
    function wins(c, p) {          // würde ein Stein von p in Spalte c gewinnen?
        const h = height[c];
        if (h >= ROWS) return false;
        cell[c * ROWS + h] = p;
        const w = runsAt(c, h, p).some(r => r.length >= 4);
        cell[c * ROWS + h] = 0;
        return w;
    }

    /* ── KI ───────────────────────────────────────────────────────────── */
    function evaluate(p) {
        const o = 3 - p;
        let s = 0;
        for (let h = 0; h < ROWS; h++) { const v = cell[3 * ROWS + h]; if (v === p) s += 3; else if (v === o) s -= 3; }
        for (const w of WINDOWS) {
            let cp = 0, co = 0;
            for (const i of w) { const v = cell[i]; if (v === p) cp++; else if (v === o) co++; }
            if (co === 0) { if (cp === 3) s += 6; else if (cp === 2) s += 2; }
            else if (cp === 0) { if (co === 3) s -= 7; else if (co === 2) s -= 2; }
        }
        return s;
    }
    let nodes = 0;
    function negamax(depth, alpha, beta, p) {
        nodes++;
        if (count >= COLS * ROWS) return 0;
        for (const c of ORDER) if (wins(c, p)) return 100000 + depth;
        if (depth === 0) return evaluate(p);
        let best = -Infinity;
        for (const c of ORDER) {
            if (height[c] >= ROWS) continue;
            const i = c * ROWS + height[c];
            cell[i] = p; height[c]++; count++;
            const v = -negamax(depth - 1, -beta, -alpha, 3 - p);
            cell[i] = 0; height[c]--; count--;
            if (v > best) best = v;
            if (best > alpha) alpha = best;
            if (alpha >= beta) break;
        }
        return best;
    }
    function aiMove(p) {
        const legal = ORDER.filter(c => height[c] < ROWS);
        if (opp === 'leicht') {
            const w = legal.find(c => wins(c, p));
            if (w != null && Math.random() < .7) return w;
            if (Math.random() < .3) return XIRU.pick(legal);
        }
        const depth = DEPTH[opp];
        nodes = 0;
        let best = -Infinity, cands = [];
        for (const c of legal) {
            if (wins(c, p)) return c;
            const i = c * ROWS + height[c];
            cell[i] = p; height[c]++; count++;
            const v = -negamax(depth - 1, -Infinity, -(best - 1), 3 - p) + (opp === 'mittel' ? Math.random() * 3 : 0);
            cell[i] = 0; height[c]--; count--;
            if (v > best + .5) { best = v; cands = [c]; } else if (Math.abs(v - best) <= .5) cands.push(c);
        }
        return XIRU.pick(cands.length ? cands : legal);
    }

    /* ── Spielablauf ──────────────────────────────────────────────────── */
    function newGame() {
        clearTimeout(aiTimer);
        cell = new Int8Array(COLS * ROWS); height = new Int8Array(COLS); count = 0;
        turn = starter; starter = 3 - starter; over = false; locked = false; lastIdx = -1;
        discsEl.innerHTML = '';
        board.classList.remove('is-over', 'has-win', 'is-locked');
        refresh();
        maybeAI();
    }
    const isAI = p => opp !== '2p' && p === 2;

    function drop(c) {
        if (over || locked || height[c] >= ROWS) return false;
        const p = turn, h = height[c], idx = c * ROWS + h;
        cell[idx] = p; height[c]++; count++;
        const row = ROWS - 1 - h;
        const d = document.createElement('div');
        d.className = 'vg-disc is-drop' + (p === 2 ? ' is-p2' : '');
        d.dataset.i = idx;
        const dur = .28 + (row + 1) * .055;
        d.style.cssText = '--c:' + c + ';--r:' + row + ';--from:' + (row + 1) + ';--dur:' + dur.toFixed(2) + 's';
        discsEl.appendChild(d);
        $$('.vg-disc.is-last', discsEl).forEach(x => x.classList.remove('is-last'));
        lastIdx = idx;
        locked = true;
        board.classList.add('is-locked');
        const ms = XIRU.setting('anim') === false ? 0 : dur * 1000 * .72;
        setTimeout(() => {
            XIRU.beep(p === 1 ? 300 : 240, .07, 'square', .05);
            setTimeout(() => XIRU.beep(p === 1 ? 420 : 340, .04, 'triangle', .03), 90);
            d.classList.add('is-last');
        }, ms);
        setTimeout(() => {
            locked = false;
            board.classList.remove('is-locked');
            afterMove(c, h, p);
        }, XIRU.setting('anim') === false ? 30 : dur * 1000 + 40);
        refresh();
        return true;
    }

    function afterMove(c, h, p) {
        const runs = runsAt(c, h, p).filter(r => r.length >= 4);
        if (runs.length) {
            runs.forEach(r => r.forEach(i => { const el = discsEl.querySelector('[data-i="' + i + '"]'); if (el) el.classList.add('is-win'); }));
            board.classList.add('has-win');
            if (runs.some(r => r.length >= 5)) XIRU.egg('g-vier-gewinnt-fuenf');
            return end(p);
        }
        if (count >= COLS * ROWS) return end(0);
        turn = 3 - p;
        refresh();
        maybeAI();
    }

    function end(w) {
        over = true;
        board.classList.add('is-over');
        let msg = '', cls = '';
        if (opp === '2p') {
            if (!w) { tally.draw++; msg = '<b>Unentschieden!</b> Das Brett ist voll.'; G.sfx.power(); XIRU.egg('g-vier-gewinnt-voll'); }
            else { tally[w]++; msg = '<b><span class="vg-dot' + (w === 2 ? ' is-p2' : '') + '"></span>' + NAME[w] + ' gewinnt!</b>'; cls = 'is-win'; XIRU.confetti(); G.sfx.win(); }
        } else {
            if (w === 1) {
                const pts = LEVEL_PTS[opp];
                streak += pts; tally.win++;
                msg = '<b>Gewonnen!</b> +' + pts + ' Serienpunkte (jetzt ' + streak + ').'; cls = 'is-win';
                XIRU.confetti(); G.sfx.win();
                if (opp === 'schwer') XIRU.egg('g-vier-gewinnt-schwer');
            } else if (w === 2) {
                tally.loss++;
                msg = '<b>Verloren.</b> ' + (streak ? 'Deine Serie von ' + streak + ' Punkten ist weg.' : 'Die KI hat vier in einer Reihe.'); cls = 'is-loss';
                streak = 0; G.sfx.die();
            } else {
                tally.draw++;
                msg = '<b>Unentschieden!</b> Das Brett ist voll – die Serie bleibt bei ' + streak + '.';
                G.sfx.power(); XIRU.egg('g-vier-gewinnt-voll');
            }
            XIRU.save('vier-gewinnt-serie', streak);
            const r = XIRU.score('vier-gewinnt', streak);
            if (r.isNew && streak > 0) msg += ' Neuer Rekord!';
        }
        refresh();
        turnEl.className = 'vg-turn is-result ' + cls;
        turnEl.innerHTML = msg + ' <span class="faint small">· Enter oder N für eine neue Partie</span>';
    }

    function maybeAI() {
        if (over || !isAI(turn)) return;
        refresh();
        aiTimer = setTimeout(() => {
            const t0 = performance.now();
            const c = aiMove(2);
            const wait = Math.max(0, 450 - (performance.now() - t0));
            aiTimer = setTimeout(() => { if (!over && turn === 2) drop(c); }, wait);
        }, 60);
    }

    function refresh() {
        const human = !over && !locked && !isAI(turn);
        $$('button', colsEl).forEach((b, c) => {
            b.disabled = over || height[c] >= ROWS;
            b.classList.toggle('is-cursor', human && c === cursor);
        });
        ghost.className = 'vg-disc vg-disc--ghost' + (turn === 2 ? ' is-p2' : '') + (human && height[cursor] < ROWS ? '' : ' is-hidden');
        ghost.style.setProperty('--c', cursor);
        btnNew.classList.toggle('is-pulse', over);
        if (!over) {
            turnEl.className = 'vg-turn';
            const dot = '<span class="vg-dot' + (turn === 2 ? ' is-p2' : '') + '"></span>';
            if (isAI(turn)) turnEl.innerHTML = 'Die KI ' + dot + ' überlegt<span class="vg-dots"></span>';
            else if (opp === '2p') turnEl.innerHTML = dot + '<b>' + NAME[turn] + '</b> ist am Zug.';
            else turnEl.innerHTML = '<b>Du</b> ' + dot + ' bist am Zug.';
        }
        if (opp === '2p') G.hud('#hud', { Pink: tally[1], Gelb: tally[2], Remis: tally.draw });
        else G.hud('#hud', { Serie: streak + ' P', Siege: tally.win, Remis: tally.draw, Niederlagen: tally.loss });
        const b = XIRU.best('vier-gewinnt');
        $('#best').textContent = b == null ? '–' : XIRU.fmt(b) + ' P';
    }

    function humanDrop(c) {
        if (over || locked || isAI(turn)) return;
        cursor = c;
        if (height[c] >= ROWS) { G.sfx.hit(); return; }
        XIRU.audio();
        drop(c);
    }

    /* ── Eingabe ──────────────────────────────────────────────────────── */
    colsEl.innerHTML = Array.from({ length: COLS }, (_, c) => '<button type="button" data-c="' + c + '" aria-label="Spalte ' + (c + 1) + '"></button>').join('');
    colsEl.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) humanDrop(+b.dataset.c); });
    colsEl.addEventListener('pointermove', e => {
        const b = e.target.closest('[data-c]');
        if (b && +b.dataset.c !== cursor && e.pointerType === 'mouse') { cursor = +b.dataset.c; refresh(); }
    });

    G.keys.onPress((k, e) => {
        const t = e && e.target;
        const onOther = t && t.closest && t.closest('button, a, input, select, textarea') && !colsEl.contains(t);
        if (k === 'n') { newGame(); return; }
        if (over) { if ((k === 'Enter' || k === ' ') && !onOther) { if (e) e.preventDefault(); newGame(); } return; }
        if (/^[1-7]$/.test(k)) { humanDrop(+k - 1); return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
            cursor = (cursor + (k === 'ArrowLeft' ? COLS - 1 : 1)) % COLS;
            refresh();
            return;
        }
        if (k === 'ArrowDown' || ((k === 'Enter' || k === ' ') && !onOther && !(t && colsEl.contains(t) && k === 'Enter'))) {
            if (e) e.preventDefault();
            humanDrop(cursor);
        }
    });

    btnNew.addEventListener('click', newGame);
    $('#opps').addEventListener('click', e => {
        const b = e.target.closest('[data-opp]'); if (!b) return;
        opp = b.dataset.opp;
        $$('#opps .chip').forEach(c => c.classList.toggle('is-active', c === b));
        $('#mode-desc').textContent = DESC[opp];
        starter = 1; newGame();
    });

    $('#mode-desc').textContent = DESC[opp];
    newGame();

    // Für Tests in der Konsole: Bedenkzeit der KI messen
    window.xiruVierGewinntBench = () => { const t = performance.now(); const c = aiMove(turn); return { spalte: c + 1, ms: Math.round(performance.now() - t), knoten: nodes }; };
});
