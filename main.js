// ── Formular (formular.html) ─────────────────────────────────────
const form = document.getElementById('bewerbungsFormular');
const feedback = document.getElementById('form-feedback');

if (form) {
    const submitBtn = form.querySelector('.btn-submit');

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Wird gesendet…' : 'Bewerbung abgeben';
        submitBtn.style.opacity = isLoading ? '0.6' : '1';
        submitBtn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    }

    function startCooldown() {
        let remaining = 5;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.textContent = `Bitte warten (${remaining}s)`;

        const interval = setInterval(() => {
            remaining -= 1;
            submitBtn.textContent = `Bitte warten (${remaining}s)`;
            if (remaining <= 0) {
                clearInterval(interval);
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
                submitBtn.textContent = 'Bewerbung abgeben';
            }
        }, 1000);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        feedback.className = 'form-feedback';
        feedback.textContent = '';

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        setLoading(true);

        const eintrag = {
            id: Date.now(),
            eingereichtAm: new Date().toISOString(),
            vorname: form.vorname.value.trim(),
            nachname: form.nachname.value.trim(),
            email: form.email.value.trim(),
            alter: parseInt(form.alter.value, 10),
            betriebssystem: form.betriebssystem.value,
            erfahrung: form.erfahrung.value,
            motivation: form.motivation.value.trim()
        };

        const liste = JSON.parse(localStorage.getItem('bewerber') || '[]');
        liste.push(eintrag);
        localStorage.setItem('bewerber', JSON.stringify(liste));

        // ── EmailJS ───────────────────────────────────────────────
        const templateParams = {
            vorname:        eintrag.vorname,
            nachname:       eintrag.nachname,
            email:          eintrag.email,
            alter:          eintrag.alter,
            betriebssystem: eintrag.betriebssystem,
            erfahrung:      eintrag.erfahrung,
            motivation:     eintrag.motivation,
            eingereicht_am: new Date(eintrag.eingereichtAm).toLocaleString('de-DE')
        };

        emailjs.send('service_wv6fpan', 'template_l8waopb', templateParams)
            .then(() => {
                // Bestätigungsmail an Bewerber
                return emailjs.send('service_wv6fpan', 'template_88azkac', {
                    vorname:   eintrag.vorname,
                    nachname:  eintrag.nachname,
                    email:     eintrag.email,
                    to_email:  eintrag.email
                });
            })
            .then(() => {
                feedback.textContent = 'Ihre Bewerbung wurde erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen.';
                feedback.className = 'form-feedback success';
                form.reset();
                startCooldown();
            })
            .catch((err) => {
                console.error('EmailJS Fehler Status:', err.status);
                console.error('EmailJS Fehler Text:', err.text);
                feedback.textContent = `E-Mail fehlgeschlagen (${err.status}: ${err.text})`;
                feedback.className = 'form-feedback error';
                startCooldown();
            });
    });
}

// ── Bewerberliste (main.html) ─────────────────────────────────────
const liste = document.getElementById('bewerber-liste');

if (liste) {
    function renderListe() {
        const bewerber  = JSON.parse(localStorage.getItem('bewerber') || '[]');
        const statusMap = JSON.parse(localStorage.getItem('bewerber_status') || '{}');

        if (bewerber.length === 0) {
            liste.innerHTML = '<p>Keine Bewerbungen vorhanden.</p>';
            return;
        }

        // ── Duplikat-Erkennung ────────────────────────────────────
        // Gleiche Person = gleiche E-Mail UND gleicher Name (Vor- + Nachname)
        function gleichePerson(a, b) {
            return a.email.toLowerCase()    === b.email.toLowerCase()   &&
                   a.vorname.toLowerCase()  === b.vorname.toLowerCase() &&
                   a.nachname.toLowerCase() === b.nachname.toLowerCase();
        }

        // Gruppen bilden (Union-Find)
        const gruppe = bewerber.map((_, i) => i);
        function find(i) { return gruppe[i] === i ? i : (gruppe[i] = find(gruppe[i])); }
        function union(i, j) { gruppe[find(i)] = find(j); }

        for (let i = 0; i < bewerber.length; i++) {
            for (let j = i + 1; j < bewerber.length; j++) {
                if (gleichePerson(bewerber[i], bewerber[j])) union(i, j);
            }
        }

        // Gruppen zusammenfassen: repräsentant = neueste Bewerbung der Gruppe
        const gruppenMap = {};
        bewerber.forEach((b, i) => {
            const rep = find(i);
            if (!gruppenMap[rep]) gruppenMap[rep] = [];
            gruppenMap[rep].push({ ...b, _idx: i });
        });

        // ── Tabelle rendern ───────────────────────────────────────
        const rows = Object.values(gruppenMap).map(gruppe => {
            // Neueste Bewerbung als Haupteintrag
            const b = gruppe.sort((a, z) => new Date(z.eingereichtAm) - new Date(a.eingereichtAm))[0];
            const count = gruppe.length;
            const key = b.id;
            const st = statusMap[key] || 'offen';

            const statusBadge = st === 'angenommen'
                ? '<span class="bl-badge bl-badge--an">Angenommen</span>'
                : st === 'abgelehnt'
                ? '<span class="bl-badge bl-badge--ab">Abgelehnt</span>'
                : '';

            const nameLabel = count > 1
                ? `${b.vorname} ${b.nachname} <span class="bl-dup">(${count}x beworben)</span>`
                : `${b.vorname} ${b.nachname}`;

            const aktionBtn = st === 'offen' ? `
                <div class="bl-aktionen-inner">
                    <button class="bl-btn bl-btn--an" data-id="${key}">Annehmen</button>
                    <button class="bl-btn bl-btn--ab" data-id="${key}">Ablehnen</button>
                </div>
            ` : `
                <div class="bl-aktionen-inner">
                    <button class="bl-btn bl-btn--reset" data-id="${key}">Zurücksetzen</button>
                </div>
            `;

            return `
                <tr class="bl-row bl-row--${st}">
                    <td>${new Date(b.eingereichtAm).toLocaleDateString('de-DE')}</td>
                    <td>${nameLabel}</td>
                    <td>${b.email}</td>
                    <td>${b.alter}</td>
                    <td>${b.betriebssystem}</td>
                    <td>${b.erfahrung}</td>
                    <td class="bl-motivation">${b.motivation}</td>
                    <td>${statusBadge}</td>
                    <td class="bl-aktionen">${aktionBtn}</td>
                </tr>`;
        }).join('');

        liste.innerHTML = `
            <table class="bewerber-tabelle">
                <thead>
                    <tr>
                        <th>Datum</th>
                        <th>Name</th>
                        <th>E-Mail</th>
                        <th>Alter</th>
                        <th>OS</th>
                        <th>Erfahrung</th>
                        <th>Motivation</th>
                        <th>Status</th>
                        <th>Aktion</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

        // Button-Events
        liste.querySelectorAll('.bl-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id   = parseInt(btn.dataset.id);
                const map  = JSON.parse(localStorage.getItem('bewerber_status') || '{}');
                if (btn.classList.contains('bl-btn--an'))    map[id] = 'angenommen';
                else if (btn.classList.contains('bl-btn--ab')) map[id] = 'abgelehnt';
                else delete map[id];
                localStorage.setItem('bewerber_status', JSON.stringify(map));
                renderListe();
            });
        });
    }

    renderListe();
}
