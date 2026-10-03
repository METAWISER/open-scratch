import { useTranslation } from "./i18n";
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
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  return (
    <>
      <input
        autoFocus
        aria-label={t("Search snippets")}
        placeholder={t("Search snippets…")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="muted">
        {t(
          "Ctrl / ⌘ S saves a snapshot. Rename here, or open a copy to edit its code.",
        )}
      </p>
      {snippets
        .filter((t) =>
          `${t.name} ${t.code}`.toLowerCase().includes(query.toLowerCase()),
        )
        .map((tab) => (
          <div className="list-row snippet-row" key={tab.id}>
            <input
              aria-label={`${t("Rename")} ${tab.name}`}
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
            <button onClick={() => onOpen(tab)}>{t("Open")}</button>
            <button
              onClick={() =>
                onChange([
                  ...snippets,
                  {
                    ...tab,
                    id: crypto.randomUUID(),
                    name: `${tab.name} ${t("copy")}`,
                  },
                ])
              }
            >
              {t("Duplicate")}
            </button>
            <button
              onClick={() => onChange(snippets.filter((t) => t.id !== tab.id))}
            >
              {t("Delete")}
            </button>
          </div>
        ))}
    </>
  );
}
