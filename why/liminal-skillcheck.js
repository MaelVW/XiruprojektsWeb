(function () {
    'use strict';

    XIRU.ready(function () {
        const checkStatus = document.getElementById('check-status');
        const checkTarget = document.getElementById('check-target');
        const checkNeedle = document.getElementById('check-needle');
        const checkButton = document.getElementById('check-button');
        const tallies = document.getElementById('tallies');
        const discovery = document.getElementById('discovery');
        const continueLink = document.getElementById('continue-link');
        const phaseClues = [
            'Vier Namen auf dem Band: Frank, Julie, Joey, Susie. Eine Stimme zählt weiter, nachdem die Aufnahme stoppt.',
            'Ein abgenutzter Pin trägt ein spinnenartiges Zeichen. Im Metall steckt ein dunkler Faden, der sich bewegt, wenn der Nebel näherkommt.',
            'Auf einer Notiz steht «Ormond». Dahinter: eine verlassene Hütte, vier Masken und frische Spuren im Schnee.'
        ];
        const phaseCount = phaseClues.length;
        const checksPerPhase = 4;
        let phase = 0;
        let hits = 0;
        let active = false;
        let betweenChecks = false;
        let complete = false;
        let wrongTurn = false;
        let needle = 0;
        let direction = 1;
        let lastFrame = 0;
        let animationFrame = 0;
        let targetStart = 0;
        let targetWidth = 12;

        function drawTallies() {
            tallies.replaceChildren();
            for (let i = 0; i < phaseCount; i += 1) {
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                group.setAttribute('class', 'lm-tally' + (i < phase ? ' is-found' : ''));
                group.setAttribute('viewBox', '0 0 36 40');
                group.setAttribute('aria-hidden', 'true');
                [[5, 7, 5, 33], [12, 6, 12, 32], [19, 7, 19, 33], [26, 6, 26, 32], [3, 31, 29, 9]].forEach(function (points) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', points[0]);
                    line.setAttribute('y1', points[1]);
                    line.setAttribute('x2', points[2]);
                    line.setAttribute('y2', points[3]);
                    group.appendChild(line);
                });
                tallies.appendChild(group);
            }
            tallies.setAttribute('aria-label', phase + ' von ' + phaseCount + ' Fundgruppen');
        }

        function setTarget() {
            targetWidth = 12;
            targetStart = 12 + Math.random() * 64;
            checkTarget.style.left = targetStart + '%';
            checkTarget.style.width = targetWidth + '%';
        }

        function showStartPrompt() {
            betweenChecks = false;
            checkStatus.textContent = 'Drücke die Leertaste oder den Knopf, um den Generator zu prüfen.';
            checkButton.textContent = 'Skillcheck starten';
            checkButton.hidden = false;
            checkTarget.hidden = true;
            checkNeedle.hidden = true;
        }

        function moveNeedle(timestamp) {
            if (!active) return;
            const delta = lastFrame ? Math.min(timestamp - lastFrame, 40) : 16;
            lastFrame = timestamp;
            needle += direction * delta * 0.055;
            if (needle >= 100) { needle = 100; direction = -1; }
            if (needle <= 0) { needle = 0; direction = 1; }
            checkNeedle.style.left = needle + '%';
            animationFrame = requestAnimationFrame(moveNeedle);
        }

        function startCheck() {
            active = true;
            betweenChecks = false;
            needle = Math.random() < 0.5 ? 0 : 100;
            direction = needle === 0 ? 1 : -1;
            lastFrame = 0;
            setTarget();
            checkTarget.hidden = false;
            checkNeedle.hidden = false;
            checkButton.hidden = true;
            checkStatus.textContent = 'Drücke die Leertaste, wenn der Zeiger im hellen Feld ist.';
            animationFrame = requestAnimationFrame(moveNeedle);
        }

        function finishPhase() {
            phase += 1;
            hits = 0;
            drawTallies();
            checkTarget.hidden = true;
            checkNeedle.hidden = true;
            if (phase >= phaseCount) {
                complete = true;
                XIRU.save('why-erlebt-freigeschaltet', true);
                discovery.textContent = 'Die Tür im Nebel gibt nach. Dahinter wartet ein Ort, den du selbst benennen wirst.';
                checkStatus.textContent = 'Alles gefunden. Drücke die Leertaste oder den Knopf für den nächsten Ort.';
                checkButton.textContent = 'Weiter';
                checkButton.hidden = false;
                continueLink.textContent = 'Weiter';
                continueLink.href = 'weiter.html';
                continueLink.dataset.lmComplete = 'true';
                checkButton.dataset.action = 'continue';
                return;
            }
            discovery.textContent = phaseClues[phase - 1];
            betweenChecks = true;
            checkStatus.textContent = 'Vier Kontakte gefunden. Drücke die Leertaste oder den Knopf, um tiefer zu suchen.';
            checkButton.textContent = 'Weiter suchen';
            checkButton.hidden = false;
        }

        function attemptCheck() {
            if (!active) return;
            active = false;
            cancelAnimationFrame(animationFrame);
            const success = needle >= targetStart && needle <= targetStart + targetWidth;
            if (success) {
                hits += 1;
                XIRU.beep(660, .07, 'sine', .018);
                if (hits === checksPerPhase) {
                    checkStatus.textContent = 'Vier Kontakte halten. Der fünfte Strich schliesst die Gruppe.';
                    finishPhase();
                    return;
                }
                checkStatus.textContent = 'Kontakt gehalten: ' + hits + ' von ' + checksPerPhase + '. Drücke die Leertaste für den nächsten.';
            } else {
                wrongTurn = true;
                checkStatus.textContent = 'Der Kontakt ist abgerutscht. Im Nebel ist ein weiterer Gang aufgetaucht.';
            }
            betweenChecks = true;
            checkButton.textContent = wrongTurn ? 'Weiter' : 'Nächster Skillcheck';
            checkButton.hidden = false;
        }

        function advance() {
            if (complete) {
                location.href = continueLink.href;
                return;
            }
            if (active) {
                attemptCheck();
                return;
            }
            if (betweenChecks) {
                if (wrongTurn) {
                    location.href = 'abdrift1.html';
                    return;
                }
                if (hits === checksPerPhase) finishPhase();
                else startCheck();
                return;
            }
            startCheck();
        }

        checkButton.addEventListener('click', advance);
        addEventListener('keydown', function (event) {
            if (event.code !== 'Space' || event.repeat || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
            event.preventDefault();
            advance();
        });
        addEventListener('pagehide', function () {
            active = false;
            cancelAnimationFrame(animationFrame);
        }, { once: true });
        drawTallies();
        showStartPrompt();
    });
})();
