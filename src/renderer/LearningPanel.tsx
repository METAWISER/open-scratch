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
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Tab["language"] | "all">(
    language === "jsx" ? "js" : language === "tsx" ? "ts" : language,
  );
  const [error, setError] = useState("");
  const results = searchLessons(query, filter);
  return (
    <div className="learning-panel">
      <p className="muted">
        Guías prácticas originales · disponibles sin conexión. Las referencias
        se abren en tu navegador y requieren Internet.
      </p>
      <div className="actions">
        <input
          aria-label="Buscar documentación"
          autoFocus
          placeholder="reduce, recorrer, sumar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Lenguaje de documentación"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">Todos</option>
          <option value="js">JavaScript</option>
          <option value="ts">TypeScript</option>
          <option value="py">Python</option>
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      {!results.length && (
        <p>
          No hay fichas para esta búsqueda. Prueba con otro término o con todos
          los lenguajes.
        </p>
      )}
      {results.map((lesson) => (
        <article className="lesson" key={lesson.id}>
          <small>
            {lesson.language.toUpperCase()} ·{" "}
            {lesson.language === "py"
              ? "Python 3.10+"
              : "ES2015+ / TypeScript 5"}
          </small>
          <h3>{lesson.title}</h3>
          <p>{lesson.summary}</p>
          <pre>{lesson.code}</pre>
          <p className="muted">{lesson.tip}</p>
          <div className="actions">
            <button className="primary" onClick={() => onOpen(lesson)}>
              Abrir ejemplo en una pestaña
            </button>
            <button
              onClick={() =>
                void navigator.clipboard
                  .writeText(lesson.code)
                  .catch((e) => setError(String(e)))
              }
            >
              Copiar
            </button>
            <button
              onClick={() =>
                void window.openscratch
                  .openReference(lesson.id)
                  .catch((e) => setError(String(e)))
              }
            >
              Ver referencia
            </button>
          </div>
          <small>{lesson.source}</small>
        </article>
      ))}
      <p className="muted">
        La búsqueda por palabra no identifica el tipo del símbolo. Comprueba que
        la ficha corresponde a tu método o biblioteca.
      </p>
    </div>
  );
}
