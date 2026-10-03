# Execution and results

Click **Run** to execute the active tab. Every execution has a runId. A replacement run stops the previous context and ignores stale results. **Auto Run** repeats this after a configurable typing delay.

## Node.js

JS/TS executes in a dedicated Node process, not in the editor or Electron main process. TypeScript is transpiled locally. Top-level await, native Node modules, installed packages, and documented ESM/CommonJS imports work.

```ts
import { basename } from "node:path";
interface Box<T> {
  value: T;
}
const box: Box<number> = { value: await Promise.resolve(3) };
box.value;
require("node:path").basename("/hello/world");
basename("/hello/world");
```

## Auto Log

JS/TS uses AST instrumentation to capture top-level expression values once. Python has its own AST implementation. C# requires explicit Console.WriteLine and disables Auto Log.

```js
const values = [10, 20, 30];
values.reduce((sum, value) => sum + value, 0);
```

## Inspect values

Expand object and collection snapshots. JavaScript inspection supports circular references, Map, Set, Date, Error, BigInt, and undefined without invoking getters. Python supports exact builtin containers; custom instances remain opaque. C# output is textual.

Click a source line to jump to it, or copy a snapshot. Console methods include log, info, warn, error, debug, and table. Table data currently uses the object inspector instead of a grid.

## Limits and cancellation

Timeout, output count, inspection depth, and entry limits are configurable. Transport volume has a hard technical bound. Node's heap limit does not apply to Python, C#, or Browser preview. A lifetime of 0 disables the timeout; Stop remains available.

Native runtimes have your user permissions. This is not a sandbox for hostile code. Read the [security model](../security.md) before running unfamiliar snippets.
