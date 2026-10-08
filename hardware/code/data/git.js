/* Code-Bibliothek · Git */
XIRU_CODE.add({
    id: 'git', n: 'Git', icon: 'git', color: '#f87171', comment: '#',
    tag: 'Die Zeitmaschine für Code: Versionen speichern, zurückspringen, zusammenarbeiten.',
    level: 'Einsteiger', use: 'Versionsverwaltung, GitHub, Teamarbeit',
    intro: 'Git ist keine Programmiersprache, sondern ein Werkzeug, das jede Version deines Projekts speichert. Ein <strong>Commit</strong> ist ein Schnappschuss. So kannst du jederzeit zurück, Neues in <strong>Branches</strong> ausprobieren und mit anderen zusammenarbeiten – zum Beispiel über GitHub. Auch diese Website wird mit Git verwaltet.',
    kw: ['git', 'init', 'clone', 'status', 'add', 'commit', 'push', 'pull', 'branch', 'switch', 'checkout', 'merge', 'log', 'diff', 'restore', 'stash', 'remote', 'origin', 'main'],
    sheet: [
        { g: 'Basics', items: [
            ['Repository', 'git init', 'Projektordner, dessen Verlauf Git verwaltet. git init macht einen Ordner dazu.'],
            ['Commit', 'git commit -m "Startseite fertig"', 'Gespeicherter Schnappschuss mit Nachricht.'],
            ['Staging', 'git add index.html', 'Auswählen, was in den nächsten Commit kommt.'],
            ['status', 'git status', 'Zeigt geänderte, neue und vorgemerkte Dateien.'],
            ['clone', 'git clone https://github.com/x/y.git', 'Kopiert ein fremdes Repository auf deinen Rechner.']
        ] },
        { g: 'Verlauf & Änderungen', items: [
            ['log', 'git log --oneline', 'Liste der Commits.'],
            ['diff', 'git diff', 'Zeigt, was sich seit dem letzten Commit geändert hat.'],
            ['restore', 'git restore index.html', 'Verwirft ungespeicherte Änderungen an einer Datei.'],
            ['stash', 'git stash\ngit stash pop', 'Änderungen kurz beiseitelegen und später zurückholen.'],
            ['.gitignore', 'node_modules/\ndev/', 'Datei mit Mustern, die Git nie aufnehmen soll (z. B. Geheimes).']
        ] },
        { g: 'Branches', items: [
            ['branch', 'git branch neues-feature', 'Eigener Entwicklungszweig, um Neues gefahrlos auszuprobieren.'],
            ['switch', 'git switch neues-feature', 'Wechselt auf einen anderen Branch (früher: checkout).'],
            ['merge', 'git merge neues-feature', 'Holt die Änderungen eines Branches in den aktuellen.', 'Ändern beide Branches dieselbe Zeile, entsteht ein Merge-Konflikt. Git markiert die Stelle mit <<<<<<< und >>>>>>>; du entscheidest, was bleibt, und committest danach.']
        ] },
        { g: 'Zusammenarbeiten', items: [
            ['remote', 'git remote add origin https://github.com/x/y.git', 'Verbindet dein Repository mit einem Server (z. B. GitHub).'],
            ['push', 'git push', 'Lädt deine Commits auf den Server hoch.'],
            ['pull', 'git pull', 'Holt neue Commits vom Server und führt sie zusammen.'],
            ['Pull Request', '–', 'Auf GitHub: Bitte, deine Änderungen in den Hauptzweig zu übernehmen – mit Review.']
        ] }
    ],
    lessons: [
        { t: 'Was ist Git?', text: '<p>Git speichert die Geschichte deines Projekts. Jeder <strong>Commit</strong> ist ein Schnappschuss mit Nachricht. Gute Nachrichten sagen kurz, <em>was</em> und <em>warum</em>.</p>',
            code: '# Ordner zu einem Repository machen\ngit init\n\n# Wie ist der Stand?\ngit status',
            quiz: [{ q: 'Was ist ein Commit?', a: ['Eine Datei', 'Ein gespeicherter Schnappschuss des Projekts', 'Ein Server'], ok: 1, why: 'Commits bilden den Verlauf.' }] },
        { t: 'add & commit', text: '<p>Zuerst merkst du Änderungen mit <code>git add</code> vor (Staging), dann speicherst du sie mit <code>git commit</code>.</p>',
            code: 'git add index.html\n# oder alles:\ngit add .\n\ngit commit -m "Startseite: Suchfeld eingebaut"\n\ngit log --oneline',
            quiz: [{ q: 'Was macht git add?', a: ['Speichert sofort einen Commit', 'Merkt Änderungen für den nächsten Commit vor', 'Lädt auf GitHub hoch'], ok: 1, why: 'add legt Änderungen in den Staging-Bereich.' }] },
        { t: 'Branches', text: '<p>Ein Branch ist eine Parallelwelt für dein Projekt. Probier dort Neues aus – der Hauptzweig bleibt sauber. Ist alles gut, holst du es mit <code>merge</code> zurück.</p>',
            code: 'git branch neues-spiel\ngit switch neues-spiel\n# … arbeiten, committen …\ngit switch main\ngit merge neues-spiel',
            quiz: [{ q: 'Womit holst du einen Branch in den aktuellen?', a: ['git merge', 'git pull', 'git branch'], ok: 0, why: 'merge führt die Änderungen zusammen.' }] },
        { t: 'GitHub: push & pull', text: '<p>Mit einem <strong>Remote</strong> (meist <code>origin</code> auf GitHub) teilst du dein Projekt. <code>push</code> lädt hoch, <code>pull</code> holt Neues herunter.</p>',
            code: 'git remote add origin https://github.com/name/projekt.git\ngit push -u origin main\n\n# später, wenn jemand anderes etwas geändert hat:\ngit pull',
            quiz: [{ q: 'Welcher Befehl lädt deine Commits hoch?', a: ['git pull', 'git push', 'git clone'], ok: 1, why: 'push schiebt nach oben, pull zieht herunter.' }] }
    ]
});
