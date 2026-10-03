# C# playground

OpenScratch compiles and executes C# locally with the **.NET SDK 8 or newer**. The SDK is installed separately; a runtime-only installation is not enough.

## Select the engine

Choose **C#** in the language selector. Runtime switches to .NET automatically. Open Tab settings if dotnet is not on PATH and enter its absolute executable path.

```cs
string[] names = ["Ada", "Grace"];
foreach (var name in names)
{
    Console.WriteLine($"Hello, {name}");
}
```

## Query a collection

```cs
int[] numbers = [1, 2, 3, 4];
var total = numbers
    .Where(number => number % 2 == 0)
    .Select(number => number * 2)
    .Sum();
Console.WriteLine(total); // 12
```

System and System.Linq are included through implicit usings. Classes and top-level await are supported. Use Console.WriteLine to display results; C# Auto Log is not implemented.

## What happens on Run

The app creates a temporary console project, compiles against the installed SDK's matching framework, and runs the DLL in a separate process. NuGet sources are cleared for this generated project, so normal snippets can compile offline with an intact SDK installation. Compiler diagnostics and runtime stack traces preserve snippet line numbers.

Stop cancels compilation or execution and terminates the active process tree. Generated files are removed after completion. The configured timeout includes compilation time.

## Current limits

There is no integrated NuGet manager, semantic language server, formatter, expandable CLR object inspector, or C# memory cap. Script-only #r directives are not supported. C# snippets can access the filesystem and network with your permissions; process isolation is for stability.
