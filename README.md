# Salubrity

A local-first nutrition diary for macOS, built with React, Tauri, and .NET. Track foods and meals, see daily nutrition, and switch between light and near-black themes with green highlights.

Salubrity is free to use. Its MIT-licensed source can be downloaded, modified, and redistributed while preserving the license notice. Third-party components and food data retain their own licenses.

## GitHub and downloads

Source: [MichaelKema/Salubrity](https://github.com/MichaelKema/Salubrity). Installers belong on the [Releases page](https://github.com/MichaelKema/Salubrity/releases), separately from Git source. A signed/notarized public installer is not available yet.

The [Actions page](https://github.com/MichaelKema/Salubrity/actions) runs tests, scans Git history/source for secrets, audits dependencies, and builds an Apple Silicon test installer on pushes to `main` and pull requests. No signing secrets are supplied to these builds. Tagged versions create a **draft** release for maintainer review. See [GITHUB.md](GITHUB.md) for publishing steps.

## Desktop app

Install Salubrity from a release DMG, drag it to Applications, and open it. The app includes its own .NET runtime and starts/stops the nutrition service automatically. Users do not need Node, Rust, .NET, a terminal, or an account. Tracking works offline; optional Open Food Facts search needs internet.

The current first-release target is **Apple Silicon macOS**. The build script also supports an Intel target, but that installer has not been built or tested. Windows and Linux are not currently release targets.

Desktop data is stored at `~/Library/Application Support/Salubrity/nutrition.json`. Updating or deleting the app does not delete this file. It is local JSON with owner-only file permissions, not encrypted storage. See [PRIVACY.md](PRIVACY.md).

### Move an existing development diary

Quit Salubrity and stop the development backend first. Back up both diary files, if present. Copy your existing `backend/App_Data/nutrition.json` to `~/Library/Application Support/Salubrity/nutrition.json`, preserving the original as a backup. Do not overwrite an existing desktop diary unless you intend to replace it. Start Salubrity again. Development and installed-app diaries are otherwise separate.

## Build a Mac installer

Development requires Node 22.13+, npm, .NET 10 SDK, Rust, Python 3 (for license collection/tests), and Xcode Command Line Tools. From `frontend`:

```sh
npm ci
npm run desktop:build
```

This publishes a self-contained backend for the target architecture, builds the frontend, and packages a `.app` and `.dmg` under `frontend/src-tauri/target/release/bundle/`. The first build downloads .NET runtime and Rust dependencies. Generated runtimes, installers, dependencies, and diaries are ignored by Git.

For an Intel build on macOS, install the Rust `x86_64-apple-darwin` target and use `npm run tauri -- build --target x86_64-apple-darwin`. Test on the target architecture before releasing.

Local test builds are **ad-hoc signed, not Apple Developer ID signed or notarized**. For normal public distribution, follow [Tauri's macOS signing guide](https://v2.tauri.app/distribute/sign/macos/), provide your own Apple signing/notarization credentials through environment variables or protected CI secrets, and rebuild. Never commit signing keys or credentials. See [RELEASE.md](RELEASE.md).

## Develop

Desktop development, from `frontend`:

```sh
npm run desktop:dev
```

This prepares the backend and starts Vite and Tauri. Stop an existing Vite instance on port 5173 first.

Browser development uses two terminals, from the repository root:

```sh
dotnet run --project backend --launch-profile http
```

```sh
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Browser development uses the API at http://localhost:5289 and stores data under `backend/App_Data/`. It is a local development mode, not a public multi-user server. `Salubrity__Port` and `Salubrity__DataDirectory` allow isolated backend testing.

## Validate

From `frontend`:

```sh
npm test
npm run build
npm run prepare:backend
cargo test --manifest-path src-tauri/Cargo.toml
```

From the repository root:

```sh
dotnet build backend
python3 backend/tests/smoke.py
python3 backend/tests/desktop.py
```

Tests use synthetic data in temporary directories. The desktop backend test runs the self-contained executable without a .NET installation, checks token/Host rejection, private file permissions, revision conflicts, persistence, and cleanup after parent exit.

## Security and open source

The desktop API binds only to IPv4 loopback on an OS-assigned port. Native commands proxy a fixed set of operations with a fresh random session token kept outside JavaScript. Production webviews cannot connect to arbitrary web servers. Single-instance handling prevents two desktop apps from writing the same diary. See [SECURITY.md](SECURITY.md).

Project-owned source is MIT licensed. Preserve third-party notices and bundled dependency licenses. The nutrition grid is original project code; the previous Aceternity component has been removed. The Magic UI ticker retains its MIT notice; fonts retain their SIL Open Font Licenses. Open Food Facts data is separately licensed and attributed. See [frontend/THIRD_PARTY_NOTICES.md](frontend/THIRD_PARTY_NOTICES.md).
