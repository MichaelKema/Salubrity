# Mac release checklist

1. Run frontend, native and backend tests using synthetic data.
2. Run Gitleaks on all Git history and the proposed source tree, and dependency vulnerability checks. Review findings, including historical copies of removed components and personal data; do not assume `.gitignore` removes anything already committed.
3. Preserve LICENSE and third-party notices in source and installers. Regenerate dependency notices after dependency updates.
4. Build on macOS for the supported architecture. Verify the bundled backend, diary restart persistence, food search error states, theme persistence and backend cleanup in the actual app.
5. Use an Apple Developer ID certificate and notarization credentials for public release. Keep certificates, private keys and credentials out of Git. Tauri handles macOS signing/notarization when configured. A local ad-hoc signed build is a test artifact, not a completed public release.
6. Test installation from the final notarized DMG on a clean Mac without Node, Rust or .NET. Check Gatekeeper normally; do not tell users to disable it or remove quarantine as an installation procedure.
7. Publish only installers, checksums and source to the chosen release page; never include `App_Data`, development diary files, signing credentials or backend publish work directories.

The GitHub repository is public. The new `backend/` and `frontend/` structure replaces the historical root starter layout. The old three-commit history scan detected no secrets, but new source and history must also be scanned. `.github/workflows/ci.yml` checks changes and builds test installers; version tags trigger `.github/workflows/release.yml`, which creates draft releases only. See GITHUB.md. Public installer distribution still requires the signing and clean-Mac checks above.

The repository defaults to ad-hoc signing (`bundle.macOS.signingIdentity: "-"`). For a public release, explicitly configure your Developer ID identity or the `APPLE_SIGNING_IDENTITY` environment variable, plus Apple notarization credentials. The bundled .NET backend is signed with the required JIT entitlement. The plain DMG packaging step preserves the signed/notarized app and avoids Finder automation. Verify and staple the final public artifact as part of the Apple release process.
