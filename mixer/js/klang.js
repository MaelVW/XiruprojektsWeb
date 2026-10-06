/* ==========================================================================
   Klangmixer – Ambient-Generator, komplett mit Web Audio synthetisiert
   Jeder Kanal ist ein kleiner Generator: Rauschen + Filter + zufällige
   Ereignisse, die mit Vorlauf auf der Audio-Zeitachse geplant werden.
   ========================================================================== */
XIRU.ready(function () {
    'use strict';
    const X = XIRU, M = X.Mixer;
    const gate = M.soundGate('#sound-off');

    /* ── Werkzeuge für die Generatoren ───────────────────────────────────── */
    const rnd = (a, b) => a + Math.random() * (b - a);
    function Sched(ctx) {
        const jobs = [];
        function tick() {
            const now = ctx.currentTime, horizon = now + 1.2;
            jobs.forEach(j => {
                if (j.next < now) j.next = now + .03;           // verpasste Ereignisse überspringen
                let guard = 0;
                while (j.next < horizon && guard++ < 400) j.next += Math.max(.002, j.fn(j.next));
            });
        }
        const iv = setInterval(tick, 180);
        return {
            add(fn, delay) { jobs.push({ fn, next: ctx.currentTime + (delay || .05) }); tick(); },
            stop() { clearInterval(iv); jobs.length = 0; }
        };
    }
    function kit(ctx) {
        const K = {};
        K.gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
        K.bq = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; };
        K.pan = p => {
            if (!ctx.createStereoPanner) return K.gain(1);
            const s = ctx.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p || 0)); return s;
        };
        K.chain = function () { for (let i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; };
        K.osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
        // kurzer, gefilterter Rausch-Impuls
        K.burst = function (out, t, o) {
            const s = ctx.createBufferSource(); s.buffer = M.noise(ctx, o.kind || 'white'); s.loop = true;
            const f = K.bq(o.type || 'bandpass', o.f || 2000, o.q == null ? 1 : o.q);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(o.g, t + (o.attack || .001));
            g.gain.exponentialRampToValueAtTime(.0001, t + (o.attack || .001) + o.dur);
            K.chain(s, f, g, K.pan(o.pan || 0), out);
            s.start(t, Math.random() * 3); s.stop(t + (o.attack || 0) + o.dur + .05);
        };
        return K;
    }

    /* ── Die Kanäle ──────────────────────────────────────────────────────── */
    // build(ctx, bus, S, K, env) -> Liste laufender Quellen (werden beim Stopp beendet)
    const CH = [
        { id: 'regen', g: 'natur', n: 'Regen', i: '🌧', d: 'Tropfen auf Dach und Fenster', norm: 1.1, build(ctx, bus, S, K) {
            const n = M.noiseSource(ctx, 'pink'); K.chain(n, K.bq('highpass', 450, .5), K.bq('lowpass', 6500, .4), K.gain(.75), bus);
            const w = M.noiseSource(ctx, 'white'); K.chain(w, K.bq('bandpass', 4800, .7), K.gain(.12), bus);
            S.add(t => { K.burst(bus, t, { dur: rnd(.015, .05), f: rnd(1600, 6000), q: rnd(4, 12), g: rnd(.05, .3), pan: rnd(-.8, .8) }); return rnd(.012, .06); });
            return [n, w];
        } },
        { id: 'gewitter', g: 'natur', n: 'Gewitter', i: '⛈', d: 'Grollen und Donner, mal nah, mal fern', norm: 1, build(ctx, bus, S, K, env) {
            const r = M.noiseSource(ctx, 'brown'), rg = K.gain(.3);
            K.chain(r, K.bq('lowpass', 150, .7), rg, bus);
            S.add(t => { rg.gain.setTargetAtTime(rnd(.15, .45), t, 1.5); return rnd(2, 5); });
            S.add(t => {
                const near = Math.random(), delay = .25 + (1 - near) * 2.2, tt = t + delay;
                env.flash(t, .35 + near * .65);
                if (near > .45) K.burst(bus, tt, { type: 'highpass', f: 900, q: .5, dur: .5 + near * .5, g: .45 * near, attack: .004, pan: rnd(-.4, .4) });
                const s = ctx.createBufferSource(); s.buffer = M.noise(ctx, 'brown'); s.loop = true;
                const f = K.bq('lowpass', 1000, .8), g = ctx.createGain();
                const len = rnd(3, 6), peak = .9 + near * 1.4;
                f.frequency.setValueAtTime(700 + near * 1800, tt); f.frequency.exponentialRampToValueAtTime(110, tt + len);
                g.gain.setValueAtTime(0, tt);
                let at = tt + .05 + (1 - near) * .35;
                g.gain.linearRampToValueAtTime(peak, at);
                const rolls = 2 + Math.floor(Math.random() * 4);
                for (let i = 0; i < rolls; i++) { at += rnd(.35, 1.1); g.gain.linearRampToValueAtTime(peak * rnd(.3, .8) * (1 - i / rolls * .5), at); }
                g.gain.setTargetAtTime(.0001, at, len / 4);
                K.chain(s, f, g, K.pan(rnd(-.5, .5)), bus);
                s.start(tt, Math.random() * 3); s.stop(at + len + 1);
                return rnd(7, 22);
            }, rnd(1.2, 3));
            return [r];
        } },
        { id: 'wind', g: 'natur', n: 'Wind', i: '🌬', d: 'Böen, die ums Haus pfeifen', norm: 1.5, build(ctx, bus, S, K) {
            const n = M.noiseSource(ctx, 'pink'), bp = K.bq('bandpass', 500, 1.1), g = K.gain(.6);
            const n2 = M.noiseSource(ctx, 'white'), bp2 = K.bq('bandpass', 900, 10), g2 = K.gain(.02);
            const p = K.pan(0);
            K.chain(n, bp, g, p, bus); K.chain(n2, bp2, g2, p);
            S.add(t => {
                const gust = Math.random(), tc = rnd(.6, 2.2);
                bp.frequency.setTargetAtTime(250 + gust * 900, t, tc);
                bp.Q.setTargetAtTime(rnd(.7, 2.2), t, tc);
                g.gain.setTargetAtTime(.35 + gust * 1.1, t, tc);
                bp2.frequency.setTargetAtTime(500 + gust * 1000, t, tc);
                g2.gain.setTargetAtTime(gust > .6 ? .03 + (gust - .6) * .3 : .01, t, tc);
                if (p.pan) p.pan.setTargetAtTime(rnd(-.6, .6), t, 2);
                return rnd(.5, 2.2);
            });
            return [n, n2];
        } },
        { id: 'feuer', g: 'natur', n: 'Kaminfeuer', i: '🔥', d: 'Knistern, Knacken, warmes Fauchen', norm: 1, build(ctx, bus, S, K, env) {
            const n = M.noiseSource(ctx, 'brown'), g = K.gain(.5);
            K.chain(n, K.bq('lowpass', 380, .5), g, bus);
            const h = M.noiseSource(ctx, 'pink'), hg = K.gain(.05);
            K.chain(h, K.bq('bandpass', 1200, .8), hg, bus);
            S.add(t => { g.gain.setTargetAtTime(rnd(.35, .75), t, .15); hg.gain.setTargetAtTime(rnd(.02, .08), t, .1); return rnd(.1, .35); });
            S.add(t => {
                const cluster = Math.random() < .3 ? 2 + Math.floor(Math.random() * 5) : 1;
                for (let i = 0; i < cluster; i++) {
                    K.burst(bus, t + i * rnd(.008, .04), { dur: rnd(.003, .014), type: 'highpass', f: rnd(1200, 4500), q: .7, g: rnd(.15, .7), pan: rnd(-.6, .6) });
                }
                if (Math.random() < .07) K.burst(bus, t, { dur: .06, f: rnd(500, 1100), q: 2, g: .8, pan: rnd(-.4, .4) });
                if (cluster > 1 || Math.random() < .35) env.ember(t);
                return rnd(.04, .38);
            });
            return [n, h];
        } },
        { id: 'meer', g: 'natur', n: 'Meeresrauschen', i: '🌊', d: 'Wellen, die kommen und gehen', norm: 1.1, build(ctx, bus, S, K, env) {
            const n = M.noiseSource(ctx, 'pink'), lp = K.bq('lowpass', 500, .3), g = K.gain(.12);
            K.chain(n, lp, g, bus);
            const f = M.noiseSource(ctx, 'white'), fg = K.gain(0);
            K.chain(f, K.bq('highpass', 2600, .5), fg, bus);
            const b = M.noiseSource(ctx, 'brown');
            K.chain(b, K.bq('lowpass', 220, .5), K.gain(.22), bus);
            S.add(t => {
                const period = rnd(6, 11), rise = period * rnd(.33, .45), peak = rnd(.6, 1.1), fall = period - rise;
                g.gain.setTargetAtTime(peak, t, rise / 3);
                lp.frequency.setTargetAtTime(rnd(1700, 3200), t, rise / 3);
                g.gain.setTargetAtTime(.1, t + rise, fall / 3);
                lp.frequency.setTargetAtTime(450, t + rise, fall / 3);
                fg.gain.setTargetAtTime(.06 * peak, t + rise * .85, .35);
                fg.gain.setTargetAtTime(0, t + rise + 1.1, 1.1);
                env.wave(t, rise, period, peak);
                return period;
            }, .1);
            return [n, f, b];
        } },
        { id: 'bach', g: 'natur', n: 'Bach', i: '💧', d: 'Plätscherndes Wasser über Steine', norm: 1.3, build(ctx, bus, S, K) {
            const base = M.noiseSource(ctx, 'pink');
            K.chain(base, K.bq('lowpass', 1100, .5), K.gain(.22), bus);
            const src = M.noiseSource(ctx, 'white');
            for (let i = 0; i < 5; i++) {
                const b = K.bq('bandpass', 600 + i * 400, rnd(9, 16)), g = K.gain(0);
                src.connect(b); K.chain(b, g, K.pan(rnd(-.7, .7)), bus);
                S.add(t => {
                    b.frequency.setTargetAtTime(rnd(350, 2700), t, rnd(.02, .06));
                    g.gain.setTargetAtTime(Math.random() < .5 ? rnd(.4, 1.3) : .06, t, .02);
                    return rnd(.04, .16);
                });
            }
            // Blubbern: Sinus mit steigender Tonhöhe (klassische Tropfen-Synthese)
            S.add(t => {
                const o = K.osc('sine', 1), g = ctx.createGain(), f0 = rnd(450, 1500), d = rnd(.025, .07);
                o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * rnd(1.4, 2.2), t + d);
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(rnd(.03, .1), t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + d);
                K.chain(o, g, K.pan(rnd(-.8, .8)), bus); o.start(t); o.stop(t + d + .02);
                return rnd(.03, .2);
            });
            return [base, src];
        } },
        { id: 'voegel', g: 'natur', n: 'Vögel', i: '🐦', d: 'Synthetisches Morgengezwitscher', norm: 1.6, build(ctx, bus, S, K) {
            const dry = K.gain(1), echo = ctx.createDelay(1), fb = K.gain(.22), el = K.bq('lowpass', 3500, .5), wet = K.gain(.25);
            echo.delayTime.value = .17;
            K.chain(echo, el, fb, echo); K.chain(el, wet, bus);
            dry.connect(bus); dry.connect(echo);
            function note(t, f0, f1, dur, vol, p, fmRate, fmDepth) {
                const o = K.osc('sine', f0), g = ctx.createGain();
                o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
                if (fmRate) { const l = K.osc('sine', fmRate), lg = K.gain(fmDepth); K.chain(l, lg, o.frequency); l.start(t); l.stop(t + dur + .05); }
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.015, dur * .3));
                g.gain.setTargetAtTime(0, t + dur * .6, dur * .15);
                K.chain(o, g, p); o.start(t); o.stop(t + dur + .15);
            }
            S.add(t => {
                const p = K.pan(rnd(-.85, .85)), vol = rnd(.05, .16);
                K.chain(p, K.bq('lowpass', rnd(5000, 9000), .5), dry);
                const sp = Math.floor(Math.random() * 5);
                if (sp === 0) {                      // Pfeifer
                    const n = 2 + Math.floor(Math.random() * 3), base = rnd(2200, 3400);
                    for (let i = 0; i < n; i++) { const d = rnd(.12, .24); note(t, base * rnd(1, 1.2), base * rnd(1.15, 1.55), d, vol, p); t += d + rnd(.05, .13); }
                } else if (sp === 1) {               // Triller
                    const n = 8 + Math.floor(Math.random() * 10), f = rnd(3800, 5300);
                    for (let i = 0; i < n; i++) { note(t, f, f * .85, .035, vol * .8, p); t += .05; }
                } else if (sp === 2) {               // Zwitschern
                    const n = 3 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < n; i++) { const f = rnd(4500, 7000); note(t, f, f * .45, rnd(.05, .09), vol, p); t += rnd(.08, .18); }
                } else if (sp === 3) {               // Meise: zi-zi-dä
                    const rep = 2 + Math.floor(Math.random() * 3), hi = rnd(5000, 5600), lo = hi * .62;
                    for (let r = 0; r < rep; r++) { note(t, hi, hi * .97, .07, vol, p); t += .12; note(t, lo * 1.05, lo, .11, vol, p); t += .22; }
                } else {                             // Amsel: weicher Pfiff mit Vibrato
                    const n = 3 + Math.floor(Math.random() * 4);
                    for (let i = 0; i < n; i++) { const f = rnd(1600, 3000), d = rnd(.15, .35); note(t, f, f * rnd(.8, 1.3), d, vol, p, rnd(30, 50), 60); t += d + .04; }
                }
                return rnd(.7, 3.8);
            }, .3);
            return [];
        } },
        { id: 'grillen', g: 'natur', n: 'Grillen', i: '🦗', d: 'Eine laue Sommernacht', norm: 2, build(ctx, bus, S, K) {
            const srcs = [];
            for (let c = 0; c < 3; c++) {
                const f = 4300 + c * 370 + rnd(0, 200);
                const o = K.osc('sine', f), o2 = K.osc('sine', f * 2.01), g = K.gain(0);
                o.connect(g); K.chain(o2, K.gain(.15), g);
                K.chain(g, K.bq('lowpass', 7000, .5), K.pan((c - 1) * .6 + rnd(-.1, .1)), bus);
                o.start(); o2.start(); srcs.push(o, o2);
                const rate = rnd(25, 40), pulses = 3 + Math.floor(Math.random() * 2), period = rnd(.45, .85), vol = rnd(.05, .1);
                S.add(t => {
                    if (Math.random() < .04) return rnd(2, 6);
                    for (let i = 0; i < pulses; i++) {
                        const pt = t + i / rate;
                        g.gain.setValueAtTime(0, pt); g.gain.linearRampToValueAtTime(vol, pt + .004); g.gain.linearRampToValueAtTime(0, pt + .9 / rate);
                    }
                    return period * rnd(.95, 1.05);
                }, Math.random() * .6);
            }
            return srcs;
        } },

        { id: 'cafe', g: 'drinnen', n: 'Café', i: '☕', d: 'Gemurmel, Tassen, Kaffeemaschine', norm: 1.4, build(ctx, bus, S, K) {
            const room = M.noiseSource(ctx, 'brown');
            K.chain(room, K.bq('lowpass', 350, .5), K.gain(.22), bus);
            const out = K.bq('lowpass', 3200, .4);
            K.chain(out, K.gain(1), bus);
            const VOW = [[730, 1090], [270, 2290], [530, 1840], [570, 840], [300, 870], [660, 1720], [490, 1350], [400, 2000]];
            const srcs = [room];
            for (let v = 0; v < 5; v++) {
                const n = M.noiseSource(ctx, 'pink'), f1 = K.bq('bandpass', 500, 5), f2 = K.bq('bandpass', 1500, 7), g = K.gain(0);
                const dist = rnd(.25, .85), shift = rnd(.8, 1.25);
                n.connect(f1); n.connect(f2); f1.connect(g); f2.connect(g);
                K.chain(g, K.pan(rnd(-.8, .8)), out);
                srcs.push(n);
                let talking = Math.random() < .6;
                S.add(t => {
                    if (Math.random() < .07) talking = !talking;
                    if (!talking) { g.gain.setTargetAtTime(0, t, .08); return rnd(.4, 1.6); }
                    const vw = X.pick(VOW), syl = rnd(.11, .27);
                    f1.frequency.setTargetAtTime(vw[0] * shift, t, .03); f2.frequency.setTargetAtTime(vw[1] * shift, t, .03);
                    g.gain.setTargetAtTime(dist * rnd(2, 4.5), t, .025); g.gain.setTargetAtTime(dist * .3, t + syl * .7, .03);
                    return syl;
                }, Math.random());
            }
            function clink(t, vol) {
                const g = ctx.createGain(), base = rnd(2000, 3400);
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + .4);
                K.chain(g, K.pan(rnd(-.7, .7)), bus);
                [1, 1.48, 2.31].forEach((r, i) => { const o = K.osc('sine', base * r); K.chain(o, K.gain(1 / (i + 1)), g); o.start(t); o.stop(t + .45); });
            }
            S.add(t => { const v = rnd(.03, .07); clink(t, v); if (Math.random() < .5) clink(t + rnd(.08, .2), v * .6); return rnd(2.5, 9); }, rnd(1, 3));
            S.add(t => { if (Math.random() < .55) K.burst(bus, t, { type: 'highpass', f: 2600, q: .6, attack: .4, dur: rnd(1.6, 3), g: .035, pan: rnd(-.5, .5) }); return rnd(14, 30); }, rnd(5, 10));
            return srcs;
        } },
        { id: 'pc', g: 'drinnen', n: 'PC-Lüfter', i: '🖥', d: 'Lüfter und 50-Hz-Netzbrummen', norm: 1.4, build(ctx, bus, S, K) {
            const fan = M.noiseSource(ctx, 'pink');
            K.chain(fan, K.bq('bandpass', 450, .6), K.gain(.6), bus);
            const air = M.noiseSource(ctx, 'white');
            K.chain(air, K.bq('bandpass', 2400, 1.2), K.gain(.04), bus);
            const hum = K.osc('sawtooth', 50), h2 = K.osc('sine', 100), blade = K.osc('sine', 1180);
            K.chain(hum, K.bq('lowpass', 320, 1), K.gain(.06), bus);
            K.chain(h2, K.gain(.035), bus);
            K.chain(blade, K.gain(.004), bus);
            [hum, h2, blade].forEach(o => o.start());
            S.add(t => { blade.frequency.setTargetAtTime(rnd(1100, 1280), t, 2); return rnd(3, 7); });
            return [fan, air, hum, h2, blade];
        } },
        { id: 'diskette', g: 'drinnen', n: 'Diskettenlaufwerk', i: '💾', d: 'Schrittmotor-Brummen beim Lesen', norm: 2.2, build(ctx, bus, S, K, env) {
            const motor = M.noiseSource(ctx, 'brown'), mg = K.gain(0);
            K.chain(motor, K.bq('bandpass', 190, 1.5), mg, bus);
            const wob = K.osc('sine', 5), wg = K.gain(0);         // 300 U/min = 5 Hz
            K.chain(wob, wg, mg.gain); wob.start();
            function step(t, v) {
                K.burst(bus, t, { dur: .006, f: rnd(1350, 1600), q: 3, g: v });
                K.burst(bus, t, { dur: .01, type: 'lowpass', f: 450, q: 1, g: v * .7, kind: 'brown' });
            }
            function seek(t) {
                const n = 4 + Math.floor(Math.random() * 36), dt = rnd(.0035, .0075);
                for (let i = 0; i < n; i++) step(t + i * dt, .32);
                return n * dt;
            }
            S.add(t => {
                mg.gain.setTargetAtTime(.5, t, .08); wg.gain.setTargetAtTime(.18, t, .1);
                let at = t + .25;
                const ops = 1 + Math.floor(Math.random() * 4);
                for (let i = 0; i < ops; i++) {
                    at += seek(at) + rnd(.12, .45);
                    if (Math.random() < .55) { const k = 3 + Math.floor(Math.random() * 6); for (let j = 0; j < k; j++) { step(at, .42); at += rnd(.19, .26); } }
                }
                mg.gain.setTargetAtTime(0, at + .3, .12); wg.gain.setTargetAtTime(0, at + .3, .12);
                env.led('fdd', t, at - t + .4);
                return at - t + .6 + rnd(3, 11);
            }, .1);
            return [motor, wob];
        } },
        { id: 'hdd', g: 'drinnen', n: 'Festplatte', i: '🗄', d: 'Rattern der Schreib-Lese-Köpfe', norm: 2.2, build(ctx, bus, S, K, env) {
            const spin = K.osc('sine', 120), whine = K.osc('sine', 5400);   // 7200 U/min
            K.chain(spin, K.gain(.035), bus); K.chain(whine, K.gain(.0022), bus);
            spin.start(); whine.start();
            const air = M.noiseSource(ctx, 'pink');
            K.chain(air, K.bq('bandpass', 900, 1.4), K.gain(.12), bus);
            function click(t, v) {
                K.burst(bus, t, { dur: rnd(.003, .007), f: rnd(2500, 5200), q: 2.5, g: v });
                K.burst(bus, t, { dur: .008, type: 'lowpass', f: 320, q: 1, g: v * .5, kind: 'brown' });
            }
            S.add(t => {
                const long = Math.random() < .3, n = long ? 20 + Math.floor(Math.random() * 60) : 2 + Math.floor(Math.random() * 10);
                let at = t;
                for (let i = 0; i < n; i++) { click(at, rnd(.18, .55)); at += rnd(.006, .035); }
                env.led('hdd', t, at - t);
                return (at - t) + (long ? .5 : .08) + rnd(0, Math.random() < .2 ? 3.5 : .7);
            }, .2);
            return [spin, whine, air];
        } },
        { id: 'cd', g: 'drinnen', n: 'CD-Laufwerk', i: '💿', d: 'Hochdrehen, Surren, Laser-Sprünge', norm: 2.5, build(ctx, bus, S, K, env) {
            const tone = K.osc('sawtooth', 30), tf = K.bq('bandpass', 300, 6), tg = K.gain(0);
            K.chain(tone, tf, tg, bus); tone.start();
            const whir = M.noiseSource(ctx, 'pink'), wf = K.bq('bandpass', 600, 4), wg = K.gain(0);
            K.chain(whir, wf, wg, bus);
            function chirp(t) {
                const o = K.osc('square', 900), g = ctx.createGain();
                o.frequency.setValueAtTime(rnd(800, 1500), t); o.frequency.exponentialRampToValueAtTime(rnd(280, 700), t + .06);
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.02, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
                K.chain(o, K.bq('bandpass', 1200, 2), g, bus); o.start(t); o.stop(t + .09);
                K.burst(bus, t, { dur: .005, f: 3000, q: 2, g: .12 });
            }
            S.add(t => {
                const up = rnd(1.2, 2), hold = rnd(4, 11), down = rnd(2, 3), top = rnd(140, 210);
                tone.frequency.setTargetAtTime(top, t, up / 2.5); tone.frequency.setTargetAtTime(18, t + up + hold, down / 2);
                tf.frequency.setTargetAtTime(top * 4, t, up / 2.5); tf.frequency.setTargetAtTime(150, t + up + hold, down / 2);
                tg.gain.setTargetAtTime(.14, t, .3); tg.gain.setTargetAtTime(0, t + up + hold + down * .5, down / 3);
                wf.frequency.setTargetAtTime(top * 9, t, up / 2); wf.frequency.setTargetAtTime(300, t + up + hold, down / 2);
                wg.gain.setTargetAtTime(.4, t, .4); wg.gain.setTargetAtTime(0, t + up + hold + down * .4, down / 3);
                for (let at = t + up + .3; at < t + up + hold - .3; at += rnd(.3, 1.6)) chirp(at);
                env.led('cd', t, up + hold + down * .5);
                return up + hold + down + rnd(1, 6);
            }, .1);
            return [tone, whir];
        } },

        { id: 'weiss', g: 'rauschen', n: 'Weisses Rauschen', i: '◻', d: 'Alle Frequenzen gleich laut', norm: 0.35, build(ctx, bus) { const s = M.noiseSource(ctx, 'white'); s.connect(bus); return [s]; } },
        { id: 'rosa', g: 'rauschen', n: 'Rosa Rauschen', i: '🌸', d: 'Weicher, wie ferner Regen', norm: 0.5, build(ctx, bus) { const s = M.noiseSource(ctx, 'pink'); s.connect(bus); return [s]; } },
        { id: 'braun', g: 'rauschen', n: 'Braunes Rauschen', i: '🟫', d: 'Tief und warm wie ein Wasserfall', norm: 0.5, build(ctx, bus) { const s = M.noiseSource(ctx, 'brown'); s.connect(bus); return [s]; } }
    ];
    const byId = {}; CH.forEach(c => { byId[c.id] = c; });
    const GROUPS = [['natur', '🌲 Natur'], ['drinnen', '🏠 Drinnen & Technik'], ['rauschen', '〰 Rauschen']];

    const PRESETS = [
        { n: 'Regnerische Nacht', i: '🌧', v: { regen: 70, gewitter: 35, wind: 25, braun: 15 } },
        { n: 'Lagerfeuer im Wald', i: '🔥', v: { feuer: 75, grillen: 45, wind: 18, bach: 25 } },
        { n: 'Serverraum', i: '🗄', v: { pc: 80, hdd: 55, braun: 30, diskette: 20 } },
        { n: 'Retro-Bastelkeller', i: '💾', v: { diskette: 70, cd: 45, pc: 50, hdd: 30, regen: 20 } },
        { n: 'Strandspaziergang', i: '🌊', v: { meer: 85, wind: 30, voegel: 15 } },
        { n: 'Waldmorgen', i: '🌲', v: { voegel: 65, bach: 45, wind: 15 } },
        { n: 'Café im Regen', i: '☕', v: { cafe: 60, regen: 45, braun: 10 } },
        { n: 'Gewittersturm', i: '⛈', v: { regen: 90, gewitter: 85, wind: 60 } },
        { n: 'Sommernacht', i: '🦗', v: { grillen: 60, wind: 12, bach: 15 } },
        { n: 'Fokus', i: '🎧', v: { rosa: 40, braun: 35 } }
    ];

    /* ── Zustand ─────────────────────────────────────────────────────────── */
    const saved = M.load('klang', {});
    const state = Object.assign({ vol: {}, mute: {}, master: 80 }, saved.last || {});
    let mixes = Array.isArray(saved.mixes) ? saved.mixes : [];
    function persist() { M.save('klang', { mixes, last: { vol: state.vol, mute: state.mute, master: state.master } }); }
    let persistT = 0;
    const persistSoon = () => { clearTimeout(persistT); persistT = setTimeout(persist, 400); };

    /* ── Oberfläche: Kanäle ──────────────────────────────────────────────── */
    X.$('#channels').innerHTML = GROUPS.map(([g, label]) =>
        '<div class="ch-group"><h3>' + label + '</h3><div class="ch-grid">' +
        CH.filter(c => c.g === g).map(c =>
            '<div class="ch" data-id="' + c.id + '">' +
            '<div class="ch__head"><div class="ch__icon" aria-hidden="true">' + c.i + '</div>' +
            '<div class="ch__text"><div class="ch__name"><span>' + X.esc(c.n) + '</span><span class="ch__pct">0 %</span></div>' +
            '<div class="ch__desc">' + X.esc(c.d) + '</div></div>' +
            '<button class="mx-icon-btn ch__mute" type="button" aria-pressed="false" aria-label="' + X.esc(c.n) + ' stumm schalten" title="Stumm">🔈</button></div>' +
            '<input class="mx-range" type="range" min="0" max="100" step="1" value="0" aria-label="Lautstärke ' + X.esc(c.n) + '">' +
            '<div class="ch__meter" aria-hidden="true"><i></i></div></div>').join('') +
        '</div></div>').join('');

    const ui = {};
    CH.forEach(c => {
        const el = X.$('.ch[data-id="' + c.id + '"]');
        ui[c.id] = { el, range: X.$('input', el), pct: X.$('.ch__pct', el), mute: X.$('.ch__mute', el) };
        ui[c.id].range.addEventListener('input', () => setVol(c.id, +ui[c.id].range.value, true));
        ui[c.id].mute.addEventListener('click', () => setMute(c.id, !state.mute[c.id]));
    });

    function renderChannel(id) {
        const u = ui[id], v = state.vol[id] || 0, muted = !!state.mute[id];
        u.range.value = v; M.paintRange(u.range);
        u.pct.textContent = v + ' %';
        u.mute.setAttribute('aria-pressed', muted);
        u.mute.textContent = muted ? '🔇' : '🔈';
        u.el.classList.toggle('is-on', v > 0 && !muted);
        u.el.classList.toggle('is-muted', muted);
    }
    function renderStatus() {
        const active = CH.filter(c => (state.vol[c.id] || 0) > 0 && !state.mute[c.id]);
        X.$('#status').innerHTML = '<b>' + active.length + '</b> ' + (active.length === 1 ? 'Kanal' : 'Kanäle') + ' aktiv' + (playing ? ' · läuft' : '');
        X.$('#screen-label').textContent = playing ? (active.length ? active.map(c => c.n).slice(0, 4).join(' · ') + (active.length > 4 ? ' …' : '') : 'Stille') : 'Bereit';
        if (playing && active.length === CH.length) X.egg('x-klang-alle');
    }

    /* ── Audio-Graph ─────────────────────────────────────────────────────── */
    let ctx = null, master = null, mixBus = null, analyser = null, playing = false;
    const nodes = {};
    const env = {
        flash(t, power) { later(t, () => { flash.a = Math.max(flash.a, power); flash.bolt = makeBolt(); flash.at = performance.now(); }); },
        ember(t) { later(t, () => spawnEmbers()); },
        wave(t, rise, period, peak) { later(t, () => { sea.t0 = performance.now(); sea.rise = rise; sea.period = period; sea.peak = peak; }); },
        led(kind, t, dur) { later(t, () => { leds[kind] = performance.now() + dur * 1000; }); }
    };
    function later(t, fn) { if (!ctx) return; setTimeout(fn, Math.max(0, (t - ctx.currentTime) * 1000)); }

    const curve = v => Math.pow(v / 100, 2);
    function effGain(id) { return state.mute[id] ? 0 : curve(state.vol[id] || 0) * byId[id].norm; }

    function ensureGraph() {
        if (ctx) return true;
        ctx = M.ctx();
        if (!ctx) return false;
        master = ctx.createGain(); master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .25;
        analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .82;
        // Visualisierung hört vor dem Hauptregler mit -> Bilder auch bei leiser Wiedergabe
        mixBus = ctx.createGain();
        mixBus.connect(master); mixBus.connect(analyser);
        master.connect(comp); comp.connect(ctx.destination);
        return true;
    }
    function startChannel(id) {
        let n = nodes[id];
        if (!n) {
            const out = ctx.createGain(); out.gain.value = 0;
            const meter = ctx.createAnalyser(); meter.fftSize = 512;
            out.connect(mixBus); out.connect(meter);
            n = nodes[id] = { out, meter, buf: new Float32Array(512), lvl: 0, gen: null };
        }
        if (!n.gen) {
            const bus = ctx.createGain(); bus.connect(n.out);
            const S = Sched(ctx), K = kit(ctx);
            let srcs = [];
            try { srcs = byId[id].build(ctx, bus, S, K, env) || []; } catch (e) { console.error('[Klangmixer]', id, e); }
            n.gen = { bus, S, srcs };
        }
        n.out.gain.setTargetAtTime(effGain(id), ctx.currentTime, .08);
    }
    function stopChannel(id) {
        const n = nodes[id];
        if (!n || !n.gen) return;
        const g = n.gen; n.gen = null;
        g.S.stop();
        g.srcs.forEach(s => { try { s.stop(); } catch (e) { /* schon gestoppt */ } });
        try { g.bus.disconnect(); } catch (e) { /* egal */ }
    }

    function setVol(id, v, fromUser) {
        state.vol[id] = Math.max(0, Math.min(100, Math.round(v)));
        renderChannel(id);
        if (playing) {
            if (state.vol[id] > 0) startChannel(id);
            else if (nodes[id]) nodes[id].out.gain.setTargetAtTime(0, ctx.currentTime, .08);
        }
        renderStatus();
        if (fromUser) { markCustom(); persistSoon(); }
    }
    function setMute(id, m) {
        state.mute[id] = !!m;
        renderChannel(id);
        if (playing && nodes[id]) nodes[id].out.gain.setTargetAtTime(effGain(id), ctx.currentTime, .06);
        renderStatus(); persistSoon();
    }
    function applyMix(v, mute) {
        CH.forEach(c => { state.mute[c.id] = !!(mute && mute[c.id]); setVol(c.id, v[c.id] || 0, false); });
        persistSoon();
    }

    function play() {
        if (!gate.check()) return;
        if (!ensureGraph()) return;
        if (!CH.some(c => (state.vol[c.id] || 0) > 0)) applyPreset(PRESETS[0], true);
        playing = true;
        CH.forEach(c => { if ((state.vol[c.id] || 0) > 0) startChannel(c.id); });
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(curve(state.master), ctx.currentTime, .4);
        renderPlay(); renderStatus(); wake();
    }
    function stop(fade) {
        if (!playing) return;
        playing = false;
        fade = fade || .6;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
        setTimeout(() => { if (!playing) CH.forEach(c => stopChannel(c.id)); }, fade * 1000 + 300);
        cancelTimer();
        renderPlay(); renderStatus();
    }
    function renderPlay() {
        const b = X.$('#play');
        b.classList.toggle('is-on', playing);
        b.setAttribute('aria-pressed', playing);
        b.innerHTML = playing ? '<span class="mx-play__icon" aria-hidden="true">❚❚</span><span>Stopp</span>' : '<span class="mx-play__icon" aria-hidden="true">▶</span><span>Abspielen</span>';
    }
    X.$('#play').addEventListener('click', () => playing ? stop() : play());
    document.addEventListener('keydown', e => {
        if (e.key !== ' ' || e.repeat || M.isTyping(e) || (e.target && /^(button|a)$/i.test(e.target.tagName))) return;
        e.preventDefault(); playing ? stop() : play();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && playing && ctx && ctx.state === 'suspended') ctx.resume(); });

    const masterEl = X.$('#master');
    function renderMaster() { masterEl.value = state.master; M.paintRange(masterEl); X.$('#master-val').textContent = state.master + ' %'; }
    masterEl.addEventListener('input', () => {
        state.master = +masterEl.value; renderMaster(); persistSoon();
        if (playing && !fading) master.gain.setTargetAtTime(curve(state.master), ctx.currentTime, .05);
    });

    /* ── Voreinstellungen, Zufall ────────────────────────────────────────── */
    X.$('#presets').innerHTML = PRESETS.map((p, i) => '<button class="chip" type="button" data-p="' + i + '">' + p.i + ' ' + X.esc(p.n) + '</button>').join('');
    function markCustom(active) { X.$$('#presets .chip').forEach(c => c.classList.toggle('is-active', c === active)); }
    function applyPreset(p, silent) {
        applyMix(p.v, {});
        markCustom(X.$$('#presets .chip')[PRESETS.indexOf(p)]);
        if (!silent && !playing) play();
    }
    X.$('#presets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) applyPreset(PRESETS[+b.dataset.p]); });
    X.$('#shuffle').addEventListener('click', () => {
        const pool = CH.slice().sort(() => Math.random() - .5).slice(0, X.rand(2, 4));
        const v = {}; pool.forEach((c, i) => { v[c.id] = i === 0 ? X.rand(55, 85) : X.rand(15, 60); });
        applyMix(v, {}); markCustom();
        if (!playing) play();
    });
    X.$('#zero').addEventListener('click', () => { applyMix({}, {}); markCustom(); });

    /* ── Eigene Mischungen ───────────────────────────────────────────────── */
    function renderMixes() {
        const ul = X.$('#mixes');
        if (!mixes.length) { ul.innerHTML = '<li class="mx-empty" style="background:none;border:0">Noch nichts gespeichert.</li>'; return; }
        ul.innerHTML = mixes.map((m, i) => {
            const icons = CH.filter(c => m.v[c.id] > 0).map(c => c.i).join('');
            return '<li><button class="mx-list__main" type="button" data-load="' + i + '" title="Laden">' + X.esc(m.n) + '</button><small>' + icons + '</small>' +
                '<button class="mx-icon-btn" type="button" data-del="' + i + '" aria-label="' + X.esc(m.n) + ' löschen" title="Löschen">✕</button></li>';
        }).join('');
    }
    X.$('#save-form').addEventListener('submit', e => {
        e.preventDefault();
        const name = X.$('#mix-name').value.trim() || 'Mischung ' + (mixes.length + 1);
        const v = {}; CH.forEach(c => { if (state.vol[c.id] > 0) v[c.id] = state.vol[c.id]; });
        if (!Object.keys(v).length) { X.toast('Nichts zu speichern', 'Dreh zuerst mindestens einen Kanal auf.', { icon: '🎚' }); return; }
        const mute = {}; CH.forEach(c => { if (state.mute[c.id]) mute[c.id] = true; });
        const existing = mixes.findIndex(m => m.n.toLowerCase() === name.toLowerCase());
        const entry = { n: name, v, mute, at: Date.now() };
        if (existing >= 0) mixes[existing] = entry; else mixes.unshift(entry);
        mixes = mixes.slice(0, 24);
        persist(); renderMixes();
        X.$('#mix-name').value = '';
        X.toast('Mischung gespeichert', name, { icon: '💽', time: 2500 });
    });
    X.$('#mixes').addEventListener('click', e => {
        const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
        if (l) { const m = mixes[+l.dataset.load]; applyMix(m.v, m.mute); markCustom(); if (!playing) play(); }
        if (d) { mixes.splice(+d.dataset.del, 1); persist(); renderMixes(); }
    });

    /* ── Schlaf-Timer ────────────────────────────────────────────────────── */
    const TIMES = [0, 5, 15, 30, 45, 60, 90];
    let timerEnd = 0, timerIv = 0, fading = false;
    X.$('#timer').innerHTML = TIMES.map(m => '<button class="chip' + (m === 0 ? ' is-active' : '') + '" type="button" data-min="' + m + '">' + (m ? m + ' min' : 'Aus') + '</button>').join('');
    X.$('#timer').addEventListener('click', e => {
        const b = e.target.closest('[data-min]'); if (!b) return;
        const min = +b.dataset.min;
        if (!min) { cancelTimer(); return; }
        if (!playing) play();
        if (!playing) return;
        timerEnd = Date.now() + min * 60000;
        X.$$('#timer .chip').forEach(c => c.classList.toggle('is-active', c === b));
        clearInterval(timerIv); timerIv = setInterval(tickTimer, 500); tickTimer();
    });
    function cancelTimer() {
        timerEnd = 0; clearInterval(timerIv); fading = false;
        const el = X.$('#timer-left'); el.textContent = 'Kein Timer'; el.classList.add('is-idle');
        X.$$('#timer .chip').forEach(c => c.classList.toggle('is-active', c.dataset.min === '0'));
    }
    function tickTimer() {
        if (!timerEnd) return;
        const left = (timerEnd - Date.now()) / 1000;
        const el = X.$('#timer-left'); el.classList.remove('is-idle');
        if (left > 0) { el.textContent = M.mmss(left); return; }
        // Ende: 8 Sekunden sanft ausblenden
        clearInterval(timerIv); timerEnd = 0; fading = true;
        el.textContent = 'Gute Nacht …';
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 8);
        setTimeout(() => {
            if (!fading) return;
            fading = false; stop(.2);
            X.toast('Schlaf-Timer abgelaufen', 'Der Klang ist ausgeblendet. Schlaf gut!', { icon: '🌙' });
            X.egg('x-klang-schlaf');
        }, 8200);
    }

    /* ── Visualisierung ──────────────────────────────────────────────────── */
    const flash = { a: 0, bolt: null, at: 0 };
    const sea = { t0: 0, rise: 3, period: 8, peak: .8 };
    const leds = { fdd: 0, hdd: 0, cd: 0 };
    let drops = [], embers = [];
    const cvs = M.canvas('#viz');
    let freq = null, wave = null;

    function makeBolt() {
        const w = cvs.w, h = cvs.h, pts = [];
        let x = rnd(.15, .85) * w, y = 0;
        while (y < h * .85) { pts.push([x, y]); x += rnd(-28, 28); y += rnd(10, 26); }
        pts.push([x, y]);
        return pts;
    }
    function spawnEmbers() {
        if (M.calm() || embers.length > 80) return;
        const w = cvs.w, h = cvs.h, n = X.rand(1, 3);
        for (let i = 0; i < n; i++) embers.push({ x: rnd(.2, .8) * w, y: h + 4, vx: rnd(-12, 12), vy: rnd(-70, -35), life: 1, s: rnd(1.2, 2.6) });
    }
    X.$('#screen').addEventListener('click', () => {
        if (flash.a > .12 && performance.now() - flash.at < 900) X.egg('x-klang-blitz');
        else if (!playing) play();
    });

    let raf = 0, lastT = performance.now();
    function wake() { if (!raf) raf = requestAnimationFrame(frame); }
    function frame(now) {
        raf = 0;
        const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
        draw(now, dt);
        updateMeters();
        if (playing || flash.a > .01 || embers.length) raf = requestAnimationFrame(frame);
    }
    function updateMeters() {
        CH.forEach(c => {
            const n = nodes[c.id];
            let lvl = 0;
            if (n && playing && n.gen) {
                n.meter.getFloatTimeDomainData(n.buf);
                let s = 0; for (let i = 0; i < n.buf.length; i += 2) s += n.buf[i] * n.buf[i];
                lvl = Math.min(1, Math.sqrt(s / (n.buf.length / 2)) * 4);
            }
            n && (n.lvl += (lvl - n.lvl) * .35);
            ui[c.id].el.style.setProperty('--lvl', (n ? n.lvl : 0).toFixed(3));
        });
    }

    function draw(now, dt) {
        const { ctx: g, w, h } = cvs;
        g.clearRect(0, 0, w, h);
        const calm = M.calm();
        const rain = playing ? effGain('regen') : 0, fire = playing ? effGain('feuer') : 0, seaV = playing ? effGain('meer') : 0;

        // Spektrum, gespiegelt aus der Mitte
        if (analyser && playing) {
            if (!freq) { freq = new Uint8Array(analyser.frequencyBinCount); wave = new Uint8Array(analyser.fftSize); }
            analyser.getByteFrequencyData(freq);
            analyser.getByteTimeDomainData(wave);
        }
        const bars = Math.max(24, Math.min(64, Math.floor(w / 18)));
        const mid = w / 2, bw = (w / 2) / bars;
        const rc = M.rgb('--rc'), a2 = M.rgb('--accent-2');
        for (let i = 0; i < bars; i++) {
            let v = 0;
            if (freq && playing) {
                const lo = Math.floor(Math.pow(i / bars, 2.2) * freq.length * .7) + 1, hi = Math.floor(Math.pow((i + 1) / bars, 2.2) * freq.length * .7) + 2;
                for (let k = lo; k < hi; k++) v = Math.max(v, freq[k]);
                v /= 255;
            } else v = .03 + .02 * Math.sin(now / 900 + i * .4);
            const bh = Math.max(2, v * h * .62);
            const k = i / bars;
            g.fillStyle = 'rgba(' + Math.round(M.lerp(rc[0], a2[0], k)) + ',' + Math.round(M.lerp(rc[1], a2[1], k)) + ',' + Math.round(M.lerp(rc[2], a2[2], k)) + ',' + (.25 + v * .55) + ')';
            g.fillRect(mid + i * bw + 1, h * .62 - bh, bw - 2, bh);
            g.fillRect(mid - (i + 1) * bw + 1, h * .62 - bh, bw - 2, bh);
            g.globalAlpha = .12;
            g.fillRect(mid + i * bw + 1, h * .62 + 2, bw - 2, bh * .35);
            g.fillRect(mid - (i + 1) * bw + 1, h * .62 + 2, bw - 2, bh * .35);
            g.globalAlpha = 1;
        }
        // Wellenform
        if (wave && playing) {
            g.beginPath();
            for (let i = 0; i < wave.length; i += 8) {
                const x = i / wave.length * w, y = h * .4 + (wave[i] - 128) / 128 * h * .3;
                i ? g.lineTo(x, y) : g.moveTo(x, y);
            }
            g.strokeStyle = M.color('--text', .45); g.lineWidth = 1.5; g.stroke();
        }

        // Meer: Wellenlinie unten
        if (seaV > 0) {
            const tt = (now - sea.t0) / 1000;
            const phase = tt < sea.rise ? tt / sea.rise : Math.max(0, 1 - (tt - sea.rise) / Math.max(.1, sea.period - sea.rise));
            const amp = (6 + phase * 22 * sea.peak) * Math.min(1, seaV * 2);
            const base = h - 10 - phase * 18 * sea.peak;
            g.beginPath(); g.moveTo(0, h);
            for (let x = 0; x <= w; x += 6) g.lineTo(x, base - Math.sin(x / 70 + now / 700) * amp * .4 - Math.sin(x / 31 - now / 500) * amp * .15);
            g.lineTo(w, h); g.closePath();
            g.fillStyle = M.color('--rc', .22 + .2 * Math.min(1, seaV)); g.fill();
        }

        // Regen
        if (rain > 0 && !calm) {
            const want = Math.round(Math.min(1, rain * 1.4) * 140);
            while (drops.length < want) drops.push({ x: Math.random() * (w + 60), y: Math.random() * h, v: rnd(380, 620), l: rnd(8, 18) });
            if (drops.length > want) drops.length = want;
            g.strokeStyle = M.color('--text', .28); g.lineWidth = 1;
            g.beginPath();
            drops.forEach(d => {
                d.y += d.v * dt; d.x -= d.v * dt * .18;
                if (d.y > h) { d.y = -d.l; d.x = Math.random() * (w + 60); }
                g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * .18, d.y - d.l);
            });
            g.stroke();
        } else drops.length = 0;

        // Glut
        if (embers.length) {
            const warm = M.rgb('--warning');
            embers = embers.filter(e => (e.life -= dt * .45) > 0);
            embers.forEach(e => {
                e.x += (e.vx + Math.sin(now / 300 + e.y / 20) * 8) * dt; e.y += e.vy * dt;
                g.fillStyle = 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',' + (e.life * .9).toFixed(2) + ')';
                g.beginPath(); g.arc(e.x, e.y, e.s, 0, Math.PI * 2); g.fill();
            });
        }
        if (fire > 0) {
            const warm = M.rgb('--warning');
            const grd = g.createLinearGradient(0, h, 0, h * .55);
            grd.addColorStop(0, 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',' + (.18 * Math.min(1, fire * 2) * (.8 + .2 * Math.sin(now / 90))).toFixed(3) + ')');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = grd; g.fillRect(0, h * .55, w, h * .45);
        }

        // Blitz
        if (flash.a > .01) {
            if (!calm) {
                g.fillStyle = M.color('--text', flash.a * .35); g.fillRect(0, 0, w, h);
                if (flash.bolt && flash.a > .25) {
                    g.beginPath(); flash.bolt.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
                    g.strokeStyle = M.color('--text', Math.min(1, flash.a * 1.3)); g.lineWidth = 2.2;
                    g.shadowColor = M.color('--accent-2', 1); g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0;
                }
            }
            flash.a *= Math.pow(.06, dt);
        }

        // Laufwerks-LEDs
        const techOn = playing && ['diskette', 'hdd', 'cd'].some(id => effGain(id) > 0);
        if (techOn) {
            const items = [['fdd', 'FDD', 'diskette'], ['hdd', 'HDD', 'hdd'], ['cd', 'CD', 'cd']].filter(x => effGain(x[2]) > 0);
            g.font = '700 10px ' + (getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace');
            g.textBaseline = 'middle';
            items.forEach((it, i) => {
                const x = w - 16 - (items.length - 1 - i) * 52, y = 18;
                const on = now < leds[it[0]] && (it[0] !== 'hdd' || Math.random() < .7);
                g.fillStyle = on ? M.color('--success', 1) : M.color('--border-strong', 1);
                if (on) { g.shadowColor = M.color('--success', 1); g.shadowBlur = 10; }
                g.fillRect(x - 6, y - 3, 10, 6); g.shadowBlur = 0;
                g.fillStyle = M.color('--text-faint', 1); g.textAlign = 'right';
                g.fillText(it[1], x - 10, y + .5);
            });
        }
    }
    M.onTheme(() => { if (!raf) draw(performance.now(), 0); });

    /* ── Start ───────────────────────────────────────────────────────────── */
    CH.forEach(c => renderChannel(c.id));
    renderMaster(); renderMixes(); renderStatus(); renderPlay();
    draw(performance.now(), 0);
    addEventListener('pagehide', persist);
});
