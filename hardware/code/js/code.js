/* ==========================================================================
   Code-Bibliothek – Programmiersprachen lernen (Kurse + Cheat-Sheets als Word)
   Daten: hardware/code/data/<id>.js ruft XIRU_CODE.add({...}) auf:
     { id, n, icon, color, tag, level, use, intro, kw: [Schlüsselwörter], comment: '//' | '#' | '<!--',
       sheet: [{ g: 'Basics', items: [[begriff, code, beschreibung, vertiefung?], …] }, …],
       lessons: [{ t, text (HTML), code, live?: 'html'|'css'|'js', quiz: [{ q, a: [...], ok, why }] }, …] }
   Seiten: index.html → XIRU_CODE.index(); <sprache>.html → XIRU_CODE.page('<id>')
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU, C = window.XIRU_CODE = { list: [], add(l) { this.list.push(l); } };
    const SAVE = 'code-fortschritt';
    const esc = X.esc;
    const progress = () => X.load(SAVE, {}) || {};
    const doneCount = l => Object.keys((progress()[l.id] || {})).length;

    /* ── Mini-Hervorhebung: Kommentare, Texte, Zahlen, Schlüsselwörter, Tags ── */
    function highlight(code, l) {
        const kw = new Set(l.kw || []);
        let out = '', i = 0;
        const s = String(code);
        const line = l.comment === '#' ? '#' : l.comment === '--' ? '--' : '//';
        while (i < s.length) {
            const rest = s.slice(i);
            let m;
            if (l.comment === '<!--' && rest.startsWith('<!--')) { const e = s.indexOf('-->', i); const end = e < 0 ? s.length : e + 3; out += '<span class="hl-c">' + esc(s.slice(i, end)) + '</span>'; i = end; continue; }
            if (l.comment !== '<!--' && rest.startsWith('/*')) { const e = s.indexOf('*/', i + 2); const end = e < 0 ? s.length : e + 2; out += '<span class="hl-c">' + esc(s.slice(i, end)) + '</span>'; i = end; continue; }
            if (l.comment !== '<!--' && rest.startsWith(line)) { const e = s.indexOf('\n', i); const end = e < 0 ? s.length : e; out += '<span class="hl-c">' + esc(s.slice(i, end)) + '</span>'; i = end; continue; }
            if ((m = /^("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`]*`)/.exec(rest))) { out += '<span class="hl-s">' + esc(m[0]) + '</span>'; i += m[0].length; continue; }
            if (l.markup && (m = /^<\/?[a-zA-Z][\w-]*/.exec(rest))) { out += '<span class="hl-t">' + esc(m[0]) + '</span>'; i += m[0].length; continue; }
            if ((m = /^\d+(\.\d+)?/.exec(rest))) { out += '<span class="hl-n">' + m[0] + '</span>'; i += m[0].length; continue; }
            if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) { out += kw.has(m[0]) ? '<span class="hl-k">' + m[0] + '</span>' : esc(m[0]); i += m[0].length; continue; }
            out += esc(s[i]); i++;
        }
        return out;
    }
    const codeBlock = (code, l) => '<div class="cb"><button class="cb__copy" type="button" data-copy>Kopieren</button><pre><code>' + highlight(code, l) + '</code></pre></div>';

    /* ── Word-Datei ── */
    function sheetDoc(langs, title) {
        return X.docx.cheatSheet({
            title: title || 'Cheat Sheet – Programmierbefehle & Definitionen',
            intro: 'Aus der Code-Bibliothek von Xiruprojekts · erstellt am ' + new Date().toLocaleDateString('de-CH'),
            languages: langs.map(l => ({ name: l.n, groups: l.sheet.map(g => ({ name: g.g, items: g.items })) }))
        });
    }
    function downloadSheet(langs, file) {
        X.docx.download(sheetDoc(langs, langs.length === 1 ? 'Cheat Sheet – ' + langs[0].n : null), file);
        XIRU.egg('c-cheatsheet');
        X.toast('Cheat-Sheet erstellt', file + ' liegt in deinen Downloads.', { icon: '📄' });
    }

    /* ── Übersicht ── */
    C.index = function () {
        const grid = X.$('#langs'), P = progress();
        const total = C.list.reduce((a, l) => a + l.sheet.reduce((b, g) => b + g.items.length, 0), 0);
        X.$('#lib-count').textContent = C.list.length + ' Sprachen · ' + total + ' Begriffe · ' + C.list.reduce((a, l) => a + l.lessons.length, 0) + ' Lektionen';
        grid.innerHTML = C.list.map((l, i) => {
            const done = Object.keys(P[l.id] || {}).length, pct = Math.round(done / l.lessons.length * 100);
            return '<a class="lang-card" href="' + l.id + '.html" style="--lc:' + l.color + ';--d:' + (i * .05) + 's" data-reveal>' +
                '<span class="lang-card__icon" aria-hidden="true">' + l.icon + '</span>' +
                '<span class="lang-card__name">' + esc(l.n) + '</span><span class="lang-card__tag">' + esc(l.tag) + '</span>' +
                '<span class="lang-card__meta"><span class="badge">' + esc(l.level) + '</span><span class="small muted">' + l.lessons.length + ' Lektionen</span></span>' +
                '<span class="bar" aria-label="' + pct + ' % geschafft"><span class="bar__fill" style="width:' + pct + '%"></span></span></a>';
        }).join('');
        X.$('#all-sheets').addEventListener('click', () => downloadSheet(C.list, 'Cheat-Sheet-Alle-Sprachen.docx'));
        X.initReveal && X.initReveal();
    };

    /* ── Sprachseite ── */
    C.page = function (id) {
        const l = C.list.find(x => x.id === id); if (!l) return;
        document.documentElement.style.setProperty('--lc', l.color);
        const root = X.$('#lang');
        const P = progress(), mine = P[id] || (P[id] = {});
        root.innerHTML =
            '<section class="lang-hero"><span class="lang-hero__icon" aria-hidden="true">' + l.icon + '</span><div>' +
            '<span class="eyebrow">⌨ Code-Bibliothek</span><h1>' + esc(l.n) + '</h1><p class="lead">' + l.intro + '</p>' +
            '<div class="row mt-2"><span class="chip">🎯 ' + esc(l.use) + '</span><span class="chip">📈 ' + esc(l.level) + '</span><span class="chip" id="lang-prog"></span></div>' +
            '<div class="row mt-3"><button class="btn btn--primary" type="button" id="go-course">▶ Kurs starten</button>' +
            '<button class="btn" type="button" id="dl-sheet">📄 Cheat-Sheet als Word</button>' +
            '<a class="btn btn--ghost" href="' + X.url('ki/code-tutor.html') + '">✦ Code-Tutor fragen</a></div></div></section>' +
            '<div class="tabs" role="tablist"><button class="tab" role="tab" data-t="kurs" aria-selected="true">Kurs</button><button class="tab" role="tab" data-t="sheet" aria-selected="false">Cheat-Sheet</button></div>' +
            '<section id="t-kurs" class="course"><nav class="course__nav" id="lessons" aria-label="Lektionen"></nav><article class="course__main card" id="lesson"></article></section>' +
            '<section id="t-sheet" hidden><div class="sheet-tools"><input class="input" type="search" id="sheet-q" placeholder="Begriff suchen …" aria-label="Im Cheat-Sheet suchen"></div><div id="sheet"></div></section>';
        let cur = Math.max(0, l.lessons.findIndex((_, i) => !mine['l' + i]));
        if (cur < 0) cur = 0;
        const setProg = () => { const d = Object.keys(mine).length; X.$('#lang-prog').textContent = '✅ ' + d + '/' + l.lessons.length + ' Lektionen'; };
        function save() { P[id] = mine; X.save(SAVE, P); setProg(); }
        function renderNav() {
            X.$('#lessons').innerHTML = l.lessons.map((ls, i) => '<button type="button" class="course__item' + (i === cur ? ' is-active' : '') + (mine['l' + i] ? ' is-done' : '') + '" data-i="' + i + '">' +
                '<span class="course__num">' + (mine['l' + i] ? '✓' : i + 1) + '</span>' + esc(ls.t) + '</button>').join('');
        }
        function renderLesson() {
            const ls = l.lessons[cur];
            let h = '<span class="eyebrow">Lektion ' + (cur + 1) + ' von ' + l.lessons.length + '</span><h2>' + esc(ls.t) + '</h2><div class="lesson__text">' + ls.text + '</div>';
            if (ls.code) h += ls.live ? liveEditor(ls) : codeBlock(ls.code, l);
            if (ls.quiz && ls.quiz.length) {
                h += '<h3 class="mt-3">Kurz testen</h3>' + ls.quiz.map((q, qi) => '<fieldset class="quiz" data-q="' + qi + '"><legend>' + esc(q.q) + '</legend>' +
                    q.a.map((a, ai) => '<button type="button" class="quiz__a" data-a="' + ai + '">' + (/[<>{};=()]/.test(a) ? '<code>' + esc(a) + '</code>' : esc(a)) + '</button>').join('') +
                    '<p class="quiz__why" hidden></p></fieldset>').join('');
            }
            h += '<div class="row mt-3 lesson__nav">' + (cur > 0 ? '<button class="btn btn--ghost" type="button" data-go="-1">← Zurück</button>' : '') +
                '<button class="btn btn--primary" type="button" id="lesson-done">' + (cur < l.lessons.length - 1 ? 'Verstanden – weiter →' : 'Kurs abschliessen ✓') + '</button></div>';
            const el = X.$('#lesson');
            el.innerHTML = h;
            if (ls.live) bindLive(el, ls);
            el.querySelectorAll('.quiz').forEach(fs => fs.addEventListener('click', e => {
                const b = e.target.closest('.quiz__a'); if (!b || fs.dataset.done) return;
                const q = ls.quiz[+fs.dataset.q], ok = +b.dataset.a === q.ok;
                b.classList.add(ok ? 'is-ok' : 'is-bad');
                if (ok) { fs.dataset.done = '1'; fs.querySelectorAll('.quiz__a').forEach(x => { x.disabled = true; }); X.beep(880, .06, 'sine', .03); }
                else X.beep(220, .08, 'square', .02);
                const why = fs.querySelector('.quiz__why'); why.hidden = false; why.textContent = (ok ? '✔ Richtig! ' : '✘ Nicht ganz. ') + (q.why || '');
            }));
        }
        function liveEditor(ls) {
            return '<div class="live"><div class="live__head"><span>✎ Probier es aus – der Code ist bearbeitbar</span><button class="btn btn--sm btn--ghost" type="button" data-reset>Zurücksetzen</button></div>' +
                '<div class="live__body"><textarea class="live__code" spellcheck="false" aria-label="Code bearbeiten">' + esc(ls.code) + '</textarea>' +
                '<iframe class="live__out" title="Vorschau" sandbox="allow-scripts"></iframe></div></div>';
        }
        function bindLive(el, ls) {
            const ta = el.querySelector('.live__code'), fr = el.querySelector('.live__out');
            // Die Vorschau läuft in einem abgeschotteten iframe (sandbox ohne same-origin) – sie kommt nicht an Konto oder Spielstände
            const wrap = c => ls.live === 'css' ? '<!doctype html><meta charset="utf-8"><style>' + c + '</style>' + (ls.html || '') :
                ls.live === 'js' ? '<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;padding:12px"><pre id="out"></pre><script>const log=(...a)=>{document.getElementById("out").textContent+=a.join(" ")+"\\n"};console.log=log;try{' + c.replace(/<\/script/gi, '<\\/script') + '}catch(e){log("Fehler: "+e.message)}<\/script>' :
                '<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;padding:12px">' + c;
            let t;
            const run = () => { fr.srcdoc = wrap(ta.value); };
            ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 350); });
            ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const p = ta.selectionStart; ta.setRangeText('    ', p, ta.selectionEnd, 'end'); } });
            el.querySelector('[data-reset]').addEventListener('click', () => { ta.value = ls.code; run(); });
            run();
        }
        X.$('#lessons').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; cur = +b.dataset.i; renderNav(); renderLesson(); X.$('#lesson').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        X.$('#lesson').addEventListener('click', e => {
            const go = e.target.closest('[data-go]');
            if (go) { cur = Math.max(0, cur - 1); renderNav(); renderLesson(); return; }
            const cp = e.target.closest('[data-copy]');
            if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.nextElementSibling.textContent).then(() => { cp.textContent = 'Kopiert ✓'; setTimeout(() => { cp.textContent = 'Kopieren'; }, 1500); }); return; }
            if (e.target.id === 'lesson-done') {
                mine['l' + cur] = Date.now(); save(); XIRU.egg('c-lektion');
                if (Object.keys(mine).length === l.lessons.length) { XIRU.egg('c-kurs'); X.toast('Kurs geschafft: ' + l.n, 'Stark! Das Cheat-Sheet hilft beim Wiederholen.', { icon: '🎓' }); }
                if (cur < l.lessons.length - 1) cur++;
                renderNav(); renderLesson(); X.$('#lesson').scrollIntoView({ block: 'start', behavior: 'smooth' });
            }
        });
        // Cheat-Sheet auf der Seite
        function renderSheet() {
            const q = (X.$('#sheet-q').value || '').toLowerCase().trim();
            const groups = l.sheet.map(g => ({ g: g.g, items: g.items.filter(it => !q || (it[0] + ' ' + it[1] + ' ' + it[2]).toLowerCase().includes(q)) })).filter(g => g.items.length);
            X.$('#sheet').innerHTML = groups.map(g => '<h3 class="sheet__g">' + esc(g.g) + '</h3><div class="table-wrap"><table class="sheet"><thead><tr><th>Begriff</th><th>Code-Beispiel</th><th>Beschreibung</th></tr></thead><tbody>' +
                g.items.map(it => '<tr><th scope="row">' + esc(it[0]) + '</th><td>' + (it[1] ? '<pre><code>' + highlight(it[1], l) + '</code></pre>' : '<span class="faint">–</span>') + '</td><td>' + esc(it[2]) +
                    (it[3] ? '<details><summary>Vertiefung</summary><p>' + esc(it[3]) + '</p></details>' : '') + '</td></tr>').join('') + '</tbody></table></div>').join('') ||
                '<p class="muted">Nichts gefunden.</p>';
        }
        X.$('#sheet-q').addEventListener('input', renderSheet);
        const tabs = X.$$('.tabs .tab');
        function show(t) { tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.t === t)); X.$('#t-kurs').hidden = t !== 'kurs'; X.$('#t-sheet').hidden = t !== 'sheet'; if (t === 'sheet') renderSheet(); }
        tabs.forEach(b => b.addEventListener('click', () => show(b.dataset.t)));
        X.$('#go-course').addEventListener('click', () => { show('kurs'); X.$('#lesson').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        X.$('#dl-sheet').addEventListener('click', () => downloadSheet([l], 'Cheat-Sheet-' + l.n.replace(/[^\w+#-]/g, '').replace('#', 'Sharp') + '.docx'));
        if (location.hash === '#cheatsheet') show('sheet');
        setProg(); renderNav(); renderLesson();
    };
})();
