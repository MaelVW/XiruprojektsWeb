/* ==========================================================================
   Kampf – rundenbasierter Mech-Kampf, geteilt von der Schrott-Arena (welt/arena.html)
   und den Strassen von Mnemora (mnemora.html). Nach core.js und werft.js laden.

   XIRU.kampf.fight(o) → Promise<{ win }>   (erfüllt, wenn man den Kampf verlässt)
     o.me / o.foe  { name, icon (Pixel-Icon), c: Kampfwerte, art(f) → SVG-Text der Figur }
                   c = { hp, atk, def, spd, en, crit, rep, regen }  (regen: Anteil Struktur, der sich je Runde selbst flickt)
     o.scene       'arena' (Standard, mit Tribüne) oder ein Gelände von Mnemora (strand, wald, sumpf …) → Hintergrund
     o.label       Name für Screenreader
     o.intro       erste Zeile im Kampfprotokoll (HTML)
     o.finish(win) → { title, html, leave }   was nach dem Kampf angezeigt wird (Beute usw.)
   Aktionen: Schlag · Überladung (3 Energie, doppelter Schaden) · Abwehr (Deckung + 2 Energie) · Flicken (2 Energie)
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, esc = X.esc;
    const PX = (n, s) => X.pix ? X.pix.svg(n, s || 16) : '';

    function fight(o) {
        return new Promise(resolve => {
            const S = {
                me: { c: o.me.c, hp: o.me.c.hp, en: Math.ceil(o.me.c.en / 2), guard: false },
                op: { c: o.foe.c, hp: o.foe.c.hp, en: Math.ceil(o.foe.c.en / 2), guard: false }
            };
            const scene = o.scene || 'arena';
            const root = document.createElement('div');
            root.className = 'fight fight--' + scene; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', o.label || 'Kampf');
            root.innerHTML = '<div class="fight__stage">' + (scene === 'arena' ? '<div class="fight__crowd"></div>' : '<div class="fight__land"></div>') +
                '<div class="fighter fighter--me"><div class="bars"><span>' + (o.me.icon ? PX(o.me.icon) + ' ' : '') + esc(o.me.name || 'Du') + '</span><div class="hp"><i></i></div><div class="en"><i></i></div><span class="hpt"></span></div><div class="pic"></div></div>' +
                '<div class="fighter fighter--foe"><div class="bars"><span>' + (o.foe.icon ? PX(o.foe.icon) + ' ' : '') + esc(o.foe.name) + '</span><div class="hp"><i></i></div><div class="en"><i></i></div><span class="hpt"></span></div><div class="pic"></div></div></div>' +
                '<div class="fight__bar"><div class="fight__acts">' +
                '<button class="btn btn--primary" type="button" data-act="hit">' + PX('st-atk') + ' Schlag</button><button class="btn" type="button" data-act="over">' + PX('st-E') + ' Überladung · 3</button>' +
                '<button class="btn" type="button" data-act="guard">' + PX('st-def') + ' Abwehr</button><button class="btn" type="button" data-act="heal">' + PX('w-schluessel') + ' Flicken · 2</button>' +
                '<button class="btn btn--ghost" type="button" data-act="auto" aria-pressed="false">' + PX('st-spd') + ' Automatisch</button></div><ul class="fight__log" aria-live="polite"></ul></div>';
            document.body.appendChild(root); document.body.style.overflow = 'hidden';
            const fMe = root.querySelector('.fighter--me'), fOp = root.querySelector('.fighter--foe'), log = root.querySelector('.fight__log');
            let busy = false, over = false, auto = false;
            const t0 = performance.now();
            const paint = () => {
                const f = (performance.now() - t0) / 1000;
                fMe.querySelector('.pic').innerHTML = o.me.art(f); fOp.querySelector('.pic').innerHTML = o.foe.art(f);
            };
            const tick = setInterval(() => { if (!document.hidden) paint(); }, 170); paint();
            const bars = () => [[fMe, S.me], [fOp, S.op]].forEach(([el, s]) => {
                el.querySelector('.hp i').style.width = Math.max(0, s.hp / s.c.hp * 100) + '%'; el.querySelector('.en i').style.width = (s.en / s.c.en * 100) + '%';
                el.querySelector('.hpt').textContent = 'Struktur ' + Math.max(0, s.hp) + '/' + s.c.hp + ' · Energie ' + s.en + '/' + s.c.en + (s.guard ? ' · Deckung' : '');
            });
            const say = h => { const li = document.createElement('li'); li.innerHTML = h; log.prepend(li); };
            const pop = (el, txt, col) => { const p = document.createElement('div'); p.className = 'pop'; p.textContent = txt; p.style.color = col; el.appendChild(p); setTimeout(() => p.remove(), 1000); };
            const fx = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 360); };
            const wait = ms => new Promise(r => setTimeout(r, X.setting('anim') === false ? 0 : ms));
            async function act(who, kind) {
                const a = S[who], b = S[who === 'me' ? 'op' : 'me'], ea = who === 'me' ? fMe : fOp, eb = who === 'me' ? fOp : fMe, du = who === 'me', name = du ? (o.me.name || 'Du') : o.foe.name;
                a.guard = false;
                if (kind === 'over' && a.en < 3) kind = 'hit';
                if (kind === 'heal' && a.en < 2) kind = 'guard';
                if (kind === 'hit' || kind === 'over') {
                    fx(ea, 'is-lunge'); await wait(180);
                    const crit = Math.random() * 100 < a.c.crit, ov = kind === 'over';
                    let dmg = a.c.atk * 1.8 * (.85 + Math.random() * .3) * (ov ? 2.1 : 1) - (ov ? 0 : b.c.def * .6);
                    dmg = Math.max(1, Math.round(dmg * (crit ? 1.6 : 1) * (b.guard ? .4 : 1)));
                    if (ov) a.en -= 3;
                    b.hp -= dmg; fx(eb, 'is-hit'); pop(eb, '−' + dmg + (crit ? '!' : ''), crit ? '#fde047' : '#fca5a5');
                    X.beep(ov ? 120 : 200, .1, 'sawtooth', .06);
                    say('<b>' + esc(name) + '</b> ' + (ov ? (du ? 'überlädst' : 'überlädt') + ' die Waffe' : (du ? 'schlägst' : 'schlägt') + ' zu') + (crit ? ' – <b>Volltreffer!</b>' : '') + ' (' + dmg + ' Schaden' + (b.guard ? ', abgewehrt' : '') + ')');
                    b.guard = false;
                } else if (kind === 'guard') {
                    a.guard = true; a.en = Math.min(a.c.en, a.en + 2); pop(ea, 'DECKUNG', '#93c5fd'); say('<b>' + esc(name) + '</b>' + (du ? ' gehst in Deckung und sammelst Energie.' : ' geht in Deckung und sammelt Energie.')); X.beep(440, .06, 'triangle', .04);
                } else if (kind === 'heal') {
                    const h = Math.round(a.c.hp * (.18 + (a.c.rep || 0) * .2)); a.en -= 2; a.hp = Math.min(a.c.hp, a.hp + h); pop(ea, '+' + h, '#86efac'); say('<b>' + esc(name) + '</b>' + (du ? ' flickst dich zusammen (+' : ' flickt sich zusammen (+') + h + ').'); X.beep(660, .08, 'sine', .05);
                }
                bars(); await wait(420);
            }
            function aiPick() {
                const s = S.op, r = Math.random();
                if (s.hp < s.c.hp * .35 && s.en >= 2 && r < .6) return 'heal';
                if (s.en >= 3 && r < .55) return 'over';
                if (r < .14) return 'guard';
                return 'hit';
            }
            /* Selbstreparatur (z. B. Hotfix-Karte): am Rundenende ein kleiner Teil der Struktur */
            function regen(s, el) {
                if (!s.c.regen || s.hp <= 0 || s.hp >= s.c.hp) return;
                const h = Math.max(1, Math.round(s.c.hp * s.c.regen)); s.hp = Math.min(s.c.hp, s.hp + h); pop(el, '+' + h, '#86efac');
            }
            async function round(kind) {
                if (busy || over) return; busy = true; root.querySelectorAll('[data-act]:not([data-act="auto"])').forEach(b => { b.disabled = true; });
                const meFirst = S.me.c.spd >= S.op.c.spd;
                const order = meFirst ? [['me', kind], ['op', aiPick()]] : [['op', aiPick()], ['me', kind]];
                for (const [who, k] of order) { if (S.me.hp <= 0 || S.op.hp <= 0) break; await act(who, k); }
                if (S.me.hp > 0 && S.op.hp > 0) { regen(S.me, fMe); regen(S.op, fOp); }
                S.me.en = Math.min(S.me.c.en, S.me.en + 1); S.op.en = Math.min(S.op.c.en, S.op.en + 1); bars();
                busy = false;
                if (S.me.hp <= 0 || S.op.hp <= 0) return finish(S.op.hp <= 0);
                root.querySelectorAll('[data-act]').forEach(b => { b.disabled = false; });
                root.querySelector('[data-act="over"]').disabled = S.me.en < 3; root.querySelector('[data-act="heal"]').disabled = S.me.en < 2;
                if (auto) setTimeout(() => round(S.me.en >= 3 && Math.random() < .5 ? 'over' : S.me.hp < S.me.c.hp * .3 && S.me.en >= 2 ? 'heal' : 'hit'), 250);
            }
            function finish(win) {
                over = true; clearInterval(tick);
                const r = (o.finish ? o.finish(win) : null) || {};
                const acts = root.querySelector('.fight__acts');
                acts.innerHTML = '<div style="grid-column:1/-1"><h2 class="mb-1">' + (r.title || (win ? 'Sieg!' : 'Niederlage')) + '</h2>' + (r.html || '') +
                    '<button class="btn btn--primary" type="button" data-leave>' + esc(r.leave || 'Weiter') + '</button></div>';
                const leave = acts.querySelector('[data-leave]');
                leave.addEventListener('click', () => { root.remove(); document.body.style.overflow = ''; resolve({ win }); });
                leave.focus({ preventScroll: true });
                say(win ? '<b>' + esc(r.cheer || 'Gewonnen!') + '</b>' : '<b>' + esc(o.foe.name) + '</b> gewinnt diese Runde.');
            }
            root.querySelector('.fight__acts').addEventListener('click', e => {
                const b = e.target.closest('[data-act]'); if (!b || over) return;
                if (b.dataset.act === 'auto') { auto = !auto; b.setAttribute('aria-pressed', auto); b.classList.toggle('btn--primary', auto); if (auto && !busy) round('hit'); return; }
                round(b.dataset.act);
            });
            if (o.intro) say(o.intro);
            bars(); root.querySelector('[data-act="over"]').disabled = S.me.en < 3; root.querySelector('[data-act="heal"]').disabled = S.me.en < 2;
        });
    }
    /* Stärke als eine Zahl (für Ranglisten und Vergleiche) */
    const power = c => Math.round(c.hp + c.atk * 5 + c.def * 3 + c.spd * 2 + c.en);
    X.kampf = { fight, power };
})();
