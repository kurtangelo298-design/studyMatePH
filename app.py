from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
import os

PORT = 8000

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('localhost', PORT), Handler)
    print(f"✅ Dashboard running at: http://localhost:{PORT}")
    print("📂 All files in this folder are served. Keep this window open!")
    webbrowser.open(f'http://localhost:{PORT}')
    server.serve_forever()