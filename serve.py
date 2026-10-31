# Local dev server: like `python3 -m http.server`, but tells the browser never to
# reuse cached files, so a normal reload always picks up the latest code.

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = partial(NoCacheHandler, directory=Path(__file__).parent)
print(f'Serving Lineage at http://localhost:{port}')
ThreadingHTTPServer(('', port), handler).serve_forever()
