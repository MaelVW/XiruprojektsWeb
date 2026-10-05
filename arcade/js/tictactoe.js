/* Tic-Tac-Toe+ – klassisch (Minimax-KI) und Ultimate (Alpha-Beta mit Heuristik) */
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$, $$ = XIRU.$$;
    const root = $('#root'), turnEl = $('#turn'), btnNew = $('#btn-new');
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const other = p => (p === 'X' ? 'O' : 'X');
    const MARK = {
        X: '<svg class="ttt-mark ttt-mark--x" viewBox="0 0 100 100" aria-hidden="true"><path pathLength="100" d="M24 24L76 76"/><path pathLength="100" d="M76 24L24 76"/></svg>',
        O: '<svg class="ttt-mark ttt-mark--o" viewBox="0 0 100 100" aria-hidden="true"><circle pathLength="100" cx="50" cy="50" r="27" transform="rotate(-90 50 50)"/></svg>'
    };
    const SYM = { X: '<span class="is-x">✕</span>', O: '<span class="is-o">◯</span>' };
    const LEVEL_PTS = { leicht: 1, mittel: 2, schwer: 3 };
    const DESC = {
        leicht: 'Die KI spielt oft zufällig – gut zum Aufwärmen.',
        mittel: 'Die KI sieht Gewinnzüge und blockt meistens, macht aber Fehler.',
        schwer: 'Klassisch spielt die KI perfekt – mehr als ein Unentschieden ist nicht drin. In Ultimate rechnet sie mehrere Züge voraus.',
        '2p': 'Zu zweit an einem Gerät. ✕ und ◯ wechseln sich ab, wer beginnt, wechselt jede Partie.'
    };

    let variant = 'klassisch', opp = 'mittel';
    let S = null, starter = 'X', busy = false, aiTimer = 0;
    let cursor = 4, pickBoard = -1, lastPlace = 0;
    const tally = { win: 0, draw: 0, loss: 0, X: 0, O: 0 };
    let streak = +XIRU.load('tictactoe-serie', 0) || 0;
    let hardDraws = 0;

    /* ── Regeln ───────────────────────────────────────────────────────── */
    function lineWinner(cells, off) {
        for (const l of L) {
            const a = cells[off + l[0]];
            if (a && a === cells[off + l[1]] && a === cells[off + l[2]]) return { p: a, line: l };
        }
        return null;
    }
    function linesThrough(cells, off, i, p) {   // wie viele Linien durch i sind komplett p?
        return L.filter(l => l.includes(i) && l.every(k => cells[off + k] === p));
    }
    function full(cells, off, n) { for (let k = 0; k < n; k++) if (!cells[off + k]) return false; return true; }

    // Ultimate
    function bigWinner(minis) {
        for (const l of L) { const a = minis[l[0]]; if (a && a !== 'D' && a === minis[l[1]] && a === minis[l[2]]) return { p: a, line: l }; }
        return null;
    }
    function uMoves(s) {
        const res = [];
        const boards = s.active >= 0 && !s.minis[s.active] ? [s.active] : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(b => !s.minis[b]);
        for (const b of boards) for (let c = 0; c < 9; c++) if (!s.cells[b * 9 + c]) res.push(b * 9 + c);
        return res;
    }
    function uPlay(s, idx, p) {
        const b = (idx / 9) | 0, c = idx % 9;
        const u = { idx, b, mini: s.minis[b], active: s.active };
        s.cells[idx] = p;
        if (!s.minis[b]) {
            const w = lineWinner(s.cells, b * 9);
            if (w) s.minis[b] = w.p; else if (full(s.cells, b * 9, 9)) s.minis[b] = 'D';
        }
        s.active = s.minis[c] ? -1 : c;
        return u;
    }
    function uUndo(s, u) { s.cells[u.idx] = null; s.minis[u.b] = u.mini; s.active = u.active; }

    /* ── KI: klassisch (Minimax) ──────────────────────────────────────── */
    function mm(b, turn, me, depth) {
        const w = lineWinner(b, 0);
        if (w) return w.p === me ? 10 - depth : depth - 10;
        if (full(b, 0, 9)) return 0;
        let best = turn === me ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) {
            if (b[i]) continue;
            b[i] = turn;
            const v = mm(b, other(turn), me, depth + 1);
            b[i] = null;
            best = turn === me ? Math.max(best, v) : Math.min(best, v);
        }
        return best;
    }
    function bestMoves(b, me) {
        let best = -Infinity, res = [];
        for (let i = 0; i < 9; i++) {
            if (b[i]) continue;
            b[i] = me;
            const v = mm(b, other(me), me, 1);
            b[i] = null;
            if (v > best) { best = v; res = [i]; } else if (v === best) res.push(i);
        }
        return res;
    }
    function aiClassic(me) {
        const b = S.cells.slice(), you = other(me);
        const empty = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => !b[i]);
        const winFor = p => empty.find(i => { b[i] = p; const w = lineWinner(b, 0); b[i] = null; return w && w.p === p; });
        if (empty.length === 9) return opp === 'schwer' ? XIRU.pick([0, 2, 4, 6, 8]) : XIRU.pick(empty);
        if (opp === 'leicht') {
            const w = winFor(me);
            if (w != null && Math.random() < .5) return w;
            return Math.random() < .25 ? XIRU.pick(bestMoves(b, me)) : XIRU.pick(empty);
        }
        if (opp === 'mittel') {
            const w = winFor(me); if (w != null) return w;
            const bl = winFor(you); if (bl != null && Math.random() < .85) return bl;
            return Math.random() < .6 ? XIRU.pick(bestMoves(b, me)) : XIRU.pick(empty);
        }
        return XIRU.pick(bestMoves(b, me));
    }

    /* ── KI: Ultimate (Negamax mit Alpha-Beta, iterative Vertiefung) ─── */
    const BW = [1.25, 1, 1.25, 1, 1.5, 1, 1.25, 1, 1.25];
    const LINE_BIG = [0, 40, 160], LINE_SMALL = [0, 1, 5];
    function uEval(s, p) {
        const o = other(p);
        let sc = 0;
        for (const l of L) {
            let mp = 0, mo = 0, dead = false;
            for (const b of l) { const m = s.minis[b]; if (m === p) mp++; else if (m === o) mo++; else if (m === 'D') dead = true; }
            if (dead) continue;
            if (!mo) sc += LINE_BIG[mp] || 0;
            if (!mp) sc -= LINE_BIG[mo] || 0;
        }
        for (let b = 0; b < 9; b++) {
            const m = s.minis[b];
            if (m === p) { sc += 60 * BW[b]; continue; }
            if (m === o) { sc -= 60 * BW[b]; continue; }
            if (m === 'D') continue;
            const off = b * 9;
            let loc = 0;
            for (const l of L) {
                let cp = 0, co = 0;
                for (const k of l) { const v = s.cells[off + k]; if (v === p) cp++; else if (v === o) co++; }
                if (!co) loc += LINE_SMALL[cp] || 0;
                if (!cp) loc -= LINE_SMALL[co] || 0;
            }
            if (s.cells[off + 4] === p) loc += 1.5; else if (s.cells[off + 4] === o) loc -= 1.5;
            sc += loc * BW[b];
        }
        if (s.active === -1 || s.minis[s.active]) sc += 15;   // p ist am Zug: freie Wahl ist ein Vorteil
        return sc;
    }
    function aiUltimate(me) {
        const moves = uMoves(S);
        if (opp === 'leicht' && Math.random() < .4) return XIRU.pick(moves);
        const maxDepth = opp === 'leicht' ? 1 : opp === 'mittel' ? 2 : 7;
        const budget = opp === 'schwer' ? 500 : 250;
        const t0 = performance.now();
        let nodes = 0, abort = false;
        function nm(depth, alpha, beta, p) {
            if ((++nodes & 511) === 0 && performance.now() - t0 > budget) abort = true;
            if (abort) return 0;
            if (bigWinner(S.minis)) return -1e6 - depth;     // der Gegner hat eben gewonnen
            const ms = uMoves(S);
            if (!ms.length) return 0;
            if (depth === 0) return uEval(S, p);
            let best = -Infinity;
            for (const m of ms) {
                const u = uPlay(S, m, p);
                const v = -nm(depth - 1, -beta, -alpha, other(p));
                uUndo(S, u);
                if (abort) return 0;
                if (v > best) best = v;
                if (best > alpha) alpha = best;
                if (alpha >= beta) break;
            }
            return best;
        }
        let order = moves.slice().sort(() => Math.random() - .5);
        let bestMove = order[0];
        for (let d = 1; d <= maxDepth; d++) {
            let best = -Infinity, cand = order[0];
            for (const m of order) {
                const u = uPlay(S, m, me);
                const v = -nm(d - 1, -Infinity, -best, other(me));
                uUndo(S, u);
                if (abort) break;
                if (v > best) { best = v; cand = m; }
            }
            if (abort) break;
            bestMove = cand;
            order = [cand].concat(order.filter(m => m !== cand));
            if (best >= 1e6) break;
        }
        return bestMove;
    }

    /* ── Spielablauf ──────────────────────────────────────────────────── */
    const cellEl = i => root.querySelector('.ttt-cell[data-i="' + i + '"]');
    const isAITurn = () => S && !S.over && opp !== '2p' && S.turn === 'O';

    function newGame() {
        clearTimeout(aiTimer); busy = false; pickBoard = -1;
        S = variant === 'klassisch'
            ? { kind: 'c', cells: Array(9).fill(null), turn: starter, over: false, winner: null, last: -1 }
            : { kind: 'u', cells: Array(81).fill(null), minis: Array(9).fill(null), active: -1, turn: starter, over: false, winner: null, last: -1 };
        starter = other(starter);
        cursor = S.kind === 'c' ? 4 : 40;
        build();
        refresh();
        maybeAI();
    }

    function build() {
        const ghost = () => '<span class="ttt-ghost"></span>';
        if (S.kind === 'c') {
            let h = '<div class="ttt-board ttt-board--classic" id="board">';
            for (let i = 0; i < 9; i++) h += '<button type="button" class="ttt-cell" data-i="' + i + '" aria-label="Feld ' + (i + 1) + '">' + ghost() + '</button>';
            root.innerHTML = h + '<svg class="ttt-winline" viewBox="0 0 300 300" aria-hidden="true"></svg></div>';
        } else {
            let h = '<div class="ttt-board ttt-board--ultimate" id="board">';
            for (let b = 0; b < 9; b++) {
                h += '<div class="ttt-mini" data-b="' + b + '">';
                for (let c = 0; c < 9; c++) h += '<button type="button" class="ttt-cell" data-i="' + (b * 9 + c) + '" aria-label="Grosses Feld ' + (b + 1) + ', kleines Feld ' + (c + 1) + '">' + ghost() + '</button>';
                h += '<svg class="ttt-winline ttt-winline--mini" viewBox="0 0 300 300" aria-hidden="true"></svg><div class="ttt-mini__owner"></div></div>';
            }
            root.innerHTML = h + '<svg class="ttt-winline ttt-winline--big" viewBox="0 0 300 300" aria-hidden="true"></svg></div>';
        }
    }

    function legal(i) {
        if (!S || S.over) return false;
        if (S.kind === 'c') return !S.cells[i];
        return uMoves(S).includes(i);
    }

    function drawLine(svg, line) {
        const pt = k => [(k % 3) * 100 + 50, ((k / 3) | 0) * 100 + 50];
        const a = pt(line[0]), c = pt(line[2]);
        const dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy), ex = dx / len * 34, ey = dy / len * 34;
        svg.innerHTML = '<line pathLength="100" x1="' + (a[0] - ex) + '" y1="' + (a[1] - ey) + '" x2="' + (c[0] + ex) + '" y2="' + (c[1] + ey) + '"/>';
    }

    function place(i) {
        const p = S.turn;
        lastPlace = performance.now();
        const el = cellEl(i);
        el.innerHTML = MARK[p];
        el.classList.add('is-filled');
        XIRU.beep(p === 'X' ? 660 : 494, .06, 'triangle', .06);
        S.last = i;
        pickBoard = -1;

        if (S.kind === 'c') {
            S.cells[i] = p;
            const w = lineWinner(S.cells, 0);
            if (w) {
                const lines = linesThrough(S.cells, 0, i, p);
                lines.forEach(l => l.forEach(k => cellEl(k).classList.add('is-win')));
                drawLine(root.querySelector('.ttt-winline'), lines[0] || w.line);
                if (lines.length >= 2) XIRU.egg('g-tictactoe-doppel');
                return end(p);
            }
            if (full(S.cells, 0, 9)) return end('D');
        } else {
            const b = (i / 9) | 0, before = S.minis[b];
            uPlay(S, i, p);
            if (!before && S.minis[b]) {
                const mini = root.querySelector('.ttt-mini[data-b="' + b + '"]');
                if (S.minis[b] === 'D') {
                    mini.classList.add('is-draw');
                    mini.querySelector('.ttt-mini__owner').classList.add('is-draw');
                } else {
                    mini.classList.add('is-won-' + p);
                    const lines = linesThrough(S.cells, b * 9, i % 9, p);
                    drawLine(mini.querySelector('.ttt-winline--mini'), lines[0]);
                    mini.querySelector('.ttt-mini__owner').innerHTML = MARK[p];
                    G.sfx.coin();
                    const bw = bigWinner(S.minis);
                    if (bw) {
                        const big = L.filter(l => l.includes(b) && l.every(k => S.minis[k] === p));
                        drawLine(root.querySelector('.ttt-winline--big'), big[0] || bw.line);
                        if (big.length >= 2) XIRU.egg('g-tictactoe-doppel');
                        return end(p);
                    }
                }
            }
            if (!uMoves(S).length) return end('D');
        }
        S.turn = other(p);
        refresh();
        maybeAI();
    }

    function end(w) {
        S.over = true; S.winner = w;
        clearTimeout(aiTimer); busy = false;
        let msg = '', cls = '';
        if (opp === '2p') {
            if (w === 'D') { tally.draw++; msg = '<b>Unentschieden!</b> Keiner gibt nach.'; G.sfx.click(); }
            else { tally[w]++; msg = '<b>' + SYM[w] + ' gewinnt!</b> Glückwunsch.'; cls = 'is-win'; XIRU.confetti(); G.sfx.win(); }
        } else {
            const hard = opp === 'schwer';
            if (w === 'X') {
                const pts = LEVEL_PTS[opp] * (S.kind === 'u' ? 2 : 1);
                streak += pts; tally.win++;
                msg = '<b>Gewonnen!</b> +' + pts + ' Serienpunkte (jetzt ' + streak + ').'; cls = 'is-win';
                XIRU.confetti(); G.sfx.win();
                if (S.kind === 'u' && hard) XIRU.egg('g-tictactoe-ultimate');
            } else if (w === 'O') {
                tally.loss++;
                msg = '<b>Verloren.</b> ' + (streak ? 'Deine Serie von ' + streak + ' Punkten ist weg.' : 'Die KI war diesmal besser.'); cls = 'is-loss';
                streak = 0; G.sfx.die();
            } else {
                tally.draw++;
                msg = '<b>Unentschieden.</b> Die Serie bleibt bei ' + streak + '.';
                G.sfx.power();
            }
            if (S.kind === 'c' && hard) {
                hardDraws = w === 'D' ? hardDraws + 1 : 0;
                if (hardDraws >= 3) XIRU.egg('g-tictactoe-patt');
                if (w === 'D' && hardDraws < 3) msg += ' (' + hardDraws + '/3 Remis in Folge gegen „schwer“)';
            }
            XIRU.save('tictactoe-serie', streak);
            const r = XIRU.score('tictactoe', streak);
            if (r.isNew && streak > 0) msg += ' Neuer Rekord!';
        }
        refresh();
        turnEl.className = 'ttt-turn is-result ' + cls;
        turnEl.innerHTML = msg + ' <span class="faint small">· Enter oder N für eine neue Partie</span>';
        btnNew.classList.add('is-pulse');
    }

    function maybeAI() {
        if (!isAITurn()) return;
        busy = true; refresh();
        aiTimer = setTimeout(() => {
            const m = S.kind === 'c' ? aiClassic('O') : aiUltimate('O');
            busy = false;
            if (S && !S.over && legal(m)) place(m);
        }, 380 + Math.random() * 260);
    }

    function refresh() {
        const board = $('#board'); if (!board) return;
        const humanTurn = !S.over && !busy && (opp === '2p' || S.turn === 'X');
        const legalSet = humanTurn ? new Set(S.kind === 'c' ? [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => !S.cells[i]) : uMoves(S)) : new Set();
        board.classList.toggle('is-busy', busy);
        board.classList.toggle('is-over', S.over);
        $$('.ttt-cell', board).forEach(el => {
            const i = +el.dataset.i;
            const can = legalSet.has(i);
            el.classList.toggle('is-playable', can);
            el.classList.toggle('is-last', i === S.last);
            el.classList.toggle('is-cursor', i === cursor && !S.over);
            el.setAttribute('aria-disabled', can ? 'false' : 'true');
            const g = el.querySelector('.ttt-ghost');
            if (g) g.innerHTML = can ? MARK[S.turn] : '';
        });
        if (S.kind === 'u') {
            const target = !S.over && S.active >= 0 && !S.minis[S.active];
            board.classList.toggle('has-target', target || pickBoard >= 0);
            $$('.ttt-mini', board).forEach(m => {
                const b = +m.dataset.b;
                const active = !S.over && !S.minis[b] && (pickBoard >= 0 ? b === pickBoard : (target ? b === S.active : true));
                m.classList.toggle('is-active', active && (target || pickBoard >= 0 || (!S.over && !busy)));
                m.classList.toggle('is-picked', b === pickBoard);
            });
        }
        btnNew.classList.toggle('is-pulse', S.over);
        if (!S.over) {
            turnEl.className = 'ttt-turn';
            let t;
            if (busy) t = 'Die KI denkt nach<span class="ttt-dots"></span>';
            else if (opp === '2p') t = 'Spieler <b>' + SYM[S.turn] + '</b> ist am Zug.';
            else t = '<b>Du</b> bist am Zug (' + SYM.X + ').';
            if (S.kind === 'u' && !busy) {
                if (S.active >= 0 && !S.minis[S.active]) t += ' Spiele im markierten Feld ' + (S.active + 1) + '.';
                else t += pickBoard >= 0 ? ' Grosses Feld ' + (pickBoard + 1) + ' gewählt – jetzt die Ziffer fürs kleine Feld.' : ' Freie Wahl!';
            }
            turnEl.innerHTML = t;
        }
        updateHud();
    }

    function updateHud() {
        if (opp === '2p') G.hud('#hud', { '✕': tally.X, '◯': tally.O, Remis: tally.draw });
        else G.hud('#hud', { Serie: streak + ' P', Siege: tally.win, Remis: tally.draw, Niederlagen: tally.loss });
        const b = XIRU.best('tictactoe');
        $('#best').textContent = b == null ? '–' : XIRU.fmt(b) + ' P';
    }

    function humanPlay(i) {
        if (!S || S.over || busy) return;
        if (opp !== '2p' && S.turn !== 'X') return;
        if (!legal(i)) {
            const el = cellEl(i);
            if (el) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
            return;
        }
        cursor = i;
        place(i);
    }

    /* ── Eingabe ──────────────────────────────────────────────────────── */
    root.addEventListener('click', e => {
        const el = e.target.closest('.ttt-cell'); if (!el) return;
        if (performance.now() - lastPlace < 120) return;
        XIRU.audio();
        humanPlay(+el.dataset.i);
    });

    function toRC(i) {
        if (S.kind === 'c') return [(i / 3) | 0, i % 3];
        const b = (i / 9) | 0, c = i % 9;
        return [((b / 3) | 0) * 3 + ((c / 3) | 0), (b % 3) * 3 + c % 3];
    }
    function fromRC(r, c) {
        if (S.kind === 'c') return r * 3 + c;
        return (((r / 3) | 0) * 3 + ((c / 3) | 0)) * 9 + (r % 3) * 3 + c % 3;
    }
    function moveCursor(dr, dc) {
        const n = S.kind === 'c' ? 3 : 9;
        const rc = toRC(cursor);
        cursor = fromRC((rc[0] + dr + n) % n, (rc[1] + dc + n) % n);
        refresh();
        const el = cellEl(cursor); if (el) el.focus({ preventScroll: true });
    }

    G.keys.onPress((k, e) => {
        const t = e && e.target;
        const onCell = t && t.classList && t.classList.contains('ttt-cell');
        const onOther = t && !onCell && t.closest && t.closest('button, a, input, select, textarea');
        if (k === 'n') { newGame(); return; }
        if (!S) return;
        if (S.over) {
            if ((k === 'Enter' || k === ' ') && !onOther) { if (e) e.preventDefault(); newGame(); }
            return;
        }
        const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (dirs[k]) { moveCursor(dirs[k][0], dirs[k][1]); return; }
        if (k === 'Enter' || k === ' ') {
            if (onOther) return;
            if (onCell && k === 'Enter') return;          // Enter löst auf Knöpfen selbst einen Klick aus
            if (e) e.preventDefault();
            humanPlay(onCell ? +t.dataset.i : cursor);
            return;
        }
        if (k === 'Escape') { pickBoard = -1; refresh(); return; }
        if (/^[1-9]$/.test(k)) {
            const d = +k - 1;
            if (S.kind === 'c') { humanPlay(d); return; }
            if (S.active >= 0 && !S.minis[S.active]) { humanPlay(S.active * 9 + d); return; }
            if (pickBoard < 0) {
                if (S.minis[d]) return;
                pickBoard = d; cursor = d * 9 + 4; refresh();
            } else humanPlay(pickBoard * 9 + d);
        }
    });

    btnNew.addEventListener('click', newGame);

    function syncDesc() {
        $('#mode-desc').textContent = DESC[opp];
        const ult = variant === 'ultimate';
        $('#rules-ultimate').hidden = !ult;
        $('#keys-ultimate').hidden = !ult;
    }
    $('#variants').addEventListener('click', e => {
        const b = e.target.closest('[data-variant]'); if (!b) return;
        variant = b.dataset.variant;
        $$('#variants .chip').forEach(c => c.classList.toggle('is-active', c === b));
        starter = 'X'; syncDesc(); newGame();
    });
    $('#opps').addEventListener('click', e => {
        const b = e.target.closest('[data-opp]'); if (!b) return;
        opp = b.dataset.opp;
        $$('#opps .chip').forEach(c => c.classList.toggle('is-active', c === b));
        starter = 'X'; hardDraws = 0; syncDesc(); newGame();
    });

    syncDesc();
    newGame();
});
