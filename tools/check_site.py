# -*- coding: utf-8 -*-
"""Prüft die Website auf Lücken.

    python tools/check_site.py

Meldet:
  * Seiten aus assets/js/site.js, deren HTML-Datei fehlt
  * HTML-Seiten, die nicht in site.js eingetragen sind
  * Realitätskristalle (XIRU.egg('...') / data-egg="..."), die im Code benutzt,
    aber nicht in site.js registriert sind – und registrierte, die nie ausgelöst werden
Läuft mit Python 3.6+.
"""
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', 'node_modules', '.claude', 'tools', 'docs', 'dev'}


def read(path):
    with io.open(path, encoding='utf-8', errors='replace') as f:
        return f.read()


site = read(os.path.join(ROOT, 'assets', 'js', 'site.js'))
pages = re.findall(r"\{\s*p:\s*'([^']+)'", site)
egg_part = site[site.index('XIRU.eggs = ['):]
egg_ids = set(re.findall(r"\{\s*id:\s*'([a-z0-9][\w-]*)'", egg_part))
auto_eggs = {e for e in egg_ids if e.startswith(('w-', 'b-', 'o-'))}   # Wörter, Verhalten, Orte: löst core.js aus

files, used = [], {}
for base, dirs, names in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for n in names:
        if not n.endswith(('.html', '.js')):
            continue
        full = os.path.join(base, n)
        rel = os.path.relpath(full, ROOT).replace('\\', '/')
        if n.endswith('.html'):
            files.append(rel)
        text = read(full)
        for m in re.findall(r"\b(?:XIRU|X)\.egg\(\s*'([\w-]+)'", text) + re.findall(r"""['"]?data-egg['"]?\s*[:=]\s*['"]([\w-]+)""", text) + re.findall(r"data-egg=\\?'([\w-]+)", text):
            used.setdefault(m, set()).add(rel)
        # Seiten, die data-egg dynamisch aus Daten bauen (z. B. Glossar, Zeitleiste): IDs in Anführungszeichen zählen
        if "data-egg=\"' +" in text:
            for m in re.findall(r"'([a-z]{1,2}-[a-z0-9-]+)'", text):
                if m in egg_ids:
                    used.setdefault(m, set()).add(rel)
        # Kristall-IDs, die als Daten oder über Hilfsfunktionen benutzt werden (z. B. egg: 'p-1080ti', win('g-pong-perfekt'))
        # Nur IDs, deren erster Namensteil zum Dateipfad passt (g-pong-… in pong.js) – sonst wären CSS-IDs dabei
        for m in re.findall(r"['\"]((?:g|k|x|t|h)-[a-z0-9]+-[a-z0-9-]+)['\"]", text):
            if m.split('-')[1] in rel:
                used.setdefault(m, set()).add(rel)

missing_files = [p for p in pages if not os.path.exists(os.path.join(ROOT, p))]
# Why.html + why/ = Liminal-Teil (Maels Bereich): bewusst nicht im Register, keine Kristalle
unregistered_pages = sorted(f for f in files if f not in pages and not f.startswith(('assets/', 'why/')) and f != 'Why.html')
unregistered_eggs = {k: v for k, v in used.items() if k not in egg_ids and not k.startswith(('id', 'g-<'))}
never_used = sorted(e for e in egg_ids - set(used) - auto_eggs)

print('Seiten im Register: %d  ·  HTML-Dateien: %d  ·  Kristalle registriert: %d' % (len(pages), len(files), len(egg_ids)))
print('\n== Seiten ohne Datei (%d)' % len(missing_files))
for p in missing_files:
    print('   ', p)
print('\n== HTML-Dateien ohne Registereintrag (%d)' % len(unregistered_pages))
for p in unregistered_pages:
    print('   ', p)
print('\n== Benutzte, aber nicht registrierte Kristalle (%d)' % len(unregistered_eggs))
for k in sorted(unregistered_eggs):
    print('    %-34s %s' % (k, ', '.join(sorted(unregistered_eggs[k]))))
print('\n== Registrierte Kristalle, die nirgends ausgelöst werden (%d)' % len(never_used))
for e in never_used:
    print('   ', e)

# Anti-Cheat: Spieldaten für den Xiru-Server (server/pb_hooks/xiru_data.js) müssen zur Website passen
try:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_server_data as bsd
    fresh = io.open(bsd.OUT, encoding='utf-8').read() == bsd.current() if os.path.exists(bsd.OUT) else False
    print('\n== Server-Spieldaten (Anti-Cheat): ' + ('aktuell' if fresh else 'VERALTET -> python tools/build_server_data.py ausführen und xiru_data.js auf den Server kopieren'))
except Exception as e:
    print('\n== Server-Spieldaten (Anti-Cheat): nicht prüfbar (%s)' % e)
