# Python playground

Select **Python** in the language selector. Install Python 3.10+ separately. Windows uses py -3; macOS and Linux use python3.

## Your first example

```py
prices = [10, 20, 30]
total = sum(prices)
total  # 60 with Auto Log
```

print output is also captured. Auto Log uses Python's AST to evaluate top-level expressions once and preserve source lines. None results are omitted.

## Asynchronous work

```py
import asyncio
await asyncio.sleep(0.1)
print('Ready')
```

Each execution starts fresh. Pending asyncio tasks are cancelled when the top-level event loop finishes. This is not a persistent notebook kernel.

## Virtual environments

Tab settings accepts a Python executable path, including .venv/Scripts/python.exe on Windows or .venv/bin/python on macOS/Linux. Imports use that interpreter's environment and the chosen working directory. Prepare packages with pip outside the app; npm only applies to JS/TS.

## Current limits

Monaco provides syntax highlighting and text editing but no Python language server or integrated formatter. Custom objects remain opaque in the inspector to avoid invoking arbitrary repr methods or properties. Builtin containers support expansion and cycle detection. Interactive input, logpoints, magic comments, and a Python memory cap are not implemented.

Use Stop to interrupt a loop. Scripts run with your user permissions, so only run code you trust.
