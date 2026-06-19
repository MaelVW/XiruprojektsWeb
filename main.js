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
        let remaining = 15;
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
    const bewerber = JSON.parse(localStorage.getItem('bewerber') || '[]');

    if (bewerber.length === 0) {
        liste.innerHTML = '<p>Keine Bewerbungen vorhanden.</p>';
    } else {
        const rows = bewerber.map(b => `
            <tr>
                <td>${new Date(b.eingereichtAm).toLocaleDateString('de-DE')}</td>
                <td>${b.vorname} ${b.nachname}</td>
                <td>${b.email}</td>
                <td>${b.alter}</td>
                <td>${b.betriebssystem}</td>
                <td>${b.erfahrung}</td>
                <td>${b.motivation}</td>
            </tr>
        `).join('');

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
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }
}
