/* Minensucher – DOM-Raster, erster Klick immer sicher, Flaggen, Chording, Tastatur & Touch
   Wertung: XIRU.score('minen', sekunden, { lower: true }) für jede gewonnene Standardstufe
   (Anfänger, Fortgeschritten, Profi). Bestzeiten pro Stufe liegen in XIRU.load('minen-stats').
   Eigene Felder und Runden mit Schummelpixel zählen nicht. */
XIRU.ready(function () {
    const G = XIRU.Game;
    const $ = id => document.getElementById(id);
    const boardEl = $('board'), stage = $('stage'), scrollEl = $('scroll'), ovEl = $('ov');

    const LEVELS = {
        anfaenger: { name: 'Anfänger', w: 9, h: 9, m: 10 },
        fortgeschritten: { name: 'Fortgeschritten', w: 16, h: 16, m: 40 },
        profi: { name: 'Profi', w: 30, h: 16, m: 99 },
        eigen: { name: 'Eigenes Feld', w: 20, h: 12, m: 40 }
    };
    const STANDARD = ['anfaenger', 'fortgeschritten', 'profi'];
    const stats = Object.assign({}, XIRU.load('minen-stats') || {});
    const pref = XIRU.load('minen-pref') || {};
    if (pref.custom) Object.assign(LEVELS.eigen, pref.custom);

    let level = LEVELS[pref.level] ? pref.level : 'anfaenger';
    let W, H, M, cells, els, state, opened, flags, startT, elapsed, timerId;
    let flagMode = false, cursor = 0, showCursor = false, usedFlag = false;
    let cheat = false, cheatedGame = false, paused = false;

    /* ── Aufbau ─────────────────────────────────────────────────────────── */
    function newGame() {
        const L = LEVELS[level];
        W = L.w; H = L.h; M = L.m;
        // Profi auf schmalen Bildschirmen hochkant
        if (level === 'profi' && scrollEl.clientWidth < 30 * (minCs() + 2) + 32) { W = 16; H = 30; }
        M = Math.min(M, W * H - 1);
        cells = Array.from({ length: W * H }, () => ({ mine: false, n: 0, open: false, flag: false }));
        state = 'ready'; opened = 0; flags = 0; elapsed = 0; usedFlag = false; cheatedGame = cheat; paused = false;
        clearInterval(timerId);
        cursor = Math.floor(H / 2) * W + Math.floor(W / 2);
        boardEl.style.setProperty('--cols', W);
        boardEl.innerHTML = '';
        const frag = document.createDocumentFragment();
        els = cells.map((c, i) => {
            const d = document.createElement('div');
            d.className = 'mn-c'; d.dataset.i = i; d.setAttribute('role', 'gridcell');
            frag.appendChild(d); return d;
        });
        boardEl.appendChild(frag);
        stage.classList.remove('is-won', 'is-paused');
        ovEl.hidden = true;
        setFace('🙂');
        fit(); updateHud(); renderCursor();
        $('status').textContent = 'Klick irgendwo hin – das erste Feld ist immer sicher.';
    }

    const minCs = () => matchMedia('(pointer: coarse)').matches ? 28 : 20;
    function fit() {
        const avail = scrollEl.clientWidth - 32;
        const availH = innerHeight * .74 - 32;
        const cs = Math.max(minCs(), Math.min(38, Math.floor((avail - (W - 1) * 2) / W), Math.floor((availH - (H - 1) * 2) / H)));
        boardEl.style.setProperty('--cs', cs + 'px');
    }
    addEventListener('resize', () => { if (els) fit(); });

    function neighbors(i) {
        const x = i % W, y = (i / W) | 0, out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
        }
        return out;
    }

    function placeMines(safe) {
        const banned = new Set([safe]);
        if (W * H - 9 >= M) neighbors(safe).forEach(n => banned.add(n));
        const pool = [];
        for (let i = 0; i < W * H; i++) if (!banned.has(i)) pool.push(i);
        for (let k = 0; k < M; k++) {
            const j = k + Math.floor(Math.random() * (pool.length - k));
            [pool[k], pool[j]] = [pool[j], pool[k]];
            cells[pool[k]].mine = true;
        }
        cells.forEach((c, i) => { c.n = neighbors(i).filter(n => cells[n].mine).length; });
    }

    /* ── Anzeige ────────────────────────────────────────────────────────── */
    const pad3 = n => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
    function updateHud() {
        $('h-mines').textContent = pad3(M - flags);
        $('h-time').textContent = pad3(Math.floor(elapsed));
        const b = XIRU.best('minen');
        $('best').textContent = b == null ? '–' : XIRU.fmt(b) + ' s';
        $('records').innerHTML = STANDARD.map(id => {
            const s = stats[id];
            return '<li><span>' + LEVELS[id].name + '</span><b>' + (s && s.best != null ? XIRU.fmt(s.best) + ' s' : '–') + '</b></li>';
        }).join('') + (stats.eigen && stats.eigen.wins ? '<li><span>Eigene Felder gelöst</span><b>' + stats.eigen.wins + '</b></li>' : '');
        $('level-desc').textContent = W + ' × ' + H + ' Felder, ' + M + ' Minen' + (level === 'profi' && W === 16 ? ' (hochkant)' : '') + (level === 'eigen' ? ' – zählt nicht für den Rekord' : '');
        $('levels').querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.level === level));
        $('custom').hidden = level !== 'eigen';
    }
    function setFace(f) { $('face').textContent = f; }
    function paint(i, extra) {
        const c = cells[i], el = els[i];
        let cls = 'mn-c';
        if (c.open) cls += ' is-open' + (c.n ? ' n' + c.n : '');
        else if (c.flag) cls += ' is-flag';
        if (extra) cls += ' ' + extra;
        if (showCursor && i === cursor) cls += ' is-cursor';
        el.className = cls;
        el.textContent = c.open && c.n ? c.n : '';
    }
    function renderCursor() {
        els.forEach(e => e.classList.remove('is-cursor'));
        if (showCursor && els[cursor]) {
            els[cursor].classList.add('is-cursor');
            els[cursor].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    /* ── Zeit ───────────────────────────────────────────────────────────── */
    function startTimer() {
        startT = performance.now() - elapsed * 1000;
        clearInterval(timerId);
        timerId = setInterval(() => { elapsed = (performance.now() - startT) / 1000; $('h-time').textContent = pad3(Math.floor(elapsed)); }, 200);
    }
    function stopTimer() { if (state === 'play') elapsed = (performance.now() - startT) / 1000; clearInterval(timerId); }

    /* ── Aktionen ───────────────────────────────────────────────────────── */
    function reveal(i) {
        if (state === 'won' || state === 'lost' || paused) return;
        const c = cells[i];
        if (c.flag) return;
        if (c.open) { chord(i); return; }
        if (state === 'ready') { placeMines(i); state = 'play'; startTimer(); $('status').textContent = cheatedGame ? 'Schummelpixel aktiv – diese Runde zählt nicht.' : ''; }
        if (c.mine) { lose(i); return; }
        flood([i]);
        G.sfx.click();
        checkWin();
    }

    function flood(start) {
        const queue = start.map(i => [i, 0]);
        let count = 0;
        while (queue.length) {
            const [i, depth] = queue.shift();
            const c = cells[i];
            if (c.open || c.flag || c.mine) continue;
            c.open = true; opened++; count++;
            els[i].style.setProperty('--d', Math.min(depth * 0.022, 0.45) + 's');
            paint(i);
            if (c.n === 0) neighbors(i).forEach(n => { if (!cells[n].open && !cells[n].flag) queue.push([n, depth + 1]); });
        }
        if (count > 25) XIRU.beep(660, .08, 'triangle', .04);
        return count;
    }

    function chord(i) {
        const c = cells[i];
        if (!c.open || !c.n) return;
        const nb = neighbors(i);
        const f = nb.filter(n => cells[n].flag).length;
        const hidden = nb.filter(n => !cells[n].open && !cells[n].flag);
        if (f !== c.n || !hidden.length) {
            hidden.forEach(n => { els[n].classList.add('is-hint'); setTimeout(() => els[n].classList.remove('is-hint'), 260); });
            return;
        }
        const boom = hidden.find(n => cells[n].mine);
        if (boom != null) { lose(boom); return; }
        flood(hidden);
        G.sfx.click();
        checkWin();
    }

    function toggleFlag(i) {
        if (state === 'won' || state === 'lost' || paused) return;
        const c = cells[i];
        if (c.open) { chord(i); return; }
        c.flag = !c.flag;
        flags += c.flag ? 1 : -1;
        if (c.flag) usedFlag = true;
        paint(i);
        XIRU.beep(c.flag ? 740 : 440, .04, 'square', .03);
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* egal */ }
        updateHud();
    }

    function primary(i) { flagMode ? toggleFlag(i) : reveal(i); }

    function lose(i) {
        stopTimer();
        state = 'lost';
        setFace('😵');
        G.sfx.die();
        const bx = i % W, by = (i / W) | 0;
        cells.forEach((c, k) => {
            const dist = Math.hypot(k % W - bx, ((k / W) | 0) - by);
            if (c.mine && !c.flag) { els[k].style.setProperty('--d', Math.min(dist * 0.03, .9) + 's'); paint(k, 'is-mine' + (k === i ? ' is-boom' : '')); }
            else if (!c.mine && c.flag) paint(k, 'is-wrong');
        });
        boardEl.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(-3px,1px)' }, { transform: 'none' }], { duration: 380 });
        const left = W * H - M - opened;
        $('status').textContent = 'Bumm! Noch ' + left + ' sichere Felder wären übrig gewesen.';
        setTimeout(() => showOverlay('💥', 'Bumm!', 'Da lag eine Mine. ' + (left <= 3 ? 'So knapp – nur noch ' + left + ' Feld' + (left === 1 ? '' : 'er') + '!' : 'Nächstes Mal klappt\'s.'), 'Nochmal'), 900);
    }

    function checkWin() {
        if (opened !== W * H - M) return;
        stopTimer();
        state = 'won';
        cells.forEach((c, k) => { if (c.mine && !c.flag) { c.flag = true; paint(k); } });
        flags = M;
        setFace('😎');
        stage.classList.add('is-won');
        XIRU.confetti(); G.sfx.win();
        const t = Math.round(elapsed * 10) / 10;
        let text = 'Gelöst in ' + XIRU.fmt(t) + ' Sekunden.';
        const counts = !cheatedGame;
        const st = stats[level] || (stats[level] = { best: null, wins: 0 });
        st.wins++;
        if (counts && STANDARD.includes(level) && W * H === LEVELS[level].w * LEVELS[level].h) {
            const isBest = st.best == null || t < st.best;
            if (isBest) st.best = t;
            const r = XIRU.score('minen', t, { lower: true });
            text += isBest ? ' Neue Bestzeit für ' + LEVELS[level].name + '!' : ' Bestzeit ' + LEVELS[level].name + ': ' + XIRU.fmt(st.best) + ' s.';
            if (r.isNew) text += ' Das ist auch dein Gesamtrekord.';
            if (level === 'profi') XIRU.egg('g-minen-profi');
            if (!usedFlag && level !== 'anfaenger') XIRU.egg('g-minen-flaggenlos');
        } else if (cheatedGame) {
            text += ' Mit Schummelpixel – das zählt leider nicht.';
        } else {
            text += ' Eigene Felder zählen nicht für den Rekord.';
        }
        XIRU.save('minen-stats', stats);
        updateHud();
        $('status').textContent = 'Alle Minen gefunden!';
        setTimeout(() => showOverlay('😎', 'Feld geräumt!', text, 'Nächste Runde'), 650);
    }

    // Ergebnis als schmales Band unten – das Minenfeld bleibt sichtbar
    function showOverlay(icon, title, text, button) {
        ovEl.classList.add('mn-lite');
        G.overlay(ovEl).show({ icon, title, text, button, onClick: newGame });
    }

    /* ── Maus & Touch ───────────────────────────────────────────────────── */
    let press = null;
    const cellOf = e => { const el = e.target.closest && e.target.closest('.mn-c'); return el ? +el.dataset.i : null; };
    boardEl.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
    boardEl.addEventListener('pointerdown', e => {
        const i = cellOf(e); if (i == null) return;
        XIRU.audio();
        if (showCursor) { showCursor = false; renderCursor(); }
        if (e.pointerType === 'mouse') {
            if (e.button === 2) { toggleFlag(i); return; }
            if (e.button === 1) { e.preventDefault(); chord(i); return; }
            if (e.button !== 0) return;
            press = { i, id: e.pointerId };
            if (state === 'ready' || state === 'play') { setFace('😮'); if (!cells[i].open && !cells[i].flag) els[i].classList.add('is-press'); }
            return;
        }
        // Touch / Stift: langes Tippen = Flagge
        press = { i, id: e.pointerId, x: e.clientX, y: e.clientY, long: false };
        press.timer = setTimeout(() => { if (press && press.i === i) { press.long = true; flagMode ? reveal(i) : toggleFlag(i); } }, 420);
        if (state === 'ready' || state === 'play') setFace('😮');
    });
    boardEl.addEventListener('pointermove', e => {
        if (cheat && e.pointerType === 'mouse') {
            const i = cellOf(e);
            $('pixel').classList.toggle('is-mine', i != null && cells[i].mine && !cells[i].open);
        }
        if (!press || press.id !== e.pointerId || press.x == null) return;
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.timer); press = null; resetFace(); }
    });
    const endPress = e => {
        if (!press || press.id !== e.pointerId) return;
        clearTimeout(press.timer);
        const p = press; press = null;
        els.forEach(el => el.classList.remove('is-press'));
        resetFace();
        if (e.type === 'pointercancel' || p.long) return;
        const i = cellOf(e);
        // Maus: nur auslösen, wenn auf demselben Feld losgelassen
        if (i == null || i !== p.i) return;
        primary(i);
    };
    boardEl.addEventListener('pointerup', endPress);
    boardEl.addEventListener('pointercancel', endPress);
    boardEl.addEventListener('pointerleave', () => { els && els.forEach(el => el.classList.remove('is-press')); });
    function resetFace() { if (state === 'ready' || state === 'play') setFace('🙂'); }

    $('face').addEventListener('click', newGame);
    $('btn-flag').addEventListener('click', () => setFlagMode(!flagMode));
    function setFlagMode(on) {
        flagMode = on;
        $('btn-flag').setAttribute('aria-pressed', on);
        $('flag-icon').textContent = on ? '⚑' : '⛏';
        $('flag-label').textContent = on ? 'Flaggenmodus' : 'Aufdecken';
    }

    /* ── Tastatur ───────────────────────────────────────────────────────── */
    let typed = '';
    G.keys.onPress((key, e) => {
        if (document.querySelector('.modal-backdrop')) return;
        const k = String(key).toLowerCase();
        if (k.length === 1) {
            typed = (typed + k).slice(-5);
            if (typed === 'xyzzy') activateCheat();
        }
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        if (!ovEl.hidden) { if (k === 'n') newGame(); return; }
        const mv = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
        if (mv) {
            if (e) e.preventDefault();
            if (!showCursor) { showCursor = true; renderCursor(); return; }
            const x = (cursor % W + mv[0] + W) % W, y = (((cursor / W) | 0) + mv[1] + H) % H;
            cursor = y * W + x; renderCursor();
            if (cheat) $('pixel').classList.toggle('is-mine', cells[cursor].mine && !cells[cursor].open);
            return;
        }
        if (k === ' ' || k === 'enter') { if (e) e.preventDefault(); showCursor = true; primary(cursor); renderCursor(); }
        else if (k === 'f') { showCursor = true; toggleFlag(cursor); renderCursor(); }
        else if (k === 'n') newGame();
    });

    function activateCheat() {
        if (cheat) return;
        cheat = true;
        if (state === 'play' || state === 'ready') cheatedGame = true;
        $('pixel').hidden = false;
        XIRU.egg('g-minen-xyzzy');
        XIRU.toast('Schummelpixel', 'Ein uralter Trick … achte auf die obere linke Ecke des Spielfelds. Runden damit zählen nicht.', { icon: '🕹' });
        if (state === 'play') $('status').textContent = 'Schummelpixel aktiv – diese Runde zählt nicht.';
    }

    /* ── Stufen ─────────────────────────────────────────────────────────── */
    $('levels').addEventListener('click', e => {
        const b = e.target.closest('[data-level]'); if (!b) return;
        level = b.dataset.level;
        XIRU.save('minen-pref', { level, custom: { w: LEVELS.eigen.w, h: LEVELS.eigen.h, m: LEVELS.eigen.m } });
        newGame();
    });
    $('c-w').value = LEVELS.eigen.w; $('c-h').value = LEVELS.eigen.h; $('c-m').value = LEVELS.eigen.m;
    $('custom').addEventListener('submit', e => {
        e.preventDefault();
        const w = XIRU.clamp(Math.round(+$('c-w').value || 9), 5, 40);
        const h = XIRU.clamp(Math.round(+$('c-h').value || 9), 5, 30);
        const m = XIRU.clamp(Math.round(+$('c-m').value || 10), 1, w * h - 1);
        $('c-w').value = w; $('c-h').value = h; $('c-m').value = m;
        Object.assign(LEVELS.eigen, { w, h, m });
        level = 'eigen';
        XIRU.save('minen-pref', { level, custom: { w, h, m } });
        newGame();
    });

    /* ── Pause beim Tab-Wechsel ─────────────────────────────────────────── */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state === 'play' && !paused) {
            stopTimer(); paused = true; stage.classList.add('is-paused');
            ovEl.classList.remove('mn-lite');
            G.overlay(ovEl).show({ icon: '⏸', title: 'Pause', text: 'Die Zeit steht still, solange du weg bist.', button: 'Weiter', onClick: resume });
        }
    });
    function resume() { paused = false; stage.classList.remove('is-paused'); ovEl.hidden = true; startTimer(); }

    newGame();
});
