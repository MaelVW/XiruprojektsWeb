// ── Formular (formular.html) ─────────────────────────────────────
const form = document.getElementById('bewerbungsFormular');
const feedback = document.getElementById('form-feedback');

if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        feedback.className = 'form-feedback';
        feedback.textContent = '';

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

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

        feedback.textContent = 'Ihre Bewerbung wurde erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen.';
        feedback.className = 'form-feedback success';
        form.reset();
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
