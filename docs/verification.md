# Verification record — OpenScratch 0.5 RunJS audit improvements

- Windows x64: strict TypeScript, ESLint and production build pass. Vitest: **48 tests passed**; the four new parity tests also passed after adding the Node CSS rejection assertion.
- **Nine desktop scenarios passed together against the packaged Windows executable**. New coverage includes selection-to-snippet capture, name/description editing, actual Monaco completion, cursor insertion, persisted preferences, undefined-result filtering, expand/collapse, source hover highlighting, JSON library export/import, Browser CSS and original console lines with bridge isolation.
- Library transfer tests use the real IPC and filesystem, substituting only native dialog path selection. JSON exports omit runtime environment, executable paths and cwd. Import validation and legacy preference defaults have unit coverage.
- The final snippet-capacity guard preserves existing entries instead of silently evicting them. The rebuilt package's two new parity scenarios were rechecked after this small final change.
- Screenshot of output inspection reviewed. Existing Node/Browser/Python/C# execution, package installation/types, React preview, offline use and persistence remain covered by the desktop suite.
- Documentation production build passed. Windows NSIS installer generated locally at `release/v0.5.0/OpenScratch Setup 0.5.0.exe`; executable at `release/v0.5.0/win-unpacked/OpenScratch.exe`. No 0.5 macOS/Linux execution, installer-wizard execution, signing or release upload is claimed. Remote CI results are separate from these local checks.

---

# Verification record — OpenScratch 0.4 desktop workflow

- Windows production build, TypeScript and ESLint pass. The two localization/migration tests pass.
- All seven desktop scenarios were exercised on `release/v0.4.0/win-unpacked/OpenScratch.exe`: six existing scenarios passed together, then the new workflow scenario passed after allowing 30 seconds for the first installed-package execution. Its original five-second assertion was too short in this environment.
- New coverage: all six language-picker choices and runtime defaults, context-menu formatting and snippet persistence, popular-package installation and immediate date-fns execution. Existing tests now access Auto Run/Auto Log through Preferences.
- Final reduced-sidebar screenshot inspected. Windows NSIS installer generated locally, unsigned; no release upload or installer-wizard execution.
- The documentation website build passed. CI will recheck the committed revision; no additional macOS/Linux verification is claimed for 0.4 here.

---

# Verification record — 2026-10-03 / OpenScratch 0.3

Host: Windows x64. Python 3.14.7 through `py -3`, .NET SDK 8.0.204, Node 24.19.0 and Electron 44.5.1.

- Strict TypeScript, ESLint and production desktop build: pass.
- Vitest: **44 tests passed** in the final complete suite. Persistence regression tests simulate transient replacement locks and permanent errors, checking save ordering, preservation of the original file and subsequent recovery. Real C# checks cover all three lessons, top-level await, compiler/runtime source lines, Stop/recovery after an active infinite loop, output limits and missing SDK errors.
- Playwright: **6 desktop scenarios passed against the final packaged Windows executable** (35.5 seconds). Includes native/menu UI language, persisted Spanish and C# selection, copying a lesson, opening its code in a new tab with Auto Run off, actual C# execution and restart persistence.
- Documentation Playwright: **2 scenarios passed**, covering all 12 guides, search, clipboard, theme persistence, 13 learning examples and mobile navigation/overflow. Desktop and mobile screenshots inspected.
- Documentation production build passes and includes MIT and third-party notices. GitHub Pages deployment succeeded; the public home page and C# guide were checked with Chromium (HTTP 200, expected headings, no client errors).
- `pnpm install --frozen-lockfile --offline`: pass using the populated local cache. License generator records 587 dependency notices.
- GitHub Actions [run 37130267135](https://github.com/METAWISER/open-scratch/actions/runs/37130267135) on revision `e041024`: typecheck, lint, 44 unit/integration tests, desktop E2E and folder packaging passed on Windows, Linux and macOS runners. Remote E2E exercised development builds; final packaged-executable E2E was performed locally on Windows. This does not verify signed installers, notarization or every OS/hardware version.
- Windows application folder: `release/v0.3.0/win-unpacked/OpenScratch.exe`.
- Unsigned Windows x64 NSIS installer: `release/v0.3.0/OpenScratch Setup 0.3.0.exe` (127857023 bytes). SHA256: `C06340442CCE08EE09ED496D53C7A6E506F9B86D727B86498DC88103FCE2E8A4`.

Python and C# require separately installed runtimes. Their editor support is basic syntax highlighting, without semantic language servers or integrated package managers. C# uses explicit console output rather than Auto Log. Monaco's built-in menus remain English; OpenScratch controls and native menus support English and Spanish. Compiler diagnostics and user output are preserved in their original language. Website documentation is English. No installer wizard, macOS/Linux application or signing check was performed locally, and no release was uploaded.

---

# Verification record — 2026-10-03 / OpenScratch 0.2

Host: Windows x64. Python tested through `py -3`: 3.14.7. Same Node/Electron toolchain as the 0.1 record below.

- Strict TypeScript, ESLint and production build: pass.
- Vitest: **36 passing tests**. Includes all ten learning examples in their actual engines, Python AST single evaluation/top-level await/imports, cyclic inspection without repr/properties, syntax/runtime source lines, missing-interpreter guidance, flooding, Stop/recovery, replacement and legacy state defaults.
- Playwright: **5 passing desktop scenarios**, both development build and final packaged Windows executable (29.6 seconds for the final packaged run).
- New desktop coverage: offline Spanish help/intent search, safe example tab with original code preserved and Auto Run off, Python selector/runtime/disabled formatter, execution, Stop after a loop actually starts, full application restart with Python tab restored, and rejection of arbitrary reference URLs.
- Previous Node/Browser/npm/React/type completion and stale-result checks continue to pass.
- `pnpm install --frozen-lockfile --offline`: pass.
- Screenshots of the learning dialog and Python editor inspected visually.
- Windows folder: `release/v0.2.0/win-unpacked/OpenScratch.exe`.
- Unsigned Windows x64 NSIS installer: `release/v0.2.0/OpenScratch Setup 0.2.0.exe` (127836606 bytes). SHA256: `02AABC131DFE90BA41AB2A33DAE8FCCA06667940C95D3E516F09473491393826`.
- Source uploaded to the user-designated repository METAWISER/open-scratch, branch main. GitHub CI was queued at handoff; only local results are claimed here.

An initial packaging attempt overlapped a production build and omitted the UI entry file. It was discarded and rebuilt after the build completed; the regenerated package passed the complete desktop suite. The documented `pnpm package` script builds sequentially before packaging.

Python 3.10 is the stated minimum target, but only 3.14.7 was executed on this host. No Linux/macOS runtime or installer checks were performed locally. CI is configured for those systems; configuration is not evidence of successful runs. Python has no language server, integrated formatter/pip manager or memory cap. Additional languages and semantic documentation lookup remain unimplemented. No system installation or release upload performed.

---

# Verification record — 2026-10-02

Host: Windows x64, OS build 10.0.26200. Tooling Node 24.19.0, pnpm 11.19.0, Electron 44.5.1 (embedded Node 24.21.0), TypeScript 5.9.3, Vite 7.3.6, Monaco 0.55.1, Vitest 4.1.11, Playwright 1.63.0. Exact resolutions are in pnpm-lock.yaml.

## Checks performed

- Strict TypeScript typecheck and ESLint pass.
- Vitest: **26 passing tests**, including real disposable Node processes and compiler/serializer/store/AI tests.
- Playwright: **4 passing desktop scenarios on the packaged Windows executable**, not just the development renderer.
- Production Electron/Vite build passes.
- `pnpm install --frozen-lockfile --offline` passes from the populated dependency cache without changing resolutions.
- `scripts/licenses.mjs` records **586 package notices**, including npm's bundled dependencies.
- Windows application folder and NSIS installer generated locally. No repository push, release upload or publishing performed.

Core tests cover Auto Log evaluation/order, TypeScript interfaces/generics, running through type errors, top-level await, native ESM and require, original Node exception/console lines, cyclic/rich values without getters, depth/output/snapshot limits, rejected promises, infinite-loop Stop/recovery, concurrent/latest-run filtering, ordinary spawned-child/timer cleanup, persistence/corrupt-file preservation, validated runtime messages, AI streaming/cancellation/context exclusion/proposal acceptance and inherited-secret exclusion.

Desktop tests exercise actual Monaco input and diagnostics, Run/Stop, snippet persistence across a full restart, Browser DOM, absence of window.openscratch and require in Browser, source-mapped Browser console rows, Stop after a Browser loop starts, npm install/import/autocompletion/uninstall, scoped @types installation, React TSX rendering, stale-result suppression with Auto Run and execution with Electron networking disabled. They use disposable userData directories, not the user's workspace data.

Packaged testing drove fixes for native esbuild paths inside ASAR and npm's nested dependency tree being omitted by generic file collection. The final package uses the unpacked native compiler and a complete npm tree copied by scripts/after-pack.mjs.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
pnpm run licenses
pnpm package:dir
```

Test the actual Windows package:

```powershell
$env:OPENSCRATCH_TEST_EXECUTABLE = (Resolve-Path 'release/win-unpacked/OpenScratch.exe').Path
pnpm exec playwright test
Remove-Item Env:OPENSCRATCH_TEST_EXECUTABLE
```

Build a host installer with `pnpm package`. To wrap precisely the already tested Windows folder: `pnpm exec electron-builder --prepackaged release/win-unpacked --win nsis --publish never`.

## Limits of this evidence

No macOS/Linux execution, native packaging, signing or notarization was performed on this Windows host. Their configurations and CI matrix are included but unverified here. The Windows installer is unsigned; its NSIS wizard was not installed into the user's operating system. The application executable inside its distribution was tested directly. Offline testing used Electron network emulation and local execution, not physical disconnection. Native file dialogs, every visual preference, arbitrary npm/native addons and every advanced marker form are not exhaustively covered.

Build output includes benign upstream Rollup annotation warnings from Zod. Packaging reports omitted optional binaries for other architectures; the host compiler was exercised successfully. See the [feature matrix](parity.md) for missing functionality and narrower semantics; no complete parity claim is made.

## Final Windows artifact

- `release/OpenScratch Setup 0.1.0.exe`: 127,824,804 bytes.
- Authenticode status: `NotSigned`.
- SHA-256: `7A11AF4E5EA99397F1D4AE2E7E1E9ECB7FC2F837CC3A0693DA5F3CCD09D70858`.
- Packaged executable: `release/win-unpacked/OpenScratch.exe`.
- No OpenScratch process remained after the acceptance run.
