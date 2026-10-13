# -*- coding: utf-8 -*-
"""Erzeugt hardware/konfigurator-preise.js aus tools/preise.csv.

    python tools/build_preise.py                     # Stand = aktueller Monat
    python tools/build_preise.py --stand "Oktober 2026"
    python tools/build_preise.py --csv tools/preise.csv --out hardware/konfigurator-preise.js

Du pflegst nur tools/preise.csv (Spalten: kategorie,id,preis,bezeichnung) und lässt
danach dieses Skript laufen. Es prüft die IDs gegen das Hardware-Archiv, setzt das
Stand-Datum und schreibt die Preisdatei neu. Läuft mit Python 3.6+, ohne Zusatzpakete.

Halb­automatisch und regelkonform: keine Netzwerk-Abfragen, kein Shop-Scraping – die
Preise tippst/kopierst du in die CSV, das Skript macht daraus sauberes JavaScript.
"""
import argparse
import csv
import datetime
import io
import os
import re
import sys

try:  # Umlaute in der Konsole (Windows cp1252) nicht crashen lassen
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import hardware_data as D  # noqa: E402  – für die Prüfung der cpu/gpu-IDs

MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

# Feste Teile-Kataloge (müssen zu hardware/konfigurator.html passen: CASES, RAM_KITS, SSDS, PSU_SIZES)
BOARD_TIERS = ['Einsteiger', 'Mittelklasse', 'Oberklasse']
RAM_IDS = ['ddr4-32', 'ddr5-32', 'ddr5-64']
SSD_IDS = ['sata-1tb', 'nvme4-1tb', 'nvme4-2tb', 'nvme5-2tb']
PSU_IDS = ['550', '650', '750', '850', '1000']
CASE_IDS = ['itx', 'matx', 'atx-air', 'atx-glass', 'big']

# Standardwerte, falls die CSV einen festen Posten nicht enthält (der Konfigurator braucht sie alle).
DEFAULTS = {
    'board': {'Einsteiger': 95, 'Mittelklasse': 185, 'Oberklasse': 320},
    'ram': {'ddr4-32': 75, 'ddr5-32': 105, 'ddr5-64': 199},
    'ssd': {'sata-1tb': 59, 'nvme4-1tb': 75, 'nvme4-2tb': 135, 'nvme5-2tb': 205},
    'psu': {'550': 75, '650': 90, '750': 110, '850': 135, '1000': 199},
    'case': {'itx': 115, 'matx': 80, 'atx-air': 95, 'atx-glass': 130, 'big': 180},
}
META = {'spanne': 0.10, 'usdChf': 0.92}

# Reihenfolge der cpu/gpu-Ausgabe = Archiv-Reihenfolge (hübsche, stabile Diffs)
CPU_ORDER = [c['id'] for c in D.CPUS]
GPU_ORDER = [g['id'] for g in D.GPUS]
ARCHIVE_IDS = set(CPU_ORDER) | set(GPU_ORDER)


def num(v):
    """Ganze Zahl ohne .0, sonst mit bis zu zwei Nachkommastellen."""
    f = float(v)
    return str(int(round(f))) if abs(f - round(f)) < 1e-9 else ('%.2f' % f).rstrip('0').rstrip('.')


def route(cat, pid):
    """Bestimmt den Abschnitt (chf/board/ram/ssd/psu/case) aus kategorie bzw. ID."""
    c = (cat or '').strip().lower()
    if c in ('cpu', 'gpu', 'teil', 'chf'):
        return 'chf'
    if c in ('board', 'ram', 'ssd', 'psu', 'case'):
        return c
    # ohne Kategorie: aus der ID erraten
    if pid in BOARD_TIERS:
        return 'board'
    if pid in RAM_IDS:
        return 'ram'
    if pid in SSD_IDS:
        return 'ssd'
    if pid in CASE_IDS:
        return 'case'
    if re.fullmatch(r'\d+', pid):
        return 'psu'
    if pid in ARCHIVE_IDS:
        return 'chf'
    return None


def parse_price(txt):
    t = txt.strip().replace("'", '').replace('’', '').replace(' ', '').replace(',', '.')
    return float(t)


def read_csv(path):
    with io.open(path, encoding='utf-8-sig', newline='') as fh:
        sample = fh.read(4096)
        fh.seek(0)
        delim = ';' if sample.count(';') > sample.count(',') else ','
        rows = []
        for raw in csv.reader(fh, delimiter=delim):
            cells = [c.strip() for c in raw]
            if not cells or not any(cells) or cells[0].startswith('#'):
                continue
            rows.append(cells)
    if not rows:
        return []
    # Kopfzeile erkennen
    head = [h.lower() for h in rows[0]]
    known = ('id', 'preis', 'price', 'kategorie', 'kat', 'cat', 'bezeichnung', 'name')
    i_cat = i_id = i_price = None
    if any(h in known for h in head):
        for i, h in enumerate(head):
            if h in ('kategorie', 'kat', 'cat'):
                i_cat = i
            elif h == 'id':
                i_id = i
            elif h in ('preis', 'price'):
                i_price = i
        rows = rows[1:]
    if i_id is None:
        i_id = 1 if i_cat == 0 else 0
    if i_price is None:
        i_price = i_id + 1
    out = []
    for cells in rows:
        if len(cells) <= i_price:
            continue
        cat = cells[i_cat] if (i_cat is not None and i_cat < len(cells)) else ''
        out.append((cat, cells[i_id], cells[i_price]))
    return out


def emit(prices, stand):
    def block(name, keys, quote):
        parts = []
        for k in keys:
            if k in prices[name]:
                key = ("'%s'" % k) if quote else k
                parts.append('        %s: %s' % (key, num(prices[name][k])))
        return parts

    o = io.StringIO()
    o.write('/* ==========================================================================\n')
    o.write('   Aktuelle Preise für den PC-Konfigurator (hardware/konfigurator.html)\n')
    o.write('   --------------------------------------------------------------------------\n')
    o.write('   ERZEUGT von tools/build_preise.py aus tools/preise.csv – NICHT von Hand ändern.\n')
    o.write('   Preise pflegst du in tools/preise.csv und führst dann aus:\n')
    o.write('       python tools/build_preise.py\n')
    o.write('   Alle Preise in CHF (ca., Schweizer Strassenpreise inkl. MwSt.). Teile ohne\n')
    o.write('   Eintrag in "chf" fallen im Konfigurator auf die UVP zum Marktstart zurück.\n')
    o.write('   ========================================================================== */\n')
    o.write('window.XIRU = window.XIRU || {};\n')
    o.write('XIRU.hwPreise = {\n')
    o.write("    stand: '%s',   // Monat, auf den sich die Preise beziehen\n" % stand)
    o.write('    spanne: %s,            // +/- fuer die Preisrange (Tagespreise schwanken)\n' % META['spanne'])
    o.write('    usdChf: %s,            // grobe Umrechnung fuer Teile ohne Tagespreis\n' % META['usdChf'])

    # chf: Prozessoren, dann Grafikkarten, in Archiv-Reihenfolge
    cpu_lines = block('chf', [i for i in CPU_ORDER if i in prices['chf']], True)
    gpu_lines = block('chf', [i for i in GPU_ORDER if i in prices['chf']], True)
    o.write('\n    chf: {\n')
    if cpu_lines:
        o.write('        // Prozessoren\n' + ',\n'.join(cpu_lines))
    if gpu_lines:
        o.write((',\n' if cpu_lines else '') + '\n        // Grafikkarten\n' + ',\n'.join(gpu_lines))
    o.write('\n    },\n')

    o.write('\n    board: { ' + ', '.join(block('board', BOARD_TIERS, False)).replace('        ', '') + ' },\n')
    o.write('    ram: {\n' + ',\n'.join(block('ram', RAM_IDS, True)) + '\n    },\n')
    o.write('    ssd: {\n' + ',\n'.join(block('ssd', SSD_IDS, True)) + '\n    },\n')
    o.write('    psu: {\n' + ',\n'.join(block('psu', PSU_IDS, True)) + '\n    },\n')
    o.write('    case: {\n' + ',\n'.join(block('case', CASE_IDS, True)) + '\n    }\n')
    o.write('};\n')
    return o.getvalue()


def main():
    ap = argparse.ArgumentParser(description='Erzeugt konfigurator-preise.js aus preise.csv.')
    ap.add_argument('--csv', default=os.path.join(HERE, 'preise.csv'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'hardware', 'konfigurator-preise.js'))
    ap.add_argument('--stand', default=None, help='z. B. "Oktober 2026" (Standard: aktueller Monat)')
    args = ap.parse_args()

    if not os.path.exists(args.csv):
        print('FEHLER: CSV nicht gefunden: %s' % args.csv)
        return 1

    today = datetime.date.today()
    stand = args.stand or ('%s %d' % (MONTHS[today.month - 1], today.year))

    prices = {'chf': {}, 'board': {}, 'ram': {}, 'ssd': {}, 'psu': {}, 'case': {}}
    warn, n = [], 0
    valid = {'chf': ARCHIVE_IDS, 'board': set(BOARD_TIERS), 'ram': set(RAM_IDS), 'ssd': set(SSD_IDS), 'psu': set(PSU_IDS), 'case': set(CASE_IDS)}
    for cat, pid, ptxt in read_csv(args.csv):
        sec = route(cat, pid)
        if sec is None:
            warn.append('unbekannt: "%s" (kategorie "%s") – übersprungen' % (pid, cat))
            continue
        if pid not in valid[sec]:
            warn.append('%s-ID "%s" steht nicht im Archiv/in der Liste – trotzdem übernommen' % (sec, pid))
        try:
            prices[sec][pid] = parse_price(ptxt)
        except ValueError:
            warn.append('Preis "%s" bei "%s" ist keine Zahl – übersprungen' % (ptxt, pid))
            continue
        n += 1

    # fehlende feste Posten mit Standardwerten auffüllen
    for sec in ('board', 'ram', 'ssd', 'psu', 'case'):
        for k, v in DEFAULTS[sec].items():
            if k not in prices[sec]:
                prices[sec][k] = v
                warn.append('%s "%s" fehlte in der CSV – Standardwert %s CHF eingesetzt' % (sec, k, v))

    js = emit(prices, stand)
    with io.open(args.out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(js)

    print('OK: %d Preise aus %s übernommen.' % (n, os.path.relpath(args.csv, ROOT)))
    print('    Stand: %s  ->  %s' % (stand, os.path.relpath(args.out, ROOT)))
    print('    chf: %d · board: %d · ram: %d · ssd: %d · psu: %d · case: %d'
          % (len(prices['chf']), len(prices['board']), len(prices['ram']), len(prices['ssd']), len(prices['psu']), len(prices['case'])))
    miss = [i for i in ARCHIVE_IDS if i not in prices['chf']]
    if miss:
        print('    Hinweis: %d Teile ohne Tagespreis (UVP-Schätzung im Konfigurator).' % len(miss))
    if warn:
        print('  Warnungen (%d):' % len(warn))
        for w in warn:
            print('    - ' + w)
    return 0


if __name__ == '__main__':
    sys.exit(main())
