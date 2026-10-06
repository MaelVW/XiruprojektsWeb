/* Snake – Referenzspiel der Spielhalle (zeigt, wie arcade.js benutzt wird) */
XIRU.ready(function () {
    const G = XIRU.Game;
    const COLS = 24, ROWS = 24, CELL = 20;
    const { ctx, W, H } = G.canvas('#cv', COLS * CELL, ROWS * CELL);
    const ov = G.overlay('#ov');
    G.bindTouch('.touch-pad');
    G.swipe('#stage', d => turn({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[d]));

    let mode = 'klassisch';
    let snake, dir, nextDir, food, score, speed, timer, paused, alive;

    function reset() {
        snake = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
        dir = { x: 1, y: 0 }; nextDir = dir;
        score = 0; speed = 8; timer = 0; paused = false; alive = true;
        placeFood();
        updateHud();
    }
    function placeFood() {
        do { food = { x: XIRU.rand(0, COLS - 1), y: XIRU.rand(0, ROWS - 1), gold: Math.random() < .08, kind: XIRU.pick(['disk', 'cd', 'ram']) }; }
        while (snake.some(s => s.x === food.x && s.y === food.y));
    }
    function updateHud() {
        G.hud('#hud', { Punkte: score, Länge: snake.length, Tempo: speed.toFixed(1) });
        const b = XIRU.best('snake');
        document.getElementById('best').textContent = b == null ? '–' : XIRU.fmt(b);
    }
    function turn(k) {
        const map = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
        const v = map[k]; if (!v) return;
        if (v[0] === -dir.x && v[1] === -dir.y) return;   // keine 180°-Wende
        nextDir = { x: v[0], y: v[1] };
    }
    G.keys.onPress(k => {
        if (k === ' ' && alive && loop.running) { paused = !paused; paused ? ov.show({ title: 'Pause', text: 'Leertaste zum Weiterspielen' }) : ov.hide(); return; }
        turn(k);
    });

    function update(dt) {
        if (paused || !alive) return;
        timer += dt;
        if (timer < 1 / speed) return;
        timer = 0;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (mode === 'wand') { head.x = (head.x + COLS) % COLS; head.y = (head.y + ROWS) % ROWS; }
        if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += food.gold ? 5 : 1;
            speed = Math.min(22, speed + .25);
            food.gold ? G.sfx.power() : G.sfx.coin();
            if (food.gold) XIRU.egg('g-snake-gold');
            placeFood();
            if (snake.length >= 30) XIRU.egg('g-snake-30');
        } else snake.pop();
        updateHud();
    }

    function draw() {
        const bg = G.css('--bg-2'), grid = G.css('--border'), accent = G.css('--rc') || '#f472b6';
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = grid; ctx.globalAlpha = .35; ctx.lineWidth = 1;
        for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL + .5, 0); ctx.lineTo(i * CELL + .5, H); ctx.stroke(); }
        for (let i = 1; i < ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL + .5); ctx.lineTo(W, i * CELL + .5); ctx.stroke(); }
        ctx.globalAlpha = 1;
        // Futter: Diskette, CD oder RAM-Riegel – selten ein Realitätskristall
        const fx = food.x * CELL, fy = food.y * CELL, pulse = 1 + Math.sin(performance.now() / 150) * .06;
        ctx.save(); ctx.translate(fx + CELL / 2, fy + CELL / 2); ctx.scale(pulse, pulse);
        if (food.gold) {
            ctx.rotate(Math.sin(performance.now() / 400) * .15);
            ctx.fillStyle = '#facc15'; ctx.beginPath();
            ctx.moveTo(0, -9); ctx.lineTo(6, -3); ctx.lineTo(4, 6); ctx.lineTo(0, 9); ctx.lineTo(-4, 6); ctx.lineTo(-6, -3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(2, -3); ctx.lineTo(0, 8); ctx.lineTo(-2, -3); ctx.closePath(); ctx.fill();
        } else if (food.kind === 'cd') {
            ctx.rotate(performance.now() / 300);
            ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, 7); ctx.fill();
            ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 1.6); ctx.stroke();
            ctx.strokeStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(0, 0, 5, 3.1, 4.7); ctx.stroke();
            ctx.fillStyle = G.css('--bg-2'); ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill();
        } else if (food.kind === 'ram') {
            ctx.fillStyle = '#16a34a'; ctx.fillRect(-8, -4, 16, 8);
            ctx.fillStyle = '#0f172a'; for (let i = -6; i <= 3; i += 3) ctx.fillRect(i, -2.5, 2.2, 3.5);
            ctx.fillStyle = '#facc15'; for (let i = -7; i <= 6; i += 2) ctx.fillRect(i, 3, 1, 1.5);
        } else {
            ctx.fillStyle = '#60a5fa'; ctx.fillRect(-7, -7, 14, 14);
            ctx.fillStyle = '#e8ebf7'; ctx.fillRect(-4, -7, 8, 5);
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-5, 1, 10, 5);
        }
        ctx.restore();
        // Schlange
        snake.forEach((s, i) => {
            ctx.fillStyle = accent; ctx.globalAlpha = i === 0 ? 1 : Math.max(.35, 1 - i / (snake.length + 6));
            G.roundRect(ctx, s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 6 : 4); ctx.fill();
        });
        ctx.globalAlpha = 1;
        const h = snake[0];
        ctx.fillStyle = bg;
        ctx.fillRect(h.x * CELL + 6 + dir.x * 3, h.y * CELL + 6 + dir.y * 3, 3, 3);
        ctx.fillRect(h.x * CELL + 11 + dir.x * 3, h.y * CELL + 11 + dir.y * 3, 3, 3);
    }

    function gameOver() {
        alive = false; loop.stop(); G.sfx.die();
        const r = XIRU.score('snake', score);
        if (score === 0) XIRU.egg('g-snake-null');
        updateHud();
        ov.show({ icon: '💥', title: 'Game Over', text: score + ' Punkte' + (r.isNew && score > 0 ? ' – neuer Rekord!' : ''), button: 'Nochmal', onClick: start });
    }
    function start() { reset(); ov.hide(); loop.start(); }

    const loop = G.loop(update, draw);
    loop.onHide = () => { if (alive && !paused) { paused = true; ov.show({ title: 'Pause', text: 'Leertaste zum Weiterspielen' }); } };

    document.getElementById('modes').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]'); if (!b || loop.running) return;
        mode = b.dataset.mode;
        document.querySelectorAll('#modes .chip').forEach(c => c.classList.toggle('is-active', c === b));
        document.getElementById('mode-desc').textContent = mode === 'wand' ? 'Wer am Rand verschwindet, taucht gegenüber wieder auf.' : 'Wände sind tödlich.';
    });

    reset(); draw();
    ov.show({ icon: '🐍', title: 'Snake', text: 'Friss Datenträger aller Epochen. Ein goldener Realitätskristall zählt fünffach.', button: 'Spielen', onClick: start });
});
