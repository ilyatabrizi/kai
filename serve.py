#!/usr/bin/env python3
"""Local preview. Static files, no build step, correct MIME for .webmanifest.

    python3 serve.py          # http://localhost:8161
"""
import functools
import http.server
import pathlib
import socketserver

PORT = 8161
ROOT = pathlib.Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript",
        ".woff2": "font/woff2",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        line = fmt % args
        if " 200 " not in line and " 206 " not in line and " 304 " not in line:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), functools.partial(Handler, directory=str(ROOT))) as srv:
        print(f"KAI → http://localhost:{PORT}")
        srv.serve_forever()
