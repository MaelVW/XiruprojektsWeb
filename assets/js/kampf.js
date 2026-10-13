/* ==========================================================================
   Kampf – rundenbasierter Mech-Kampf, geteilt von der Schrott-Arena (welt/arena.html)
   und den Strassen von Mnemora (mnemora.html). Nach core.js und werft.js laden.

   XIRU.kampf.fight(o) → Promise<{ win, dmg, rounds }>   (erfüllt, wenn man den Kampf verlässt)
     o.me / o.foe  { name, icon (Pixel-Icon), c: Kampfwerte, art(f) → SVG-Text der Figur }
                   c = { hp, atk, def, spd, en, crit, rep, regen }  (regen: Anteil Struktur, der sich je Runde selbst flickt)
                   o.foe.hp (optional): Struktur zu Beginn, falls kleiner als c.hp (Weltboss: Rest-Lebenspunkte vom Server)
     o.allies      [ { name, icon, c, art } ] Truppkameraden: kämpfen von selbst mit (KI), höchstens 2
     o.rounds      Rundenlimit (Weltboss): danach endet der Kampf, gezählt wird der Schaden
     o.scene       'arena' (Standard, mit Tribüne) oder ein Gelände von Mnemora (strand, wald, sumpf …) → Hintergrund
     o.label       Name für Screenreader
     o.intro       erste Zeile im Kampfprotokoll (HTML)
     o.finish(win, info) → { title, html, leave, cheer }   was nach dem Kampf angezeigt wird (Beute usw.)
                   info = { dmg (Schaden von dir), team (Schaden vom ganzen Trupp), rounds, timeout }
   Aktionen: Schlag · Überladung (3 Energie, doppelter Schaden) · Abwehr (Deckung + 2 Energie) · Flicken (2 Energie)
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, esc = X.esc;
    const PX = (n, s) => X.pix ? X.pix.svg(n, s || 16) : '';
    const unit = (u, key) => ({ key, u, name: u.name || 'Du', c: u.c, hp: Math.min(u.c.hp, u.hp != null ? Math.max(1, Math.round(u.hp)) : u.c.hp), en: Math.ceil(u.c.en / 2), guard: false });

    function fight(o) {
        return new Promise(resolve => {
            const me = unit(o.me, 'me'), op = unit(o.foe, 'op');
            const allies = (o.allies || []).slice(0, 2).map((a, i) => unit(a, 'al' + i));
            const team = [me].concat(allies);
            const scene = o.scene || 'arena';
            const bar = (u, cls) => '<div class="fighter ' + cls + '" data-u="' + u.key + '"><div class="bars"><span>' + (u.u.icon ? PX(u.u.icon) + ' ' : '') + esc(u.name) + '</span><div class="hp"><i></i></div><div class="en"><i></i></div><span class="hpt"></span></div><div class="pic"></div></div>';
            const root = document.createElement('div');
            root.className = 'fight fight--' + scene + (allies.length ? ' fight--team' : ''); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', o.label || 'Kampf');
            root.innerHTML = '<div class="fight__stage">' + (scene === 'arena' ? '<div class="fight__crowd"></div>' : '<div class="fight__land"></div>') +
                '<div class="fight__team">' + allies.map(a => bar(a, 'fighter--ally')).join('') + bar(me, 'fighter--me') + '</div>' + bar(op, 'fighter--foe') + '</div>' +
                '<div class="fight__bar">' + (o.rounds ? '<div class="fight__rounds small"></div>' : '') + '<div class="fight__acts">' +
                '<button class="btn btn--primary" type="button" data-act="hit">' + PX('st-atk') + ' Schlag</button><button class="btn" type="button" data-act="over">' + PX('st-E') + ' Überladung · 3</button>' +
                '<button class="btn" type="button" data-act="guard">' + PX('st-def') + ' Abwehr</button><button class="btn" type="button" data-act="heal">' + PX('w-schluessel') + ' Flicken · 2</button>' +
                '<button class="btn btn--ghost" type="button" data-act="auto" aria-pressed="false">' + PX('st-spd') + ' Automatisch</button></div><ul class="fight__log" aria-live="polite"></ul></div>';
            document.body.appendChild(root); document.body.style.overflow = 'hidden';
            const all = team.concat([op]);
            all.forEach(u => { u.el = root.querySelector('[data-u="' + u.key + '"]'); });
            const log = root.querySelector('.fight__log');
            let busy = false, over = false, auto = false, round = 0, dmgMe = 0, dmgTeam = 0;
            const t0 = performance.now();
            const paint = () => {
                const f = (performance.now() - t0) / 1000;
                all.forEach((u, i) => { u.el.querySelector('.pic').innerHTML = u.u.art(f + (u === op ? 1.3 : i * .7)); });
            };
            const tick = setInterval(() => { if (!document.hidden) paint(); }, 170); paint();
            const bars = () => {
                all.forEach(s => {
                    s.el.querySelector('.hp i').style.width = Math.max(0, s.hp / s.c.hp * 100) + '%'; s.el.querySelector('.en i').style.width = (s.en / s.c.en * 100) + '%';
                    s.el.querySelector('.hpt').textContent = 'Struktur ' + Math.max(0, s.hp) + '/' + s.c.hp + ' · Energie ' + s.en + '/' + s.c.en + (s.guard ? ' · Deckung' : '');
                    s.el.classList.toggle('is-down', s.hp <= 0);
                });
                const rr = root.querySelector('.fight__rounds'); if (rr) rr.textContent = 'Runde ' + Math.min(round + 1, o.rounds) + ' von ' + o.rounds + ' · dein Schaden: ' + dmgMe;
            };
            const say = h => { const li = document.createElement('li'); li.innerHTML = h; log.prepend(li); };
            const pop = (el, txt, col) => { const p = document.createElement('div'); p.className = 'pop'; p.textContent = txt; p.style.color = col; el.appendChild(p); setTimeout(() => p.remove(), 1000); };
            const fx = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 360); };
            const wait = ms => new Promise(r => setTimeout(r, X.setting('anim') === false ? 0 : ms));
            const alive = () => team.filter(u => u.hp > 0);
            /* Der Gegner zielt meistens auf dich, sonst auf eine:n Kamerad:in */
            const target = () => { const a = alive(); return a.length > 1 && Math.random() < .45 ? X.pick(a.filter(u => u !== me && u.hp > 0)) || me : (me.hp > 0 ? me : a[0]); };
            async function act(a, kind, b) {
                const isMe = a === me, du = isMe && a.name === 'Du', name = a.name;   // „Du schlägst“ nur, wenn der eigene Mech „Du“ heisst
                a.guard = false;
                if (kind === 'over' && a.en < 3) kind = 'hit';
                if (kind === 'heal' && a.en < 2) kind = 'guard';
                if (kind === 'hit' || kind === 'over') {
                    fx(a.el, 'is-lunge'); await wait(180);
                    const crit = Math.random() * 100 < a.c.crit, ov = kind === 'over';
                    let dmg = a.c.atk * 1.8 * (.85 + Math.random() * .3) * (ov ? 2.1 : 1) - (ov ? 0 : b.c.def * .6);
                    dmg = Math.max(1, Math.round(dmg * (crit ? 1.6 : 1) * (b.guard ? .4 : 1)));
                    if (ov) a.en -= 3;
                    const real = Math.min(dmg, Math.max(0, b.hp));
                    if (b === op) { dmgTeam += real; if (isMe) dmgMe += real; }
                    b.hp -= dmg; fx(b.el, 'is-hit'); pop(b.el, '−' + dmg + (crit ? '!' : ''), crit ? '#fde047' : '#fca5a5');
                    X.beep(ov ? 120 : 200, .1, 'sawtooth', .06);
                    say('<b>' + esc(name) + '</b> ' + (ov ? (du ? 'überlädst' : 'überlädt') + ' die Waffe' : (du ? 'schlägst' : 'schlägt') + ' zu') + (b !== op && b !== me ? ' auf <b>' + esc(b.name) + '</b>' : '') + (crit ? ' – <b>Volltreffer!</b>' : '') + ' (' + dmg + ' Schaden' + (b.guard ? ', abgewehrt' : '') + ')');
                    b.guard = false;
                } else if (kind === 'guard') {
                    a.guard = true; a.en = Math.min(a.c.en, a.en + 2); pop(a.el, 'DECKUNG', '#93c5fd'); say('<b>' + esc(name) + '</b>' + (du ? ' gehst in Deckung und sammelst Energie.' : ' geht in Deckung und sammelt Energie.')); X.beep(440, .06, 'triangle', .04);
                } else if (kind === 'heal') {
                    const h = Math.round(a.c.hp * (.18 + (a.c.rep || 0) * .2)); a.en -= 2; a.hp = Math.min(a.c.hp, a.hp + h); pop(a.el, '+' + h, '#86efac'); say('<b>' + esc(name) + '</b>' + (du ? ' flickst dich zusammen (+' : ' flickt sich zusammen (+') + h + ').'); X.beep(660, .08, 'sine', .05);
                }
                bars(); await wait(a === me || a === op ? 420 : 300);
            }
            function aiPick(s) {
                const r = Math.random();
                if (s.hp < s.c.hp * .35 && s.en >= 2 && r < .6) return 'heal';
                if (s.en >= 3 && r < .55) return 'over';
                if (r < .14) return 'guard';
                return 'hit';
            }
            /* Selbstreparatur (z. B. Hotfix-Karte): am Rundenende ein kleiner Teil der Struktur */
            function regen(s) {
                if (!s.c.regen || s.hp <= 0 || s.hp >= s.c.hp) return;
                const h = Math.max(1, Math.round(s.c.hp * s.c.regen)); s.hp = Math.min(s.c.hp, s.hp + h); pop(s.el, '+' + h, '#86efac');
            }
            const done = () => op.hp <= 0 || !alive().length;
            async function turn(kind) {
                if (busy || over) return; busy = true; root.querySelectorAll('[data-act]:not([data-act="auto"])').forEach(b => { b.disabled = true; });
                const teamMoves = async () => {
                    if (me.hp > 0 && !done()) await act(me, kind, op);
                    for (const a of allies) { if (a.hp > 0 && !done()) await act(a, aiPick(a), op); }
                };
                const foeMove = async () => { if (!done()) await act(op, aiPick(op), target()); };
                if (me.c.spd >= op.c.spd) { await teamMoves(); await foeMove(); } else { await foeMove(); await teamMoves(); }
                if (!done()) { team.forEach(regen); regen(op); }
                all.forEach(s => { if (s.hp > 0) s.en = Math.min(s.c.en, s.en + 1); });
                round++; bars();
                busy = false;
                if (done()) return finish(op.hp <= 0, false);
                if (o.rounds && round >= o.rounds) return finish(false, true);
                root.querySelectorAll('[data-act]').forEach(b => { b.disabled = false; });
                const down = me.hp <= 0;
                ['hit', 'over', 'guard', 'heal'].forEach(k => { root.querySelector('[data-act="' + k + '"]').disabled = down; });
                if (!down) { root.querySelector('[data-act="over"]').disabled = me.en < 3; root.querySelector('[data-act="heal"]').disabled = me.en < 2; }
                // Bist du ausser Gefecht, kämpft der Trupp allein weiter
                if (down) setTimeout(() => turn('hit'), 350);
                else if (auto) setTimeout(() => turn(me.en >= 3 && Math.random() < .5 ? 'over' : me.hp < me.c.hp * .3 && me.en >= 2 ? 'heal' : 'hit'), 250);
            }
            function finish(win, timeout) {
                over = true; clearInterval(tick);
                const info = { dmg: dmgMe, team: dmgTeam, rounds: round, timeout };
                const r = (o.finish ? o.finish(win, info) : null) || {};
                const acts = root.querySelector('.fight__acts');
                acts.innerHTML = '<div style="grid-column:1/-1"><h2 class="mb-1">' + (r.title || (win ? 'Sieg!' : timeout ? 'Zeit um' : 'Niederlage')) + '</h2>' + (r.html || '') +
                    '<button class="btn btn--primary" type="button" data-leave>' + esc(r.leave || 'Weiter') + '</button></div>';
                const leave = acts.querySelector('[data-leave]');
                leave.addEventListener('click', () => { root.remove(); document.body.style.overflow = ''; resolve({ win, dmg: dmgMe, team: dmgTeam, rounds: round }); });
                leave.focus({ preventScroll: true });
                say(win ? '<b>' + esc(r.cheer || 'Gewonnen!') + '</b>' : timeout ? '<b>Die Zeit ist um.</b>' : '<b>' + esc(o.foe.name) + '</b> gewinnt diese Runde.');
            }
            root.querySelector('.fight__acts').addEventListener('click', e => {
                const b = e.target.closest('[data-act]'); if (!b || over) return;
                if (b.dataset.act === 'auto') { auto = !auto; b.setAttribute('aria-pressed', auto); b.classList.toggle('btn--primary', auto); if (auto && !busy) turn('hit'); return; }
                turn(b.dataset.act);
            });
            if (o.intro) say(o.intro);
            if (allies.length) say('Dein Trupp kämpft mit: ' + allies.map(a => '<b>' + esc(a.name) + '</b>').join(' und ') + '.');
            bars(); root.querySelector('[data-act="over"]').disabled = me.en < 3; root.querySelector('[data-act="heal"]').disabled = me.en < 2;
        });
    }
    /* Stärke als eine Zahl (für Ranglisten und Vergleiche) */
    const power = c => Math.round(c.hp + c.atk * 5 + c.def * 3 + c.spd * 2 + c.en);
    X.kampf = { fight, power };
})();
