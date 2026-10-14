#!/usr/bin/env python3
"""Erzeugt server/pb_hooks/xiru_data.js aus den Spieldaten der Website (für das Anti-Cheat auf dem Xiru-Server).

Der Server rechnet damit selbst nach: Level aus XP, Werte des Mnemora-Gehäuses (Gehäuse + Steckkarten + Pilotenbonus
aus dem Seemech), wie viel XP neue Kristalle/Orte bringen dürfen usw. Nach Änderungen an site.js (Kristalle, Seiten,
Mech-Teile, Seltenheiten) oder mnemora.js (Gehäuse, Karten, Orte, Strassen) neu ausführen und die Datei auf den Server kopieren.
tools/check_site.py meldet, wenn die Datei veraltet ist.

    python tools/build_server_data.py
"""
import hashlib, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'server', 'pb_hooks', 'xiru_data.js')


def read(p):
    return io.open(os.path.join(ROOT, p), encoding='utf-8').read()


def block(src, start):
    """Text eines Arrays/Objekts ab `start` (Klammern zählen, Strings überspringen)."""
    i = src.index(start) + len(start)
    while src[i] not in '[{':
        i += 1
    depth, j, q = 0, i, None
    while True:
        c = src[j]
        if q:
            if c == '\\':
                j += 1
            elif c == q:
                q = None
        elif c in '\'"`':
            q = c
        elif c in '[{':
            depth += 1
        elif c in ']}':
            depth -= 1
            if depth == 0:
                return src[i:j + 1]
        j += 1


def entries(arr):
    """Einzelne { … }-Einträge auf oberster Ebene eines Arrays."""
    out, depth, start, q, j = [], 0, None, None, 0
    while j < len(arr):
        c = arr[j]
        if q:
            if c == '\\':
                j += 1
            elif c == q:
                q = None
        elif c in '\'"`':
            q = c
        elif c == '{':
            if depth == 1:
                start = j
            depth += 1
        elif c == '[':
            depth += 1
        elif c in '}]':
            depth -= 1
            if c == '}' and depth == 1 and start is not None:
                out.append(arr[start:j + 1])
                start = None
        j += 1
    return out


def sval(e, key):
    m = re.search(r"\b" + key + r":\s*'([^']*)'", e)
    return m.group(1) if m else None


def nval(e, key, default=None):
    m = re.search(r"\b" + key + r":\s*(-?[\d.]+)", e)
    return float(m.group(1)) if m else default


def obj(e, key):
    """Kleines Objekt mit Zahlen: s: { P: 1, R: 2 } → dict"""
    m = re.search(r"\b" + key + r":\s*\{([^{}]*)\}", e)
    if not m:
        return {}
    return {k: float(v) for k, v in re.findall(r"(\w+):\s*(-?[\d.]+)", m.group(1))}


def strlist(e, key):
    m = re.search(r"\b" + key + r":\s*\[([^\]]*)\]", e)
    return re.findall(r"'([^']*)'", m.group(1)) if m else []


def num(v):
    return int(v) if v is not None and float(v).is_integer() else v


def build():
    site, mn = read('assets/js/site.js'), read('assets/js/mnemora.js')
    rar = [None] + [num(nval(e, 'm', 1)) for e in entries(block(site, 'XIRU.rarities ='))]
    parts = {}
    for e in entries(block(site, 'XIRU.mechParts =')):
        pid = sval(e, 'id')
        if pid:
            parts[pid] = {'slot': sval(e, 'slot'), 's': {k: num(v) for k, v in obj(e, 's').items()}}
    slots = [sval(e, 'id') for e in entries(block(site, 'XIRU.mechSlots ='))]
    mats = [sval(e, 'id') for e in entries(block(site, 'XIRU.materials ='))]
    eggs = {}
    i = site.index('XIRU.eggs.push(') + len('XIRU.eggs.push(')
    pushed = '[' + site[i:site.index('\n);', i)] + ']'   # zweiter Block: XIRU.eggs.push( … );
    for e in entries(block(site, 'XIRU.eggs =')) + entries(pushed):
        eid = sval(e, 'id')
        if eid:
            eggs[eid] = [num(nval(e, 'x', 20)), num(nval(e, 'r', 1))]
    pages = {}
    for e in entries(block(site, 'XIRU.pages =')):
        p = sval(e, 'p')
        if p:
            pages[p] = 40 if re.search(r"\bhidden:\s*true", e) else 10
    games = sorted({sval(e, 'p').split('/')[-1][:-5] for e in entries(block(site, 'XIRU.pages =')) if sval(e, 'p') and re.search(r"\bgame:\s*'", e)})
    casings = {}
    for e in entries(block(mn, 'const CASINGS =')):
        casings[sval(e, 'id')] = {'slots': num(nval(e, 'slots')), 't': num(nval(e, 't')), 'terr': strlist(e, 'terr'), 'base': {k: num(v) for k, v in obj(e, 'base').items()}}
    cards = {}
    for e in entries(block(mn, 'const CARDS =')):
        cards[sval(e, 'id')] = {'w': num(nval(e, 'w')), 'fx': {k: num(v) for k, v in obj(e, 'fx').items()}, 'terr': strlist(e, 'terr')}
    roads = {}
    for e in entries(block(mn, 'const ROADS =')):
        roads[sval(e, 'id')] = {'foes': num(nval(e, 'foes')), 'lvl': num(nval(e, 'lvl'))}
    places = re.findall(r"^\s{8}(\w+):\s*\{\s*(?:n:|kind:)", block(mn, 'const EXTRA ='), re.M)
    world = [sval(e, 'id') for e in entries(block(mn, 'const WORLD ='))]
    data = {'rar': rar, 'parts': parts, 'slots': slots, 'mats': mats, 'eggs': eggs, 'pages': pages, 'games': games,
            'casings': casings, 'cards': cards, 'roads': roads, 'places': places, 'world': world}
    # Kurzer Plausibilitätscheck, damit ein kaputter Auszug nicht unbemerkt auf den Server kommt
    assert len(parts) > 30 and len(eggs) > 200 and len(pages) > 150 and len(casings) == 6 and len(cards) >= 13 and len(roads) >= 12 and len(places) >= 11, \
        (len(parts), len(eggs), len(pages), len(casings), len(cards), len(roads), len(places))
    assert all(p['slot'] in slots for p in parts.values())
    return data


def render(data):
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    h = hashlib.sha1(body.encode()).hexdigest()[:12]
    return ('// Automatisch erzeugt von tools/build_server_data.py – nicht von Hand ändern.\n'
            '// Spieldaten für das Anti-Cheat (Version ' + h + ').\n'
            'module.exports = ' + body + ';\nmodule.exports.version = "' + h + '";\n')


def current():
    return render(build())


if __name__ == '__main__':
    text = current()
    if '--check' in sys.argv:
        old = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        sys.exit(0 if old == text else 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    d = build()
    print('server/pb_hooks/xiru_data.js geschrieben:', {k: len(v) for k, v in d.items() if hasattr(v, '__len__')})
