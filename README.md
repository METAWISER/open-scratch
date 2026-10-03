# OpenScratch

A free, local desktop playground for JavaScript, TypeScript, JSX, TSX, Python and C#. Original MIT implementation inspired by the interaction patterns documented by RunJS. No account, telemetry, subscription, cloud service or execution quotas. TypeScript is included.

## Develop and run

Prerequisites: Node **24 LTS**, pnpm **11.19.0**, a desktop graphical session, Python 3.10+ for Python execution/tests, and .NET SDK 8+ for C# execution/tests. The dependency lockfile is committed. Initial dependency/Electron downloads and registry operations need Internet; the installed app and already installed packages work offline.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` builds the Electron main/preload/runtime files and launches Vite + Electron. Renderer edits hot reload; restart dev after changing main/preload/runtime code.

```sh
pnpm check          # strict TypeScript, ESLint, Vitest, production build
pnpm test:e2e       # build and launch real Electron with Playwright
pnpm build
pnpm start         # run the production build
pnpm run licenses      # regenerate full third-party notices
pnpm package:dir   # unpacked desktop application
pnpm package       # installer for the host OS
```

On Windows, ensure `node --version` and pnpm's Node resolve to 24; older Node installations earlier in PATH can cause confusing install failures. Linux desktop tests require a graphical session, or `xvfb-run --auto-servernum pnpm test:e2e`. Build native installers on their target platform. Configured outputs: Windows NSIS, macOS DMG, Linux AppImage/deb. This does not imply all target systems have been tested.

## Use

Write code on the left and inspect snapshots on the right. Auto Log captures top-level expressions (`1 + 2` → `3`) without double evaluation. Expand object entries, copy a snapshot or click its source line. Console supports log/info/warn/error/debug/table; table data currently uses the same expandable inspector, not a tabular grid. Type errors are editor diagnostics and do not prevent execution.

Run: **Ctrl/Cmd R**. Stop: **Ctrl/Cmd Shift R**. Format: **Ctrl/Cmd Shift F**. Save snippet: **Ctrl/Cmd S**. Command palette: **Ctrl/Cmd Shift P**. Monaco includes search with Ctrl/Cmd F, hover, suggestions and inline diagnostics. Toggle logpoints using the gutter or F9; clear with Ctrl/Cmd Shift F9. Logpoints are session-only. Drag the separator or focus it and use arrow keys to resize panels.

Select language and runtime in the status bar. Set cwd, explicit runtime environment variables and a tab name in Tab settings. Import/export JS/TS/JSX/TSX/PY/CS there. Duplicate tabs and save independent snippet snapshots; search/open/delete saved snippets in the library. Workspace tabs, snippets and preferences autosave. Environment values are encrypted with OS secure storage when available; without it, they are session-only.

Auto Run has a configurable debounce and supersedes the previous process. Stop terminates the execution context, including infinite loops. Settings include theme, font, wrapping, format preferences, output limits and lifetime. Set lifetime to 0 for persistent preview/server work and stop it manually. Node scripts have user permissions: read [security notes](docs/security.md).

### Node

```ts
import { basename } from 'node:path';
interface Box<T> { value: T }
const box: Box<number> = { value: await Promise.resolve(3) };
box.value;
require('node:path').basename('/hello/world');
basename('/hello/world');
```

Static ESM imports and CommonJS require resolve installed packages in the separate dependency workspace. Relative static imports are bundled from tab cwd; require resolves cwd first, then the dependency workspace. Native Node modules work. ESM-only packages should be imported; `require` follows the embedded Node version's native behavior. Dynamic nonliteral relative ESM imports and import.meta.url reflect the generated module path, not a virtual file in cwd. See parity limitations.

### Python, C# and practical documentation

Select **PY** in Language. Install Python 3.10+ separately; OpenScratch uses `py -3` on Windows and `python3` elsewhere. In Tab settings you can select an interpreter or virtualenv executable. Python runs in a dedicated cancellable process with AST Auto Log, top-level await, bounded collection inspection and original error lines. Python has syntax highlighting but no language server, formatter or integrated pip manager yet. See [language support and limits](docs/languages.md).

Open **Learn** for thirteen offline English/Spanish reference cards with original runnable examples (reduce, forEach, map, filter, find, generics, Python loops, sum, comprehensions, dictionaries, and C# foreach/LINQ/await). **Look up** searches the word under the cursor. Search by intent, copy an example or open it in a new tab; opening an example disables Auto Run. References open explicitly in your browser. See [learning guide](docs/learning.md).

Choose **C#** to compile and run top-level C# code with an installed .NET SDK 8+. Set an explicit dotnet executable in Tab settings if needed. Use `Console.WriteLine` for output; C# Auto Log, semantic completion, formatting, and NuGet management are not implemented. Build and execution are cancellable and normal standard-library snippets compile offline.

Choose **Preferences → Interface language** for English or Spanish. The preference persists and updates application controls, native menus, and learning explanations. User code, compiler output, package logs, and Monaco's internal editor commands keep their own language.

### Packages and Browser

Open npm packages, enter a name (including `@scope/name`) and an exact version or semver range, then Install / update. Search queries the public registry. Installed packages are immediately available; installation creates package.json and package-lock.json under Electron's userData/dependencies, never in the product repository. Remove uninstalls; choose another version to update. npm install scripts are off unless explicitly enabled for that operation. Packages with included .d.ts files feed Monaco; install the matching @types package for libraries that lack declarations. Type loading is bounded to 8 MB / 1500 files; very large type graphs may be incomplete.

For React, install `react`, `react-dom`, `@types/react` and `@types/react-dom`, select Browser + TSX, then run:

```tsx
import { createRoot } from 'react-dom/client';
function App() { return <h1>Hello from OpenScratch</h1>; }
createRoot(document.getElementById('root')!).render(<App />);
```

Browser has a real DOM, Canvas, CSS via style elements and `#root`. Its isolated view appears below the console. Packages are bundled locally; Node-only module imports fail during compilation. Browser has no privileged application bridge. Combined Browser + Node is researched but deliberately not exposed in this release; see [design and implications](docs/security.md).

### Inspection markers

Documented RunJS syntax implemented here: trailing `//?`, inline `/*?*/`, and a transform with `$`, for example `items //? $.length`. Logpoints support expression statements, declaration initializers and returns inside functions/loops. More advanced control-flow comment forms are tracked in [parity](docs/parity.md); no complete compatibility claim is made.

## Architecture

- `src/renderer`: React UI, Monaco, editor state, snapshot inspector. No Node privileges.
- `src/main`: Electron composition, validated IPC, encrypted persistence, npm workspace, isolated preview.
- `src/compiler`: TypeScript AST selection, MagicString mapping and esbuild transpilation/bundling.
- `src/runtime`: disposable Node/Python/.NET processes, Browser capture, bounded serialization.
- `src/shared`: versioned state schema and bridge/event contracts.
- `src/ai`: optional provider/transport/credentials contracts and explicit context construction, streaming/cancellation and proposal acceptance. No chat or network provider is active. See [AI integration](docs/ai-provider.md).

Version 1 persistence rejects unknown versions and preserves invalid files instead of silently overwriting data. Future schema changes must add migrations. Older v1 state defaults the new Python executable field to an empty string; Python tabs require 0.2+. Dependencies and snippet execution are independent of AI.

## Distribution

Installers are unsigned development artifacts unless you configure signing. Windows distribution should use Authenticode signing with a trusted certificate; unsigned builds can trigger SmartScreen. Enable `build.win.signExecutable` and configure signing credentials to produce signed Windows binaries. macOS distribution requires Developer ID signing and Apple notarization for a normal Gatekeeper experience. Linux may use distribution/package signatures. Configure electron-builder credentials in your local/CI secret store; never commit keys. Packaging scripts explicitly use `--publish never`; CI checks and builds but never publishes releases.

Original code: [MIT](LICENSE). Retain [third-party notices](THIRD_PARTY_NOTICES.md) plus Electron/Chromium license files in distributions. No proprietary RunJS assets or source are included. See [CONTRIBUTING](CONTRIBUTING.md), [parity status](docs/parity.md) and [verification record](docs/verification.md) for scope and tested limitations.

## Community

[GitHub repository](https://github.com/METAWISER/open-scratch) · [Report a bug or propose a feature](https://github.com/METAWISER/open-scratch/issues/new/choose). Contributions use forks and pull requests; no invitation is needed. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Issue/PR templates, a code of conduct, security policy and cross-platform CI are included.

## Documentation website

The English documentation site lives in `website/` and renders the same Markdown guides maintained under `docs/`. It includes navigation, page search, light/dark themes, mobile navigation, code copying, and links to improve each guide.

```sh
pnpm docs:dev       # http://127.0.0.1:4174
pnpm docs:build     # static output in dist-docs/
pnpm test:docs      # browser checks against a local documentation server
```

The Pages workflow publishes documentation on changes to main; desktop installers are never uploaded by it. See [website maintenance](docs/website.md).
