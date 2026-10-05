/* Nonogramm – 17 handgemachte Pixelbilder (alle per Zeilenlogik eindeutig lösbar) + Zufallsbilder.
   Gelöst ist ein Rätsel, sobald alle Zeilen- und Spaltenhinweise erfüllt sind.
   Wertung: XIRU.score('nonogramm', anzahlGelösterHandbilder). */
XIRU.ready(function () {
    const G = XIRU.Game;
    const $ = id => document.getElementById(id);
    const boardEl = $('board'), wrapEl = $('wrap'), stage = $('stage'), ovEl = $('ov');

    const PUZZLES = [
        { id: 'herz', n: 'Herz', s: ['.#.#.', '#####', '#####', '.###.', '..#..'] },
        { id: 'geist', n: 'Geist', s: ['.###.', '#.#.#', '#####', '#####', '#.#.#'] },
        { id: 'pfeil', n: 'Pfeil', s: ['..#..', '.###.', '#.#.#', '..#..', '..#..'] },
        { id: 'pilzchen', n: 'Pilzchen', s: ['.###.', '##.##', '#####', '.#.#.', '.###.'] },
        { id: 'haus', n: 'Haus', s: ['..#..', '.###.', '#####', '##.##', '##.##'] },
        { id: 'diskette', n: 'Diskette', s: ['#########.', '#.#####.##', '#.##.##.##', '#.#####..#', '#........#', '#.######.#', '#.#....#.#', '#.#....#.#', '#.######.#', '##########'] },
        { id: 'controller', n: 'Controller', s: ['..........', '..........', '.########.', '##.####.##', '#...##.#.#', '##.####.##', '##########', '###....###', '##......##', '..........'] },
        { id: 'joystick', n: 'Joystick', s: ['...##.....', '..####....', '..####....', '...##.....', '...##.....', '...##..#..', '.########.', '##########', '##########', '.########.'] },
        { id: 'invasor', n: 'Invasor', s: ['..........', '..#....#..', '...#..#...', '..######..', '.##.##.##.', '##########', '#.######.#', '#.#....#.#', '..##..##..', '..........'] },
        { id: 'monitor', n: 'Monitor', s: ['##########', '#........#', '#.#......#', '#..#.....#', '#.#..##..#', '#........#', '##########', '....##....', '...####...', '.########.'] },
        { id: 'maus', n: 'Maus', s: ['.....#....', '.....#....', '...#####..', '..###.###.', '..###.###.', '..#######.', '..#######.', '..#######.', '...#####..', '..........'] },
        { id: 'pilz', n: 'Pilz', s: ['...####...', '.###..###.', '##.####.##', '#..####..#', '##########', '..######..', '..#.##.#..', '..#.##.#..', '..######..', '...####...'] },
        { id: 'kassette', n: 'Kassette', s: ['##########', '#........#', '#.######.#', '#.#.##.#.#', '#.######.#', '#........#', '#..####..#', '#.#....#.#', '##########', '..........'] },
        { id: 'handheld', n: 'Handheld-Konsole', s: ['.#############.', '.#############.', '.##.........##.', '.##.........##.', '.##.........##.', '.##.........##.', '.##.........##.', '.#############.', '.#############.', '.###.#####.###.', '.##...###.####.', '.###.#########.', '.#############.', '.#####.#.#####.', '..###########..'] },
        { id: 'rakete', n: 'Rakete', s: ['.......#.......', '......###......', '.....#####.....', '.....##.##.....', '.....#...#.....', '.....##.##.....', '.....#####.....', '.....#####.....', '....#######....', '...##.###.##...', '..###.###.###..', '.####.###.####.', '.....#.#.#.....', '......#.#......', '.......#.......'] },
        { id: 'katze', n: 'Katze', s: ['..#.........#..', '.##.........##.', '.###.......###.', '.#############.', '.#############.', '.###..###..###.', '.###..###..###.', '.#############.', '#######.#######', '.#####.#.#####.', '######...######', '.#############.', '..###########..', '...#########...', '.....#####.....'] },
        { id: 'grafikkarte', n: 'Grafikkarte', s: ['...............', '###############', '#.............#', '#..###...###..#', '#.#.#.#.#.#.#.#', '#.##.##.##.##.#', '#.#.#.#.#.#.#.#', '#..###...###..#', '#.............#', '###############', '#..#########...', '#..#.#.#.#.#...', '#..............', '...............', '...............'] }
    ];
    const BY_ID = {};
    PUZZLES.forEach(p => { BY_ID[p.id] = p; p.N = p.s.length; p.sol = p.s.join('').split('').map(ch => ch === '#' ? 1 : 0); });

    /* ── Hinweise & Zeilenlogik ─────────────────────────────────────────── */
    function runs(line) {
        const out = []; let n = 0;
        for (const v of line) { if (v === 1) n++; else if (n) { out.push(n); n = 0; } }
        if (n) out.push(n);
        return out;
    }
    function rowOf(arr, N, y) { return arr.slice(y * N, y * N + N); }
    function colOf(arr, N, x) { const o = []; for (let y = 0; y < N; y++) o.push(arr[y * N + x]); return o; }

    // Alle Platzierungen einer Zeile durchgehen: welche Felder sind sicher voll/leer?
    function lineSolve(cl, cur) {
        const n = cur.length, canF = Array(n).fill(false), canE = Array(n).fill(false), row = Array(n).fill(0);
        let any = false;
        const tail = cl.map((_, i) => cl.slice(i + 1).reduce((s, k) => s + k + 1, 0));
        (function rec(i, pos) {
            if (i === cl.length) {
                for (let j = pos; j < n; j++) if (cur[j] === 1) return;
                any = true;
                for (let j = 0; j < n; j++) { if (j < pos && row[j]) canF[j] = true; else canE[j] = true; }
                return;
            }
            const k = cl[i];
            for (let s = pos; s + k + tail[i] <= n; s++) {
                if (s > pos && cur[s - 1] === 1) break;
                let ok = true;
                for (let j = s; j < s + k; j++) if (cur[j] === 0) { ok = false; break; }
                if (ok && s + k < n && cur[s + k] === 1) ok = false;
                if (!ok) continue;
                for (let j = pos; j < s; j++) row[j] = 0;
                for (let j = s; j < s + k; j++) row[j] = 1;
                if (s + k < n) row[s + k] = 0;
                rec(i + 1, Math.min(n, s + k + 1));
            }
        })(0, 0);
        if (!any) return null;
        return cur.map((v, j) => canF[j] && !canE[j] ? 1 : (!canF[j] && canE[j] ? 0 : -1));
    }
    function logicSolvable(sol, N) {
        const rc = [], cc = [];
        for (let i = 0; i < N; i++) { rc.push(runs(rowOf(sol, N, i))); cc.push(runs(colOf(sol, N, i))); }
        const g = Array(N * N).fill(-1);
        let changed = true;
        while (changed) {
            changed = false;
            for (let y = 0; y < N; y++) {
                const r = lineSolve(rc[y], rowOf(g, N, y)); if (!r) return false;
                r.forEach((v, x) => { if (g[y * N + x] !== v) { g[y * N + x] = v; changed = true; } });
            }
            for (let x = 0; x < N; x++) {
                const r = lineSolve(cc[x], colOf(g, N, x)); if (!r) return false;
                r.forEach((v, y) => { if (g[y * N + x] !== v) { g[y * N + x] = v; changed = true; } });
            }
        }
        return g.every(v => v !== -1);
    }
    function randomPicture(N) {
        let last = null;
        for (let t = 0; t < 400; t++) {
            const d = .52 + Math.random() * .12;
            const sol = Array.from({ length: N * N }, () => Math.random() < d ? 1 : 0);
            last = sol;
            if (logicSolvable(sol, N)) return sol;
        }
        return last;
    }

    /* ── Speicher ───────────────────────────────────────────────────────── */
    const data = Object.assign({ solved: {}, prog: {}, last: 'herz', rand: null, randSolved: 0 }, XIRU.load('nonogramm') || {});
    const persist = () => XIRU.save('nonogramm', data);
    const solvedCount = () => PUZZLES.filter(p => data.solved[p.id]).length;

    /* ── Zustand ────────────────────────────────────────────────────────── */
    let cur = null, cells = null, N = 0, rowClues = [], colClues = [], cellEls = [], rowEls = [], colEls = [];
    let tool = 'fill', undoStack = [], solved = false, cursor = 0, showCursor = false;
    let tStart = 0, tBase = 0, timerId = 0;

    function load(p, skipSave) {
        if (!skipSave) saveProgress();
        cur = p; N = p.N; solved = false; undoStack = [];
        const pr = p.random ? data.rand : data.prog[p.id];
        cells = Array(N * N).fill(0);
        if (pr && pr.c && pr.c.length === N * N) cells = pr.c.split('').map(Number);
        tBase = pr && pr.t || 0;
        data.last = p.random ? 'zufall' : p.id;
        rowClues = []; colClues = [];
        for (let i = 0; i < N; i++) { rowClues.push(runs(rowOf(p.sol, N, i))); colClues.push(runs(colOf(p.sol, N, i))); }
        build();
        ovEl.hidden = true;
        cursor = 0;
        const done = !p.random && data.solved[p.id] && checkAll();
        if (done) { solved = true; boardEl.classList.add('is-solved'); }
        else startTimer();
        refresh(); renderPicker(); persist();
        boardEl.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
    }

    function build() {
        boardEl.innerHTML = '';
        boardEl.classList.remove('is-solved');
        boardEl.style.setProperty('--n', N);
        const frag = document.createDocumentFragment();
        const corner = document.createElement('div'); corner.className = 'ng-corner'; frag.appendChild(corner);
        colEls = colClues.map(cl => {
            const d = document.createElement('div'); d.className = 'ng-cc';
            d.innerHTML = (cl.length ? cl : [0]).map(v => '<span>' + v + '</span>').join('');
            frag.appendChild(d); return d;
        });
        rowEls = []; cellEls = [];
        for (let y = 0; y < N; y++) {
            const r = document.createElement('div'); r.className = 'ng-rc';
            r.innerHTML = (rowClues[y].length ? rowClues[y] : [0]).map(v => '<span>' + v + '</span>').join('');
            frag.appendChild(r); rowEls.push(r);
            for (let x = 0; x < N; x++) {
                const c = document.createElement('div');
                c.dataset.i = y * N + x;
                c.dataset.base = 'ng-c' + (y === 0 ? ' t' : '') + (x === 0 ? ' l' : '') + (x % 5 === 4 ? ' r5' : '') + (y % 5 === 4 ? ' b5' : '');
                c.className = c.dataset.base;
                frag.appendChild(c); cellEls.push(c);
            }
        }
        boardEl.appendChild(frag);
        fit();
    }
    function fit() {
        if (!cur) return;
        const maxRow = Math.max(1, ...rowClues.map(c => c.length));
        const maxCol = Math.max(1, ...colClues.map(c => c.length));
        const availW = wrapEl.clientWidth - 36, availH = innerHeight * .78 - 40;
        const csW = availW / (N + maxRow * .8 + .6);
        const csH = availH / (N + maxCol * .62 + .5);
        const cs = Math.max(16, Math.min(40, Math.floor(Math.min(csW, csH))));
        boardEl.style.setProperty('--cs', cs + 'px');
    }
    addEventListener('resize', fit);

    function paintCell(i) {
        const c = cellEls[i];
        c.className = c.dataset.base + (cells[i] === 1 ? ' f' : cells[i] === 2 ? ' x' : '') + (showCursor && i === cursor ? ' cur' : '');
    }
    const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    function lineState(line, clue) {
        const r = runs(line);
        if (eq(r, clue)) return 'done';
        const filled = line.filter(v => v === 1).length, need = clue.reduce((s, v) => s + v, 0);
        if (filled > need || (clue.length && r.length && Math.max(...r) > Math.max(...clue))) return 'err';
        return '';
    }
    function checkAll() {
        for (let i = 0; i < N; i++) {
            if (!eq(runs(rowOf(cells, N, i)), rowClues[i])) return false;
            if (!eq(runs(colOf(cells, N, i)), colClues[i])) return false;
        }
        return true;
    }
    function refresh() {
        for (let i = 0; i < N * N; i++) paintCell(i);
        for (let i = 0; i < N; i++) {
            const rs = lineState(rowOf(cells, N, i), rowClues[i]);
            rowEls[i].classList.toggle('done', rs === 'done'); rowEls[i].classList.toggle('err', rs === 'err');
            const cs = lineState(colOf(cells, N, i), colClues[i]);
            colEls[i].classList.toggle('done', cs === 'done'); colEls[i].classList.toggle('err', cs === 'err');
        }
        $('h-name').textContent = solved || (!cur.random && data.solved[cur.id]) ? cur.n : (cur.random ? 'Zufallsbild' : '?');
        $('h-size').textContent = N + ' × ' + N;
        $('h-fill').textContent = cells.filter(v => v === 1).length + ' / ' + cur.sol.filter(v => v).length;
        $('btn-undo').disabled = !undoStack.length || solved;
        const b = XIRU.best('nonogramm');
        $('best').textContent = b == null ? '–' : b;
        $('best-sub').textContent = 'gelöste Bilder von ' + PUZZLES.length + (data.randSolved ? ' · ' + data.randSolved + ' Zufallsbilder' : '');
    }
    function highlight(i) {
        const x = i == null ? -1 : i % N, y = i == null ? -1 : (i / N) | 0;
        rowEls.forEach((el, k) => el.classList.toggle('hl', k === y));
        colEls.forEach((el, k) => el.classList.toggle('hl', k === x));
        cellEls.forEach((el, k) => el.classList.toggle('hl', k % N === x || ((k / N) | 0) === y));
    }

    /* ── Zeit ───────────────────────────────────────────────────────────── */
    const fmtTime = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const elapsed = () => tBase + (tStart ? (performance.now() - tStart) / 1000 : 0);
    function startTimer() {
        clearInterval(timerId); tStart = performance.now();
        timerId = setInterval(() => { $('h-time').textContent = fmtTime(elapsed()); }, 500);
        $('h-time').textContent = fmtTime(elapsed());
    }
    function stopTimer() { tBase = elapsed(); tStart = 0; clearInterval(timerId); $('h-time').textContent = fmtTime(tBase); }
    document.addEventListener('visibilitychange', () => {
        if (!cur || solved) return;
        if (document.hidden) { stopTimer(); saveProgress(); } else startTimer();
    });
    function saveProgress() {
        if (!cur || !cells || (cur.random && solved)) return;
        const entry = { c: cells.join(''), t: Math.round(elapsed()) };
        if (cur.random) data.rand = Object.assign(data.rand || {}, entry, { N, sol: cur.sol.join('') });
        else if (!data.solved[cur.id] || solved) data.prog[cur.id] = entry;
        persist();
    }

    /* ── Malen ──────────────────────────────────────────────────────────── */
    let stroke = null;
    function applyTo(i) {
        if (!stroke || stroke.done.has(i)) return;
        stroke.done.add(i);
        const v = cells[i];
        if (v !== stroke.from) return;
        stroke.changes.push([i, v]);
        cells[i] = stroke.target;
        paintCell(i);
        stroke.target === 1 ? XIRU.beep(500 + (stroke.changes.length % 8) * 40, .025, 'square', .025) : XIRU.beep(300, .02, 'triangle', .02);
    }
    function startStroke(i, cross) {
        if (solved) return;
        // Der Strich wirkt nur auf Felder mit demselben Startzustand wie das erste Feld
        const v = cells[i];
        const target = cross ? (v === 2 ? 0 : 2) : (v === 1 ? 0 : 1);
        stroke = { target, from: v, start: i, axis: null, done: new Set(), changes: [] };
        applyTo(i);
    }
    function extendStroke(i) {
        if (!stroke || i == null) return;
        const sx = stroke.start % N, sy = (stroke.start / N) | 0, x = i % N, y = (i / N) | 0;
        if (!stroke.axis) { if (y === sy && x !== sx) stroke.axis = 'h'; else if (x === sx && y !== sy) stroke.axis = 'v'; else if (x !== sx) stroke.axis = Math.abs(x - sx) >= Math.abs(y - sy) ? 'h' : 'v'; else return; }
        if (stroke.axis === 'h') { for (let k = Math.min(sx, x); k <= Math.max(sx, x); k++) applyTo(sy * N + k); }
        else { for (let k = Math.min(sy, y); k <= Math.max(sy, y); k++) applyTo(k * N + sx); }
    }
    function endStroke() {
        if (!stroke) return;
        const s = stroke; stroke = null;
        if (!s.changes.length) return;
        undoStack.push(s.changes);
        afterChange();
    }
    function afterChange() {
        refresh(); saveProgress();
        if (cells.every(v => v === 2)) XIRU.egg('g-nonogramm-kreuz');
        if (checkAll()) win();
    }
    function undo() {
        if (solved || !undoStack.length) return;
        undoStack.pop().forEach(([i, v]) => { cells[i] = v; });
        G.sfx.jump(); afterChange();
    }

    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.dataset && el.dataset.i != null && boardEl.contains(el) ? +el.dataset.i : null; };
    boardEl.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
    boardEl.addEventListener('pointerdown', e => {
        const i = cellAt(e.clientX, e.clientY); if (i == null) return;
        e.preventDefault(); XIRU.audio();
        if (showCursor) { showCursor = false; paintCell(cursor); }
        boardEl.setPointerCapture(e.pointerId);
        startStroke(i, e.button === 2 || (e.button === 0 && tool === 'cross'));
    });
    boardEl.addEventListener('pointermove', e => {
        const i = cellAt(e.clientX, e.clientY);
        if (stroke) extendStroke(i);
        if (i != null && !solved) highlight(i);
    });
    boardEl.addEventListener('pointerup', endStroke);
    boardEl.addEventListener('pointercancel', endStroke);
    boardEl.addEventListener('pointerleave', () => { if (!stroke) highlight(null); });

    document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    function setTool(t) {
        tool = t;
        document.querySelectorAll('[data-tool]').forEach(b => { const on = b.dataset.tool === t; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    }
    $('btn-undo').addEventListener('click', undo);
    $('btn-reset').addEventListener('click', () => {
        if (solved) {   // gelöstes Bild nochmals spielen
            solved = false; boardEl.classList.remove('is-solved'); ovEl.hidden = true;
            cells.fill(0); undoStack = []; tBase = 0; startTimer(); refresh(); saveProgress();
            return;
        }
        if (!cells.some(v => v)) return;
        const m = XIRU.modal('<h2>Feld leeren?</h2><p>Alle Füllungen und Kreuze in diesem Bild werden gelöscht.</p><div class="row mt-2"><button class="btn btn--primary" type="button" data-ok>Leeren</button><button class="btn" type="button" data-close>Abbrechen</button></div>');
        m.el.querySelector('[data-ok]').addEventListener('click', () => {
            m.close();
            undoStack.push(cells.map((v, i) => [i, v]).filter(([, v]) => v));
            cells.fill(0); afterChange();
        });
    });

    G.keys.onPress((key, e) => {
        if (document.querySelector('.modal-backdrop') || !cur) return;
        const k = String(key).toLowerCase();
        if (e && (e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (mv) {
            if (e) e.preventDefault();
            const prev = cursor;
            if (showCursor) cursor = ((((cursor / N) | 0) + mv[1] + N) % N) * N + ((cursor % N) + mv[0] + N) % N;
            showCursor = true; paintCell(prev); paintCell(cursor); highlight(cursor);
            if (stroke) extendStroke(cursor);
            return;
        }
        if ((k === ' ' || k === 'enter' || k === 'x') && !solved && ovEl.hidden) {
            if (e) e.preventDefault();
            showCursor = true;
            startStroke(cursor, k === 'x'); endStroke(); paintCell(cursor);
        } else if (k === 'z') undo();
    });

    /* ── Gelöst ─────────────────────────────────────────────────────────── */
    function picture(sol, n, size, color) {
        const c = document.createElement('canvas');
        c.width = c.height = n; const x = c.getContext('2d');
        x.fillStyle = color || G.css('--rc');
        sol.forEach((v, i) => { if (v) x.fillRect(i % n, (i / n) | 0, 1, 1); });
        if (size) { c.style.width = c.style.height = size + 'px'; }
        return c;
    }
    function win() {
        solved = true; stopTimer();
        const t = Math.round(tBase);
        cells = cells.map(v => v === 1 ? 1 : 0);
        refresh();
        cellEls.forEach((el, i) => el.style.setProperty('--d', (((i % N) + ((i / N) | 0)) * .025) + 's'));
        boardEl.classList.add('is-solved');
        highlight(null);
        G.sfx.win(); XIRU.confetti();
        let text;
        if (cur.random) {
            data.randSolved = (data.randSolved || 0) + 1; data.rand = null;
            text = 'Zufallsbild ' + N + ' × ' + N + ' in ' + fmtTime(t) + ' gelöst.';
        } else {
            const first = !data.solved[cur.id];
            data.solved[cur.id] = Date.now();
            data.prog[cur.id] = { c: cells.join(''), t };
            const cnt = solvedCount();
            if (first) XIRU.score('nonogramm', cnt);
            text = 'Es ist: <b>' + XIRU.esc(cur.n) + '</b> · ' + fmtTime(t) + ' · ' + cnt + ' von ' + PUZZLES.length + ' Bildern gelöst.';
            if (cur.id === 'diskette') XIRU.egg('g-nonogramm-diskette');
            if (cnt === PUZZLES.length) XIRU.egg('g-nonogramm-alle');
        }
        persist(); refresh(); renderPicker();
        const next = PUZZLES.find(p => !data.solved[p.id]);
        setTimeout(() => {
            ovEl.classList.add('ng-lite');
            G.overlay(ovEl).show({
                icon: cur.random ? '🎲' : '🖼', title: cur.random ? 'Gelöst!' : cur.n + '!', text, html: true,
                button: cur.random ? 'Neues Zufallsbild' : (next ? 'Nächstes Bild' : 'Zufallsbild'),
                onClick: () => cur.random || !next ? loadRandom(cur.random ? N : 10) : load(next)
            });
        }, 900);
    }

    /* ── Rätselauswahl ──────────────────────────────────────────────────── */
    function renderPicker() {
        const groups = [5, 10, 15];
        $('picker').innerHTML = groups.map(sz => '<h4 class="ng-group">' + sz + ' × ' + sz + '</h4><div class="ng-list" data-size="' + sz + '"></div>').join('');
        PUZZLES.forEach(p => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'ng-pick';
            const isSolved = !!data.solved[p.id];
            if (isSolved) { b.classList.add('is-solved'); b.appendChild(picture(p.sol, p.N)); b.title = p.n + ' (gelöst)'; }
            else { b.textContent = '?'; b.title = 'Unbekanntes Bild ' + p.N + ' × ' + p.N; if (data.prog[p.id] && /[12]/.test(data.prog[p.id].c)) b.classList.add('is-wip'); }
            if (cur && !cur.random && cur.id === p.id) b.classList.add('is-active');
            b.setAttribute('aria-label', isSolved ? p.n : 'Rätsel ' + p.N + ' mal ' + p.N);
            b.addEventListener('click', () => load(p));
            $('picker').querySelector('[data-size="' + p.N + '"]').appendChild(b);
        });
    }
    function loadRandom(n) {
        saveProgress();
        const sol = randomPicture(n);
        data.rand = { N: n, sol: sol.join(''), c: '0'.repeat(n * n), t: 0 };
        load({ id: 'zufall', n: 'Zufallsbild', N: n, sol, random: true }, true);
    }
    $('random').addEventListener('click', e => {
        const b = e.target.closest('[data-rand]'); if (!b) return;
        loadRandom(+b.dataset.rand);
    });
    addEventListener('pagehide', saveProgress);

    /* ── Start ──────────────────────────────────────────────────────────── */
    if (data.rand && data.rand.sol && data.last === 'zufall') {
        load({ id: 'zufall', n: 'Zufallsbild', N: data.rand.N, sol: data.rand.sol.split('').map(Number), random: true });
    } else {
        load(BY_ID[data.last] || PUZZLES.find(p => !data.solved[p.id]) || PUZZLES[0]);
    }
});
