const markdown = import.meta.glob("../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
import contributing from "../CONTRIBUTING.md?raw";
import ai from "../docs/ai-provider.md?raw";
export const pages = [
  {
    id: "start",
    title: "Getting started",
    group: "Start here",
    source: "docs/guide/getting-started.md",
  },
  {
    id: "editor",
    title: "Editor & workspace",
    group: "Start here",
    source: "docs/guide/editor.md",
  },
  {
    id: "execution",
    title: "Execution & results",
    group: "Using OpenScratch",
    source: "docs/guide/execution.md",
  },
  {
    id: "learn",
    title: "Learn with examples",
    group: "Using OpenScratch",
    source: "docs/learning.md",
  },
  {
    id: "browser",
    title: "Browser & npm packages",
    group: "Using OpenScratch",
    source: "docs/guide/browser-packages.md",
  },
  {
    id: "languages",
    title: "Language support",
    group: "Languages",
    source: "docs/languages.md",
  },
  {
    id: "python",
    title: "Python",
    group: "Languages",
    source: "docs/guide/python.md",
  },
  {
    id: "csharp",
    title: "C# / .NET",
    group: "Languages",
    source: "docs/guide/csharp.md",
  },
  {
    id: "security",
    title: "Security model",
    group: "Project",
    source: "docs/security.md",
  },
  {
    id: "ai",
    title: "AI generation & providers",
    group: "Project",
    source: "docs/ai-provider.md",
  },
  {
    id: "parity",
    title: "Features & limitations",
    group: "Project",
    source: "docs/parity.md",
  },
  {
    id: "contribute",
    title: "Contributing",
    group: "Project",
    source: "CONTRIBUTING.md",
  },
].map((page) => ({
  ...page,
  body:
    page.id === "contribute"
      ? contributing
      : page.id === "ai"
        ? ai
        : markdown["../" + page.source],
}));
