# Editor and workspace

The editor and results panel share a resizable split. Drag the separator or focus it and use the arrow keys. Each tab has its own code, language, runtime, working directory, and environment configuration.

The left sidebar contains Run, Stop, Clear, Learn, Snippets, npm packages, and Preferences. Hover over an icon for its label. Preferences contains Auto Run, Auto Log, tab settings, documentation, contribution links, and access to the command palette. Formatting and saving snippets are available from the editor context menu or keyboard shortcuts.

## Appearance

OpenScratch uses a violet, coral and mint identity with rounded outline icons. The code-and-spark mark is shared by the desktop app, application icon and documentation website. Run has a softly colored background; Learn, Snippets and Packages have distinct accent colors and retain text tooltips and accessible labels.

Choose **Preferences → Theme** for dark or light mode. Both include matching Monaco editor colors and readable result colors. The website has an independent theme button in its header. Interface transitions respect the operating system's reduced-motion preference. No online fonts or icon services are required.

## Editing

Monaco provides line numbers, selection, undo/redo, and search. JavaScript and TypeScript also have completion, hover, diagnostics, and Prettier formatting. Python and C# currently offer text editing and syntax highlighting.

Right-click the editor (or press Shift F10) for Format, Save snippet, Find, and Select all. The context menu follows the interface language. Formatting remains available only for JS/TS/JSX/TSX. Change All Occurrences is not included in this simplified menu; editor keyboard shortcuts remain available.

TypeScript type errors are reported separately from execution errors. A type error does not automatically block code that can be transpiled. C# must compile successfully before it can execute.

## Tabs and snippets

Use the plus button to choose JavaScript, TypeScript, JSX, TSX, Python, or C# before creating a blank tab. JSX/TSX start with Browser; other languages use Node, Python, or .NET as appropriate. The status-bar language selector remains available. **Tab settings** lets you rename, duplicate, import, and export files. Supported file extensions are .js, .ts, .jsx, .tsx, .py, and .cs.

**Save snippet** (or Ctrl/Cmd S) saves selected text, or the whole tab if the selection is empty. Selected fragments become separate library entries. Whole-tab snapshots update the existing entry for that tab. New snippets exclude runtime paths and environment variables.

Open **Snippets** to create, search, rename, describe, edit, duplicate or delete reusable code. **Insert at cursor** replaces the current selection and supports undo; **Open** creates a new tab. Completion suggests saved snippets for the exact current language by name and includes their descriptions. Snippet bodies are literal code, not placeholder templates.

**Export library** writes a versioned OpenScratch JSON file with names, descriptions, languages and code only. **Import library** validates that format and adds entries with new IDs; it never executes imported code. Limits are 8 MB per transfer and 1000 library entries. This format is not claimed to be compatible with RunJS exports. Code can itself contain secrets, so review it before sharing.

Code, tabs, snippets, and preferences autosave locally.

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

## Editor and output preferences

Expand **Preferences → Editor and output** to configure line numbers, ligatures, bracket closing, whitespace, active-line highlighting, automatic suggestions, type diagnostics, hover and parameter help. Turning diagnostics off does not change whether code can execute. Manual completion remains available.

**Show undefined results** filters undefined expression results from the display while preserving explicit console messages. Use **Expand all / Collapse all** above results for the currently displayed snapshots. Hover a result to highlight its original source line; click the source number to navigate.

## Interface language

Choose **Preferences → Interface language → English / Español**. The preference persists across restarts and updates application controls, learning cards, and native menus immediately. It does not translate your code, compiler messages, or external references. Monaco's own command menus currently remain in English.

## Environment variables

Configure KEY=value entries in Tab settings. Node, Python, and C# receive these explicit variables. They are encrypted when OS secure storage is available; otherwise they are session-only. They are never automatically included in AI context, but your code can print them. Browser preview does not receive them.
