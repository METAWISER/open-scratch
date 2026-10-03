# Editor and workspace

The editor and results panel share a resizable split. Drag the separator or focus it and use the arrow keys. Each tab has its own code, language, runtime, working directory, and environment configuration.

## Editing

Monaco provides line numbers, selection, undo/redo, and search. JavaScript and TypeScript also have completion, hover, diagnostics, and Prettier formatting. Python and C# currently offer text editing and syntax highlighting.

TypeScript type errors are reported separately from execution errors. A type error does not automatically block code that can be transpiled. C# must compile successfully before it can execute.

## Tabs and snippets

Use the plus button for a new tab. **Tab settings** lets you rename, duplicate, import, and export files. Supported file extensions are .js, .ts, .jsx, .tsx, .py, and .cs.

**Save snippet** stores a snapshot in the library. Open **Snippets** to search, rename, duplicate, delete, or open a saved copy. Code, tabs, snippets, and preferences autosave locally.

## Keyboard shortcuts

| Action                | Shortcut          |
| --------------------- | ----------------- |
| Run                   | Ctrl/Cmd R        |
| Stop                  | Ctrl/Cmd Shift R  |
| Format JS/TS          | Ctrl/Cmd Shift F  |
| Save snippet          | Ctrl/Cmd S        |
| Command palette       | Ctrl/Cmd Shift P  |
| Find in editor        | Ctrl/Cmd F        |
| Toggle JS/TS logpoint | F9                |
| Clear JS/TS logpoints | Ctrl/Cmd Shift F9 |

## Interface language

Choose **Preferences → Interface language → English / Español**. The preference persists across restarts and updates application controls, learning cards, and native menus immediately. It does not translate your code, compiler messages, or external references. Monaco's own command menus currently remain in English.

## Environment variables

Configure KEY=value entries in Tab settings. Node, Python, and C# receive these explicit variables. They are encrypted when OS secure storage is available; otherwise they are session-only. They are never automatically included in AI context, but your code can print them. Browser preview does not receive them.
