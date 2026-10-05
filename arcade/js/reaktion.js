/* Reaktionstest – rot, warten, grün, klicken. Fünf Runden, der Durchschnitt zählt. */
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$;
    const ROUNDS = 5;
    const MIN_HUMAN = 90;            // schneller kann kein Mensch reagieren -> geraten
    const pad = $('#pad'), roundsEl = $('#rounds');

    let mode = 'klassisch';
    let state = 'idle';              // idle | wait | decoy | go | early | shown | done | paused
    let times = [], early = 0, goAt = 0, timers = [];
    let history = XIRU.load('reaktion-verlauf', []);
    if (!Array.isArray(history)) history = [];

    const COMMENTS = [
        [150, 'Blitzartig! Bist du ein Roboter?'],
        [200, 'Hervorragend – Profi-Reflexe.'],
        [250, 'Sehr gut!'],
        [300, 'Solide.'],
        [400, 'Geht noch schneller.'],
        [700, 'Etwas verschlafen?'],
        [Infinity, 'Hallo? Jemand zu Hause?']
    ];
    const comment = ms => COMMENTS.find(c => ms < c[0])[1];

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function setPad(cls, icon, title, text) {
        pad.className = 'rx-pad is-' + cls;
        pad.innerHTML = '<div class="rx-pad__icon" aria-hidden="true">' + icon + '</div>' +
            '<div class="rx-pad__title">' + XIRU.esc(title) + '</div>' +
            (text ? '<div class="rx-pad__text">' + XIRU.esc(text) + '</div>' : '');
    }

    function renderRounds() {
        const best = times.length ? Math.min.apply(null, times) : null;
        let html = '';
        for (let i = 0; i < ROUNDS; i++) {
            const t = times[i];
            const cls = t != null ? 'is-done' + (t === best && times.length > 1 ? ' is-best' : '') : (i === times.length && state !== 'idle' && state !== 'done' ? 'is-current' : '');
            html += '<li class="' + cls + '"><small>Runde ' + (i + 1) + '</small>' + (t != null ? t + ' ms' : '–') + '</li>';
        }
        roundsEl.innerHTML = html;
    }

    function updateHud() {
        const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
        G.hud('#hud', {
            Runde: Math.min(times.length + (state === 'idle' || state === 'done' ? 0 : 1), ROUNDS) + '/' + ROUNDS,
            Schnitt: avg == null ? '–' : avg + ' ms',
            Frühstarts: early
        });
        const b = XIRU.best('reaktion');
        $('#best').textContent = b == null ? '–' : XIRU.fmt(b) + ' ms';
        renderRounds();
    }

    function idle() {
        clearTimers();
        state = 'idle';
        setPad('idle', '⚡', 'Bereit?', mode === 'fies'
            ? 'Klicke, um zu starten. Achtung: Nicht jede Farbe ist Grün!'
            : 'Klicke oder drücke die Leertaste, um zu starten.');
        updateHud();
    }

    function startRun() {
        times = []; early = 0;
        $('#result-card').hidden = true;
        nextRound();
    }

    function nextRound() {
        clearTimers();
        state = 'wait';
        setPad('wait', '✋', 'Warte …', 'Noch nicht klicken!');
        const delay = 1300 + Math.random() * 3200;
        if (mode === 'fies' && delay > 2000) {
            // Täuschungsfarben vor dem echten Grün
            const n = Math.random() < .45 ? 2 : 1;
            for (let i = 0; i < n; i++) {
                const at = 600 + Math.random() * (delay - 1200);
                later(() => {
                    if (state !== 'wait') return;
                    state = 'decoy';
                    const b = Math.random() < .5;
                    setPad(b ? 'decoy-b' : 'decoy-a', b ? '🟡' : '🟣', b ? 'Gelb!' : 'Lila!', 'Das ist kein Grün …');
                    later(() => { if (state === 'decoy') { state = 'wait'; setPad('wait', '✋', 'Warte …', 'Noch nicht klicken!'); } }, 380);
                }, at);
            }
        }
        later(go, delay);
        updateHud();
    }

    function go() {
        if (state !== 'wait' && state !== 'decoy') return;
        // Im nächsten Frame umschalten (genauer), notfalls per Timer, falls rAF gedrosselt ist
        let done = false;
        const flip = () => {
            if (done || (state !== 'wait' && state !== 'decoy')) return;
            done = true;
            state = 'go';
            setPad('go', '🟢', 'JETZT!', '');
            goAt = performance.now();
        };
        requestAnimationFrame(flip);
        later(flip, 60);
    }

    function tooEarly(text) {
        clearTimers();
        early++;
        state = 'early';
        setPad('early', '🐇', 'Zu früh!', text || 'Tippe, um die Runde zu wiederholen.');
        G.sfx.hit();
        if (pad.animate && XIRU.setting('anim') !== false) pad.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
        if (early >= 3) XIRU.egg('g-reaktion-ungeduld');
        updateHud();
    }

    function react(ts) {
        XIRU.audio();
        switch (state) {
            case 'idle': case 'done': startRun(); break;
            case 'paused': case 'early': case 'shown': nextRound(); break;
            case 'wait': tooEarly(); break;
            case 'decoy': tooEarly(mode === 'fies' ? 'Reingefallen! Nur Grün zählt.' : null); break;
            case 'go': {
                const ms = Math.round(Math.max(0, (ts || performance.now()) - goAt));
                if (ms < MIN_HUMAN) { tooEarly('Unter ' + MIN_HUMAN + ' ms? Das war geraten. Nochmal!'); return; }
                times.push(ms);
                history.push(ms); if (history.length > 120) history = history.slice(-120);
                XIRU.save('reaktion-verlauf', history);
                if (ms >= 1000) XIRU.egg('g-reaktion-schnecke');
                G.sfx.coin();
                if (times.length >= ROUNDS) { finish(); return; }
                state = 'shown';
                setPad('shown', ms < 250 ? '🚀' : ms < 400 ? '👍' : '🐢', ms + ' ms', comment(ms) + ' Tippe für die nächste Runde.');
                updateHud();
                break;
            }
        }
    }

    function finish() {
        clearTimers();
        state = 'done';
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const best = Math.min.apply(null, times), worst = Math.max.apply(null, times);
        const prev = XIRU.best('reaktion');
        const r = XIRU.score('reaktion', avg, { lower: true });
        const isRecord = r.isNew;
        setPad('done', isRecord ? '🏆' : '⏱', avg + ' ms', (isRecord ? (prev == null ? 'Dein erster Rekord! ' : 'Neuer Rekord! ') : '') + comment(avg) + ' Klicke für eine neue Runde.');
        if (isRecord) { XIRU.confetti(); G.sfx.win(); } else G.sfx.power();
        if (avg < 220) XIRU.egg('g-reaktion-blitz');
        updateHud();
        showResult(avg, best, worst, isRecord);
    }

    /* ── Auswertung mit kleinen Diagrammen ── */
    function showResult(avg, best, worst, isRecord) {
        const card = $('#result-card');
        card.hidden = false;
        $('#result-badge').textContent = mode === 'fies' ? 'Fies-Modus' : 'Klassisch';
        const stat = (v, l) => '<div class="stat"><span class="stat__value">' + v + '</span><span class="stat__label">' + l + '</span></div>';
        $('#result-stats').innerHTML = stat(avg + ' ms', isRecord ? 'Schnitt · Rekord!' : 'Schnitt') + stat(best + ' ms', 'Bester') + stat(worst + ' ms', 'Langsamster') + stat(early, 'Frühstarts');
        $('#chart-rounds').innerHTML = roundsChart(avg, best);
        $('#chart-hist').innerHTML = histChart(avg);
    }

    function roundsChart(avg, best) {
        const W = 320, H = 170, P = { l: 34, r: 8, t: 18, b: 22 };
        const max = Math.max(400, Math.ceil(Math.max.apply(null, times) / 100) * 100);
        const iw = W - P.l - P.r, ih = H - P.t - P.b, bw = iw / times.length;
        const y = v => P.t + ih - v / max * ih;
        let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Reaktionszeiten der fünf Runden">';
        for (let v = 0; v <= max; v += max / 4) s += '<text class="rx-label" x="' + (P.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v) + '</text>';
        s += '<line class="rx-axis" x1="' + P.l + '" y1="' + (P.t + ih) + '" x2="' + (W - P.r) + '" y2="' + (P.t + ih) + '"/>';
        times.forEach((t, i) => {
            const x = P.l + i * bw + bw * .18, w = bw * .64;
            s += '<rect class="rx-bar' + (t === best ? ' is-best' : '') + '" style="animation-delay:' + (i * .08) + 's" x="' + x + '" y="' + y(t) + '" width="' + w + '" height="' + (P.t + ih - y(t)) + '" rx="4"/>';
            s += '<text class="rx-label rx-label--strong" x="' + (x + w / 2) + '" y="' + (y(t) - 5) + '" text-anchor="middle">' + t + '</text>';
            s += '<text class="rx-label" x="' + (x + w / 2) + '" y="' + (H - 6) + '" text-anchor="middle">R' + (i + 1) + '</text>';
        });
        s += '<line class="rx-avg" x1="' + P.l + '" y1="' + y(avg) + '" x2="' + (W - P.r) + '" y2="' + y(avg) + '"/>';
        s += '<text class="rx-label rx-label--avg" x="' + (W - P.r) + '" y="' + (y(avg) - 5) + '" text-anchor="end">Ø ' + avg + '</text>';
        return s + '</svg>';
    }

    function histChart(avg) {
        const W = 320, H = 170, P = { l: 8, r: 8, t: 18, b: 22 };
        const edges = [100, 150, 200, 250, 300, 350, 400, 500, Infinity];
        const labels = ['<150', '150', '200', '250', '300', '350', '400', '500+'];
        const counts = new Array(edges.length - 1).fill(0);
        const recent = history.slice(-60);
        recent.forEach(t => { for (let i = 0; i < counts.length; i++) if (t < edges[i + 1] || i === counts.length - 1) { counts[i]++; break; } });
        const nowBin = edges.findIndex((e, i) => i < counts.length && avg < edges[i + 1]);
        const max = Math.max(1, Math.max.apply(null, counts));
        const iw = W - P.l - P.r, ih = H - P.t - P.b, bw = iw / counts.length;
        let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Verteilung der letzten ' + recent.length + ' Reaktionszeiten">';
        s += '<line class="rx-axis" x1="' + P.l + '" y1="' + (P.t + ih) + '" x2="' + (W - P.r) + '" y2="' + (P.t + ih) + '"/>';
        counts.forEach((c, i) => {
            const h = c / max * ih, x = P.l + i * bw + 3, w = bw - 6;
            s += '<rect class="rx-bar rx-bar--hist' + (i === nowBin ? ' is-now' : '') + '" style="animation-delay:' + (i * .05) + 's" x="' + x + '" y="' + (P.t + ih - h) + '" width="' + w + '" height="' + Math.max(h, c ? 2 : 0) + '" rx="3"/>';
            if (c) s += '<text class="rx-label rx-label--strong" x="' + (x + w / 2) + '" y="' + (P.t + ih - h - 5) + '" text-anchor="middle">' + c + '</text>';
            s += '<text class="rx-label" x="' + (x + w / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + labels[i] + '</text>';
        });
        return s + '</svg>';
    }

    /* ── Eingabe ── */
    // Zeitstempel des Ereignisses (genauer als "jetzt"), falls er zur performance-Uhr passt
    function stamp(e) {
        const now = performance.now();
        return e && e.timeStamp && Math.abs(now - e.timeStamp) < 1000 ? Math.min(now, e.timeStamp) : now;
    }
    pad.addEventListener('pointerdown', e => {
        if (e.button && e.button !== 0) return;
        e.preventDefault();
        react(stamp(e));
    });
    G.keys.onPress((k, e) => {
        if (k !== ' ' && k !== 'Enter') return;
        const t = e && e.target;
        if (t && t !== pad && t.closest && t.closest('button, a, input, select, textarea')) return;
        if (e) e.preventDefault();
        react(stamp(e));
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && (state === 'wait' || state === 'decoy' || state === 'go')) {
            clearTimers();
            state = 'paused';
            setPad('paused', '⏸', 'Pause', 'Tab gewechselt – diese Runde zählt nicht. Klicke, um weiterzumachen.');
            updateHud();
        }
    });

    $('#modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        mode = b.dataset.mode;
        XIRU.$$('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        $('#mode-desc').textContent = mode === 'fies'
            ? 'Vor dem Grün blitzen manchmal andere Farben auf. Wer darauf reinfällt, hat einen Frühstart.'
            : 'Rot, warten, Grün – klicken.';
        times = []; early = 0;
        $('#result-card').hidden = true;
        idle();
    });

    idle();
});
