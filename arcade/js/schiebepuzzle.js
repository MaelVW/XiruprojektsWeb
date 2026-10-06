/* Schiebepuzzle – 3×3, 4×4, 5×5; nur lösbare Mischungen (Paritätsprüfung), Zahlen- oder Bildmodus.
   Wertung: Punkte = Grundwert (1000/3000/6000) − 2 × Sekunden − Züge, mindestens 10 % des Grundwerts. */
XIRU.ready(function () {
    const G = XIRU.Game;
    const $ = id => document.getElementById(id);
    const boardEl = $('board'), ovEl = $('ov');
    const BASE = { 3: 1000, 4: 3000, 5: 6000 };
    const DESC = {
        zahlen: 'Ordne die Zahlen der Reihe nach, die Lücke gehört unten rechts hin.',
        bild: 'Ein frisch generiertes Bild in den Farben deines Designs. Die kleinen Zahlen helfen beim Sortieren.',
        loyd: 'Sam Loyds Rätsel von 1880: Alles stimmt, nur 14 und 15 sind vertauscht. Er versprach 1000 Dollar für die Lösung …'
    };
    const stats = Object.assign({}, XIRU.load('schiebepuzzle-stats') || {});

    let n = 4, mode = 'zahlen', tiles = [], moves = 0, time = 0, tStart = 0, timerId = 0, running = false, won = false, imgSeed = 1;
    let inner, els = {}, loydWarned = false;

    /* ── Mischen ────────────────────────────────────────────────────────── */
    function inversions(arr) {
        const a = arr.filter(v => v); let c = 0;
        for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
        return c;
    }
    function solvable(arr) {
        const inv = inversions(arr);
        if (n % 2) return inv % 2 === 0;
        const blankRowFromBottom = n - Math.floor(arr.indexOf(0) / n);
        return (inv + blankRowFromBottom) % 2 === 1;
    }
    const solvedArr = () => Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
    const isSolved = () => tiles.every((v, i) => v === (i + 1) % (n * n));
    function shuffle() {
        let a;
        do {
            a = solvedArr();
            for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
            if (!solvable(a)) {   // zwei Kacheln (nicht die Lücke) tauschen kippt die Parität
                const p = a.map((v, i) => v ? i : -1).filter(i => i >= 0);
                [a[p[0]], a[p[1]]] = [a[p[1]], a[p[0]]];
            }
        } while (a.every((v, i) => v === (i + 1) % (n * n)) || a.filter((v, i) => v === (i + 1) % (n * n)).length > n);
        return a;
    }

    /* ── Generiertes Bild ───────────────────────────────────────────────── */
    function rgb(name) {
        const p = document.createElement('i'); p.style.color = 'var(' + name + ')'; document.body.appendChild(p);
        const c = getComputedStyle(p).color; p.remove();
        const nums = (c.match(/-?[\d.]+/g) || ['0', '0', '0']).map(Number);
        return c.startsWith('color(') ? nums.slice(0, 3).map(v => Math.round(v * 255)) : nums.slice(0, 3);
    }
    const css = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    function makeImage(seed) {
        const rnd = G.rng(seed), S = 600;
        const cv = document.createElement('canvas'); cv.width = cv.height = S;
        const x = cv.getContext('2d');
        const rc = rgb('--rc'), a2 = rgb('--accent-2'), bg = rgb('--bg'), warn = rgb('--warning'), ac = rgb('--accent');
        const dark = mix(bg, [0, 0, 0], .3), horizon = 370;
        // Himmel
        let g = x.createLinearGradient(0, 0, 0, horizon);
        g.addColorStop(0, css(dark)); g.addColorStop(.6, css(mix(dark, a2, .35))); g.addColorStop(1, css(mix(a2, rc, .6)));
        x.fillStyle = g; x.fillRect(0, 0, S, horizon);
        for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(255,255,255,' + (.2 + rnd() * .7) + ')'; const r = rnd() * 1.8 + .4; x.beginPath(); x.arc(rnd() * S, rnd() * horizon * .75, r, 0, 7); x.fill(); }
        // Sonne mit Streifen
        const sx = 160 + rnd() * 280, sr = 120 + rnd() * 50, sy = horizon - 10;
        x.save(); x.beginPath(); x.arc(sx, sy, sr, 0, Math.PI * 2); x.clip();
        g = x.createLinearGradient(0, sy - sr, 0, sy);
        g.addColorStop(0, css(warn)); g.addColorStop(1, css(rc));
        x.fillStyle = g; x.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        x.fillStyle = css(mix(a2, rc, .6));
        for (let k = 0; k < 7; k++) { const yy = sy - sr * .55 + k * k * 3.2 + k * 10; x.fillRect(sx - sr, yy, sr * 2, 2 + k * 1.6); }
        x.restore();
        // Berge
        for (let layer = 0; layer < 2; layer++) {
            x.fillStyle = css(mix(dark, a2, layer ? .45 : .25));
            x.beginPath(); x.moveTo(0, horizon);
            let px = 0;
            while (px < S) { px += 40 + rnd() * 70; x.lineTo(px, horizon - (layer ? 30 : 70) - rnd() * (layer ? 60 : 110)); px += 30 + rnd() * 50; x.lineTo(px, horizon - rnd() * 20); }
            x.lineTo(S, horizon); x.closePath(); x.fill();
        }
        // Boden mit Perspektivraster
        g = x.createLinearGradient(0, horizon, 0, S);
        g.addColorStop(0, css(mix(dark, a2, .3))); g.addColorStop(1, css(dark));
        x.fillStyle = g; x.fillRect(0, horizon, S, S - horizon);
        x.strokeStyle = css(rc, .75); x.lineWidth = 2;
        for (let k = -12; k <= 12; k++) { x.beginPath(); x.moveTo(S / 2 + k * 18, horizon); x.lineTo(S / 2 + k * 120, S); x.stroke(); }
        for (let k = 0; k < 9; k++) { const yy = horizon + Math.pow(k / 8, 2) * (S - horizon); x.globalAlpha = .4 + k / 16; x.beginPath(); x.moveTo(0, yy); x.lineTo(S, yy); x.stroke(); }
        x.globalAlpha = 1;
        // Schwebender Realitätskristall
        const cx = 120 + rnd() * 360, cy = 150 + rnd() * 70, h = 95 + rnd() * 30, w = h * .62;
        x.save(); x.shadowColor = css(ac, .9); x.shadowBlur = 40;
        const P = { top: [cx, cy - h], l: [cx - w, cy - h * .15], r: [cx + w, cy - h * .15], m: [cx + w * .15, cy - h * .05], bot: [cx, cy + h] };
        const face = (pts, c) => { x.fillStyle = c; x.beginPath(); x.moveTo(...pts[0]); pts.slice(1).forEach(p => x.lineTo(...p)); x.closePath(); x.fill(); };
        face([P.top, P.l, P.m], css(mix(ac, [255, 255, 255], .35)));
        x.shadowBlur = 0;
        face([P.top, P.m, P.r], css(ac));
        face([P.l, P.bot, P.m], css(mix(ac, a2, .55)));
        face([P.m, P.bot, P.r], css(mix(a2, dark, .25)));
        x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(...P.top); x.lineTo(...P.l); x.lineTo(...P.bot); x.lineTo(...P.r); x.closePath(); x.stroke();
        x.restore();
        // Spiegelung am Boden
        x.fillStyle = css(ac, .25); x.beginPath(); x.ellipse(cx, horizon + 60 + h * .2, w * 1.1, 10, 0, 0, Math.PI * 2); x.fill();
        return cv.toDataURL('image/jpeg', .88);
    }

    /* ── Aufbau ─────────────────────────────────────────────────────────── */
    function build() {
        boardEl.innerHTML = '<div class="sp__inner"></div>';
        inner = boardEl.firstChild;
        boardEl.style.setProperty('--n', n);
        boardEl.classList.remove('is-won');
        const bild = mode === 'bild';
        boardEl.classList.toggle('is-bild', bild);
        if (bild) boardEl.style.setProperty('--img', 'url(' + makeImage(imgSeed) + ')');
        els = {};
        for (let v = 1; v < n * n; v++) {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'sp-t'; b.dataset.v = v;
            b.innerHTML = '<span>' + v + '</span>';
            const c = (v - 1) % n, r = Math.floor((v - 1) / n);
            if (bild) b.style.backgroundPosition = (c / (n - 1) * 100) + '% ' + (r / (n - 1) * 100) + '%';
            inner.appendChild(b); els[v] = b;
        }
        if (bild) { const f = document.createElement('div'); f.className = 'sp-full'; f.style.backgroundImage = 'var(--img)'; boardEl.appendChild(f); }
        layout();
    }
    function layout() {
        tiles.forEach((v, i) => {
            if (!v) return;
            const el = els[v];
            el.style.setProperty('--x', i % n); el.style.setProperty('--y', Math.floor(i / n));
            el.classList.toggle('ok', v === i + 1);
            el.setAttribute('aria-label', 'Kachel ' + v);
        });
    }
    function newGame(keepImage) {
        stopTimer();
        if (mode === 'loyd') { n = 4; tiles = solvedArr(); [tiles[13], tiles[14]] = [14, 13]; loydWarned = false; }
        else tiles = shuffle();
        moves = 0; time = 0; won = false;
        if (!keepImage) imgSeed = XIRU.rand(1, 1e9);
        ovEl.hidden = true;
        build(); updateHud(); persist();
        boardEl.animate([{ transform: 'rotate(-2deg) scale(.96)', opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
    }

    /* ── Zeit & Anzeige ─────────────────────────────────────────────────── */
    const fmtTime = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    function startTimer() { if (running || won) return; running = true; tStart = performance.now() - time * 1000; timerId = setInterval(tick, 250); }
    function stopTimer() { if (running) time = (performance.now() - tStart) / 1000; running = false; clearInterval(timerId); }
    function tick() { time = (performance.now() - tStart) / 1000; $('h-time').textContent = fmtTime(time); }
    function updateHud() {
        $('h-size').textContent = n + ' × ' + n;
        $('h-moves').textContent = moves;
        $('h-time').textContent = fmtTime(time);
        $('h-ok').textContent = tiles.filter((v, i) => v && v === i + 1).length + ' / ' + (n * n - 1);
        $('sizes').querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', +c.dataset.size === n));
        $('modes').querySelectorAll('.chip').forEach(c => c.classList.toggle('is-active', c.dataset.mode === mode));
        $('mode-desc').textContent = DESC[mode];
        const b = XIRU.best('schiebepuzzle');
        $('best').textContent = b == null ? '–' : XIRU.fmt(b) + ' Punkte';
        $('records').innerHTML = [3, 4, 5].map(s => {
            const st = stats[s];
            return '<li><span>' + s + ' × ' + s + '</span><b>' + (st ? fmtTime(st.time) + ' · ' + st.moves + ' Züge' : '–') + '</b></li>';
        }).join('');
    }
    function persist() { XIRU.save('schiebepuzzle', { n, mode, tiles, moves, time: Math.round(time), imgSeed, won }); }

    /* ── Züge ───────────────────────────────────────────────────────────── */
    function slideFrom(i) {
        if (won || !ovEl.hidden) return false;
        const b = tiles.indexOf(0);
        const br = Math.floor(b / n), bc = b % n, r = Math.floor(i / n), c = i % n;
        if (i === b || (r !== br && c !== bc)) { nudge(i); return false; }
        const step = r === br ? (c > bc ? 1 : -1) : (r > br ? n : -n);
        let k = b;
        while (k !== i) { tiles[k] = tiles[k + step]; k += step; moves++; }
        tiles[i] = 0;
        afterMove();
        return true;
    }
    function slideDir(dir) {   // Kachel bewegt sich in Richtung dir in die Lücke
        const b = tiles.indexOf(0), br = Math.floor(b / n), bc = b % n;
        const src = { left: bc < n - 1 ? b + 1 : -1, right: bc > 0 ? b - 1 : -1, up: br < n - 1 ? b + n : -1, down: br > 0 ? b - n : -1 }[dir];
        if (src < 0) { boardEl.animate([{ transform: 'none' }, { transform: 'translateX(' + (dir === 'left' ? -4 : dir === 'right' ? 4 : 0) + 'px) translateY(' + (dir === 'up' ? -4 : dir === 'down' ? 4 : 0) + 'px)' }, { transform: 'none' }], { duration: 120 }); return; }
        slideFrom(src);
    }
    function nudge(i) {
        const v = tiles[i]; if (!v) return;
        els[v].animate([{ filter: 'none' }, { filter: 'brightness(.6)' }, { filter: 'none' }], { duration: 180 });
    }
    function afterMove() {
        XIRU.audio();
        startTimer();
        XIRU.beep(420 + Math.random() * 60, .04, 'triangle', .04);
        layout(); updateHud();
        if (mode === 'loyd' && moves >= 60 && !loydWarned) { loydWarned = true; loydReveal(); }
        if (mode !== 'loyd' && isSolved()) win();
        else persist();
    }

    function win() {
        won = true; stopTimer();
        const t = Math.round(time * 10) / 10;
        const points = Math.max(Math.round(BASE[n] * .1), Math.round(BASE[n] - 2 * t - moves));
        const st = stats[n];
        if (!st || t < st.time) stats[n] = { time: t, moves };
        XIRU.save('schiebepuzzle-stats', stats);
        const r = XIRU.score('schiebepuzzle', points);
        if (n === 5) XIRU.egg('g-schiebepuzzle-5x5');
        if (n === 3 && t < 30) XIRU.egg('g-schiebepuzzle-blitz');
        Object.values(els).forEach((el, k) => el.style.setProperty('--d', (k * .03) + 's'));
        boardEl.classList.add('is-won');
        G.sfx.win(); XIRU.confetti();
        persist(); updateHud();
        setTimeout(() => { ovEl.classList.add('sp-lite'); G.overlay(ovEl).show({
            icon: '🧩', title: 'Geordnet!',
            text: n + ' × ' + n + ' in ' + fmtTime(t) + ' und ' + moves + ' Zügen · ' + XIRU.fmt(points) + ' Punkte' + (r.isNew ? ' – neuer Rekord!' : ''),
            button: 'Nochmal mischen', onClick: () => newGame(false)
        }); }, mode === 'bild' ? 1600 : 900);
    }

    function loydReveal() {
        XIRU.egg('g-schiebepuzzle-loyd');
        XIRU.modal('<h2>Gib dir keine Mühe 😅</h2><p>Dieses Rätsel ist <b>unlösbar</b>. Jeder Zug verändert die sogenannte Parität – und die vertauschten 14 und 15 lassen sich damit nie gerade rücken. Sam Loyd wusste das 1880 ganz genau, als er 1000 Dollar für die Lösung versprach.</p><p class="small muted">Darum prüft dieses Spiel jede Mischung, bevor du sie bekommst.</p><div class="row mt-2"><button class="btn btn--primary" type="button" data-close>Verstanden</button></div>');
    }

    /* ── Eingaben ───────────────────────────────────────────────────────── */
    boardEl.addEventListener('click', e => {
        const t = e.target.closest('.sp-t'); if (!t) return;
        const i = tiles.indexOf(+t.dataset.v);
        slideFrom(i);
    });
    G.bindTouch('.touch-pad');
    G.swipe('#stage', dir => { if (ovEl.hidden) slideDir(dir); });
    const DIRK = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
    G.keys.onPress((key, e) => {
        if (document.querySelector('.modal-backdrop')) return;
        const k = String(key).toLowerCase();
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        if (DIRK[k]) { if (ovEl.hidden) slideDir(DIRK[k]); return; }
        if (k === 'n') askNew();
    });
    function askNew() {
        if (moves > 0 && !won && mode !== 'loyd') {
            const m = XIRU.modal('<h2>Neu mischen?</h2><p>Dein aktuelles Puzzle (' + moves + ' Züge) geht verloren.</p><div class="row mt-2"><button class="btn btn--primary" type="button" data-ok>Mischen</button><button class="btn" type="button" data-close>Weiterspielen</button></div>');
            m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); newGame(false); });
        } else newGame(false);
    }
    $('btn-new').addEventListener('click', askNew);
    $('sizes').addEventListener('click', e => {
        const b = e.target.closest('[data-size]'); if (!b) return;
        n = +b.dataset.size; if (mode === 'loyd') mode = 'zahlen';
        newGame(true);
    });
    $('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]'); if (!b) return;
        mode = b.dataset.mode;
        newGame(mode !== 'bild');
    });
    // Vorlage kurz zeigen, solange gedrückt
    const peekBtn = $('btn-peek');
    const showPeek = () => {
        if (boardEl.querySelector('.sp-peek')) return;
        const p = document.createElement('div');
        if (mode === 'bild') { p.className = 'sp-peek'; p.style.backgroundImage = 'var(--img)'; }
        else { p.className = 'sp-peek is-nums'; p.innerHTML = solvedArr().map(v => '<i>' + (v || '') + '</i>').join(''); }
        boardEl.appendChild(p);
    };
    const hidePeek = () => { const p = boardEl.querySelector('.sp-peek'); if (p) p.remove(); };
    peekBtn.addEventListener('pointerdown', showPeek);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => peekBtn.addEventListener(ev, hidePeek));
    peekBtn.addEventListener('keydown', e => { if (e.key === 'Enter') showPeek(); });
    peekBtn.addEventListener('keyup', hidePeek);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && running) {
            stopTimer(); persist();
            ovEl.classList.remove('sp-lite');
            G.overlay(ovEl).show({ icon: '⏸', title: 'Pause', text: 'Die Uhr wartet auf dich.', button: 'Weiter', onClick: () => { ovEl.hidden = true; if (moves) startTimer(); } });
        }
    });
    addEventListener('pagehide', () => { stopTimer(); persist(); });

    /* ── Start ──────────────────────────────────────────────────────────── */
    const saved = XIRU.load('schiebepuzzle');
    if (saved && [3, 4, 5].includes(saved.n) && Array.isArray(saved.tiles) && saved.tiles.length === saved.n * saved.n && !saved.won && DESC[saved.mode]) {
        n = saved.n; mode = saved.mode; tiles = saved.tiles; moves = saved.moves || 0; time = saved.time || 0; imgSeed = saved.imgSeed || 1;
        build(); updateHud();
    } else newGame(false);
});
