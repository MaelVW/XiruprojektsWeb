/* Einheitenrechner – Datenmengen, Datenrate, Strom, Temperatur, Frequenz, Zoll & PPI */
XIRU.ready(function () {
    'use strict';
    const $ = XIRU.$, esc = XIRU.esc;
    const plain = (v, frac) => isFinite(v) ? Number(v).toLocaleString('de-CH', { maximumFractionDigits: frac == null ? 4 : frac, useGrouping: false }) : '';
    const raw = v => isFinite(v) ? String(Number(v.toPrecision(12))) : '';

    WZ.tabs($('#tabs'));

    function fillSelect(sel, units, def) {
        sel.innerHTML = units.map(u => '<option value="' + esc(u.u) + '"' + (u.u === def ? ' selected' : '') + '>' + esc(u.l || u.u) + '</option>').join('');
    }
    const byU = (list, u) => list.find(x => x.u === u);

    function rowsHTML(list, val, srcU, cls) {
        return list.map(u => {
            const v = val / u.f;
            return '<button type="button" class="wz-row' + (u.u === srcU ? ' is-src' : '') + (cls ? ' ' + cls : '') + '" data-copy="' + esc(raw(v)) + '" title="' + esc(u.n || u.u) + ' – klicken zum Kopieren">' +
                '<b>' + WZ.fmt(v, 10) + '</b><span>' + esc(u.l || u.u) + '</span></button>';
        }).join('');
    }
    document.addEventListener('click', e => {
        const r = e.target.closest && e.target.closest('.wz-row[data-copy]');
        if (!r) return;
        WZ.copy(r.getAttribute('data-copy'));
        r.classList.add('is-copied');
        setTimeout(() => r.classList.remove('is-copied'), 900);
        XIRU.toast('Kopiert', r.getAttribute('data-copy') + ' ' + r.querySelector('span').textContent, { icon: '📋', time: 1800 });
    });

    /* ── Datenmengen ─────────────────────────────────────────────────── */
    const DATA = [
        { u: 'bit', f: 1 / 8, n: 'Bit' },
        { u: 'Byte', f: 1, n: 'Byte' },
        { u: 'kB', f: 1e3, n: 'Kilobyte' }, { u: 'KiB', f: 1024, n: 'Kibibyte' },
        { u: 'MB', f: 1e6, n: 'Megabyte' }, { u: 'MiB', f: 1048576, n: 'Mebibyte' },
        { u: 'GB', f: 1e9, n: 'Gigabyte' }, { u: 'GiB', f: 1073741824, n: 'Gibibyte' },
        { u: 'TB', f: 1e12, n: 'Terabyte' }, { u: 'TiB', f: 1099511627776, n: 'Tebibyte' },
        { u: 'PB', f: 1e15, n: 'Petabyte' }, { u: 'PiB', f: 1125899906842624, n: 'Pebibyte' }
    ];
    const DEC = ['bit', 'kB', 'MB', 'GB', 'TB', 'PB'].map(u => byU(DATA, u));
    const BIN = ['Byte', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'].map(u => byU(DATA, u));
    const dVal = $('#d-val'), dUnit = $('#d-unit');
    fillSelect(dUnit, DATA, 'TB');
    let floppyT;
    function calcData() {
        const v = WZ.num(dVal.value), u = byU(DATA, dUnit.value);
        dVal.setAttribute('aria-invalid', isFinite(v) ? 'false' : 'true');
        const bytes = isFinite(v) ? v * u.f : NaN;
        $('#d-dec').innerHTML = rowsHTML(DEC, bytes, u.u);
        $('#d-bin').innerHTML = rowsHTML(BIN, bytes, u.u);
        clearTimeout(floppyT);
        // Kristall: die Kapazität einer 3,5″-Diskette (1,44 „MB“ = 1440 KiB = 1’474’560 Byte)
        if (isFinite(bytes) && (Math.abs(bytes - 1.44e6) < 0.5 || Math.abs(bytes - 1474560) < 0.5 || Math.abs(bytes - 1.44 * 1048576) < 1)) {
            floppyT = setTimeout(() => {
                if (XIRU.egg('t-einheiten-floppy')) XIRU.toast('Fun Fact', 'Die „1,44-MB“-Diskette fasst 1’474’560 Byte = 1440 KiB. Also weder 1,44 MB noch 1,44 MiB, sondern ein wilder Mix aus beidem.', { icon: '💾', time: 9000 });
            }, 500);
        }
    }
    dVal.addEventListener('input', calcData);
    dUnit.addEventListener('change', calcData);
    calcData();

    // 931-GB-Erklärung
    const tbVal = $('#tb-val'), tbUnit = $('#tb-unit');
    function calcTB() {
        const v = WZ.num(tbVal.value);
        const unit = tbUnit.value;
        const bytes = v * (unit === 'TB' ? 1e12 : 1e9);
        if (!isFinite(bytes) || bytes < 0) { $('#tb-out').innerHTML = '–'; $('#tb-loss').textContent = ''; return; }
        const gib = bytes / 1073741824, tib = bytes / 1099511627776;
        const shown = unit === 'TB' && tib >= 1 ? WZ.fix(tib, 2) + ' <small>TB</small>' : WZ.fix(gib, 2) + ' <small>GB</small>';
        $('#tb-out').innerHTML = shown;
        const loss = unit === 'TB' ? 1 - 1e12 / 1099511627776 : 1 - 1e9 / 1073741824;
        $('#tb-loss').innerHTML = 'Scheinbar „verloren“: <strong>' + WZ.fix(v - (unit === 'TB' ? tib : gib), 2) + ' ' + unit + '</strong> (' + WZ.fix(loss * 100, 1) + ' %) – in Wahrheit sind es exakt ' + XIRU.fmt(Math.round(bytes)) + ' Byte.';
    }
    tbVal.addEventListener('input', calcTB);
    tbUnit.addEventListener('change', calcTB);
    calcTB();

    /* ── Datenrate ───────────────────────────────────────────────────── */
    const RATE = [
        { u: 'bit/s', f: 1 / 8 }, { u: 'kbit/s', f: 125 }, { u: 'Mbit/s', f: 125000 }, { u: 'Gbit/s', f: 1.25e8 },
        { u: 'B/s', f: 1 }, { u: 'kB/s', f: 1e3 }, { u: 'MB/s', f: 1e6 }, { u: 'GB/s', f: 1e9 },
        { u: 'KiB/s', f: 1024 }, { u: 'MiB/s', f: 1048576 }, { u: 'GiB/s', f: 1073741824 }
    ];
    const rVal = $('#r-val'), rUnit = $('#r-unit');
    fillSelect(rUnit, RATE, 'Mbit/s');
    function calcRate() {
        const v = WZ.num(rVal.value), u = byU(RATE, rUnit.value);
        $('#r-out').innerHTML = rowsHTML(RATE, v * u.f, u.u);
    }
    rVal.addEventListener('input', calcRate);
    rUnit.addEventListener('change', calcRate);
    calcRate();

    // Downloadzeit
    const SIZE_UNITS = DATA.filter(u => u.u !== 'bit');
    const dlSize = $('#dl-size'), dlSizeU = $('#dl-size-unit'), dlSpeed = $('#dl-speed'), dlSpeedU = $('#dl-speed-unit'), dlEff = $('#dl-eff');
    fillSelect(dlSizeU, SIZE_UNITS, 'GB');
    fillSelect(dlSpeedU, RATE, 'Mbit/s');
    const SIZE_PRESETS = [['Diskette', 1.44, 'MB'], ['CD', 700, 'MB'], ['DVD', 4.7, 'GB'], ['Windows-ISO', 6, 'GB'], ['4K-Film', 25, 'GB'], ['AAA-Spiel', 150, 'GB']];
    const SPEED_PRESETS = [['10 Mbit/s', 10, 'Mbit/s'], ['50', 50, 'Mbit/s'], ['100', 100, 'Mbit/s'], ['300', 300, 'Mbit/s'], ['1 Gbit/s', 1, 'Gbit/s'], ['10 Gbit/s', 10, 'Gbit/s']];
    $('#dl-size-chips').innerHTML = SIZE_PRESETS.map((p, i) => '<button type="button" class="chip" data-i="' + i + '">' + esc(p[0]) + '</button>').join('');
    $('#dl-speed-chips').innerHTML = SPEED_PRESETS.map((p, i) => '<button type="button" class="chip" data-i="' + i + '">' + esc(p[0]) + '</button>').join('');
    $('#dl-size-chips').addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        const p = SIZE_PRESETS[+b.dataset.i]; dlSize.value = plain(p[1]); dlSizeU.value = p[2]; calcDL();
    });
    $('#dl-speed-chips').addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        const p = SPEED_PRESETS[+b.dataset.i]; dlSpeed.value = plain(p[1]); dlSpeedU.value = p[2]; calcDL();
    });

    function fmtDur(s) {
        if (!isFinite(s)) return '–';
        if (s < 1) return WZ.fix(s * 1000, 0) + ' ms';
        if (s < 60) return WZ.fix(s, s < 10 ? 1 : 0) + ' s';
        s = Math.round(s);
        const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
        const parts = [];
        if (d) parts.push(XIRU.fmt(d) + (d === 1 ? ' Tag' : ' Tage'));
        if (h) parts.push(h + ' h');
        if (m) parts.push(m + ' min');
        if (sec && !d) parts.push(sec + ' s');
        return parts.slice(0, 3).join(' ');
    }
    function calcDL() {
        const eff = +dlEff.value / 100;
        $('#dl-eff-out').textContent = dlEff.value + ' %';
        const bytes = WZ.num(dlSize.value) * byU(SIZE_UNITS, dlSizeU.value).f;
        const bps = WZ.num(dlSpeed.value) * byU(RATE, dlSpeedU.value).f;
        if (!(bytes >= 0) || !(bps > 0)) { $('#dl-out').textContent = '–'; $('#dl-extra').textContent = 'Gib eine Grösse und eine Geschwindigkeit über 0 ein.'; return; }
        const t = bytes / (bps * eff), t100 = bytes / bps;
        $('#dl-out').textContent = fmtDur(t);
        const end = new Date(Date.now() + t * 1000);
        const endTxt = t < 7 * 86400
            ? (end.toDateString() === new Date().toDateString() ? 'heute' : end.toLocaleDateString('de-CH', { weekday: 'long' })) + ' um ' + end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'
            : 'am ' + end.toLocaleDateString('de-CH');
        $('#dl-extra').innerHTML = 'Ohne Verluste (100 %): ' + fmtDur(t100) + ' · effektiv ' + WZ.fmt(bps * eff / 1e6, 4) + ' MB/s<br>Wenn du jetzt startest, bist du ' + endTxt + ' fertig.';
    }
    [dlSize, dlSpeed, dlEff].forEach(el => el.addEventListener('input', calcDL));
    [dlSizeU, dlSpeedU].forEach(el => el.addEventListener('change', calcDL));
    calcDL();

    /* ── Strom & Kosten ──────────────────────────────────────────────── */
    const DEFAULT_DEVICES = [
        { n: 'Gaming-PC (unter Last)', w: 450, h: 3, d: 7 },
        { n: 'Gaming-PC (Desktop, YouTube)', w: 90, h: 3, d: 7 },
        { n: 'Monitor 27″', w: 35, h: 6, d: 7 },
        { n: 'WLAN-Router', w: 10, h: 24, d: 7 }
    ];
    const PRESETS = [
        { n: 'Gaming-PC (Last)', w: 450, h: 3, d: 7 }, { n: 'PC im Leerlauf', w: 80, h: 4, d: 7 },
        { n: 'Laptop', w: 45, h: 4, d: 5 }, { n: 'Monitor', w: 30, h: 6, d: 7 },
        { n: 'Konsole', w: 180, h: 2, d: 7 }, { n: 'Fernseher', w: 100, h: 3, d: 7 },
        { n: 'NAS / Server', w: 35, h: 24, d: 7 }, { n: 'Standby (alles zusammen)', w: 8, h: 24, d: 7 },
        { n: 'LED-Lampe', w: 8, h: 5, d: 7 }
    ];
    let strom = XIRU.load('einheiten-strom', null);
    if (!strom || !Array.isArray(strom.rows)) strom = { price: 30, rows: DEFAULT_DEVICES.map(x => Object.assign({}, x)) };
    const tbody = $('#s-table tbody'), price = $('#s-price');
    price.value = plain(strom.price, 2);
    $('#s-presets').innerHTML = PRESETS.map((p, i) => '<button type="button" class="chip" data-i="' + i + '">' + esc(p.n) + '</button>').join('');

    const saveStrom = WZ.debounce(() => XIRU.save('einheiten-strom', strom), 400);
    function rowHTML(r, i) {
        return '<tr data-i="' + i + '">' +
            '<td><input type="text" data-k="n" value="' + esc(r.n) + '" aria-label="Gerät" maxlength="60"></td>' +
            '<td class="w-n"><input type="text" inputmode="decimal" data-k="w" value="' + esc(plain(r.w, 2)) + '" aria-label="Leistung in Watt"></td>' +
            '<td class="w-n"><input type="text" inputmode="decimal" data-k="h" value="' + esc(plain(r.h, 2)) + '" aria-label="Stunden pro Tag"></td>' +
            '<td class="w-n"><input type="text" inputmode="decimal" data-k="d" value="' + esc(plain(r.d, 2)) + '" aria-label="Tage pro Woche"></td>' +
            '<td class="num" data-o="kwh"></td><td class="num" data-o="chf"></td>' +
            '<td><button type="button" class="btn btn--ghost btn--sm" data-del aria-label="' + esc(r.n || 'Gerät') + ' entfernen" title="Entfernen">✕</button></td></tr>';
    }
    function renderStrom() {
        tbody.innerHTML = strom.rows.map(rowHTML).join('');
        calcStrom();
    }
    const kwhYear = r => {
        const w = WZ.num(r.w), h = Math.min(24, Math.max(0, WZ.num(r.h))), d = Math.min(7, Math.max(0, WZ.num(r.d)));
        return isFinite(w) && isFinite(h) && isFinite(d) ? w * h * d / 7 * 365 / 1000 : 0;
    };
    function calcStrom() {
        const p = WZ.num(price.value);
        strom.price = isFinite(p) ? p : 30;
        const rp = isFinite(p) && p >= 0 ? p : NaN;
        let sum = 0, max = null;
        XIRU.$$('tr', tbody).forEach(tr => {
            const r = strom.rows[+tr.dataset.i];
            const k = kwhYear(r);
            sum += k;
            if (!max || k > max.k) max = { k, n: r.n };
            tr.querySelector('[data-o="kwh"]').textContent = WZ.fix(k, 1);
            tr.querySelector('[data-o="chf"]').textContent = WZ.fix(k * rp / 100, 2);
            ['h', 'd'].forEach(key => {
                const v = WZ.num(r[key]);
                tr.querySelector('[data-k="' + key + '"]').setAttribute('aria-invalid', (key === 'h' ? v > 24 : v > 7) || v < 0 ? 'true' : 'false');
            });
        });
        const chf = sum * rp / 100;
        $('#s-kwh').textContent = WZ.fix(sum, 1);
        $('#s-chf').textContent = WZ.fix(chf, 2);
        $('#s-stats').innerHTML =
            stat(WZ.fix(chf / 365, 2), 'CHF pro Tag') +
            stat(WZ.fix(chf / 12, 2), 'CHF pro Monat') +
            stat(WZ.fix(chf, 0), 'CHF pro Jahr') +
            stat(WZ.fix(sum * 1000 / 365 / 24, 0) + ' W', 'Ø Dauerleistung') +
            (max && sum > 0 ? stat(Math.round(max.k / sum * 100) + ' %', 'Anteil ' + max.n) : '');
        saveStrom();
    }
    const stat = (v, l) => '<div class="stat"><span class="stat__value">' + esc(v) + '</span><span class="stat__label">' + esc(l) + '</span></div>';
    tbody.addEventListener('input', e => {
        const k = e.target.getAttribute('data-k'); if (!k) return;
        const r = strom.rows[+e.target.closest('tr').dataset.i];
        r[k] = k === 'n' ? e.target.value : WZ.num(e.target.value);
        calcStrom();
    });
    tbody.addEventListener('click', e => {
        const b = e.target.closest('[data-del]'); if (!b) return;
        strom.rows.splice(+b.closest('tr').dataset.i, 1);
        renderStrom();
    });
    function addRow(r) {
        strom.rows.push(Object.assign({}, r));
        renderStrom();
        const last = tbody.lastElementChild;
        if (last) { last.querySelector('input').focus(); last.querySelector('input').select(); }
    }
    $('#s-add').addEventListener('click', () => addRow({ n: 'Neues Gerät', w: 50, h: 2, d: 7 }));
    $('#s-presets').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) addRow(PRESETS[+b.dataset.i]); });
    price.addEventListener('input', calcStrom);
    renderStrom();

    // Leistung & Energie
    const POWER = [{ u: 'mW', f: 1e-3 }, { u: 'W', f: 1 }, { u: 'kW', f: 1e3 }, { u: 'PS', f: 735.49875, n: 'Pferdestärke (metrisch)' }, { u: 'BTU/h', f: 0.29307107, n: 'British Thermal Unit pro Stunde' }];
    const ENERGY = [{ u: 'J', f: 1, n: 'Joule (= 1 Ws)' }, { u: 'kJ', f: 1e3 }, { u: 'MJ', f: 1e6 }, { u: 'Wh', f: 3600 }, { u: 'kWh', f: 3.6e6 }, { u: 'kcal', f: 4184, n: 'Kilokalorie' }];
    function simpleConv(valEl, unitEl, outEl, list, def) {
        fillSelect(unitEl, list, def);
        const go = () => { const u = byU(list, unitEl.value); outEl.innerHTML = rowsHTML(list, WZ.num(valEl.value) * u.f, u.u); };
        valEl.addEventListener('input', go); unitEl.addEventListener('change', go); go();
    }
    simpleConv($('#p-val'), $('#p-unit'), $('#p-out'), POWER, 'W');
    simpleConv($('#e-val'), $('#e-unit'), $('#e-out'), ENERGY, 'kWh');

    /* ── Temperatur ──────────────────────────────────────────────────── */
    const tC = $('#t-c'), tF = $('#t-f'), tK = $('#t-k');
    const toC = { c: v => v, f: v => (v - 32) * 5 / 9, k: v => v - 273.15 };
    let zeroT;
    function setTemp(from) {
        const el = { c: tC, f: tF, k: tK }[from];
        const v = WZ.num(el.value);
        const msg = $('#t-msg');
        if (!isFinite(v)) {
            [tC, tF, tK].forEach(x => { if (x !== el) x.value = ''; });
            msg.textContent = el.value.trim() ? 'Das ist keine Zahl.' : ''; msg.className = 'form-msg is-error';
            return;
        }
        const c = toC[from](v);
        if (from !== 'c') tC.value = plain(c, 2);
        if (from !== 'f') tF.value = plain(c * 9 / 5 + 32, 2);
        if (from !== 'k') tK.value = plain(c + 273.15, 2);
        const k = c + 273.15;
        $('#t-mark').style.setProperty('--p', Math.max(0, Math.min(100, (c + 50) / 200 * 100)) + '%');
        clearTimeout(zeroT);
        if (k < -1e-9) { msg.textContent = 'Kälter als der absolute Nullpunkt (−273,15 °C) geht nicht – nicht einmal mit Flüssigstickstoff-Übertaktung.'; msg.className = 'form-msg is-error'; }
        else if (Math.abs(k) < 0.005) {
            msg.textContent = 'Absoluter Nullpunkt. Hier bewegt sich gar nichts mehr – nicht einmal dein Lüfter.'; msg.className = 'form-msg is-ok';
            zeroT = setTimeout(() => XIRU.egg('t-einheiten-nullpunkt'), 400);
        }
        else if (c >= 100 && c < 110) { msg.textContent = 'Wasser kocht – und viele CPUs drosseln spätestens hier.'; msg.className = 'form-msg'; }
        else msg.textContent = '';
    }
    tC.addEventListener('input', () => setTemp('c'));
    tF.addEventListener('input', () => setTemp('f'));
    tK.addEventListener('input', () => setTemp('k'));
    const TEMP_CHIPS = [['Gefrierpunkt', 0], ['Zimmer', 21], ['Körper', 37], ['CPU idle', 40], ['GPU Last', 75], ['CPU heiss', 95], ['Wasser kocht', 100], ['Lötkolben', 350]];
    $('#t-chips').innerHTML = TEMP_CHIPS.map(c => '<button type="button" class="chip" data-c="' + c[1] + '">' + esc(c[0]) + ' · ' + c[1] + ' °C</button>').join('');
    $('#t-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { tC.value = b.dataset.c; setTemp('c'); } });
    setTemp('c');

    /* ── Frequenz ────────────────────────────────────────────────────── */
    const FU = [{ u: 'Hz', f: 1 }, { u: 'kHz', f: 1e3 }, { u: 'MHz', f: 1e6 }, { u: 'GHz', f: 1e9 }];
    const TU = [{ u: 's', f: 1 }, { u: 'ms', f: 1e-3 }, { u: 'µs', f: 1e-6 }, { u: 'ns', f: 1e-9 }, { u: 'ps', f: 1e-12 }];
    const fVal = $('#f-val'), fUnit = $('#f-unit'), TVal = $('#T-val'), TUnit = $('#T-unit');
    fillSelect(fUnit, FU, 'Hz'); fillSelect(TUnit, TU, 'ms');
    const bestUnit = (list, v) => {           // grösste Einheit, bei der der Wert ≥ 1 ist
        const sorted = list.slice().sort((a, b) => b.f - a.f);
        return sorted.find(u => Math.abs(v) / u.f >= 1) || sorted[sorted.length - 1];
    };
    function freqFrom(side) {
        let hz;
        if (side === 'f') {
            hz = WZ.num(fVal.value) * byU(FU, fUnit.value).f;
            const T = 1 / hz;
            if (isFinite(T) && hz > 0) { const u = bestUnit(TU, T); TUnit.value = u.u; TVal.value = plain(T / u.f, 4); } else TVal.value = '';
        } else {
            const T = WZ.num(TVal.value) * byU(TU, TUnit.value).f;
            hz = 1 / T;
            if (isFinite(hz) && T > 0) { const u = bestUnit(FU, hz); fUnit.value = u.u; fVal.value = plain(hz / u.f, 4); } else fVal.value = '';
        }
        explainFreq(hz);
    }
    function explainFreq(hz) {
        const out = $('#f-explain');
        XIRU.$$('#hz-table tbody tr').forEach(tr => tr.classList.toggle('is-sel', Math.abs(+tr.dataset.hz - hz) < 1e-9));
        if (!(hz > 0) || !isFinite(hz)) { out.textContent = ''; return; }
        const T = 1 / hz, light = 299792458 * T;
        const lightTxt = light >= 1000 ? WZ.fmt(light / 1000, 4) + ' km' : light >= 1 ? WZ.fmt(light, 4) + ' m' : WZ.fmt(light * 100, 3) + ' cm';
        let txt = '';
        if (hz >= 20 && hz <= 1000) txt = 'Bei ' + WZ.fmt(hz, 5) + ' Hz bleiben ' + WZ.fmt(T * 1000, 4) + ' ms pro Bild – so schnell muss deine Grafikkarte jedes Bild fertig haben, um ' + WZ.fmt(hz, 5) + ' FPS zu halten. ';
        else if (hz >= 1e8) txt = 'Ein Takt dauert ' + WZ.fmt(T * 1e9, 4) + ' ns. ';
        txt += 'Licht kommt in dieser Zeit ' + lightTxt + ' weit.';
        out.textContent = txt;
    }
    fVal.addEventListener('input', () => freqFrom('f'));
    fUnit.addEventListener('change', () => freqFrom('f'));
    TVal.addEventListener('input', () => freqFrom('T'));
    TUnit.addEventListener('change', () => freqFrom('T'));
    const HZ = [24, 30, 50, 60, 75, 90, 100, 120, 144, 165, 180, 240, 280, 360, 480, 540];
    $('#hz-table tbody').innerHTML = HZ.map(h => '<tr data-hz="' + h + '" tabindex="0"><td><strong>' + h + '</strong> Hz</td><td class="num">' + WZ.fix(1000 / h, 2) + ' ms</td><td class="num">' + XIRU.fmt(h * 10) + '</td></tr>').join('');
    const pickHz = tr => { fVal.value = tr.dataset.hz; fUnit.value = 'Hz'; freqFrom('f'); };
    $('#hz-table tbody').addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) pickHz(tr); });
    $('#hz-table tbody').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('tr')) { e.preventDefault(); pickHz(e.target.closest('tr')); } });
    freqFrom('f');

    /* ── Zoll & PPI ──────────────────────────────────────────────────── */
    const mW = $('#m-w'), mH = $('#m-h'), mD = $('#m-d');
    const RES = [[1366, 768], [1920, 1080], [2560, 1080], [2560, 1440], [2560, 1600], [3440, 1440], [3840, 2160], [5120, 1440]];
    const DIAG = [13.3, 15.6, 24, 27, 32, 34, 49];
    $('#m-res-chips').innerHTML = RES.map(r => '<button type="button" class="chip" data-w="' + r[0] + '" data-h="' + r[1] + '">' + r[0] + '×' + r[1] + '</button>').join('');
    $('#m-d-chips').innerHTML = DIAG.map(d => '<button type="button" class="chip" data-d="' + d + '">' + plain(d, 1) + '″</button>').join('');
    $('#m-res-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { mW.value = b.dataset.w; mH.value = b.dataset.h; calcPPI(); } });
    $('#m-d-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { mD.value = plain(+b.dataset.d, 1); calcPPI(); } });

    const RATIOS = [[1, '1:1'], [5 / 4, '5:4'], [4 / 3, '4:3'], [3 / 2, '3:2'], [16 / 10, '16:10'], [16 / 9, '16:9'], [21 / 9, '21:9'], [32 / 9, '32:9']];
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    function ratioName(w, h) {
        const g = gcd(w, h), a = w / g, b = h / g, r = w / h;
        const exact = RATIOS.find(x => Math.abs(x[0] - r) < 1e-9);
        if (exact) return exact[1];
        const near = RATIOS.slice().sort((x, y) => Math.abs(x[0] - r) - Math.abs(y[0] - r))[0];
        const label = a <= 99 ? a + ':' + b : WZ.fix(r, 2) + ':1';
        return Math.abs(near[0] - r) / r < 0.04 ? label + ' (≈ ' + near[1] + ')' : label;
    }
    function calcPPI() {
        const w = Math.round(WZ.num(mW.value)), h = Math.round(WZ.num(mH.value)), d = WZ.num(mD.value);
        const ok = w > 0 && h > 0 && d > 0 && w < 100000 && h < 100000;
        XIRU.$$('#m-res-chips .chip').forEach(c => c.classList.toggle('is-active', +c.dataset.w === w && +c.dataset.h === h));
        XIRU.$$('#m-d-chips .chip').forEach(c => c.classList.toggle('is-active', Math.abs(+c.dataset.d - d) < 1e-9));
        if (!ok) { $('#m-ppi').innerHTML = '–'; $('#m-verdict').textContent = ''; $('#m-details').innerHTML = ''; return; }
        const diagPx = Math.sqrt(w * w + h * h);
        const ppi = diagPx / d;
        const wIn = d * w / diagPx, hIn = d * h / diagPx;
        const retinaCm = 1 / (ppi * Math.tan(Math.PI / 180 / 60)) * 2.54;
        $('#m-ppi').innerHTML = WZ.fix(ppi, 2) + ' <small>PPI</small>';
        const verdict = ppi < 90 ? 'eher grob' : ppi < 110 ? 'Standard' : ppi < 140 ? 'scharf' : ppi < 200 ? 'sehr scharf' : 'Retina-Klasse';
        $('#m-verdict').textContent = verdict;
        const scr = $('#m-screen');
        scr.style.setProperty('--ar', w + '/' + h);
        $('#m-screen-label').textContent = w + ' × ' + h + ' · ' + plain(d, 1) + '″';
        const kv = (k, v) => '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>';
        $('#m-details').innerHTML =
            kv('Seitenverhältnis', esc(ratioName(w, h))) +
            kv('Sichtbare Fläche', WZ.fix(wIn * 2.54, 1) + ' × ' + WZ.fix(hIn * 2.54, 1) + ' cm') +
            kv('Diagonale', WZ.fix(d * 2.54, 1) + ' cm') +
            kv('Pixelabstand', WZ.fix(25.4 / ppi, 4) + ' mm') +
            kv('Pixel gesamt', XIRU.fmt(w * h) + ' (' + WZ.fix(w * h / 1e6, 2) + ' MP)') +
            kv('Pixel unsichtbar ab', 'ca. ' + WZ.fix(retinaCm, 0) + ' cm Abstand') +
            kv('Skalierung wie 96-PPI-Monitor', Math.round(ppi / 96 * 100) + ' %');
    }
    [mW, mH, mD].forEach(el => el.addEventListener('input', calcPPI));
    calcPPI();

    const lIn = $('#l-in'), lCm = $('#l-cm');
    const fromIn = () => { const v = WZ.num(lIn.value); lCm.value = isFinite(v) ? plain(v * 2.54, 3) : ''; };
    const fromCm = () => { const v = WZ.num(lCm.value); lIn.value = isFinite(v) ? plain(v / 2.54, 3) : ''; };
    lIn.addEventListener('input', fromIn);
    lCm.addEventListener('input', fromCm);
    fromIn();
});
