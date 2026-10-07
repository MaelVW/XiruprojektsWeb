(function () {
    'use strict';

    XIRU.ready(function () {
        const checkStatus = document.getElementById('check-status');
        // Anzeige und Striche zeichnet why/liminal-art.js
        const meter = LM_ART.meter(document.getElementById('check-track'));
        const checkButton = document.getElementById('check-button');
        const talliesBox = document.getElementById('tallies');
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

        const tallies = LM_ART.tallies(talliesBox, phaseCount, 'carved');

        // Jeder Treffer ritzt einen Strich, der fünfte schliesst die Gruppe
        function drawTallies(animate) {
            tallies.set(phase, hits, animate);
            talliesBox.setAttribute('aria-label', phase + ' von ' + phaseCount + ' Fundgruppen');
        }

        function setTarget() {
            targetWidth = 12;
            targetStart = 12 + Math.random() * 64;
            meter.zone(targetStart, targetWidth);
        }

        function showStartPrompt() {
            betweenChecks = false;
            checkStatus.textContent = 'Drücke die Leertaste oder den Knopf, um den Generator zu prüfen.';
            checkButton.textContent = 'Skillcheck starten';
            checkButton.hidden = false;
            meter.idle();
        }

        function moveNeedle(timestamp) {
            if (!active) return;
            const delta = lastFrame ? Math.min(timestamp - lastFrame, 40) : 16;
            lastFrame = timestamp;
            needle += direction * delta * 0.055;
            if (needle >= 100) { needle = 100; direction = -1; }
            if (needle <= 0) { needle = 0; direction = 1; }
            meter.needle(needle);
            animationFrame = requestAnimationFrame(moveNeedle);
        }

        function startCheck() {
            active = true;
            betweenChecks = false;
            needle = Math.random() < 0.5 ? 0 : 100;
            direction = needle === 0 ? 1 : -1;
            lastFrame = 0;
            meter.stop();
            setTarget();
            meter.needle(needle);
            checkButton.hidden = true;
            checkStatus.textContent = 'Drücke die Leertaste, wenn der Zeiger im hellen Feld ist.';
            animationFrame = requestAnimationFrame(moveNeedle);
        }

        function finishPhase() {
            phase += 1;
            hits = 0;
            drawTallies(true);
            meter.idle();
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
                meter.hit();
                drawTallies(true);
                XIRU.beep(660, .07, 'sine', .018);
                if (hits === checksPerPhase) {
                    checkStatus.textContent = 'Vier Kontakte halten. Der fünfte Strich schliesst die Gruppe.';
                    finishPhase();
                    return;
                }
                checkStatus.textContent = 'Kontakt gehalten: ' + hits + ' von ' + checksPerPhase + '. Drücke die Leertaste für den nächsten.';
            } else {
                wrongTurn = true;
                meter.miss();
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
        // Auf dem Handy gibt es keine Leertaste: Antippen der Anzeige zählt als Druck
        document.getElementById('check-track').addEventListener('pointerdown', function (event) {
            if (!active) return;
            event.preventDefault();
            attemptCheck();
        });
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
