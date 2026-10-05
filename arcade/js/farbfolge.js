/* Farbfolge – Simon sagt: Sequenz merken und nachspielen */
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$;
    const svg = $('#board'), hub = $('#hub'), stage = $('#stage');
    const ov = G.overlay('#ov');
    const NS = 'http://www.w3.org/2000/svg';
    // Normal: C-Dur-Dreiklang + Oktave · Profi: C D E F G A
    const FREQ = { normal: [261.63, 329.63, 392.00, 523.25], profi: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00] };
    const MELODY = [0, 1, 2, 3, 4, 4];   // ein bekanntes Kinderlied fängt so an …

    let mode = 'normal', n = 4;
    let seq = [], pos = 0, phase = 'idle';   // idle | show | input | over | paused
    let timers = [], inputTimer = 0, free = [];
    let pads = [];

    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; clearTimeout(inputTimer); };
    const points = () => Math.max(0, seq.length - 1) * (mode === 'profi' ? 2 : 1);

    /* ── Brett als Ring aus n Segmenten ── */
    function build() {
        n = mode === 'profi' ? 6 : 4;
        const C = 150, R = 146, r = 52, gap = n === 4 ? 4 : 3.5;
        const P = (rad, deg) => [C + rad * Math.cos(deg * Math.PI / 180), C + rad * Math.sin(deg * Math.PI / 180)];
        const start = -90 - 360 / n;
        svg.innerHTML = '';
        pads = [];
        for (let i = 0; i < n; i++) {
            const a0 = start + i * 360 / n + gap / 2, a1 = start + (i + 1) * 360 / n - gap / 2;
            const p0 = P(R, a0), p1 = P(R, a1), p2 = P(r, a1), p3 = P(r, a0);
            const path = document.createElementNS(NS, 'path');
            path.setAttribute('d', 'M' + p0 + 'A' + R + ' ' + R + ' 0 0 1 ' + p1 + 'L' + p2 + 'A' + r + ' ' + r + ' 0 0 0 ' + p3 + 'Z');
            path.setAttribute('class', 'ff-pad');
            path.setAttribute('data-i', i);
            path.setAttribute('data-c', i);
            path.setAttribute('tabindex', '0');
            path.setAttribute('role', 'button');
            path.setAttribute('aria-label', 'Feld ' + (i + 1));
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
            pads.push(path);
            const mid = (a0 + a1) / 2, lp = P((R + r) / 2 + 30, mid);
            const t = document.createElementNS(NS, 'text');
            t.setAttribute('class', 'ff-num'); t.setAttribute('x', lp[0]); t.setAttribute('y', lp[1]);
            t.textContent = i + 1;
            svg.appendChild(t);
        }
    }

    function light(i, ms, quiet) {
        const p = pads[i]; if (!p) return;
        p.classList.add('is-lit');
        if (!quiet) XIRU.beep(FREQ[mode][i], Math.max(.12, ms / 1000), 'triangle', .08);
        setTimeout(() => p.classList.remove('is-lit'), ms);
    }

    function setHub(big, small, cls) {
        hub.className = 'ff-hub' + (cls ? ' ' + cls : '');
        $('#hub-big').textContent = big;
        $('#hub-small').textContent = small;
        void hub.offsetWidth; hub.classList.add('is-pop');
    }

    function updateHud() {
        const tempo = Math.round(100 * 640 / interval());
        G.hud('#hud', { Runde: Math.max(1, seq.length), Punkte: points(), Tempo: tempo + ' %' });
        const b = XIRU.best('farbfolge');
        $('#best').textContent = b == null ? '–' : XIRU.fmt(b);
    }
    const interval = () => Math.max(250, 640 - Math.max(0, seq.length - 1) * 24);

    /* ── Ablauf ── */
    function start() {
        if (phase === 'show' || phase === 'input') return;
        XIRU.audio();
        ov.hide();
        clearTimers();
        seq = []; pos = 0;
        $('#status').textContent = 'Schau genau hin …';
        addAndPlay();
    }

    function addAndPlay() {
        seq.push(XIRU.rand(0, n - 1));
        playSequence(500);
    }

    function playSequence(delay) {
        phase = 'show';
        svg.classList.remove('is-input'); svg.classList.add('is-off');
        setHub(seq.length, 'Merken', 'is-busy');
        updateHud();
        const step = interval(), on = Math.round(step * .62);
        seq.forEach((c, k) => later(() => light(c, on), delay + k * step));
        later(() => {
            phase = 'input'; pos = 0;
            svg.classList.add('is-input'); svg.classList.remove('is-off');
            setHub(seq.length, 'Du bist dran', 'is-listen');
            $('#status').textContent = 'Spiel die Folge nach (' + seq.length + (seq.length === 1 ? ' Ton' : ' Töne') + ').';
            armTimeout();
        }, delay + seq.length * step);
    }

    function armTimeout() {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(() => { if (phase === 'input') fail(-1, 'Nach 6 Sekunden ohne Eingabe ist Schluss.'); }, 6000);
    }

    function press(i) {
        if (i < 0 || i >= n) return;
        const p = pads[i];
        p.classList.add('is-press'); setTimeout(() => p.classList.remove('is-press'), 120);
        if (phase === 'idle' || phase === 'over') {        // freies Spielen
            light(i, 240);
            free.push(i); if (free.length > 12) free.shift();
            if (mode === 'profi' && free.slice(-MELODY.length).join() === MELODY.join()) {
                free = [];
                setTimeout(() => XIRU.egg('g-farbfolge-entchen'), 300);
            }
            return;
        }
        if (phase !== 'input') return;
        if (seq[pos] !== i) { fail(i); return; }
        light(i, 200);
        pos++;
        armTimeout();
        if (pos >= seq.length) {
            clearTimeout(inputTimer);
            phase = 'show';
            svg.classList.remove('is-input');
            const done = seq.length;
            setHub('✓', done + (done === 1 ? ' Ton' : ' Töne'), 'is-busy');
            if (done % 10 === 0) { XIRU.confetti(60); G.sfx.power(); }
            if (done >= 12) XIRU.egg('g-farbfolge-12');
            if (mode === 'profi' && done >= 10) XIRU.egg('g-farbfolge-profi');
            updateHud();
            later(addAndPlay, 700);
        }
    }

    function fail(i, why) {
        clearTimers();
        phase = 'over';
        svg.classList.remove('is-input'); svg.classList.add('is-off');
        if (i >= 0) { pads[i].classList.add('is-wrong'); setTimeout(() => pads[i].classList.remove('is-wrong'), 900); }
        XIRU.beep(110, .55, 'sawtooth', .06);
        stage.classList.remove('is-fail'); void stage.offsetWidth; stage.classList.add('is-fail');
        // richtigen Ton zeigen
        const right = seq[pos];
        setTimeout(() => light(right, 600, true), 450);
        const pts = points(), reached = Math.max(0, seq.length - 1);
        const r = XIRU.score('farbfolge', pts);
        if (r.isNew && pts > 0) { XIRU.confetti(); G.sfx.win(); }
        setHub('↻', 'Nochmal');
        updateHud();
        $('#status').textContent = 'Richtig wäre Feld ' + (right + 1) + ' gewesen.';
        setTimeout(() => {
            if (phase !== 'over') return;
            ov.show({
                icon: reached >= 10 ? '🧠' : reached >= 5 ? '🎵' : '🙈',
                title: why ? 'Zu langsam!' : 'Falscher Ton!',
                text: (why || 'Feld ' + (i + 1) + ' war falsch – gesucht war Feld ' + (right + 1) + '.') + ' Du hast ' + reached + (reached === 1 ? ' Runde' : ' Runden') + ' geschafft: ' + pts + ' Punkte' + (r.isNew && pts > 0 ? ' – neuer Rekord!' : '.'),
                button: 'Nochmal', onClick: start, hint: 'Leertaste oder Enter startet neu.'
            });
        }, 1100);
    }

    /* ── Eingabe ── */
    svg.addEventListener('pointerdown', e => {
        const p = e.target.closest('.ff-pad'); if (!p) return;
        e.preventDefault();
        XIRU.audio();
        press(+p.dataset.i);
    });
    svg.addEventListener('keydown', e => {
        const p = e.target.closest && e.target.closest('.ff-pad');
        if (!p || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault(); e.stopPropagation();
        press(+p.dataset.i);
    });
    hub.addEventListener('click', () => { if (phase === 'idle' || phase === 'over') start(); });
    G.keys.onPress((k, e) => {
        if (/^[1-6]$/.test(k)) { press(+k - 1); return; }
        if (k === ' ' || k === 'Enter') {
            if (e && e.target && e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
            if (phase === 'idle' || phase === 'over') { if (e) e.preventDefault(); start(); }
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden || (phase !== 'show' && phase !== 'input')) return;
        clearTimers();
        phase = 'paused';
        setHub('⏸', 'Pause', 'is-busy');
        ov.show({ icon: '⏸', title: 'Pause', text: 'Die Folge wird nochmal von vorne gezeigt.', button: 'Weiter', onClick: () => { ov.hide(); playSequence(500); } });
    });

    $('#modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]'); if (!b) return;
        if (phase === 'show' || phase === 'input' || phase === 'paused') {
            $('#status').textContent = 'Den Modus kannst du nach dieser Runde wechseln.';
            return;
        }
        mode = b.dataset.mode;
        XIRU.$$('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        $('#mode-desc').textContent = mode === 'profi'
            ? 'Sechs Felder, sechs Töne (C bis A) – und jede geschaffte Runde zählt doppelt.'
            : 'Vier Felder, vier Töne. Jede geschaffte Runde gibt einen Punkt.';
        seq = []; free = []; phase = 'idle';
        ov.hide();
        build(); setHub('▶', 'Start'); updateHud();
        $('#status').textContent = 'Tipp: Vor dem Start kannst du frei auf den Feldern spielen.';
    });

    build();
    setHub('▶', 'Start');
    updateHud();
});
