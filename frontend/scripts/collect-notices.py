"""Collect installed package license texts without embedding user data or credentials."""
import json, os, subprocess, tomllib
from pathlib import Path
frontend = Path(__file__).resolve().parents[1]
sections = ['Salubrity third-party dependency notices\n\nProject source: MIT; third-party licenses below apply to their respective packages.']

def add(label, directory, license_name=''):
    texts = []
    for file in sorted(directory.iterdir()):
        if file.is_file() and file.name.lower().startswith(('license', 'licence', 'copying', 'notice', 'third-party-notices', 'copyright')):
            texts.append(file.name + '\n' + file.read_text(errors='replace'))
    sections.append(f'\n\n=== {label} ({license_name}) ===\n' + '\n\n'.join(texts))

paths = subprocess.check_output(['npm', 'ls', '--omit=dev', '--all', '--parseable'], cwd=frontend, text=True).splitlines()
for name in sorted(set(paths)):
    p = Path(name)
    if p == frontend: continue
    manifest = json.loads((p/'package.json').read_text())
    add(manifest['name']+'@'+manifest['version'], p, str(manifest.get('license', 'See package notices')))

lock = tomllib.loads((frontend/'src-tauri/Cargo.lock').read_text())
registry = Path(os.environ.get('CARGO_HOME', str(Path.home()/'.cargo'))) / 'registry/src'
count = 0
for package in lock['package']:
    if not package.get('source', '').startswith('registry+'): continue
    matches = list(registry.glob(f"*/{package['name']}-{package['version']}"))
    if matches:
        p = matches[0]
        manifest = tomllib.loads((p/'Cargo.toml').read_text())
        add(package['name']+'@'+package['version'], p, manifest['package'].get('license', 'See package notices'))
        count += 1

rid = 'osx-arm64' if os.uname().machine == 'arm64' else 'osx-x64'
nuget = Path(os.environ.get('NUGET_PACKAGES', str(Path.home()/'.nuget/packages')))
for name in ['microsoft.netcore.app.runtime.'+rid, 'microsoft.aspnetcore.app.runtime.'+rid, 'microsoft.aspnetcore.openapi']:
    assets = json.loads((frontend.parent/'backend/obj/project.assets.json').read_text())
    versions = [key.split('/', 1)[1] for key in assets['libraries'] if key.split('/', 1)[0].lower() == name]
    if not versions:
        versions = [entry['version'].strip('[]').split(',')[0].strip() for framework in assets['project']['frameworks'].values() for entry in framework.get('downloadDependencies', []) if entry['name'].lower() == name]
    if not versions: raise SystemExit('Missing .NET license package: '+name)
    version = versions[0]
    add(name+'@'+version, nuget/name/version, 'MIT and included third-party notices')

out = frontend/'licenses/DEPENDENCY_NOTICES.txt'
out.write_text('\n'.join(sections))
print(f'Collected notices for {len(paths)-1} npm packages, {count} cached Rust packages, and .NET packages.')
