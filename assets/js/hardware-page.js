/* Gemeinsames Skript für alle Hardware-Datenblätter (hardware/<kategorie>/<id>.html) */
XIRU.ready(function () {
    // Expertenmodus (Skill t1 „Schraubenzieher")
    if (XIRU.hasSkill('t1')) {
        XIRU.$$('[data-expert]').forEach(el => { el.hidden = false; });
        XIRU.$$('[data-expert-lock]').forEach(el => { el.hidden = true; });
    }

    // Vergleichsliste (max. 3 Teile derselben Kategorie)
    const btn = XIRU.$('#cmp-add');
    if (!btn) return;
    const cat = btn.dataset.cat, id = btn.dataset.id;
    const read = () => XIRU.store.get('xiru:vergleich', { cat: cat, ids: [] });
    function render() {
        const v = read();
        const inList = v.cat === cat && v.ids.includes(id);
        btn.textContent = inList ? '✓ Im Vergleich – öffnen' : '＋ Zum Vergleich';
    }
    btn.addEventListener('click', () => {
        let v = read();
        if (v.cat === cat && v.ids.includes(id)) { location.href = '../vergleich.html'; return; }
        if (v.cat !== cat) v = { cat: cat, ids: [] };
        v.ids.push(id);
        if (v.ids.length > 3) v.ids.shift();
        XIRU.store.set('xiru:vergleich', v);
        XIRU.toast('Zum Vergleich hinzugefügt', v.ids.length + ' von 3 Plätzen belegt', { icon: '⚖' });
        render();
    });
    render();
});
