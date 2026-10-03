# Editor and workspace

The editor and results panel share a resizable split. Drag the separator or focus it and use the arrow keys. Each tab has its own code, language, runtime, working directory, and environment configuration.

The left sidebar contains Run, Stop, Clear, Learn, Snippets, npm packages, and Preferences. Hover over an icon for its label. Preferences contains Auto Run, Auto Log, tab settings, documentation, contribution links, and access to the command palette. Formatting and saving snippets are available from the editor context menu or keyboard shortcuts.

## Editing

Monaco provides line numbers, selection, undo/redo, and search. JavaScript and TypeScript also have completion, hover, diagnostics, and Prettier formatting. Python and C# currently offer text editing and syntax highlighting.

Right-click the editor (or press Shift F10) for Format, Save snippet, Find, and Select all. The context menu follows the interface language. Formatting remains available only for JS/TS/JSX/TSX. Change All Occurrences is not included in this simplified menu; editor keyboard shortcuts remain available.

TypeScript type errors are reported separately from execution errors. A type error does not automatically block code that can be transpiled. C# must compile successfully before it can execute.

## Tabs and snippets

Use the plus button to choose JavaScript, TypeScript, JSX, TSX, Python, or C# before creating a blank tab. JSX/TSX start with Browser; other languages use Node, Python, or .NET as appropriate. The status-bar language selector remains available. **Tab settings** lets you rename, duplicate, import, and export files. Supported file extensions are .js, .ts, .jsx, .tsx, .py, and .cs.

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
