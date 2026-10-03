import { useTranslation } from "./i18n";
import { useState } from "react";
import { searchLessons, type Lesson } from "../learning/catalog";
import type { Tab } from "../shared/contracts";
export function LearningPanel({
  language,
  initialQuery,
  onOpen,
}: {
  language: Tab["language"];
  initialQuery: string;
  onOpen: (lesson: Lesson) => void;
}) {
  const { locale, t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Tab["language"] | "all">(
    language === "jsx" ? "js" : language === "tsx" ? "ts" : language,
  );
  const [error, setError] = useState("");
  const results = searchLessons(query, filter, locale);
  return (
    <div className="learning-panel">
      <p className="muted">
        {t(
          "Original practical guides, available offline. References open in your browser and require Internet.",
        )}
      </p>
      <div className="actions">
        <input
          aria-label={t("Search documentation")}
          autoFocus
          placeholder={t("reduce, iterate, sum…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={t("Documentation language")}
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">{t("All")}</option>
          <option value="js">JavaScript</option>
          <option value="ts">TypeScript</option>
          <option value="py">Python</option>
          <option value="cs">C#</option>
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      {!results.length && (
        <p>{t("No matching guides. Try another search or all languages.")}</p>
      )}
      {results.map((lesson) => (
        <article className="lesson" key={lesson.id}>
          <small>
            {lesson.language.toUpperCase()} ·{" "}
            {lesson.language === "cs"
              ? ".NET SDK 8+"
              : lesson.language === "py"
                ? "Python 3.10+"
                : "ES2015+ / TypeScript 5"}
          </small>
          <h3>
            <button className="lesson-title" onClick={() => onOpen(lesson)}>
              {lesson.title}
            </button>
          </h3>
          <p>{lesson.summary}</p>
          <button
            className="lesson-code"
            aria-label={t("Open example in a new tab") + ": " + lesson.title}
            onClick={() => onOpen(lesson)}
          >
            <pre>{lesson.code}</pre>
          </button>
          <p className="muted">{lesson.tip}</p>
          <div className="actions">
            <button className="primary" onClick={() => onOpen(lesson)}>
              {t("Open example in a new tab")}
            </button>
            <button
              onClick={() =>
                void navigator.clipboard
                  .writeText(lesson.code)
                  .catch((e) => setError(String(e)))
              }
            >
              {t("Copy")}
            </button>
            <button
              onClick={() =>
                void window.openscratch
                  .openReference(lesson.id)
                  .catch((e) => setError(String(e)))
              }
            >
              {t("View reference")}
            </button>
          </div>
          <small>{lesson.source}</small>
        </article>
      ))}
      <p className="muted">
        {t(
          "Word search does not resolve symbol types. Check that the guide matches your method or library.",
        )}
      </p>
    </div>
  );
}
