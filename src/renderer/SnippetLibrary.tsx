import { useState } from "react";
import type { Tab } from "../shared/contracts";
export function SnippetLibrary({
  snippets,
  onOpen,
  onChange,
}: {
  snippets: Tab[];
  onOpen: (tab: Tab) => void;
  onChange: (snippets: Tab[]) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <>
      <input
        autoFocus
        aria-label="Search snippets"
        placeholder="Search snippets…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="muted">
        Ctrl / ⌘ S saves a snapshot. Rename here, or open a copy to edit its
        code.
      </p>
      {snippets
        .filter((t) =>
          `${t.name} ${t.code}`.toLowerCase().includes(query.toLowerCase()),
        )
        .map((tab) => (
          <div className="list-row snippet-row" key={tab.id}>
            <input
              aria-label={`Rename ${tab.name}`}
              value={tab.name}
              onChange={(e) =>
                onChange(
                  snippets.map((t) =>
                    t.id === tab.id ? { ...t, name: e.target.value } : t,
                  ),
                )
              }
            />
            <span className="muted">{tab.language.toUpperCase()}</span>
            <button onClick={() => onOpen(tab)}>Open</button>
            <button
              onClick={() =>
                onChange([
                  ...snippets,
                  { ...tab, id: crypto.randomUUID(), name: `${tab.name} copy` },
                ])
              }
            >
              Duplicate
            </button>
            <button
              onClick={() => onChange(snippets.filter((t) => t.id !== tab.id))}
            >
              Delete
            </button>
          </div>
        ))}
    </>
  );
}
