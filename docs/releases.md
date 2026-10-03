# Releases and version history

OpenScratch lives in a public personal-account repository with an MIT license. No special GitHub organization or open-source directory is required. An organization can be introduced later for shared ownership and team administration; moving the repository is not necessary for contributions or releases.

Official downloads and version notes belong in [GitHub Releases](https://github.com/METAWISER/open-scratch/releases). [CHANGELOG.md](../CHANGELOG.md) tracks user-visible source changes; a local build or a changelog heading alone does not mean a version was published.

## Publishing a version

1. Update `package.json` with the new version. Move completed items from **Unreleased** into a matching `## [X.Y.Z]` section in `CHANGELOG.md`. Include changes and known limitations. Review application guides and the documentation website in the same change.
2. Commit and push the reviewed code to `main`; wait for the normal checks. Optionally run the **Release** workflow manually from Actions first. A manual run builds/tests and retains downloadable Actions artifacts for 14 days, but never publishes a GitHub Release, even when run against a tag.
3. When publishing is intended, create and push an annotated version tag at the reviewed commit. For a version of `0.6.0`, the commands would be:

   ```sh
   git tag -a v0.6.0 -m "OpenScratch 0.6.0"
   git push origin v0.6.0
   ```

   Use the actual new version; never move an already published tag. Merely pushing ordinary commits or running `pnpm package` does not publish anything.
4. The **Release** workflow validates tag/version/changelog consistency, installs locked dependencies, runs checks, builds a Windows x64 application, tests that packaged executable, and creates its NSIS installer. Publication is skipped if a check fails.
5. A separate job with release-write permission creates a draft, uploads the installer and `SHA256SUMS.txt`, then publishes the complete release with curated changes from the changelog. GitHub supplies source archives for the tag. A version with a suffix such as `0.7.0-beta.1` is marked as a prerelease.

All future published versions must be recorded through this process, with release notes and download assets. Updating the version number alone is not publication.

## Failure and retry

Inspect the failed Actions job, fix the problem, and rerun when appropriate. A failed upload may leave an unpublished draft; a rerun completes its assets. The workflow does not overwrite an already published release. For an actual product fix, create a new version rather than replacing published binaries or moving tags. If a published release is incomplete, investigate it manually instead of forcing an overwrite.

## Distribution scope

The initial release workflow distributes Windows x64 only. The project has Linux/macOS build configuration and separate CI, but this workflow does not promise installers for those systems. Windows builds are currently unsigned; signing/notarization need certificates and a separately verified configuration. SHA256 checksums verify file integrity and do not substitute for a trusted signature. Python and C# still require external runtimes.

Release notes are curated in English rather than inferred solely from commit subjects, so direct commits as well as pull requests get meaningful change descriptions. See the [verification record](verification.md) for actual tests; workflow configuration alone is not proof of a successful release.

GitHub documentation: [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
