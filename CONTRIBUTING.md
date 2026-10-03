# Contributing to OpenScratch

You can contribute code, tests, documentation, translations, accessibility improvements, examples, and bug reports. You do not need write access: use a fork and a pull request.

## Getting started

1. Search [existing issues](https://github.com/METAWISER/open-scratch/issues) or open one using the templates. Discuss large changes before implementing them.
2. Fork [METAWISER/open-scratch](https://github.com/METAWISER/open-scratch) and clone your fork.
3. Install Node 24, pnpm 11.19, Python 3.10+, and .NET SDK 8+. Python and .NET are required for the corresponding integration tests.
4. Run `pnpm install --frozen-lockfile`, create a branch with `git switch -c feat/my-improvement`, and start `pnpm dev`.
5. Add meaningful tests and run `pnpm check`, `pnpm test:e2e`, `pnpm docs:build`, and `pnpm test:docs`. Electron needs a graphical session; Linux CI uses Xvfb.
6. Push your branch to your fork and open a pull request against `main`. Explain the behavior change, validation, and limitations. No collaborator invitation is required.

## Good first contributions

- Add an original learning card to `src/learning/catalog.ts`, with a tested example, English and Spanish text, keywords, version information, and a reference. See [learning](docs/learning.md).
- Improve keyboard navigation, accessibility, or a translation in `src/shared/i18n.ts`.
- Reproduce a bug with a small snippet that contains no private data.
- Improve documentation or platform-specific setup instructions.

## Technical guidelines

Keep UI, IPC, compilation, runtimes, package management, and AI separate. Validate IPC senders and payloads. Never execute snippets in Electron main or the application renderer. New engines follow `ExecutionEngine`; see [language support](docs/languages.md).

Test evaluation order, single evaluation, original lines, asynchronous behavior, cancellation, and output limits when changing instrumentation. Update `docs/parity.md` and state real limitations.

No telemetry, mandatory cloud services, commercial quotas, or automatic code transmission. Package installation scripts remain disabled by default. Do not add secrets to examples, fixtures, or logs.

Original code and contributions are distributed under MIT. Write your own examples rather than copying tutorials. Keep third-party notices and run `pnpm run licenses` when dependencies change. No CLA is required; submitting a contribution means you agree to distribute it under MIT.

## Review and community

METAWISER currently maintains the project and makes integration decisions. Keep PRs focused, pass CI, and obtain review before merging. Releases are not published automatically. Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md).

Templates do not grant write permission or guarantee response times. Discuss additional runtimes, language servers, and package managers in an issue before starting a large implementation.
