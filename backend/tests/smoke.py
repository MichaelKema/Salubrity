"""Run against an isolated local API and temporary data, never the user's diary."""
import copy
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

backend = Path(__file__).resolve().parents[1]
url = 'http://127.0.0.1:5290/api/tracker'

def request(data=None, origin='http://localhost:5173'):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,
                                 headers={'Content-Type': 'application/json', 'Origin': origin})
    if data is not None:
        req.method = 'PUT'
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, response.headers, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, error.headers, json.load(error)

with tempfile.TemporaryDirectory(prefix='salubrity-test-') as directory:
    env = dict(os.environ, ASPNETCORE_URLS='http://127.0.0.1:5290', ASPNETCORE_ENVIRONMENT='Development', Salubrity__DataDirectory=directory, Salubrity__Port="5290")
    def start():
        process = subprocess.Popen(['dotnet', str(backend / 'bin/Debug/net10.0/backend.dll')], cwd=backend, env=env,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                request()
                return process
            except (urllib.error.URLError, TimeoutError):
                if process.poll() is not None:
                    raise RuntimeError('Test API exited before starting')
                time.sleep(.1)
        process.terminate()
        raise RuntimeError('Test API did not start')

    process = start()
    try:
        status, headers, state = request()
        assert status == 200 and state['revision'] == 0 and state['entries'] == []
        assert headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'
        assert request(origin='https://untrusted.example')[0] == 403
        assert request(origin='tauri://localhost')[0] == 403
        nutrients = dict(calories=120, protein=15, carbs=10, fat=2, fiber=0, sugar=None, sodium=60)
        state['foods'] = [dict(id='food-1', name='Test yogurt', source='Custom label', basisAmount=150, nutrients=nutrients)]
        state['meals'] = [dict(id='meal-1', name='Test meal', servings=2, ingredients=[dict(foodId='food-1', amount=300)])]
        state['entries'] = [dict(id='entry-1', date='2026-09-28', slot='Breakfast', name='Test meal', portion='1 serving', nutrients=nutrients)]
        status, _, saved = request(state)
        assert status == 200 and saved['revision'] == 1
        assert request(state)[0] == 409, 'Stale clients must not overwrite newer data'
        broken = copy.deepcopy(saved)
        broken['foods'][0]['nutrients']['calories'] = -1
        assert request(broken)[0] == 400, 'Negative nutrients must be rejected'
        broken = copy.deepcopy(saved)
        broken['meals'][0]['ingredients'][0]['foodId'] = 'missing'
        assert request(broken)[0] == 400, 'Missing recipe ingredients must be rejected'
        broken = copy.deepcopy(saved)
        broken['entries'][0]['slot'] = 'invalid'
        assert request(broken)[0] == 400
        broken = copy.deepcopy(saved)
        broken['foods'] = [None]
        assert request(broken)[0] == 400
        process.terminate()
        process.wait(timeout=5)
        process = start()
        assert request()[2] == saved, 'Saved nutrition must survive a server restart'
        saved['entries'] = []
        status, _, removed = request(saved)
        assert status == 200 and removed['entries'] == [] and removed['revision'] == 2
        print('PASS: persistent foods, meals, diary, deletion, validation, CORS, and revision conflicts')
    finally:
        process.terminate()
        process.wait(timeout=5)
