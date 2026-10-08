"""Startet einen lokalen Webserver für die Website.

    python tools/serve.py          -> http://localhost:5510 (oder Port aus der Umgebungsvariable PORT)
    python tools/serve.py 8080     -> anderer Port

Funktioniert ab Python 3.6. Alternativ geht auch VS Code „Live Server".
"""
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 5510)


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({'.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml'})

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        # Eigene 404-Seite ausliefern
        if code == 404:
            path = os.path.join(ROOT, '404.html')
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    body = f.read()
                self.send_response(404)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().send_error(code, message, explain)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


os.chdir(ROOT)
with Server(('127.0.0.1', PORT), Handler) as httpd:
    print('Xiruprojekts läuft auf http://localhost:%d  (Strg+C zum Beenden)' % PORT)
    httpd.serve_forever()
