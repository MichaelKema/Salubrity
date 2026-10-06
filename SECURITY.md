# Security

This is a local, single-user app, not an authenticated cloud service. Do not expose the development API on a network or use it as a public server.

Desktop protection:

- Backend listens on `127.0.0.1` at a dynamically assigned port.
- Each launch generates a 256-bit session token. It is passed to the child environment and native HTTP requests, never the webview, source, URL, command-line arguments, or logs.
- Backend checks local clients, Host headers and session tokens. Browser development rejects unexpected origins.
- Native commands expose tracker read/write and food search only, not an arbitrary URL proxy or shell.
- The webview has a restricted content security policy. No remote capabilities or general shell/file-system permissions are granted.
- Owner-only permissions protect the app-data directory and diary file on macOS. The app does not provide encryption at rest.
- The native process cleans up its backend on exit; the backend also watches parent-process exit.

These controls do not protect against a compromised OS account or malicious code running as the same user.

Before public release, scan source and all Git history with Gitleaks; audit npm, NuGet, and Rust dependencies; preserve third-party licenses; test a signed/notarized installer on a clean Mac. A passing automated scan is not a guarantee that all vulnerabilities or sensitive information have been detected.

Do not post credentials, signing material, or real diary data in public bug reports. Report security problems privately through [GitHub's vulnerability reporting page](https://github.com/MichaelKema/Salubrity/security/advisories/new). Include reproducible steps using synthetic data and the affected app version.
