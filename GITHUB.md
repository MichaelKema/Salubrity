# GitHub source and releases

The repository is https://github.com/MichaelKema/Salubrity and the default branch is `main`. Git pushes upload source. GitHub Actions runs the workflows under `.github/workflows/`; Actions does not run or host the installed user's nutrition backend.

## Normal updates

From the repository root, review the changed files and run the checks described in README.md. Stage specific reviewed source files, commit, and push:

```sh
git status --short
git diff
git add <reviewed-files>
git diff --cached
git commit -m "Describe the change"
git push origin main
```

The Checks and Mac build workflow runs automatically. It uses a standard Apple Silicon macOS runner, read-only repository permissions, official actions pinned to commits, and synthetic test data. Test DMGs appear in workflow artifacts; they are ad-hoc signed and are not public production installers. Artifact downloads may require a GitHub login. The workflow fails for detected secrets or known vulnerable dependencies; advisory warnings are printed for review. Dependabot opens dependency update PRs each week; updates are not auto-merged.

Never force-add ignored diaries, `.env` files, signing material, local tool worktrees, or build directories. GitHub automatically provides the workflow's `GITHUB_TOKEN`; no personal access token needs to be stored in project code.

## Draft a versioned release

Update `frontend/package.json`, `frontend/package-lock.json`, `frontend/src-tauri/Cargo.toml`, the local package entry in `frontend/src-tauri/Cargo.lock`, and `frontend/src-tauri/tauri.conf.json` together. Commit and push, then tag the reviewed commit. For the first version:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The Draft Mac release workflow reruns all checks, builds the DMG and checksum, and attaches them to a **draft GitHub Release**. It never publishes automatically and refuses to replace assets on an already published release. Tags must match the app/package version. Existing tags should not be moved to different commits.

Before publishing, follow RELEASE.md: build with Developer ID signing and Apple notarization, replace the draft test DMG/checksum with the verified public artifacts, and test installation on a clean Mac. This workflow intentionally does not import Apple signing secrets; setting GitHub secrets alone does not change its test-build behavior. A protected signing job must be added before automating that step. Do not expose signing credentials to pull-request builds.

Publish the reviewed release from GitHub's Releases page. Anyone can then download its assets without paying for Salubrity. Source archives are provided by GitHub automatically. The supported first installer is Apple Silicon macOS; Intel Macs, Windows and Linux have not been tested.

## Repository security

Use GitHub's private vulnerability reporting to disclose security problems without posting personal data in public issues. Enable Dependabot alerts and secret scanning/push protection in repository settings where available. Keep workflow and dependency updates reviewed, and use GitHub-hosted runners for outside contributions. Do not give public pull requests access to a personal computer or signing environment.
