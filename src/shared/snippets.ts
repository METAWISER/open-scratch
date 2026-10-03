import { z } from "zod";
import { languageSchema, newTab, type Tab } from "./contracts";
const portableSnippet = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  code: z.string().max(2_000_000),
  language: languageSchema,
});
const librarySchema = z.object({
  format: z.literal("openscratch-snippets"),
  version: z.literal(1),
  snippets: z.array(portableSnippet).max(1000),
});
export function exportLibrary(snippets: Tab[]): string {
  const data = librarySchema.parse({
    format: "openscratch-snippets",
    version: 1,
    snippets: snippets.map(({ name, description, code, language }) => ({
      name: name || "Untitled",
      description,
      code,
      language,
    })),
  });
  const text = JSON.stringify(data, null, 2);
  if (new TextEncoder().encode(text).length > 8_000_000)
    throw new Error("Snippet library exceeds 8 MB");
  return text;
}
export function importLibrary(text: string, id: () => string): Tab[] {
  if (new TextEncoder().encode(text).length > 8_000_000)
    throw new Error("Snippet library exceeds 8 MB");
  return librarySchema.parse(JSON.parse(text)).snippets.map((snippet) => ({
    ...newTab(id()),
    ...snippet,
    runtime:
      snippet.language === "py"
        ? "python"
        : snippet.language === "cs"
          ? "dotnet"
          : ["jsx", "tsx"].includes(snippet.language)
            ? "browser"
            : "node",
  }));
}
