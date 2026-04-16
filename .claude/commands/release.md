You are performing a version release for the managed-agent-ui project.

## Steps

1. **Check current state**:
   - Run `git status` to get the current branch and working tree state.
   - Ensure the working tree is clean. If not, stop and tell the user to commit or stash changes first.

2. **Branch routing** — ask the user which path to take:

   - **A) Create a release PR** — if on `develop` (or the PR hasn't been merged to `main` yet):
     1. Ask the user which bump they want: **patch**, **minor**, or **major**.
        - Read the current version from `package.json` and the latest `v*` git tag (`git tag --list 'v*' --sort=-v:refname | head -1`). Use whichever is higher as the baseline.
        - Show the current version and what each bump would produce (e.g., `0.2.1 → patch: 0.2.2 | minor: 0.3.0 | major: 1.0.0`).
        - Wait for the user to choose before proceeding.
     2. Update the `version` field in `package.json` to the new version.
     3. Stage and commit with message: `release: vX.Y.Z`
     4. Push to `develop`.
     5. Create a PR from `develop` → `main` titled `release: vX.Y.Z` using `gh pr create`.
     6. Tell the user the PR is ready for review. Provide the PR URL. Tell them to come back and run `/release` again after merging to tag the release.

   - **B) Tag the release** — if on `main`:
     1. Pull latest: `git pull origin main`.
     2. Read the current version from `package.json` — this is the version to tag (it was already bumped in the PR).
     3. Confirm with the user: "Tag and push `vX.Y.Z`?"
     4. Create an annotated git tag: `git tag -a vX.Y.Z -m "vX.Y.Z"`
     5. Push the tag: `git push origin vX.Y.Z`
     6. Tell the user the tag has been pushed and the Docker Publish workflow will build and push the image. Link to the Actions tab: `https://github.com/<owner>/<repo>/actions`
