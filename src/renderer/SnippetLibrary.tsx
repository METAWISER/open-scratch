import { useTranslation } from "./i18n";
import { useState } from "react";
import { newTab, type Tab } from "../shared/contracts";
export function SnippetLibrary({
  snippets,
  language,
  onOpen,
  onInsert,
  onChange,
}: {
  snippets: Tab[];
  language: Tab["language"];
  onOpen: (tab: Tab) => void;
  onInsert: (tab: Tab) => void;
  onChange: (snippets: Tab[]) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const update = (id: string, patch: Partial<Tab>) =>
    onChange(snippets.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const importSnippets = async () => {
    try {
      const imported = await window.openscratch.importSnippets();
      if (!imported) return;
      if (snippets.length + imported.length > 1000)
        throw new Error(t("The library supports up to 1000 snippets."));
      onChange([...snippets, ...imported]);
      setError("");
    } catch (error) {
      setError(String(error));
    }
  };
  return (
    <>
      <input
        autoFocus
        aria-label={t("Search snippets")}
        placeholder={t("Search snippets…")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="actions">
        <button
          disabled={snippets.length >= 1000}
          onClick={() => {
            setQuery("");
            onChange([
              ...snippets,
              {
                ...newTab(crypto.randomUUID(), t("New snippet")),
                language,
                runtime:
                  language === "py"
                    ? "python"
                    : language === "cs"
                      ? "dotnet"
                      : ["jsx", "tsx"].includes(language)
                        ? "browser"
                        : "node",
              },
            ]);
          }}
        >
          {t("New snippet")}
        </button>
        <button onClick={() => void importSnippets()}>
          {t("Import library")}
        </button>
        <button
          onClick={() =>
            void window.openscratch
              .exportSnippets(snippets)
              .catch((error) => setError(String(error)))
          }
        >
          {t("Export library")}
        </button>
      </div>
      <p className="muted">
        {t(
          "Save selected code or the whole tab. Insert reusable code at the cursor or open a new tab. Exports contain code and descriptions, never environment variables.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {snippets
        .filter((s) =>
          `${s.name} ${s.description} ${s.code}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((tab) => (
          <article className="snippet-card" key={tab.id}>
            <div className="list-row snippet-row">
              <input
                aria-label={`${t("Rename")} ${tab.name}`}
                value={tab.name}
                maxLength={200}
                onChange={(e) => update(tab.id, { name: e.target.value })}
              />
              <span className="muted">{tab.language.toUpperCase()}</span>
              <button onClick={() => onInsert(tab)}>
                {t("Insert at cursor")}
              </button>
              <button onClick={() => onOpen(tab)}>{t("Open")}</button>
              <button
                disabled={snippets.length >= 1000}
                onClick={() =>
                  onChange([
                    ...snippets,
                    {
                      ...tab,
                      id: crypto.randomUUID(),
                      name: `${tab.name.slice(0, 180)} ${t("copy")}`,
                    },
                  ])
                }
              >
                {t("Duplicate")}
              </button>
              <button
                onClick={() =>
                  onChange(snippets.filter((s) => s.id !== tab.id))
                }
              >
                {t("Delete")}
              </button>
            </div>
            <input
              className="snippet-description"
              aria-label={`${t("Description")} ${tab.name}`}
              placeholder={t("Description")}
              value={tab.description}
              maxLength={2000}
              onChange={(e) => update(tab.id, { description: e.target.value })}
            />
            <details>
              <summary>{t("Edit snippet code")}</summary>
              <textarea
                spellCheck={false}
                aria-label={`${t("Code")} ${tab.name}`}
                value={tab.code}
                maxLength={2000000}
                onChange={(e) => update(tab.id, { code: e.target.value })}
              />
            </details>
          </article>
        ))}
    </>
  );
}
