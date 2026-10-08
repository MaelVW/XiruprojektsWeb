# -*- coding: utf-8 -*-
"""Erzeugt das Hardware-Archiv aus tools/hardware_data.py.

    python tools/build_hardware.py

Schreibt:
  assets/js/hardware-data.js
  hardware/<ordner>/<id>.html          Datenblätter
  hardware/<liste>.html                Listen (cpu, gpu, chipsatz, speicher, laufwerke, netzteile)
  assets/js/site.js                    Seiteneinträge zwischen GEN:HW START / END
Läuft mit Python 3.6+.
"""
import html
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import hardware_data as D  # noqa: E402

MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']


def esc(s):
    return html.escape(str(s), quote=True)


def num(v, d=None):
    """Zahl im Schweizer Format (1’234.5)."""
    if v is None:
        return '–'
    if d is None:
        d = 0 if float(v).is_integer() else 1
    s = ('{:,.%df}' % d).format(float(v))
    return s.replace(',', '’')


def ghz(v):
    return num(v, 1) + ' GHz'


def when(it):
    if it.get('month'):
        return '%s %d' % (MONTHS[it['month'] - 1], it['year'])
    return str(it['year'])


def yesno(b):
    return 'Ja' if b else 'Nein'


def write(path, text):
    full = os.path.join(ROOT, path)
    d = os.path.dirname(full)
    if not os.path.isdir(d):
        os.makedirs(d)
    with io.open(full, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


# ── Kategorien ──────────────────────────────────────────────────────────────

def cpu_rows(c):
    kerne = '%d' % c['cores']
    if c.get('pcores'):
        kerne += ' (%d P-Kerne + %d E-Kerne)' % (c['pcores'], c['ecores'])
    tdp = '%d W' % c['tdp'] + (' (max. %d W)' % c['tdpMax'] if c.get('tdpMax') else '')
    return [
        ('Allgemein', [('Hersteller', c['brand']), ('Architektur', c['arch']), ('Vorgestellt', when(c)),
                       ('Fertigung', c['node']), ('UVP zum Marktstart', '%d USD' % c['price'])]),
        ('Kerne & Takt', [('Kerne', kerne), ('Threads', c['threads']), ('Basistakt', ghz(c['base'])), ('Boost-Takt', ghz(c['boost']))]),
        ('Cache & Speicher', [('L3-Cache', '%d MB' % c['l3']), ('Arbeitsspeicher', c['ram'])]),
        ('Plattform', [('Sockel', c['socket']), ('PCIe', c['pcie']), ('Integrierte Grafik', c['igpu']), ('TDP', tdp)]),
    ]


def gpu_rows(g):
    return [
        ('Allgemein', [('Hersteller', g['brand']), ('Architektur', g['arch']), ('Grafikchip', g['chip']),
                       ('Vorgestellt', when(g)), ('UVP zum Marktstart', '%d USD' % g['price'])]),
        ('Recheneinheiten', [('Shader-Einheiten', num(g['shaders'])), ('Boost-Takt', '%s MHz' % num(g['boost'])),
                             ('Raytracing-Hardware', yesno(g['rt']))]),
        ('Speicher', [('Grafikspeicher', '%d GB %s' % (g['vram'], g['memType'])), ('Speicherinterface', '%d Bit' % g['bus']),
                      ('Bandbreite', '%s GB/s' % num(g['bandwidth']))]),
        ('Strom & Anschluss', [('Leistungsaufnahme (TBP)', '%d W' % g['tdp']), ('Empfohlenes Netzteil', 'ca. %d W' % g['psu']),
                               ('Schnittstelle', 'PCIe ' + g['pcie'])]),
    ]


def chipset_rows(c):
    return [
        ('Allgemein', [('Hersteller', c['brand']), ('Sockel', c['socket']), ('Erschienen', c['year']), ('Klasse', c['tier']),
                       ('Passende CPUs', c['cpus'])]),
        ('Übertakten', [('CPU übertakten', yesno(c['cpuOc'])), ('Speicher übertakten (XMP/EXPO)', yesno(c['memOc']))]),
        ('Anschlüsse', [('Arbeitsspeicher', c['ram']), ('Grafikkarte (PCIe)', c['gpuPcie']), ('M.2-SSD an der CPU (PCIe)', c['nvmePcie']),
                        ('Chipsatz-Lanes (PCIe)', c['chipsetPcie']), ('Schnellster USB', c['usb'])]),
    ]


def memory_rows(m):
    return [
        ('Allgemein', [('Art', m['kind']), ('Eingeführt', m['year']), ('Typischer Einsatz', m['usedIn'])]),
        ('Technik', [('Datenrate', m['rate']), ('Spannung', m['voltage']), ('Anschluss', m['pins']), ('Kapazität', m['capacity']),
                     ('Besonderheiten', m['features'])]),
    ]


def storage_rows(s):
    return [
        ('Allgemein', [('Art', s['kind']), ('Seit', s['year']), ('Bauform', s['form']), ('Schnittstelle', s['interface'])]),
        ('Leistung', [('Kapazität', s['capacity']), ('Lesen (sequenziell)', s['read']), ('Zugriffszeit', s['access'])]),
    ]


def psu_rows(p):
    rows = [('Allgemein', [('Art', p['kind']), ('Kurz gesagt', p['note'])])]
    if p['eff230']:
        rows.append(('Mindest-Effizienz bei 230 V (EU, intern)', [('20 % Last', '%d %%' % p['eff230'][0]), ('50 % Last', '%d %%' % p['eff230'][1]),
                                                                    ('100 % Last', '%d %%' % p['eff230'][2])]))
        rows.append(('Mindest-Effizienz bei 115 V (USA, intern)', [('20 % Last', '%d %%' % p['eff115'][0]), ('50 % Last', '%d %%' % p['eff115'][1]),
                                                                    ('100 % Last', '%d %%' % p['eff115'][2])]))
    return rows


def cpu_lead(c):
    return '%d Kerne, %d Threads und %d MB L3-Cache auf Sockel %s – vorgestellt im %s.' % (c['cores'], c['threads'], c['l3'], c['socket'], when(c))


def gpu_lead(g):
    return '%s-Grafikkarte mit %d GB %s und %s Shader-Einheiten – vorgestellt im %s.' % (g['arch'], g['vram'], g['memType'], num(g['shaders']), when(g))


CATS = [
    dict(key='cpu', folder='cpu', list='cpu.html', single='Prozessor', plural='Prozessoren', items=D.CPUS, rows=cpu_rows, lead=cpu_lead,
         stats=lambda c: [('%d/%d' % (c['cores'], c['threads']), 'Kerne / Threads'), (num(c['boost'], 1), 'GHz Boost'), (str(c['l3']), 'MB L3-Cache'), (str(c['tdp']), 'Watt TDP')],
         short=lambda c: 'Prozessor · %d Kerne · %d' % (c['cores'], c['year']),
         filters=('brand', 'Hersteller'), sort=lambda c: (c['brand'], c['year'], c.get('month', 0), c['price']),
         cols=[('Name', 'text', lambda c: c['name'], None), ('Hersteller', 'text', lambda c: c['brand'], None), ('Jahr', 'num', lambda c: c['year'], None),
               ('Sockel', 'text', lambda c: c['socket'], None), ('Kerne/Threads', 'num', lambda c: '%d/%d' % (c['cores'], c['threads']), lambda c: c['cores']),
               ('Boost', 'num', lambda c: ghz(c['boost']), lambda c: c['boost']), ('L3', 'num', lambda c: '%d MB' % c['l3'], lambda c: c['l3']),
               ('TDP', 'num', lambda c: '%d W' % c['tdp'], lambda c: c['tdp']), ('UVP', 'num', lambda c: '%d $' % c['price'], lambda c: c['price'])],
         intro='Prozessoren von AMD und Intel – von der Legende aus 2011 bis zu den aktuellen Generationen.'),
    dict(key='gpu', folder='gpu', list='gpu.html', single='Grafikkarte', plural='Grafikkarten', items=D.GPUS, rows=gpu_rows, lead=gpu_lead,
         stats=lambda g: [(str(g['vram']), 'GB ' + g['memType']), (num(g['bandwidth']), 'GB/s Bandbreite'), (num(g['shaders']), 'Shader'), (str(g['tdp']), 'Watt')],
         short=lambda g: 'Grafikkarte · %d GB · %d' % (g['vram'], g['year']),
         filters=('brand', 'Hersteller'), sort=lambda g: (g['brand'], g['year'], g.get('month', 0), g['price']),
         cols=[('Name', 'text', lambda g: g['name'], None), ('Hersteller', 'text', lambda g: g['brand'], None), ('Jahr', 'num', lambda g: g['year'], None),
               ('Speicher', 'num', lambda g: '%d GB %s' % (g['vram'], g['memType']), lambda g: g['vram']), ('Bus', 'num', lambda g: '%d Bit' % g['bus'], lambda g: g['bus']),
               ('Bandbreite', 'num', lambda g: '%s GB/s' % num(g['bandwidth']), lambda g: g['bandwidth']), ('Strom', 'num', lambda g: '%d W' % g['tdp'], lambda g: g['tdp']),
               ('UVP', 'num', lambda g: '%d $' % g['price'], lambda g: g['price'])],
         intro='Grafikkarten von NVIDIA, AMD und Intel – mit Speicher, Bandbreite und Stromhunger im Überblick.'),
    dict(key='chipset', folder='chipsatz', list='chipsatz.html', single='Chipsatz', plural='Chipsätze', items=D.CHIPSETS, rows=chipset_rows,
         lead=lambda c: '%s-Chipsatz für Sockel %s (%s). %s' % (c['tier'], c['socket'], c['year'], c['note']),
         stats=lambda c: [(c['socket'], 'Sockel'), (str(c['year']), 'Erschienen'), ('Ja' if c['cpuOc'] else 'Nein', 'CPU-OC'), (c['gpuPcie'].split(' ')[0], 'PCIe Grafik')],
         short=lambda c: 'Chipsatz · %s · %d' % (c['socket'], c['year']),
         filters=('socket', 'Sockel'), sort=lambda c: (c['brand'], c['socket'], c['year'], c['name']),
         cols=[('Name', 'text', lambda c: c['name'], None), ('Sockel', 'text', lambda c: c['socket'], None), ('Jahr', 'num', lambda c: c['year'], None),
               ('Klasse', 'text', lambda c: c['tier'], None), ('CPU-OC', 'text', lambda c: yesno(c['cpuOc']), None), ('RAM', 'text', lambda c: c['ram'], None),
               ('PCIe Grafik', 'text', lambda c: c['gpuPcie'], None)],
         intro='Der Chipsatz entscheidet, was ein Mainboard kann: Übertakten, PCIe-Version, USB und mehr.'),
    dict(key='memory', folder='speicher', list='speicher.html', single='Speicherstandard', plural='Speicherstandards', items=D.MEMORY, rows=memory_rows,
         lead=lambda m: '%s aus dem Jahr %d – %s.' % (m['kind'], m['year'], m['rate']),
         stats=lambda m: [(str(m['year']), 'Eingeführt'), (m['voltage'].split(' (')[0], 'Spannung'), (m['kind'], 'Art'), (num(m['rateMax'], 1 if m['rateMax'] < 100 else 0), 'MT/s bzw. Gbit/s max.')],
         short=lambda m: '%s · %d' % (m['kind'], m['year']),
         filters=('kind', 'Art'), sort=lambda m: (m['kind'], m['year']),
         cols=[('Name', 'text', lambda m: m['name'], None), ('Art', 'text', lambda m: m['kind'], None), ('Jahr', 'num', lambda m: m['year'], None),
               ('Datenrate', 'text', lambda m: m['rate'], None), ('Spannung', 'text', lambda m: m['voltage'], None)],
         intro='Arbeitsspeicher, Grafikspeicher und Stapelspeicher – die Standards hinter den Modulen.'),
    dict(key='storage', folder='laufwerke', list='laufwerke.html', single='Datenträger', plural='Datenträger', items=D.STORAGE, rows=storage_rows,
         lead=lambda s: '%s-Speicher seit %d: %s Kapazität, %s.' % (s['kind'], s['year'], s['capacity'], s['read']),
         stats=lambda s: [(s['capacity'], 'Kapazität'), (s['read'].replace('bis ca. ', '').replace('ca. ', ''), 'Lesen'), (s['access'].replace('ca. ', ''), 'Zugriff'), (str(s['year']), 'Seit')],
         short=lambda s: 'Datenträger · %s' % s['kind'],
         filters=('kind', 'Art'), sort=lambda s: s['readMb'],
         cols=[('Name', 'text', lambda s: s['name'], None), ('Art', 'text', lambda s: s['kind'], None), ('Seit', 'num', lambda s: s['year'], None),
               ('Kapazität', 'text', lambda s: s['capacity'], None), ('Lesen', 'num', lambda s: s['read'], lambda s: s['readMb']), ('Zugriff', 'text', lambda s: s['access'], None)],
         intro='Von der Diskette bis zur PCIe-5.0-SSD: wie viel passt drauf und wie schnell kommt es wieder runter?'),
    dict(key='psu', folder='netzteile', list='netzteile.html', single='Netzteil-Standard', plural='Netzteil-Standards', items=D.PSUS, rows=psu_rows,
         lead=lambda p: p['note'],
         stats=lambda p: ([('%d %%' % p['eff230'][1], 'bei 50 % (230 V)'), ('%d %%' % p['eff115'][1], 'bei 50 % (115 V)'), ('%d %%' % p['eff230'][2], 'bei 100 % (230 V)'), ('%d W' % round(400 / (p['eff230'][1] / 100.0) - 400), 'Abwärme bei 400 W')]
                          if p['eff230'] else [('ATX 3.1', 'Standard'), ('600 W', 'pro 12V-2x6'), ('200 %', 'Lastspitzen'), ('2023', 'Jahr')]),
         short=lambda p: 'Netzteil · %s' % p['kind'],
         filters=('kind', 'Art'), sort=lambda p: (p['kind'] != 'Effizienz', p['eff230'][1] if p['eff230'] else 0),
         cols=[('Name', 'text', lambda p: p['name'], None), ('Art', 'text', lambda p: p['kind'], None),
               ('50 % Last (230 V)', 'num', lambda p: ('%d %%' % p['eff230'][1]) if p['eff230'] else '–', lambda p: p['eff230'][1] if p['eff230'] else 0),
               ('50 % Last (115 V)', 'num', lambda p: ('%d %%' % p['eff115'][1]) if p['eff115'] else '–', lambda p: p['eff115'][1] if p['eff115'] else 0)],
         intro='Wie effizient muss ein Netzteil sein, um ein 80-PLUS-Siegel zu bekommen – und was bringt ATX 3.1?'),
]

for cat in CATS:
    cat['items'] = sorted(cat['items'], key=cat['sort'])
    for it in cat['items']:
        it['url'] = 'hardware/%s/%s.html' % (cat['folder'], it['id'])


# ── Seitenteile ─────────────────────────────────────────────────────────────

HEAD = '''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} · Xiruprojekts</title>
    <meta name="description" content="{desc}">
    <link rel="stylesheet" href="{up}assets/css/main.css">
    <link rel="stylesheet" href="{up}assets/css/themes/hardware.css">
    <script src="{up}assets/js/site.js"></script>
    <script src="{up}assets/js/core.js"></script>
</head>
<body class="theme-hardware">
'''


def similar(cat, it, n=4):
    """Ähnliche Teile: gleicher Hersteller/Sockel zuerst, dann nach Leistung bzw. Jahr."""
    key = 'game' if cat['key'] == 'cpu' else 'perf' if cat['key'] == 'gpu' else 'year'
    others = [o for o in cat['items'] if o['id'] != it['id']]
    def dist(o):
        d = abs((o.get(key) or 0) - (it.get(key) or 0))
        if o.get('brand') == it.get('brand'):
            d -= 0.5
        if o.get('socket') and o.get('socket') == it.get('socket'):
            d -= 1
        return d
    return sorted(others, key=dist)[:n]


def detail_page(cat, it, idx):
    items = cat['items']
    prev_it = items[idx - 1] if idx > 0 else None
    next_it = items[idx + 1] if idx < len(items) - 1 else None
    egg = ''
    if it.get('egg'):
        egg = ' <button class="hw-egg" type="button" data-egg="%s" title="Etwas Besonderes …" aria-label="Geheimnis">%s</button>' % (
            esc(it['egg']), '💾' if cat['key'] == 'storage' else '🏆')
    badges = [it.get('brand'), it.get('arch'), it.get('socket'), it.get('kind'), it.get('tier')]
    badges_html = ''.join('<span class="badge">%s</span>' % esc(b) for b in badges if b)
    stats_html = ''.join('<div class="card card--flat stat" data-reveal style="--d:%.2fs"><span class="stat__value">%s</span><span class="stat__label">%s</span></div>'
                         % (i * 0.06, esc(v), esc(l)) for i, (v, l) in enumerate(cat['stats'](it)))
    rows_html = ''
    for group, rows in cat['rows'](it):
        rows_html += '<tr class="spec-group"><th colspan="2">%s</th></tr>' % esc(group)
        rows_html += ''.join('<tr><th>%s</th><td>%s</td></tr>' % (esc(k), esc(v)) for k, v in rows)
    sim_html = ''.join('<li><a href="%s.html">%s</a> <span class="faint small">%s</span></li>' % (esc(o['id']), esc(o['name']), esc(cat['short'](o)))
                       for o in similar(cat, it))

    expert = ''
    if cat['key'] in ('cpu', 'gpu'):
        if cat['key'] == 'cpu':
            bars = [('Spiele-Index', it['game'], 'Ryzen 7 9800X3D = 100'), ('Mehrkern-Index', it['multi'], 'Ryzen 9 9950X = 100')]
            value = it['price'] / float(it['game'])
            rank = sorted(items, key=lambda o: -o['game']).index(it) + 1
            extra = 'Platz %d von %d im Spiele-Index · %s USD pro Indexpunkt' % (rank, len(items), num(value, 2))
        else:
            bars = [('Raster-Index', it['perf'], 'RTX 4090 = 100')]
            value = it['price'] / float(it['perf'])
            rank = sorted(items, key=lambda o: -o['perf']).index(it) + 1
            extra = 'Platz %d von %d · %s USD pro Indexpunkt · %s Indexpunkte pro 100 W' % (rank, len(items), num(value, 2), num(it['perf'] / it['tdp'] * 100, 1))
        bar_html = ''.join('<div class="mb-2"><div class="row small"><strong>%s</strong><span class="spacer"></span><span>%d</span></div>'
                           '<div class="bar bar--shine"><div class="bar__fill" style="--v:%d%%"></div></div><div class="faint small">%s</div></div>'
                           % (esc(l), v, min(100, v), esc(r)) for l, v, r in bars)
        expert = ('<section class="card" id="expert"><h3>🔧 Expertenmodus</h3>'
                  '<div data-expert hidden>%s<p class="small muted mb-0">%s</p></div>'
                  '<div data-expert-lock><p class="muted">Leistungsindex, Rangliste und Preis-Leistung siehst du mit dem Modul '
                  '<strong>Schraubenzieher</strong> (Techniker-Ast).</p><a class="btn btn--sm" href="../../konto/skilltree.html#module">Zu den Modulen</a></div></section>'
                  % (bar_html, esc(extra)))

    pager = '<nav class="hw-pager" aria-label="Weitere %s">' % esc(cat['plural'])
    pager += ('<a class="tile" href="%s.html"><span class="faint small">← Vorheriger</span><span class="tile__title">%s</span></a>' % (esc(prev_it['id']), esc(prev_it['name']))) if prev_it else '<span></span>'
    pager += ('<a class="tile hw-pager__next" href="%s.html"><span class="faint small">Nächster →</span><span class="tile__title">%s</span></a>' % (esc(next_it['id']), esc(next_it['name']))) if next_it else '<span></span>'
    pager += '</nav>'

    lead = cat['lead'](it)
    out = HEAD.format(title=esc(it['name']), desc=esc(lead), up='../../')
    out += '''<main class="content">
    <header class="page-head">
        <span class="eyebrow">▣ Hardware-Archiv · {single}</span>
        <h1>{name}{egg}</h1>
        <p class="lead">{lead}</p>
        <div class="row mt-2">{badges}</div>
    </header>

    <div class="grid grid--sm hw-stats">{stats}</div>

    <div class="hw-layout mt-3">
        <section class="card">
            <h2>Datenblatt</h2>
            <div class="table-wrap"><table class="table spec-table"><tbody>{rows}</tbody></table></div>
        </section>
        <div class="stack">
            <section class="card card--accent" data-reveal><h3>💡 Wusstest du?</h3><p>{fact}</p></section>
            {expert}
            <section class="card"><h3>Ähnliche {plural}</h3><ul class="hw-sim">{sim}</ul></section>
            <div class="row">
                <button class="btn btn--primary" type="button" id="cmp-add" data-cat="{key}" data-id="{id}">＋ Zum Vergleich</button>
                <a class="btn" href="../{list}">Alle {plural}</a>
            </div>
        </div>
    </div>

    {pager}
    <p class="small faint mt-3">Angaben nach Herstellerdaten zum Marktstart, ohne Gewähr. Preise sind unverbindliche Preisempfehlungen in USD zum Marktstart.
    Leistungsindizes sind grobe Richtwerte zum Vergleichen auf dieser Website, keine Messwerte.</p>
</main>
<script src="../../assets/js/hardware-page.js"></script>
</body>
</html>
'''.format(single=esc(cat['single']), name=esc(it['name']), egg=egg, lead=esc(lead), badges=badges_html, stats=stats_html,
           rows=rows_html, fact=esc(it.get('fact', '')), expert=expert, plural=esc(cat['plural']), sim=sim_html,
           key=cat['key'], id=esc(it['id']), list=cat['list'], pager=pager)
    return out


def list_page(cat):
    fkey, flabel = cat['filters']
    values = []
    for it in cat['items']:
        if it[fkey] not in values:
            values.append(it[fkey])
    chips = '<button class="chip is-active" data-filter="">Alle</button>' + ''.join(
        '<button class="chip" data-filter="%s">%s</button>' % (esc(v), esc(v)) for v in values)
    head = ''.join('<th data-sort="%s"%s>%s</th>' % (t, ' class="num"' if t == 'num' else '', esc(n)) for n, t, _, _ in cat['cols'])
    rows = ''
    for it in cat['items']:
        cells = ''
        for i, (n, t, show, val) in enumerate(cat['cols']):
            shown = show(it)
            if i == 0:
                shown_html = '<a href="%s/%s.html"><strong>%s</strong></a>' % (cat['folder'], esc(it['id']), esc(shown))
            else:
                shown_html = esc(shown)
            dv = ' data-v="%s"' % esc(val(it)) if val else ''
            cells += '<td%s%s>%s</td>' % (' class="num"' if t == 'num' else '', dv, shown_html)
        rows += '<tr data-f="%s" data-q="%s">%s</tr>' % (esc(it[fkey]), esc((it['name'] + ' ' + str(it.get('arch', '')) + ' ' + str(it.get('socket', ''))).lower()), cells)
    tiles = ''.join('<a class="tile" data-f="%s" href="%s/%s.html" data-reveal style="--d:%.2fs"><span class="tile__meta"><span class="badge">%s</span></span>'
                    '<span class="tile__title">%s</span><span class="tile__desc">%s</span></a>'
                    % (esc(it[fkey]), cat['folder'], esc(it['id']), (i % 8) * 0.04, esc(it[fkey]), esc(it['name']), esc(cat['short'](it)))
                    for i, it in enumerate(cat['items']))
    out = HEAD.format(title=esc(cat['plural']), desc=esc(cat['intro']), up='../')
    out += '''<main class="content">
    <header class="page-head">
        <span class="eyebrow">▣ Hardware-Archiv</span>
        <h1>{plural}</h1>
        <p class="lead">{intro}</p>
    </header>

    <div class="card card--flat mb-3">
        <div class="row">
            <input class="input" type="search" id="hw-q" placeholder="{plural} durchsuchen …" style="max-width:320px" aria-label="Suchen">
            <div class="row" id="hw-filter" role="group" aria-label="{flabel}">{chips}</div>
            <span class="spacer"></span>
            <div class="row" role="group" aria-label="Ansicht">
                <button class="chip is-active" data-view="table">Tabelle</button>
                <button class="chip" data-view="tiles">Kacheln</button>
            </div>
        </div>
    </div>

    <div id="hw-table" class="table-wrap">
        <table class="table" data-sortable><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>
    </div>
    <div id="hw-tiles" class="grid" hidden>{tiles}</div>
    <p class="small muted mt-2"><span id="hw-count">{count}</span> Einträge · Klick auf eine Spaltenüberschrift sortiert. <a href="vergleich.html">Zum Vergleich →</a></p>
</main>
<script>
XIRU.ready(function () {{
    let filter = '', q = '';
    const rows = XIRU.$$('#hw-table tbody tr'), tiles = XIRU.$$('#hw-tiles .tile');
    function apply() {{
        let n = 0;
        rows.forEach(r => {{ const ok = (!filter || r.dataset.f === filter) && (!q || r.dataset.q.includes(q)); r.hidden = !ok; if (ok) n++; }});
        tiles.forEach((t, i) => {{ t.hidden = rows[i].hidden; }});
        XIRU.$('#hw-count').textContent = n;
    }}
    XIRU.$('#hw-filter').addEventListener('click', e => {{
        const b = e.target.closest('[data-filter]'); if (!b) return;
        filter = b.dataset.filter;
        XIRU.$$('#hw-filter .chip').forEach(c => c.classList.toggle('is-active', c === b));
        apply();
    }});
    XIRU.$('#hw-q').addEventListener('input', e => {{ q = e.target.value.trim().toLowerCase(); apply(); }});
    XIRU.$$('[data-view]').forEach(b => b.addEventListener('click', () => {{
        XIRU.$$('[data-view]').forEach(c => c.classList.toggle('is-active', c === b));
        XIRU.$('#hw-table').hidden = b.dataset.view !== 'table';
        XIRU.$('#hw-tiles').hidden = b.dataset.view !== 'tiles';
        if (b.dataset.view === 'tiles') XIRU.initReveal();
    }}));
}});
</script>
</body>
</html>
'''.format(plural=esc(cat['plural']), intro=esc(cat['intro']), flabel=esc(flabel), chips=chips, head=head, rows=rows,
           tiles=tiles, count=len(cat['items']))
    return out


# ── Ausgabe ─────────────────────────────────────────────────────────────────

def main():
    # Daten-JS
    data = {}
    names = {'cpu': 'cpu', 'gpu': 'gpu', 'chipset': 'chipset', 'memory': 'memory', 'storage': 'storage', 'psu': 'psu'}
    for cat in CATS:
        data[names[cat['key']]] = cat['items']
    js = ('/* Automatisch erzeugt von tools/build_hardware.py – nicht von Hand ändern. */\n'
          'window.XIRU = window.XIRU || {};\n'
          'XIRU.hw = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    write('assets/js/hardware-data.js', js)

    count = 0
    entries = []
    for cat in CATS:
        for i, it in enumerate(cat['items']):
            write(it['url'], detail_page(cat, it, i))
            entries.append("    { p: '%s', t: %s, r: 'hardware', d: %s, hw: '%s' }," % (
                it['url'], json.dumps(it['name'], ensure_ascii=False), json.dumps(cat['short'](it), ensure_ascii=False), cat['key']))
            count += 1
        write('hardware/' + cat['list'], list_page(cat))

    # site.js aktualisieren
    site_path = os.path.join(ROOT, 'assets', 'js', 'site.js')
    with io.open(site_path, encoding='utf-8') as f:
        site = f.read()
    start = site.index('/* GEN:HW START')
    start = site.index('\n', start) + 1
    end = site.index('    /* GEN:HW END */')
    site = site[:start] + '\n'.join(entries) + '\n' + site[end:]
    with io.open(site_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(site)
    print('Hardware-Archiv erzeugt: %d Datenblätter, %d Listen.' % (count, len(CATS)))


if __name__ == '__main__':
    main()
