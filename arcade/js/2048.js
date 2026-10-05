/* 2048 – Kacheln schieben und verschmelzen (DOM-Kacheln mit CSS-Animationen) */
XIRU.ready(function () {
    const G = XIRU.Game;
    const N = 4;
    const $ = id => document.getElementById(id);
    const tilesEl = $('tiles'), stage = $('stage');
    const ovEl = $('ov');
    document.querySelector('.t48__cells').innerHTML = '<span></span>'.repeat(N * N);

    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const KEYMAP = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };

    let grid, score, moves, won, keepPlaying, over, reported, undoSnap, nextId = 1;
    let pending = [], flushTimer = 0;
    const stats = Object.assign({ bestTile: 0 }, XIRU.load('2048-stats') || {});

    /* ── Kacheln im DOM ─────────────────────────────────────────────────── */
    function makeTile(x, y, v, extra) {
        const el = document.createElement('div');
        el.innerHTML = '<div class="t48-tile__in"></div>';
        const t = { id: nextId++, x, y, v, el };
        render(t, extra);
        setPos(t);
        tilesEl.appendChild(el);
        return t;
    }
    function setPos(t) { t.el.style.setProperty('--x', t.x); t.el.style.setProperty('--y', t.y); }
    function render(t, extra) {
        const digits = String(t.v).length;
        t.el.className = 't48-tile ' + (t.v > 2048 ? 'vsuper' : 'v' + t.v) + (digits > 2 ? ' d' + digits : '') + (extra ? ' ' + extra : '');
        t.el.firstChild.textContent = t.v;
        t.el.setAttribute('aria-label', String(t.v));
    }
    function pop(t) { render(t); void t.el.offsetWidth; t.el.classList.add('is-pop'); }

    function flush() {
        clearTimeout(flushTimer);
        const p = pending; pending = [];
        p.forEach(fn => fn());
    }

    /* ── Zustand ────────────────────────────────────────────────────────── */
    function values() { return grid.map(row => row.map(t => t ? t.v : 0)); }
    function snapshot() { return { cells: values(), score, moves }; }
    function build(cells) {
        flush();
        tilesEl.innerHTML = '';
        grid = Array.from({ length: N }, () => Array(N).fill(null));
        cells.forEach((row, y) => row.forEach((v, x) => { if (v) grid[y][x] = makeTile(x, y, v, 'is-new'); }));
    }
    function empties() {
        const out = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) out.push([x, y]);
        return out;
    }
    function spawn() {
        const e = empties(); if (!e.length) return;
        const [x, y] = XIRU.pick(e);
        grid[y][x] = makeTile(x, y, Math.random() < .9 ? 2 : 4, 'is-new');
    }
    function maxTile() { return Math.max(...values().flat()); }
    function canMove() {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const t = grid[y][x]; if (!t) return true;
            if (x < N - 1 && grid[y][x + 1] && grid[y][x + 1].v === t.v) return true;
            if (y < N - 1 && grid[y + 1][x] && grid[y + 1][x].v === t.v) return true;
        }
        return false;
    }
    function persist() {
        XIRU.save('2048', { cells: values(), score, moves, won, keepPlaying, over, reported, undo: undoSnap });
    }

    /* ── Anzeige ────────────────────────────────────────────────────────── */
    function updateHud(gained) {
        $('h-score').textContent = XIRU.fmt(score);
        $('h-moves').textContent = XIRU.fmt(moves);
        $('h-max').textContent = XIRU.fmt(maxTile());
        if (gained) {
            const p = $('h-plus');
            p.textContent = '+' + gained; p.classList.remove('is-on'); void p.offsetWidth; p.classList.add('is-on');
        }
        $('btn-undo').disabled = !undoSnap;
        const b = XIRU.best('2048');
        $('best').textContent = b == null ? '–' : XIRU.fmt(b);
        $('best-tile').textContent = 'Grösste Kachel: ' + (stats.bestTile ? XIRU.fmt(stats.bestTile) : '–');
        stage.classList.toggle('is-over', !!over);
    }

    function showOverlay(o) {
        ovEl.innerHTML = '<div style="font-size:3rem">' + o.icon + '</div><h2>' + XIRU.esc(o.title) + '</h2>' +
            '<p>' + o.text + '</p><div class="t48-over-btns">' +
            o.buttons.map((b, i) => '<button class="btn ' + (b.primary ? 'btn--primary ' : '') + 'btn--lg" type="button" data-i="' + i + '">' + XIRU.esc(b.label) + '</button>').join('') +
            '</div>';
        ovEl.hidden = false;
        ovEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { XIRU.audio(); o.buttons[+btn.dataset.i].fn(); }));
        setTimeout(() => { const f = ovEl.querySelector('.btn--primary'); if (f) f.focus({ preventScroll: true }); }, 60);
    }
    function hideOverlay() { ovEl.hidden = true; }

    /* ── Spielzug ───────────────────────────────────────────────────────── */
    function move(dir) {
        if (over || !ovEl.hidden) return;
        flush();
        const [dx, dy] = DIRS[dir];
        const xs = [0, 1, 2, 3], ys = [0, 1, 2, 3];
        if (dx === 1) xs.reverse();
        if (dy === 1) ys.reverse();
        const snap = snapshot();
        const merged = new Set();
        let moved = false, gained = 0;

        for (const y of ys) for (const x of xs) {
            const t = grid[y][x]; if (!t) continue;
            let cx = x, cy = y, target = null;
            for (;;) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
                const o = grid[ny][nx];
                if (!o) { cx = nx; cy = ny; continue; }
                if (o.v === t.v && !merged.has(o)) target = o;
                break;
            }
            if (target) {
                grid[y][x] = null;
                t.x = target.x; t.y = target.y; setPos(t);
                t.el.classList.add('is-merging');
                target.v *= 2; merged.add(target); gained += target.v;
                pending.push(() => { t.el.remove(); pop(target); });
                moved = true;
            } else if (cx !== x || cy !== y) {
                grid[y][x] = null; grid[cy][cx] = t; t.x = cx; t.y = cy; setPos(t);
                moved = true;
            }
        }
        if (!moved) { nudge(dir); return; }

        undoSnap = snap;
        moves++; score += gained;
        spawn();
        flushTimer = setTimeout(flush, 115);
        gained ? (gained >= 128 ? G.sfx.coin() : XIRU.beep(330 + Math.log2(gained) * 40, .05, 'triangle', .04)) : G.sfx.click();

        const top = maxTile();
        if (top > stats.bestTile) { stats.bestTile = top; XIRU.save('2048-stats', stats); }
        if (top >= 1024) XIRU.egg('g-2048-kilobyte');
        if (top >= 2048) XIRU.egg('g-2048-2048');

        if (!won && top >= 2048) {
            won = true;
            setTimeout(() => {
                XIRU.confetti(); G.sfx.win();
                showOverlay({
                    icon: '🏆', title: '2048 erreicht!',
                    text: 'Stark! ' + XIRU.fmt(score) + ' Punkte nach ' + XIRU.fmt(moves) + ' Zügen. Hörst du auf oder jagst du die 4096?',
                    buttons: [
                        { label: 'Weiterspielen', primary: true, fn: continuePlaying },
                        { label: 'Neues Spiel', fn: () => newGame(true) }
                    ]
                });
            }, 260);
        } else if (!canMove()) {
            over = true;
            const r = report();
            setTimeout(() => gameOver(r), 260);
        }
        persist();
        updateHud(gained);
    }
    function nudge(dir) {
        const [dx, dy] = DIRS[dir];
        const b = $('board');
        b.animate([{ transform: 'none' }, { transform: 'translate(' + dx * 5 + 'px,' + dy * 5 + 'px)' }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
    }

    function report() {
        if (reported || score <= 0) return null;
        reported = true;
        return XIRU.score('2048', score);
    }

    function continuePlaying() {
        keepPlaying = true; hideOverlay(); persist();
        if (!canMove()) { over = true; gameOver(report()); }
    }

    function gameOver(r) {
        over = true;
        G.sfx.die();
        persist(); updateHud();
        showOverlay({
            icon: '🧱', title: 'Keine Züge mehr',
            text: XIRU.fmt(score) + ' Punkte · grösste Kachel ' + XIRU.fmt(maxTile()) + (r && r.isNew ? ' – <b>neuer Rekord!</b>' : '') +
                '<br><span class="small faint">Ein letzter Rückgängig-Zug ist noch erlaubt …</span>',
            buttons: [
                { label: 'Neues Spiel', primary: true, fn: () => newGame(true) },
                { label: '↶ Rückgängig', fn: undo }
            ]
        });
    }

    function undo() {
        if (!undoSnap) return;
        if (over) XIRU.egg('g-2048-zeitreise');
        const s = undoSnap;
        undoSnap = null;
        over = false;
        hideOverlay();
        build(s.cells);
        score = s.score; moves = s.moves;
        tilesEl.querySelectorAll('.is-new').forEach(el => el.classList.remove('is-new'));
        G.sfx.jump();
        persist(); updateHud();
    }

    function newGame(force) {
        if (!force && !over && score > 0) {
            const m = XIRU.modal('<h2>Neues Spiel?</h2><p>Dein aktuelles Spiel (' + XIRU.fmt(score) + ' Punkte) wird gewertet und beendet.</p>' +
                '<div class="row mt-2"><button class="btn btn--primary" type="button" data-ok>Ja, neu starten</button><button class="btn" type="button" data-close>Weiterspielen</button></div>');
            m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); newGame(true); });
            return;
        }
        if (!over) report();
        score = 0; moves = 0; won = false; keepPlaying = false; over = false; reported = false; undoSnap = null;
        hideOverlay();
        build([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
        spawn(); spawn();
        persist(); updateHud();
    }

    /* ── Eingaben ───────────────────────────────────────────────────────── */
    const busy = () => !!document.querySelector('.modal-backdrop');
    G.keys.onPress((key, e) => {
        const k = String(key).toLowerCase();
        if (busy()) return;
        if (e && (e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        if (KEYMAP[k]) { if (e && /^[wasd]$/.test(k) && !ovEl.hidden) return; move(KEYMAP[k]); }
        else if (k === 'z') undo();
        else if (k === 'n') newGame(false);
    });
    G.swipe('#stage', dir => { if (!busy()) move(dir); });
    $('btn-undo').addEventListener('click', undo);
    $('btn-new').addEventListener('click', () => newGame(false));

    /* ── Start: gespeichertes Spiel fortsetzen ─────────────────────────── */
    const saved = XIRU.load('2048');
    if (saved && saved.cells && !saved.over && saved.cells.flat().some(v => v)) {
        score = saved.score || 0; moves = saved.moves || 0; won = !!saved.won; keepPlaying = !!saved.keepPlaying;
        over = false; reported = !!saved.reported; undoSnap = saved.undo || null;
        build(saved.cells);
        updateHud();
        if (won && !keepPlaying) {
            showOverlay({
                icon: '🏆', title: '2048 erreicht!', text: 'Du hattest die 2048 schon geschafft. Weiter geht\'s?',
                buttons: [
                    { label: 'Weiterspielen', primary: true, fn: continuePlaying },
                    { label: 'Neues Spiel', fn: () => newGame(true) }
                ]
            });
        }
    } else {
        newGame(true);
    }
});
