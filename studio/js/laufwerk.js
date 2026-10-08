/* ==========================================================================
   Studio-Laufwerk: Datenträger (Diskette/CD) per Ziehen oder „Einlegen" ins
   Laufwerk legen. Animation + live erzeugte Laufwerksgeräusche (WebAudio,
   keine Aufnahmen). Danach zeigt das Laufwerk einen normalen Link zum Öffnen.

   XIRU.laufwerk(driveEl) → { insert(item, mediumEl), eject() }
   item: { name, medium: 'floppy'|'cd', href, ext, online, download }
   Ziehbare Elemente: [data-medium="<index>"], Auflösung über getItem(index).
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU;

    /* ── Geräusche ───────────────────────────────────────────────────────── */
    function ctx() { if (X.setting('sound') === false) return null; const c = X.audio(); return c && c.state === 'running' ? c : null; }
    function noise(c, dur) {
        const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = c.createBufferSource(); s.buffer = b; return s;
    }
    function click(c, t, freq, vol) {               // kurzes mechanisches Klacken
        const s = noise(c, .03), f = c.createBiquadFilter(), g = c.createGain();
        f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .03);
        s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + .04);
    }
    function hum(c, t, dur, freq, type, vol, to) {   // Motor
        const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * .8);
        f.type = 'lowpass'; f.frequency.value = 600;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .08);
        g.gain.setValueAtTime(vol, t + dur - .15); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
    }
    const SOUND = {
        floppy(dur) {
            const c = ctx(); if (!c) return; const t = c.currentTime;
            click(c, t, 900, .25);                                  // Diskette rastet ein
            hum(c, t + .1, dur, 55, 'sawtooth', .035);              // Spindelmotor
            for (let i = 0, k = t + .25; k < t + dur - .1; i++) {   // Lesekopf rattert in Schritten
                click(c, k, 1800 + (i % 3) * 400, .12); k += .05 + (i % 5 === 4 ? .18 : 0);
            }
        },
        cd(dur) {
            const c = ctx(); if (!c) return; const t = c.currentTime;
            hum(c, t, .45, 140, 'square', .02);                     // Schublade auf
            hum(c, t + .55, .4, 120, 'square', .02);                // Schublade zu
            click(c, t + .95, 700, .2);
            hum(c, t + 1, dur - .9, 90, 'triangle', .05, 420);      // CD dreht hoch
            const s = noise(c, dur - .9), f = c.createBiquadFilter(), g = c.createGain();
            f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = .8;
            g.gain.setValueAtTime(.0001, t + 1); g.gain.exponentialRampToValueAtTime(.02, t + 1.6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
            s.connect(f).connect(g).connect(c.destination); s.start(t + 1);
        },
        eject() { const c = ctx(); if (!c) return; click(c, c.currentTime, 600, .25); hum(c, c.currentTime + .03, .25, 160, 'square', .015); },
        error() { X.beep(220, .18, 'square', .05); setTimeout(() => X.beep(180, .25, 'square', .05), 200); }
    };

    const reduced = () => document.documentElement.classList.contains('no-anim') || matchMedia('(prefers-reduced-motion: reduce)').matches;

    X.laufwerk = function (drive, getItem) {
        const lcd = drive.querySelector('.drive__lcd'), actions = drive.querySelector('.drive__actions');
        const slot = drive.querySelector('.drive__slot'), tray = drive.querySelector('.drive__tray');
        let busy = false, timer = 0;
        const say = t => { lcd.textContent = t; };
        const state = s => { drive.classList.remove('is-busy', 'is-ready', 'is-error'); if (s) drive.classList.add('is-' + s); };

        function eject(silent) {
            clearTimeout(timer); busy = false; state(''); drive.classList.remove('is-tray-open');
            actions.innerHTML = '';
            if (!silent) { SOUND.eject(); say('LAUFWERK LEER · Datenträger hier hineinziehen'); }
        }

        function insert(item, from) {
            if (busy || !item) return;
            eject(true); busy = true;
            const cd = item.medium === 'cd', target = cd ? tray : slot;
            // Flug ins Laufwerk (falls der Datenträger nicht schon als Geist unterwegs ist)
            if (from && !from.classList.contains('medium-ghost')) from = ghostOf(from);
            if (from) {
                if (cd) drive.classList.add('is-tray-open');
                const r = target.getBoundingClientRect(), g = from.getBoundingClientRect();
                requestAnimationFrame(() => {
                    from.classList.add('is-in');
                    from.style.left = (r.left + r.width / 2 - g.width / 2) + 'px';
                    from.style.top = (r.top + r.height / 2 - g.height / 2) + 'px';
                });
                setTimeout(() => from.remove(), reduced() ? 0 : 900);
            }
            const dur = reduced() ? .9 : (cd ? 2.6 : 2);
            state('busy'); say((cd ? 'D:\\ ' : 'A:\\ ') + 'LESE „' + item.name.toUpperCase() + '“ …');
            SOUND[cd ? 'cd' : 'floppy'](dur);
            setTimeout(() => { if (cd) drive.classList.remove('is-tray-open'); }, reduced() ? 0 : 950);
            let p = 0;
            const step = () => {
                p = Math.min(100, p + 7 + Math.random() * 14);
                if (p < 100) { say((cd ? 'D:\\ ' : 'A:\\ ') + item.name.toUpperCase() + ' ' + '▮'.repeat(Math.round(p / 10)) + '▯'.repeat(10 - Math.round(p / 10)) + ' ' + Math.round(p) + ' %'); timer = setTimeout(step, dur * 1000 / 9); return; }
                busy = false;
                if (!item.href) {
                    state('error'); SOUND.error();
                    say('FEHLER: Datenträger ist noch unbespielt. Bald verfügbar!');
                } else {
                    state('ready');
                    say('BEREIT · ' + item.name + (item.ext ? ' (öffnet GitHub in neuem Tab)' : ''));
                    const a = document.createElement('a');
                    a.className = 'btn btn--primary btn--sm'; a.href = item.href;
                    if (item.ext) { a.target = '_blank'; a.rel = 'noopener'; }
                    else if (item.download) a.setAttribute('download', '');
                    a.textContent = item.online ? '▶ Starten' : item.ext ? '↗ Zum Download' : '⬇ Herunterladen';
                    actions.appendChild(a);
                    setTimeout(() => a.focus({ preventScroll: true }), 30);
                }
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'btn btn--ghost btn--sm'; b.textContent = '⏏ Auswerfen';
                b.addEventListener('click', () => eject());
                actions.appendChild(b);
            };
            timer = setTimeout(step, reduced() ? 100 : (cd ? 1100 : 450));
        }

        function ghostOf(el) {
            const r = el.getBoundingClientRect(), g = el.cloneNode(true);
            g.removeAttribute('data-medium'); g.removeAttribute('id');
            g.classList.add('medium-ghost'); g.setAttribute('aria-hidden', 'true');
            g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
            document.body.appendChild(g);
            return g;
        }

        /* Ziehen mit Zeiger (Maus, Stift, Finger) */
        function overDrive(x, y) { const r = drive.getBoundingClientRect(); return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12; }
        document.addEventListener('pointerdown', e => {
            const m = e.target.closest('[data-medium]'); if (!m || e.button > 0) return;
            e.preventDefault(); X.audio();
            const sx = e.clientX, sy = e.clientY, r = m.getBoundingClientRect(), ox = sx - r.left, oy = sy - r.top;
            let g = null;
            const move = ev => {
                if (!g) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; g = ghostOf(m); m.classList.add('is-dragging'); }
                g.style.left = (ev.clientX - ox) + 'px'; g.style.top = (ev.clientY - oy) + 'px';
                drive.classList.toggle('is-target', overDrive(ev.clientX, ev.clientY));
            };
            const up = ev => {
                document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
                drive.classList.remove('is-target'); m.classList.remove('is-dragging');
                if (!g) { m.animate && !reduced() && m.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 250 }); say('Zieh den Datenträger ins Laufwerk – oder nutze „Einlegen“.'); return; }
                if (ev.type === 'pointerup' && overDrive(ev.clientX, ev.clientY)) { insert(getItem(+m.dataset.medium), g); return; }
                g.classList.add('is-back'); g.style.left = r.left + 'px'; g.style.top = (m.getBoundingClientRect().top) + 'px';
                setTimeout(() => g.remove(), 400);
            };
            document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
        });

        eject(true); say('LAUFWERK LEER · Datenträger hier hineinziehen');
        return { insert, eject };
    };
})();
