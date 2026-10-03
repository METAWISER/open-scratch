# OpenScratch parity matrix

Baseline reference review 2026-10-02; expanded audit 2026-10-03 in [runjs-audit.md](runjs-audit.md): [RunJS overview](https://runjs.app/docs/), [execution](https://runjs.app/docs/features/running-code), [web view](https://runjs.app/docs/features/web-view), [packages](https://runjs.app/docs/features/npm-packages), [logpoints](https://runjs.app/docs/features/logpoints), [magic comments](https://runjs.app/docs/features/magic-comments).

Original MIT implementation and visual identity. **Not complete RunJS parity.** Implemented means the explicit behavior below, not every edge case of the reference. Windows x64 is the local test host. CI for 0.4 passed Windows/Linux/macOS checks; see verification.md for version-specific evidence.

| Reference feature | Expected / implemented behavior | State | Evidence / limitation |
|---|---|---|---|
| Split desktop editor | Monaco left, results right; mouse/keyboard resizing | Implemented | Electron E2E and inspected screenshot |
| Languages | Per-tab JS, TS, JSX, TSX | Implemented | TS generics integration; React TSX E2E |
| Language service | Suggestions, hover, diagnostics, line numbers, find | Implemented | Nonblocking type error and actual npm completion E2E; built-in Node types included |
| Formatting | Local Prettier; quotes, semicolons, tab width | Implemented | Typed IPC + UI/shortcut and context-menu formatting E2E |
| Appearance | Dark/light, font size, wrapping | Implemented | Dark screenshot inspected; light not visually regression-tested |
| Run / Stop | Dedicated Node process, stop infinite loop, run again | Implemented | Real process tests and ordinary child/timer cleanup test |
| Auto Run | Debounce, previous context cancellation, runId filtering | Implemented | Concurrent/replacement integration and desktop delayed-result test |
| Type errors | Diagnostics independent of transpilation/execution | Implemented | TypeScript runtime and Monaco E2E |
| Async | Top-level await, exceptions, rejected promises | Implemented | Runtime tests |
| ESM / CommonJS | Native imports/require, installed packages, cwd | Implemented with limits | Built-in module tests; installed package E2E. Static relative imports bundled from cwd; nonliteral dynamic relative imports/import.meta.url refer to generated module. Use import for ESM-only packages; native addons need Electron-compatible ABI |
| Source locations | Node source maps; mapped Browser result rows | Implemented | Original Node exception/console line tests and Browser console line assertion. Browser stack text itself remains generated |
| Auto Log | AST selection, single evaluation, original return value | Implemented | Mutation and evaluation-order tests; strict/asm directives preserved |
| Console | log/info/warn/error/debug/table | Implemented with difference | Bounded snapshots. table uses expandable inspector rather than a grid |
| Inspector | Objects, arrays, Map, Set, Date, Error, BigInt, undefined, cycles | Implemented | Descriptor/no-getter, depth/size/cycle tests; copy snapshots and source navigation. Not live handles; proxy traps can run inside disposable runtime |
| Flood protection | Configurable count/depth/properties/lifetime/Node heap | Implemented | 100,000-log test. Additional fixed transport caps: 180 KB snapshot, 4 MB/run. No Browser heap cap |
| Tabs | Independent source/runtime/env, create/rename/duplicate/close | Implemented | Active-tab persistence E2E; URI-separated editor models |
| Snippets | Selection/full-tab save, descriptions/body editing, cursor insertion, completion, JSON import/export, rename/duplicate/delete/search | Implemented | Versioned OpenScratch transfer excludes env/paths. No folders, cloud sync or claimed RunJS JSON compatibility |
| Files | Native dialogs for JS/TS/JSX/TSX import/export | Implemented | Validated handlers; native dialogs not automated |
| Settings | Version 1; atomic writes; encrypted variables; preserve corrupt files | Implemented | Store round-trip/corrupt-file tests; additive preference fields receive tested legacy defaults. Future incompatible versions require migrations |
| Environment | Per-tab cwd and explicit Node env variables | Implemented | Environment allowlist test. No workspace-wide env inheritance UI |
| npm workspace | Search/list/exact-version install/update/remove/scoped names | Implemented | Live picocolors install/import/completion/remove and scoped @types installs in packaged E2E. Registry search and arbitrary version updates are not separately tested |
| npm scripts | Disabled by default, explicit operation opt-in | Implemented | Structured spawn arguments. Enabled scripts may need system Node/native toolchain |
| npm types | Included declarations and installed @types, immediate refresh | Implemented | Real package completion E2E; bounded 8 MB/1500-file graph; no automatic @types download |
| Browser | Isolated WebContentsView/session, DOM/Canvas/style/root | Implemented | DOM, bridge absence, running infinite-loop stop/recovery E2E |
| JSX / TSX preview | Local bundling of installed React | Implemented | Actual react/react-dom TSX render and preview capture |
| Web tiles | Console and preview simultaneously | Partial | Vertical split; no tile reordering or separate HTML/CSS editors. Browser CSS imports implemented, including nested imports and embedded local image/font assets |
| Browser + Node | DOM and Node in the same realm | Not implemented | Design/security implications in security.md. Not exposed as a selector or replaced with DOM emulation |
| Logpoints | Gutter/F9, clear all, session-only; nested expressions/declarations/returns/arrow bodies | Partial parity | AST tests. Not every intermediate chain segment/callback argument can be selected by line; multi-expression lines may log multiple values |
| Magic comments | `//?`, `/*?*/`, `$` transforms, if/while conditions, for-in/of iterations | Partial parity | AST syntax/transform/loop tests. Method-reference markers before calls rejected to preserve this; not all classic-for/control-flow forms supported |
| AI | Provider/configuration/transport/credentials contracts, streaming, cancellation, acceptance | Extension ready | Injection/context/cancellation/proposal tests. No live adapters/chat/diff viewer; no code transmission or auto-execution |
| Offline/no account | Core and existing packages work locally | Implemented | Electron network-emulation offline test; no account, AI or telemetry requirement |
| Distribution | Installers, MIT, notices, scripts, CI | See verification record | Exact host package evidence in verification.md. See historical CI evidence; signing/notarization not verified |

## Instrumentation

TypeScript AST nodes select expressions. MagicString inserts a value-returning hook and emits a source map which esbuild composes. The hook returns its original argument; a marker transform only changes the logged representation. Inspection reads descriptors, not getters; exception stack collection is a separate diagnostic operation.

## Combined runtime

The documented RunJS environment combines DOM and Node globals. A compatible implementation needs a separate execution application/process with a sanitized environment, its own Electron renderer, no app IPC handlers, and verified lifecycle/permissions. Enabling Node integration in the existing preview removes its sandbox. DOM emulation does not reproduce layout/Canvas/WebGL. The current release exposes the two tested runtimes and leaves combined mode unfinished.

## OpenScratch 0.2 extensions (not RunJS parity claims)

| Feature | Status | Verification / limits |
| --- | --- | --- |
| Python 3.10+ | Implemented local process | AST Auto Log, await, original lines, circular containers, bounded output, Stop/replacement integration tests. External interpreter required; no Python heap cap |
| Python editor | Basic | Monaco highlighting and text editing; no LSP, type diagnostics, formatting, logpoints or pip UI |
| Learning catalog | Implemented | Thirteen offline bilingual cards, intent search, language filter, original examples, explicit reference links; all examples executed in tests |
| Contextual help | Lexical | Word under cursor via Look up/command; not semantic symbol resolution |
| Example tabs | Implemented | New tab preserves original; Auto Run disabled before example opens |
| Open-source collaboration | Prepared | MIT, contribution guide, issue/PR templates, code of conduct, security policy, Contribute link; no permissions automatically granted |
| Additional languages | Not implemented | Go/Rust remain future work; ExecutionEngine contract established |

## OpenScratch 0.3 extensions

| Feature | Status | Verification / limits |
| --- | --- | --- |
| English and Spanish UI | Implemented | Persisted setting, application/native menus and learning explanations; user/runtime output and Monaco internal commands are not translated |
| English project documentation | Implemented | Guides, community files, issue/PR templates and website content |
| C# / .NET | Implemented | SDK 8+ external dependency, temporary offline project, top-level statements/await, compiler/runtime lines, output bounds and cancellable build/run |
| C# editor and inspection | Basic | Syntax highlighting and text output; no language server, Auto Log, CLR object inspector, NuGet UI or memory cap |
| Clickable learning examples | Implemented | Title/code/button creates a separate tab with Auto Run off; Copy remains independent |
| Documentation website | Implemented | Responsive English guides, search, copy, theme, navigation, static hosting workflow |

## Desktop workflow update (0.4)

- Compact left sidebar with labeled controls; editor height is reserved for code and results.
- New-tab language picker supports all six editor languages; status-bar selection remains available.
- Localized custom context menu provides formatting and snippet snapshots, plus Find and Select all.
- Curated popular npm packages support direct installation through the existing package manager. This is not a live popularity ranking.

## 0.5 audit implementation

- Reusable snippet workflow and portable library transfer; exact-language completion.
- Ten persisted editor/output preferences, with defaults for legacy workspaces.
- Expand/collapse currently displayed objects and source-line hover highlight.
- Browser stylesheet imports served within the existing isolated execution context.
- Remaining work and priorities: [RunJS audit](runjs-audit.md). Combined runtime, shared environment UI, private npm registry configuration, layout customization and real AI chat remain unfinished.

## Visual identity update (0.5.1)

Original rounded SVG controls and a shared code-and-spark mark replace font-dependent toolbar symbols. Desktop, Monaco themes and documentation use coordinated violet/coral/mint accents, accessible labels, focus states and reduced-motion support. See [branding](branding.md) for assets and regeneration commands. No execution behavior or RunJS parity claim changes.
