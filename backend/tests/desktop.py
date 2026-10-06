"""Exercise the actual self-contained executable with synthetic diary data."""
import json, os, queue, secrets, stat, subprocess, sys, tempfile, threading, urllib.request, urllib.error
from pathlib import Path
root = Path(__file__).resolve().parents[2]
arch = 'aarch64' if os.uname().machine == 'arm64' else 'x86_64'
binary = root / f'frontend/src-tauri/binaries/salubrity-backend-{arch}-apple-darwin'

def request(url, token=None, data=None, extra=None):
    headers = {'Content-Type': 'application/json', **(extra or {})}
    if token: headers['X-Salubrity-Token'] = token
    req = urllib.request.Request(url + '/api/tracker', headers=headers,
        data=json.dumps(data).encode() if data is not None else None, method='PUT' if data is not None else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=5) as response: return response.status, response.headers, json.load(response)
    except urllib.error.HTTPError as e: return e.code, e.headers, json.load(e)

with tempfile.TemporaryDirectory(prefix='salubrity-desktop-test-') as directory:
    token = secrets.token_hex(32)
    parent = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(120)'])
    def start():
        env = {**os.environ, 'SALUBRITY_API_TOKEN': token, 'Salubrity__DataDirectory': directory,
            'DOTNET_BUNDLE_EXTRACT_BASE_DIR': directory + '/runtime', 'ASPNETCORE_ENVIRONMENT': 'Production',
            'Logging__LogLevel__Default': 'Warning', 'DOTNET_ROOT': '/nonexistent'}
        p = subprocess.Popen([str(binary), '--Salubrity:Desktop=true', f'--Salubrity:ParentPid={parent.pid}'],
            env=env, cwd=directory, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        q = queue.Queue()
        def read():
            for line in p.stdout:
                if line.startswith('SALUBRITY_READY:'): q.put(line.strip().split(':', 1)[1])
        threading.Thread(target=read, daemon=True).start()
        try: return p, q.get(timeout=30)
        except queue.Empty:
            p.kill(); p.wait(); raise RuntimeError('Backend startup failed: ' + p.stderr.read())
    p = None
    try:
        p, url = start()
        assert url.startswith('http://127.0.0.1:')
        assert request(url)[0] == 401
        assert request(url, 'wrong-token')[0] == 401
        assert request(url, token, extra={'Host': 'evil.example'})[0] == 403
        status, headers, state = request(url, token)
        assert status == 200 and state['revision'] == 0
        assert 'Access-Control-Allow-Origin' not in headers
        state['foods'] = [dict(id='test-food', name='Synthetic apple', source='Test', basisAmount=100,
            nutrients=dict(calories=52, protein=0.3, carbs=14, fat=0.2, fiber=2.4, sugar=10, sodium=1))]
        status, _, saved = request(url, token, state)
        assert status == 200 and saved['revision'] == 1
        assert request(url, token, state)[0] == 409
        assert stat.S_IMODE(Path(directory, 'nutrition.json').stat().st_mode) == 0o600
        assert stat.S_IMODE(Path(directory).stat().st_mode) == 0o700
        p.terminate(); p.wait(timeout=10)
        p, url = start()
        assert request(url, token)[2] == saved
        # The parent exits without telling the backend; its watcher must stop it.
        parent.terminate(); parent.wait(timeout=5)
        p.wait(timeout=10)
        assert p.returncode == 0
        print('PASS: standalone runtime, random loopback port, token/Host protection, private files, persistence, parent-exit cleanup')
    finally:
        if p and p.poll() is None: p.terminate(); p.wait(timeout=10)
        if parent.poll() is None: parent.terminate(); parent.wait(timeout=5)
