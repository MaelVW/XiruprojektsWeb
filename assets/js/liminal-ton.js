/* ==========================================================================
   Liminal – Ton. Neonröhren-Brummen, Klopfen hinter der Wand, vier Schritte,
   gedämpfte Stimmen, ferne Schreie, Radiorauschen, Lüftung, Risse im Putz.
   Alles wird live erzeugt (Web Audio) – keine Aufnahmen.
   Welche Schichten ein Raum hat:  <body data-lm-ton="brumm klopfen schritte stimmen schreie band lueftung riss">
   Ohne Attribut nur „brumm", leeres Attribut = Stille. Respektiert die Ton-Einstellung der Website.
   Wird von liminal.js nachgeladen.
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU;
    const AC = window.AudioContext || window.webkitAudioContext;
    const R = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [440, 1020], [300, 870], [660, 1700]];

    // Alle Klänge; ctx darf auch ein OfflineAudioContext sein (zum Einpegeln)
    function engine(ctx, master) {
        const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        noise.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
        const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.6), ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
        // „Hinter der Wand": dumpf und hallig
        const bus = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), verb = ctx.createConvolver();
        verb.buffer = ir; dry.gain.value = .7; wet.gain.value = .5;
        bus.connect(dry).connect(master); bus.connect(verb).connect(wet).connect(master);
        const now = () => ctx.currentTime + .05;
        const filter = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q || .7; return n; };
        const wall = (f) => { const n = filter('lowpass', f || 520, .3); n.connect(bus); return n; };
        const pan = (p, to) => { const n = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(); if (n.pan) n.pan.value = p; n.connect(to); return n; };
        const gain = (v, to) => { const n = ctx.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };
        function env(g, t, a, peak, d) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
        function noiseSrc(t, dur) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur); return s; }

        function knock(t, out, loud) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.setValueAtTime(R(105, 125), t); o.frequency.exponentialRampToValueAtTime(R(52, 62), t + .14);
            env(g, t, .004, 1.1 * loud, .22); o.connect(g).connect(out); o.start(t); o.stop(t + .3);
            const n = noiseSrc(t, .07), ng = ctx.createGain();
            env(ng, t, .002, .7 * loud, .05); n.connect(filter('bandpass', R(700, 1100), 1.2)).connect(ng).connect(out);
        }
        const S = {
            // Neonröhre: 100-Hz-Brummen, ab und zu knistert sie
            brumm() {
                const g = gain(0, master), o = ctx.createOscillator(), o2 = ctx.createOscillator();
                o.type = 'sawtooth'; o.frequency.value = 100; o2.frequency.value = 50;
                o.connect(filter('lowpass', 900, .5)).connect(g); o2.connect(gain(.4, g));
                o.start(); o2.start();
                g.gain.setTargetAtTime(.03, ctx.currentTime, 1.5);
                return function flicker() {
                    const t = now(), n = noiseSrc(t, .5), ng = gain(0);
                    n.connect(filter('bandpass', 3800, .8)).connect(ng).connect(master);
                    for (let s = 0; s < .45; s += .03) ng.gain.setValueAtTime(Math.random() < .5 ? R(.01, .035) : 0, t + s);
                    ng.gain.setValueAtTime(0, t + .48);
                    g.gain.setValueAtTime(.05, t); g.gain.setTargetAtTime(.03, t + .45, .1);
                };
            },
            klopfen() {
                const out = pan(R(-.8, .8), wall()), n = pick([2, 3, 3, 4, 4, 4]), loud = R(.55, 1);
                let t = now();
                for (let i = 0; i < n; i++) { knock(t, out, loud * (i === n - 1 ? 1.15 : 1)); t += i === n - 2 ? R(.5, .8) : R(.28, .4); }
            },
            // Immer genau vier Schritte – mal kommen sie näher, mal gehen sie weg
            schritte() {
                const out = pan(0, wall(700)), dir = pick([-1, 1]), near = Math.random() < .6;
                let t = now();
                for (let i = 0; i < 4; i++) {
                    const loud = near ? .35 + i * .22 : 1 - i * .2;
                    if (out.pan) out.pan.setValueAtTime(dir * (.8 - i * .25), t);
                    const o = ctx.createOscillator(), g = ctx.createGain();
                    o.frequency.setValueAtTime(72, t); o.frequency.exponentialRampToValueAtTime(42, t + .1);
                    env(g, t, .006, .6 * loud, .16); o.connect(g).connect(out); o.start(t); o.stop(t + .25);
                    const nz = noiseSrc(t, .1), ng = ctx.createGain();
                    env(ng, t + .01, .01, .3 * loud, .08); nz.connect(filter('lowpass', 1100, .5)).connect(ng).connect(out);
                    t += R(.52, .68);
                }
            },
            // Gedämpftes Reden hinter der Wand (oder auf dem Band): Silben ohne Worte
            stimmen(count) {
                const t0 = now(), n = count || pick([2, 3, 4]), to = wall(560);
                for (let k = 0; k < n; k++) {
                    const t = t0 + R(0, 1.6), dur = R(2.5, 5.5), f0 = pick([105, 120, 140, 190, 210, 235]) * R(.95, 1.05);
                    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = gain(f0 * .03), amp = gain(0, pan(R(-.6, .6), to));
                    o.type = 'sawtooth'; vib.frequency.value = R(4, 6); vib.connect(vg).connect(o.frequency);
                    const f1 = filter('bandpass', 700, 6), f2 = filter('bandpass', 1200, 8);
                    o.connect(f1).connect(amp); o.connect(f2).connect(amp);
                    for (let s = t; s < t + dur;) {
                        const len = R(.12, .32), v = pick(VOWELS);
                        f1.frequency.setValueAtTime(v[0], s); f2.frequency.setValueAtTime(v[1], s); o.frequency.setValueAtTime(f0 * R(.85, 1.2), s);
                        amp.gain.setTargetAtTime(R(.25, .55), s, .03); amp.gain.setTargetAtTime(0, s + len * .7, .04);
                        s += len + (Math.random() < .2 ? R(.25, .6) : R(.02, .08));
                    }
                    o.start(t); vib.start(t); o.stop(t + dur + .5); vib.stop(t + dur + .5);
                }
            },
            // Ein Schrei, weit weg und durch Wände gedämpft
            schreie() {
                const t = now(), dur = R(1.1, 2), f0 = R(330, 420), out = pan(R(-.9, .9), wall(820));
                const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = gain(16), amp = ctx.createGain();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * R(1.6, 1.9), t + .25);
                o.frequency.linearRampToValueAtTime(f0 * R(1.3, 1.5), t + dur); o.frequency.linearRampToValueAtTime(f0 * .75, t + dur + .5);
                vib.frequency.value = R(5, 7.5); vib.connect(vg).connect(o.frequency);
                o.connect(filter('bandpass', 850, 5)).connect(amp); o.connect(filter('bandpass', 1250, 6)).connect(amp);
                amp.gain.setValueAtTime(.0001, t); amp.gain.exponentialRampToValueAtTime(.8, t + .15);
                amp.gain.setValueAtTime(.8, t + dur); amp.gain.exponentialRampToValueAtTime(.0001, t + dur + .6);
                amp.connect(out);
                const br = noiseSrc(t, dur + .6), bg = ctx.createGain();
                bg.gain.setValueAtTime(.0001, t); bg.gain.exponentialRampToValueAtTime(.07, t + .15); bg.gain.setValueAtTime(.07, t + dur); bg.gain.exponentialRampToValueAtTime(.0001, t + dur + .6);
                br.connect(filter('bandpass', 1500, .8)).connect(bg).connect(out);
                o.start(t); vib.start(t); o.stop(t + dur + .7); vib.stop(t + dur + .7);
            },
            // Radio/Band: breites Rauschen, Knistern, ab und zu sucht ein Sender und pfeift
            band() {
                const st = gain(0, master), n = noiseSrc(ctx.currentTime, 3600), bp = filter('bandpass', 2300, .4);
                n.connect(bp).connect(st);
                const lfo = ctx.createOscillator(), lg = gain(.012); lfo.frequency.value = .17; lfo.connect(lg).connect(st.gain); lfo.start();
                st.gain.setTargetAtTime(.045, ctx.currentTime, .8);
                // Knistern: eine Schleife mit vereinzelten Knacksern
                const cb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), cd = cb.getChannelData(0);
                for (let k = 0; k < 70; k++) { const at = Math.floor(Math.random() * (cd.length - 60)), amp = R(.2, 1) * (Math.random() < .5 ? -1 : 1); for (let j = 0; j < 40; j++) cd[at + j] += amp * Math.exp(-j / 6) * (Math.random() * 2 - 1); }
                const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true; cs.connect(filter('highpass', 900, .6)).connect(gain(.06, master)); cs.start();
                const swell = (t, peak, d) => { st.gain.setValueAtTime(.045, t); st.gain.linearRampToValueAtTime(peak, t + .08); st.gain.setTargetAtTime(.045, t + d, .15); };
                this.burst = () => swell(now(), R(.08, .12), R(.25, .6));   // ein Rauschstoss, z. B. pro Zeile auf Seite B
                return function tune() {
                    const t = now(), d = R(.9, 1.8), o = ctx.createOscillator(), og = gain(0, master);
                    o.frequency.setValueAtTime(R(700, 1100), t); o.frequency.exponentialRampToValueAtTime(R(2600, 3600), t + d * .5); o.frequency.exponentialRampToValueAtTime(R(900, 1500), t + d);
                    o.connect(og); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(.012, t + .1); og.gain.linearRampToValueAtTime(0, t + d);
                    o.start(t); o.stop(t + d + .05);
                    swell(t, .1, d);
                };
            },
            // Lüftung: tiefes Rauschen, das langsam atmet; manchmal knarzt Metall
            lueftung() {
                const g = gain(0, master), n = noiseSrc(ctx.currentTime, 3600), lp = filter('lowpass', 220, .5);
                const lfo = ctx.createOscillator(), lg = gain(70); lfo.frequency.value = .07; lfo.connect(lg).connect(lp.frequency); lfo.start();
                n.connect(lp).connect(g); g.gain.setTargetAtTime(.14, ctx.currentTime, 2);
                return function creak() {
                    const t = now(), d = R(.8, 1.6), c = noiseSrc(t, d), bp = filter('bandpass', 320, 18), cg = gain(0, wall(900));
                    bp.frequency.setValueAtTime(R(300, 380), t); bp.frequency.linearRampToValueAtTime(R(160, 220), t + d);
                    c.connect(bp).connect(cg); cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(1.4, t + .2); cg.gain.linearRampToValueAtTime(0, t + d);
                };
            },
            // Risse: tiefes Grollen, jeder Sprung im Putz knackt
            riss() {
                const g = gain(0, master), n = noiseSrc(ctx.currentTime, 3600);
                n.connect(filter('lowpass', 90, .7)).connect(g); g.gain.setTargetAtTime(.35, ctx.currentTime, 3);
                return function crack(depth) {
                    const t = now(), c = noiseSrc(t, .1), cg = gain(0, pan(R(-.8, .8), master));
                    c.connect(filter('bandpass', R(900, 2600), 1.5)).connect(cg); env(cg, t, .001, depth ? .12 : .3, R(.03, .08));
                    const o = ctx.createOscillator(), og = gain(0, master);
                    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
                    o.connect(og); env(og, t, .003, depth ? .08 : .2, .15); o.start(t); o.stop(t + .2);
                };
            }
        };
        return S;
    }

    const api = window.LM_TON = { engine, crack() {}, voice() {}, knock() {}, steps() {}, burst() {} };
    if (!X || !AC) return;
    X.ready(function () {
        if (X.setting('sound') === false) return;
        const attr = document.body.getAttribute('data-lm-ton');
        const layers = new Set((attr === null ? 'brumm' : attr).split(/\s+/).filter(Boolean));
        if (!layers.size) return;
        let ctx;
        try { ctx = new AC(); } catch (e) { return; }
        const LEVEL = .5, master = ctx.createGain();
        master.gain.value = 0; master.connect(ctx.destination);
        const S = engine(ctx, master);
        // Wiederkehrende Ereignisse: [Funktion, frühestens, spätestens] in Sekunden
        const EVENTS = { klopfen: [() => S.klopfen(), 22, 55], schritte: [() => S.schritte(), 28, 65], stimmen: [() => S.stimmen(), 30, 70], schreie: [() => S.schreie(), 50, 120] };
        const timers = [];
        let started = false;
        function loop(fn, a, b) { timers.push(setTimeout(() => { if (!document.hidden) fn(); loop(fn, a, b); }, R(a, b) * 1000)); }
        function begin() {
            if (started || ctx.state !== 'running') return;
            started = true;
            master.gain.setTargetAtTime(LEVEL, ctx.currentTime, .8);
            if (layers.has('brumm')) loop(S.brumm(), 6, 17);
            if (layers.has('band')) { loop(S.band(), 14, 30); api.burst = () => S.burst(); }
            if (layers.has('lueftung')) loop(S.lueftung(), 20, 45);
            if (layers.has('riss')) { const crack = S.riss(); let last = 0; api.crack = d => { const t = performance.now(); if (t - last > 110) { last = t; crack(d); } }; }
            api.voice = () => S.stimmen(1); api.knock = () => S.klopfen(); api.steps = () => S.schritte();   // für Seiten mit eigenem Ablauf (z. B. Seite B)
            const active = Object.keys(EVENTS).filter(k => layers.has(k));
            active.forEach(k => loop(EVENTS[k][0], EVENTS[k][1], EVENTS[k][2]));
            if (active.length) timers.push(setTimeout(() => EVENTS[pick(active)][0](), R(5, 11) * 1000));   // das erste kommt bald
        }
        // Browser lassen Ton oft erst nach einem Klick oder Tastendruck zu
        if (ctx.state === 'running') begin();
        else {
            ctx.resume().then(begin, () => { });
            const go = () => ctx.resume().then(begin, () => { });
            ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, go, { once: true, passive: true }));
        }
        // Wegschauen: Stille. Zurückkommen: manchmal hat währenddessen jemand geklopft.
        let hiddenAt = 0;
        document.addEventListener('visibilitychange', () => {
            if (!started) return;
            if (document.hidden) { hiddenAt = Date.now(); master.gain.setTargetAtTime(0, ctx.currentTime, .3); return; }
            master.gain.setTargetAtTime(LEVEL, ctx.currentTime, .6);
            if (Date.now() - hiddenAt > 4000 && Math.random() < .5) {
                const fn = layers.has('klopfen') ? S.klopfen : layers.has('schritte') ? S.schritte : null;
                if (fn) setTimeout(() => fn.call(S), 1200);
            }
        });
        addEventListener('pagehide', () => { timers.forEach(clearTimeout); try { ctx.close(); } catch (e) { } }, { once: true });
    });
})();
