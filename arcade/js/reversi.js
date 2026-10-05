/* Reversi – 8×8 gegen die KI (Positionsgewichtung + Minimax mit Alpha-Beta) */
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$, $$ = XIRU.$$;
    const YOU = 1, AI = 2;
    const boardEl = $('#board'), turnEl = $('#turn'), noteEl = $('#note'), btnNew = $('#btn-new');
    const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];
    const CORNERS = [0, 7, 56, 63];
    const LEVEL_PTS = { leicht: 1, mittel: 2, schwer: 3 };
    const DESC = {
        leicht: 'Die KI schaut nur auf den nächsten Zug und spielt oft planlos.',
        mittel: 'Die KI rechnet drei Halbzüge voraus und kennt den Wert der Ecken.',
        schwer: 'Die KI rechnet tief voraus, achtet auf Beweglichkeit und spielt das Ende perfekt.'
    };
    // klassische Positionsgewichte: Ecken top, Felder daneben gefährlich
    const W = [
        120, -20, 20, 5, 5, 20, -20, 120,
        -20, -40, -5, -5, -5, -5, -40, -20,
        20, -5, 15, 3, 3, 15, -5, 20,
        5, -5, 3, 3, 3, 3, -5, 5,
        5, -5, 3, 3, 3, 3, -5, 5,
        20, -5, 15, 3, 3, 15, -5, 20,
        -20, -40, -5, -5, -5, -5, -40, -20,
        120, -20, 20, 5, 5, 20, -20, 120
    ];
    // Felder neben einer Ecke -> zugehörige Ecke
    const NEAR = {}; [[0, [1, 8, 9]], [7, [6, 15, 14]], [56, [57, 48, 49]], [63, [62, 55, 54]]].forEach(([c, ns]) => ns.forEach(n => { NEAR[n] = c; }));

    let level = 'mittel', b, turn, over, busy, cursor = 27, last = -1, timers = [];
    let hints = true;

    /* ── Regeln ───────────────────────────────────────────────────────── */
    function flips(bd, i, p) {
        if (bd[i]) return [];
        const o = 3 - p, res = [];
        const r = i >> 3, c = i & 7;
        for (const d of DIRS) {
            const dr = d === -9 || d === -8 || d === -7 ? -1 : d === 7 || d === 8 || d === 9 ? 1 : 0;
            const dc = d === -9 || d === -1 || d === 7 ? -1 : d === -7 || d === 1 || d === 9 ? 1 : 0;
            let rr = r + dr, cc = c + dc;
            const line = [];
            while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr * 8 + cc] === o) { line.push(rr * 8 + cc); rr += dr; cc += dc; }
            if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr * 8 + cc] === p) res.push.apply(res, line);
        }
        return res;
    }
    function movesOf(bd, p) {
        const res = [];
        for (let i = 0; i < 64; i++) if (!bd[i] && hasFlip(bd, i, p)) res.push(i);
        return res;
    }
    function hasFlip(bd, i, p) {
        const o = 3 - p, r = i >> 3, c = i & 7;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            let rr = r + dr, cc = c + dc, n = 0;
            while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr * 8 + cc] === o) { rr += dr; cc += dc; n++; }
            if (n && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && bd[rr * 8 + cc] === p) return true;
        }
        return false;
    }
    function countOf(bd) { let y = 0, a = 0; for (let i = 0; i < 64; i++) { if (bd[i] === YOU) y++; else if (bd[i] === AI) a++; } return { y, a }; }

    /* ── KI ───────────────────────────────────────────────────────────── */
    function evaluate(bd, p) {
        const o = 3 - p;
        let pos = 0, mine = 0, theirs = 0, empty = 0;
        for (let i = 0; i < 64; i++) {
            const v = bd[i];
            if (!v) { empty++; continue; }
            let w = W[i];
            if (NEAR[i] != null && bd[NEAR[i]]) w = 4;            // Ecke schon belegt: Nachbarfeld ungefährlich
            if (v === p) { pos += w; mine++; } else { pos -= w; theirs++; }
        }
        const mp = movesOf(bd, p).length, mo = movesOf(bd, o).length;
        const mob = mp + mo ? 100 * (mp - mo) / (mp + mo) : 0;
        const disc = empty < 14 ? (mine - theirs) * (14 - empty) : 0;
        return pos + mob * .9 + disc;
    }
    function aiMove() {
        const moves = movesOf(b, AI);
        if (moves.length === 1) return moves[0];
        if (level === 'leicht') {
            if (Math.random() < .35) return XIRU.pick(moves);
            let best = -Infinity, cand = [];
            for (const m of moves) {
                const v = W[m] + flips(b, m, AI).length * 2 + Math.random() * 12;
                if (v > best) { best = v; cand = [m]; } else if (v === best) cand.push(m);
            }
            return XIRU.pick(cand);
        }
        const empties = b.filter(v => !v).length;
        // schwer: im Endspiel bis zum letzten Stein durchrechnen (exakt), sonst so tief die Zeit reicht
        const maxDepth = level === 'mittel' ? 3 : empties <= 12 ? empties : 9;
        const budget = level === 'schwer' ? 900 : 400;
        const t0 = performance.now();
        let nodes = 0, abort = false;
        const bd = b.slice();
        function nm(depth, alpha, beta, p, passed) {
            if ((++nodes & 255) === 0 && performance.now() - t0 > budget) abort = true;
            if (abort) return 0;
            const ms = movesOf(bd, p);
            if (!ms.length) {
                if (passed) { const c = countOf(bd), d = p === YOU ? c.y - c.a : c.a - c.y; return d * 10000 + (d > 0 ? 1 : d < 0 ? -1 : 0); }
                return -nm(depth, -beta, -alpha, 3 - p, true);
            }
            if (depth === 0) return evaluate(bd, p);
            let best = -Infinity;
            // Ecken zuerst probieren -> bessere Schnitte
            ms.sort((x, y) => W[y] - W[x]);
            for (const m of ms) {
                const f = flips(bd, m, p);
                bd[m] = p; for (const k of f) bd[k] = p;
                const v = -nm(depth - 1, -beta, -alpha, 3 - p, false);
                bd[m] = 0; for (const k of f) bd[k] = 3 - p;
                if (abort) return 0;
                if (v > best) best = v;
                if (best > alpha) alpha = best;
                if (alpha >= beta) break;
            }
            return best;
        }
        let order = moves.slice().sort((x, y) => W[y] - W[x] + (Math.random() - .5));
        let bestMove = order[0];
        for (let d = 1; d <= maxDepth; d++) {
            let best = -Infinity, cand = order[0];
            for (const m of order) {
                const f = flips(bd, m, AI);
                bd[m] = AI; for (const k of f) bd[k] = AI;
                const v = -nm(d - 1, -Infinity, -best, YOU, false);
                bd[m] = 0; for (const k of f) bd[k] = YOU;
                if (abort) break;
                if (v > best) { best = v; cand = m; }
            }
            if (abort) break;
            bestMove = cand;
            order = [cand].concat(order.filter(m => m !== cand));
        }
        return bestMove;
    }

    /* ── Darstellung ──────────────────────────────────────────────────── */
    function build() {
        let h = '';
        for (let i = 0; i < 64; i++) {
            const col = 'abcdefgh'[i & 7], row = (i >> 3) + 1;
            h += '<button type="button" class="rv-cell" role="gridcell" data-i="' + i + '" aria-label="Feld ' + col + row + '"></button>';
        }
        boardEl.innerHTML = h;
    }
    const cellEl = i => boardEl.children[i];
    function putDisc(i, p, isNew) {
        const el = cellEl(i);
        let d = el.querySelector('.rv-disc');
        if (!d) {
            d = document.createElement('span');
            d.className = 'rv-disc' + (p === AI ? ' is-ai' : '') + (isNew ? ' is-new' : '');
            d.innerHTML = '<span class="rv-face rv-face--you"></span><span class="rv-face rv-face--ai"></span>';
            el.appendChild(d);
        }
    }
    function flipDisc(i, p, delay) {
        const d = cellEl(i).querySelector('.rv-disc');
        if (!d) return;
        d.classList.remove('is-new');
        d.style.setProperty('--delay', delay + 's');
        d.classList.toggle('is-ai', p === AI);
    }

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function note(text, ms) {
        noteEl.textContent = text; noteEl.hidden = false;
        later(() => { noteEl.hidden = true; }, ms || 1500);
    }

    function refresh() {
        const human = !over && !busy && turn === YOU;
        const legal = new Set(human ? movesOf(b, YOU) : []);
        boardEl.classList.toggle('is-busy', busy);
        boardEl.classList.toggle('is-over', over);
        for (let i = 0; i < 64; i++) {
            const el = cellEl(i);
            el.classList.toggle('is-move', legal.has(i));
            el.classList.toggle('is-hint', hints && legal.has(i));
            el.classList.toggle('is-cursor', human && i === cursor);
            el.classList.toggle('is-last', i === last);
        }
        const c = countOf(b);
        G.hud('#hud', { Du: c.y, KI: c.a, Stufe: level[0].toUpperCase() + level.slice(1) });
        const best = XIRU.best('reversi');
        $('#best').textContent = best == null ? '–' : XIRU.fmt(best) + ' P';
        btnNew.classList.toggle('is-pulse', over);
        if (!over) {
            turnEl.className = 'rv-turn';
            turnEl.innerHTML = turn === YOU
                ? '<b>Du</b> <span class="rv-dot rv-dot--you"></span> bist am Zug.' + (legal.size ? ' ' + legal.size + (legal.size === 1 ? ' möglicher Zug.' : ' mögliche Züge.') : '')
                : 'Die KI <span class="rv-dot rv-dot--ai"></span> überlegt<span class="rv-dots"></span>';
        }
    }

    /* ── Ablauf ───────────────────────────────────────────────────────── */
    function newGame() {
        timers.forEach(clearTimeout); timers = [];
        b = new Array(64).fill(0);
        b[27] = AI; b[36] = AI; b[28] = YOU; b[35] = YOU;
        turn = YOU; over = false; busy = false; last = -1; cursor = 19;
        noteEl.hidden = true;
        build();
        [27, 28, 35, 36].forEach(i => putDisc(i, b[i], true));
        refresh();
    }

    function play(i, p) {
        const f = flips(b, i, p);
        if (!f.length) return false;
        b[i] = p; f.forEach(k => { b[k] = p; });
        last = i;
        putDisc(i, p, true);
        const r = i >> 3, c = i & 7;
        f.forEach(k => {
            const dist = Math.max(Math.abs((k >> 3) - r), Math.abs((k & 7) - c));
            flipDisc(k, p, .08 + dist * .07);
            later(() => XIRU.beep(p === YOU ? 520 + dist * 40 : 380 + dist * 30, .04, 'triangle', .04), 120 + dist * 70);
        });
        XIRU.beep(p === YOU ? 440 : 330, .06, 'square', .04);
        if (p === YOU && CORNERS.every(k => b[k] === YOU)) XIRU.egg('g-reversi-ecken');
        busy = true;
        refresh();
        const maxDist = f.reduce((m, k) => Math.max(m, Math.max(Math.abs((k >> 3) - r), Math.abs((k & 7) - c))), 1);
        later(() => { busy = false; next(3 - p); }, XIRU.setting('anim') === false ? 50 : 420 + maxDist * 70);
        return true;
    }

    function next(p) {
        const mine = movesOf(b, p), theirs = movesOf(b, 3 - p);
        if (!mine.length && !theirs.length) return end();
        if (!mine.length) {
            note(p === AI ? 'Die KI muss passen.' : 'Kein Zug möglich – du musst passen.', 1600);
            G.sfx.hit();
            turn = 3 - p; busy = true; refresh();
            later(() => { busy = false; next(3 - p); }, 1700);
            return;
        }
        turn = p;
        refresh();
        if (p === AI) {
            busy = true; refresh();
            later(() => {
                const t0 = performance.now();
                const m = aiMove();
                later(() => { busy = false; if (!over) play(m, AI); }, Math.max(0, 500 - (performance.now() - t0)));
            }, 40);
        }
    }

    function end() {
        over = true; busy = false;
        const c = countOf(b), diff = c.y - c.a;
        let msg, cls = '', pts = 0;
        if (diff > 0) {
            pts = diff * LEVEL_PTS[level];
            msg = '<b>Gewonnen, ' + c.y + ' : ' + c.a + '!</b> ' + pts + ' Punkte.'; cls = 'is-win';
            XIRU.confetti(); G.sfx.win();
            if (level === 'schwer') XIRU.egg('g-reversi-schwer');
            if (diff === 2) XIRU.egg('g-reversi-knapp');
        } else if (diff < 0) {
            msg = '<b>Verloren, ' + c.y + ' : ' + c.a + '.</b> Die KI hat mehr Steine.'; cls = 'is-loss';
            G.sfx.die();
        } else {
            msg = '<b>Unentschieden, ' + c.y + ' : ' + c.a + '.</b> Perfektes Gleichgewicht.';
            G.sfx.power();
        }
        const r = XIRU.score('reversi', pts);
        if (r.isNew && pts > 0) msg += ' Neuer Rekord!';
        const winner = diff > 0 ? YOU : diff < 0 ? AI : 0;
        refresh();
        if (winner) for (let i = 0; i < 64; i++) if (b[i] === winner) { cellEl(i).classList.add('is-winner'); cellEl(i).style.setProperty('--wd', ((i % 9) * .08) + 's'); }
        turnEl.className = 'rv-turn is-result ' + cls;
        turnEl.innerHTML = msg + ' <span class="faint small">· Enter oder N für eine neue Partie</span>';
    }

    function humanPlay(i) {
        if (over || busy || turn !== YOU) return;
        XIRU.audio();
        cursor = i;
        if (!play(i, YOU)) {
            const el = cellEl(i);
            el.animate && XIRU.setting('anim') !== false && el.animate([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 180 });
        }
    }

    /* ── Eingabe ──────────────────────────────────────────────────────── */
    boardEl.addEventListener('click', e => {
        const el = e.target.closest('.rv-cell'); if (!el) return;
        humanPlay(+el.dataset.i);
    });
    G.keys.onPress((k, e) => {
        const t = e && e.target;
        const onCell = t && t.classList && t.classList.contains('rv-cell');
        const onOther = t && !onCell && t.closest && t.closest('button, a, input, select, textarea');
        if (k === 'n') { newGame(); return; }
        if (over) { if ((k === 'Enter' || k === ' ') && !onOther) { if (e) e.preventDefault(); newGame(); } return; }
        const dirs = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 };
        if (dirs[k]) {
            const r = cursor >> 3, c = cursor & 7;
            const nr = (r + (k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0) + 8) % 8, nc = (c + (k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0) + 8) % 8;
            cursor = nr * 8 + nc;
            refresh();
            cellEl(cursor).focus({ preventScroll: true });
            return;
        }
        if ((k === 'Enter' || k === ' ') && !onOther) {
            if (onCell && k === 'Enter') return;      // Klick kommt vom Knopf selbst
            if (e) e.preventDefault();
            humanPlay(onCell ? +t.dataset.i : cursor);
        }
    });

    btnNew.addEventListener('click', newGame);
    $('#hints').addEventListener('change', e => { hints = e.target.checked; refresh(); });
    $('#levels').addEventListener('click', e => {
        const bt = e.target.closest('[data-level]'); if (!bt) return;
        level = bt.dataset.level;
        $$('#levels .chip').forEach(c => c.classList.toggle('is-active', c === bt));
        $('#mode-desc').textContent = DESC[level];
        newGame();
    });

    $('#mode-desc').textContent = DESC[level];
    newGame();
});
