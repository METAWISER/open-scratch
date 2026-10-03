# Language support

Choose a language in the status bar. OpenScratch supports JavaScript, TypeScript, JSX, TSX, Python, and C#. Each tab stores its language, compatible runtime, working directory, and explicitly configured environment variables.

| Language                | Runtime            | Installation                                        | Editor capabilities                             |
| ----------------------- | ------------------ | --------------------------------------------------- | ----------------------------------------------- |
| JavaScript / TypeScript | Node.js or Browser | Included                                            | Completion, hover, type diagnostics, formatting |
| JSX / TSX               | Node.js or Browser | Included; install React packages for React previews | TypeScript language service                     |
| Python                  | Python process     | Python 3.10+                                        | Syntax highlighting and text editing            |
| C#                      | .NET process       | .NET SDK 8+                                         | Syntax highlighting and text editing            |

Go and Rust are not implemented. Python and C# do not yet have a language server, semantic completion, an integrated formatter, or package manager. Runtime/compiler errors remain visible in the output. Application language does not translate user code, compiler diagnostics, or package logs.

## Python

Select Python. Windows uses `py -3`; macOS and Linux use `python3`. Tab settings accepts an executable path, including a virtual environment such as `.venv/Scripts/python.exe` or `.venv/bin/python`. Do not include arguments or quotes around the path. Missing interpreters produce an actionable error; nothing is downloaded automatically.

Imports use the working directory and selected interpreter's dependencies. Prepare pip environments outside the app; npm packages only apply to JS/TS.

Auto Log instruments top-level expressions with Python's `ast` module. It preserves original lines and docstrings, evaluates expressions once, and omits None results. Top-level await uses `PyCF_ALLOW_TOP_LEVEL_AWAIT` and asyncio; pending tasks are cancelled when that event loop ends. Each Run uses a new namespace. Interactive `input()` is not supported because stdin delivers the snippet.

print, stdout/stderr, and exceptions are captured. Built-in containers expand with cycle detection and depth/volume limits. Custom objects remain opaque: inspection does not invoke properties or custom repr methods. Native output may lack a source line. Python does not support logpoints or magic comments.

## C#

Select C#. The app locates `dotnet` on PATH, or uses the executable path in Tab settings. Install the **SDK**, not just the runtime. OpenScratch generates a temporary console project for the installed SDK's major framework, compiles it without package sources, then runs the resulting DLL in a dedicated process. A normal SDK installation includes the framework reference packs needed for offline compilation.

Use top-level C# statements and `Console.WriteLine` for output. `await`, classes, and standard-library APIs such as LINQ work. Auto Log is disabled for C#: arbitrary expression statements such as `1 + 2;` are not automatically rewritten. There is no NuGet manager or support for script-only `#r` directives. Dependencies cannot be added through npm.

Compilation errors retain original snippet line numbers using a line directive; runtime stack frames include original lines when the SDK emits debug symbols. Output is text, not an expandable CLR object inspector. Both build and execution are cancellable. Compilation time counts toward the configured lifetime, so increase it if the SDK is slow on first use.

## Execution boundaries

All three native runtimes run with your user permissions, not in a hostile-code sandbox. Stop terminates the active process tree; deliberately detached children are outside that guarantee. Timeout and output limits apply. The Node heap setting does **not** limit Python or C# memory. The .NET runner opts out of CLI telemetry and uses no package sources. Explicit snippets can still access the network or filesystem.

## Adding another engine

Implement `src/runtime/engine.ts`, compose the engine in main, and extend the language/runtime schemas and selectors. Use structured process arguments, validated RunEvent messages, cancellation, runId filtering, and bounded output. Test replacement, errors, flooding, and stopping an active loop. State what the editor supports; do not imply all languages have identical features.

Version 1 persisted state defaults missing executable fields to empty strings and missing interface locale to English. Older app versions cannot open workspaces containing newly introduced languages.
