# Desktop preparation validation

Validated on an Apple Silicon Mac on 2026-10-06 with synthetic diary data.

- Frontend: 18 tests passed; TypeScript and production build passed.
- Native Rust: restricted loopback URL regression passed; release build passed.
- Backend: browser-mode smoke checks and self-contained desktop checks passed, including private API token, hostile Host rejection, revision conflicts, owner-only files, restart persistence and parent-exit cleanup.
- Actual packaged app: near-black/green theme, custom food logging, saved diary after restart, and online food search worked.
- npm and NuGet checks reported no known vulnerabilities. Rust audit reported no known vulnerabilities, with remaining upstream warnings for glib 0.18.5 (unsound) and proc-macro-error 1.0.4 (unmaintained). Both are absent from the macOS dependency tree and are not shipped in this Mac build. Other platforms require a separate review.
- Gitleaks found no secrets in the existing three-commit Git history or the proposed source package. This is a detection result, not a guarantee that no sensitive content exists.
- Local app signature and DMG integrity checks passed. The app is ad-hoc signed, not Apple Developer ID signed or notarized.

The subsequent GitHub preparation adds validated Actions workflows, weekly Dependabot updates, and private security reporting. Source and history were scanned again before pushing. No cloud backend deployment was performed. A clean-Mac installation test, Developer ID signing and Apple notarization remain required before public installer distribution. Intel Macs, Windows and Linux have not been tested.
