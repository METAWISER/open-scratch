# RunJS functional audit

Reviewed 2026-10-03 against public documentation, the product page and the public changelog. Baseline: OpenScratch 0.4 source. This is a documented-capability comparison, not a binary compatibility test or an inspection of proprietary source. Documentation snapshots can differ from release behavior.

## Immediate implementation batch

1. Reusable snippets: save the selection, edit descriptions and bodies, insert at the cursor, offer completion, import/export an explicitly versioned OpenScratch JSON format.
2. Editor and output controls: persisted editor preferences, hide undefined expression results, expand/collapse snapshots and highlight source lines on hover.
3. Browser stylesheets: local CSS imports, including bundled imports and local assets, without exposing the application bridge.

The narrow sidebar stays unchanged. New configuration belongs in Preferences and existing tools.

This first batch is implemented in 0.5. Automated checks cover the workflows and isolation; see [verification](verification.md) for the tested artifacts. The table below records the 0.4 baseline so completed items remain traceable.

## Gaps and priorities

| Area / reference | Baseline gap | Priority / disposition |
| --- | --- | --- |
| [Snippets](https://runjs.app/docs/features/snippets) | Library stores tab snapshots; lacks selection capture, descriptions, cursor insertion, completion and JSON transfer | P0, current batch |
| [Output](https://runjs.app/docs/features/output) | No hover-to-source highlight or expand/collapse-all; copying objects exposes snapshot protocol; no Explain Result | P0 for inspection; AI explanation later |
| [Web view](https://runjs.app/docs/features/web-view) | CSS imports, visibility toggle and draggable console/preview tiles absent | P0 CSS, P1 layout |
| [Editor settings](https://runjs.app/docs/settings/editor) | Most Monaco options fixed; no Vim bindings | P0 configurable options; P2 Vim |
| [General settings](https://runjs.app/docs/settings/general) | No default language/runtime or confirm-close preference | P1; keep explicit new-tab chooser |
| [Environment variables](https://runjs.app/docs/features/environment-variables) | Only per-tab variables; no workspace-wide inheritance | P1; needs encrypted storage and explicit override rules |
| [Running code](https://runjs.app/docs/features/running-code) | No combined Browser + Node realm; relative dynamic imports have generated-module semantics | P1 runtime project; separate execution application required |
| [NPM packages](https://runjs.app/docs/features/npm-packages) and [NPM settings](https://runjs.app/docs/settings/npm) | No debounced search, registry/proxy/auth editor, automatic type acquisition or dedicated update controls | P1; credentials must remain outside executed code and logs |
| [Formatting](https://runjs.app/docs/settings/formatting) | No format-on-run; only a subset of Prettier options exposed | P1; formatting must not cause Auto Run loops |
| [Appearance](https://runjs.app/docs/settings/appearance) and [interface](https://runjs.app/docs/introduction/user-interface) | No vertical editor/output layout, system font selector, theme catalog, bar visibility switches, automatic tab titles or tab rename context menu | P1 layout; P2 visual customization |
| [Shortcuts](https://runjs.app/docs/features/shortcuts) | Missing tab cycling/jump, open/save-as, settings and package shortcuts; Save intentionally saves a snippet | P1; document differences rather than claiming identical bindings |
| [Advanced settings](https://runjs.app/docs/settings/advanced) | No undefined filter, per-loop iteration guard or automatic updater | P0 filter; P1 optional AST loop budget; P2 signed update infrastructure |
| [Logpoints](https://runjs.app/docs/features/logpoints) / [magic comments](https://runjs.app/docs/features/magic-comments) | Intermediate chains, callback arguments and some control-flow forms have documented limits | P1 targeted AST tests; preserve evaluation count and this binding |
| [AI chat](https://runjs.app/docs/features/ai-chat) / [AI settings](https://runjs.app/docs/settings/ai) | Contracts only; no usable chat, provider transports, model discovery or diff UI | Separate phase as originally requested; opt-in context, cancellation and accepted diffs required |
| [Changelog](https://github.com/lukehaas/RunJS/blob/master/CHANGELOG.md) | Release history covers many behavioral fixes that require separate regression evaluation | Ongoing; do not infer exhaustive compatibility |

## Existing foundations and deliberate differences

The [release history](https://github.com/lukehaas/RunJS/blob/master/CHANGELOG.md) also identifies candidates for a follow-up audit: snippet cursor placeholders, drag-and-drop file opening, file binding and unsaved-change prompts, synchronized scrolling, clickable output URLs, transpiled-code viewing, console.assert/console.clear semantics and automatic .env loading. These historical entries need current-version behavior checks before claiming parity requirements. Environment-file loading should be explicit in OpenScratch. RunJS mentions inspection of some getters; OpenScratch deliberately never invokes getters, as required by its inspection contract.

OpenScratch already has JS/TS/JSX/TSX, Node and Browser execution, asynchronous code, source locations, npm dependencies/types, snapshots, cancellable processes, persistence and AST logging. It additionally provides Python and C#, bilingual application controls and offline learning cards. Core execution has no account, commercial quota or required AI provider. TypeScript remains free.

The guides for [Canvas](https://runjs.app/docs/guides/canvas), [HTTP](https://runjs.app/docs/guides/http-requests), [databases](https://runjs.app/docs/guides/database-queries), [servers](https://runjs.app/docs/guides/server), [React](https://runjs.app/docs/guides/react), [P5](https://runjs.app/docs/guides/p5), [Three.js](https://runjs.app/docs/guides/three-js) and [Web Audio](https://runjs.app/docs/guides/web-audio) describe use cases built on runtimes and packages, not standalone editors we should pretend to implement. OpenScratch supports the underlying Node or Browser APIs; each library, native addon, permission and audio device still requires its own check. Dedicated HTML/CSS source editors are not established as a RunJS requirement by the reviewed web-view documentation.

No RunJS source, artwork or brand resources are copied. Subscription, license activation and cloud dependencies are deliberately excluded. See parity.md for implementation status and verification.md for actual checks.
