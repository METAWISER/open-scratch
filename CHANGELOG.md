# Changelog

User-visible changes by source version. A version is publicly distributed only when it appears in [GitHub Releases](https://github.com/METAWISER/open-scratch/releases); the historical entries below do not imply published releases or signed installers.

## [Unreleased]

- Tag-driven GitHub Releases with curated notes, a tested Windows x64 installer and SHA256 checksum.
- Manual release-workflow dry run builds/tests without publishing.

## [0.6.0]

### Added

- Optional AI code generation with a user-configured Chat Completions endpoint, model and API key.
- Streaming, cancellation, optional current-code context, diff review and explicit acceptance with Auto Run disabled.
- Session-only credentials by default and opt-in OS-encrypted persistence.

### Fixed

- Restored Cut, Copy and Paste to the editor context menu, including undo support.
- Restored keyboard access to the custom menu with Shift F10.

### Limits

- Individual cloud models and a running Ollama service have not been verified; integration tests use a local protocol server.
- No multi-turn AI chat, autonomous code execution or native non-compatible provider protocols.

## [0.5.1]

- Original rounded SVG icons and a shared code-and-spark mark.
- Coordinated violet, coral and mint colors in desktop, Monaco and documentation themes.
- Improved light-theme result contrast and reduced-motion styling.

## [0.5.0]

- Reusable snippets with selection capture, descriptions, cursor insertion and completion.
- Versioned JSON library import/export excluding runtime paths and environment variables.
- Editor/output preferences, expand/collapse snapshots and source-line hover highlighting.
- Local Browser CSS imports with bundled assets.

## [0.4.0]

- Compact sidebar, new-tab language picker and custom editor menu.
- Curated popular npm package installation shortcuts.

## [0.3.0]

- C# execution using an installed .NET SDK.
- English/Spanish interface, English documentation website and runnable learning examples.

## [0.2.0]

- Python execution, offline learning cards and safe example tabs.
- Open-source contribution and community documentation.

## [0.1.0]

- Initial Electron playground with JS/TS/JSX/TSX, Node and Browser runtimes.
- AST logging, bounded inspection, npm packages, persistence and AI extension contracts.
