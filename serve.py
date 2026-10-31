# Local dev server: like `python3 -m http.server`, but tells the browser never to
# reuse cached files, so a normal reload always picks up the latest code.

import socket
import sys
from contextlib import suppress
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class DualStackServer(ThreadingHTTPServer):
    # Listen on IPv6 and IPv4 like `python3 -m http.server`: browsers often try
    # localhost as ::1 first, and an IPv4-only server makes some requests fail.
    address_family = socket.AF_INET6

    def server_bind(self):
        with suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = partial(NoCacheHandler, directory=Path(__file__).parent)
print(f'Serving Lineage at http://localhost:{port}')
DualStackServer(('::', port), handler).serve_forever()
