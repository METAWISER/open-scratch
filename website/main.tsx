import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Marked, Renderer } from "marked";
import { pages } from "./content";
import { lessons } from "../src/learning/catalog";
import "./style.css";

const repo = "https://github.com/METAWISER/open-scratch";
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function App() {
  const id = new URLSearchParams(location.search).get("page") || "start";
  const page = pages.find((page) => page.id === id);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("docs-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("docs-theme", dark ? "dark" : "light");
    } catch {
      /* Storage may be disabled. */
    }
  }, [dark]);
  const { html, headings } = useMemo(() => {
    const headings: { id: string; title: string }[] = [];
    const renderer = new Renderer();
    renderer.html = ({ text }) => escape(text);
    renderer.heading = function ({ tokens, depth }) {
      const content = this.parser.parseInline(tokens),
        title = content.replace(/<[^>]*>/g, "");
      const headingId = slug(title);
      if (depth === 2) headings.push({ id: headingId, title });
      return `<h${depth} id="${headingId}">${content}</h${depth}>`;
    };
    renderer.link = function ({ href, tokens }) {
      let url = href;
      if (!/^(https?:|#)/.test(url)) {
        const resolved = new URL(
          url,
          `${repo}/blob/main/${page?.source ?? "README.md"}`,
        );
        const path = resolved.pathname.split("/blob/main/")[1];
        const target = pages.find((p) => p.source === path);
        url = target ? `?page=${target.id}${resolved.hash}` : resolved.href;
      }
      if (!/^(https?:|#|\?page=)/.test(url))
        return this.parser.parseInline(tokens);
      return `<a href="${escape(url)}"${url.startsWith("https:") ? ' target="_blank" rel="noreferrer"' : ""}>${this.parser.parseInline(tokens)}</a>`;
    };
    const parser = new Marked({ renderer });
    return {
      html: parser.parse(
        page?.body ?? "# Page not found\nChoose a guide from the navigation.",
      ) as string,
      headings,
    };
  }, [page]);
  useEffect(() => {
    document.title = `${page?.title ?? "Page not found"} · OpenScratch Docs`;
    const buttons: HTMLButtonElement[] = [];
    document.querySelectorAll<HTMLElement>(".article pre").forEach((pre) => {
      const button = document.createElement("button");
      button.className = "copy-code";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code example");
      button.onclick = () => {
        void navigator.clipboard
          .writeText(pre.querySelector("code")?.textContent ?? "")
          .then(() => {
            setNotice("Code copied to clipboard.");
          })
          .catch(() =>
            setNotice(
              "Clipboard unavailable. Select and copy the code manually.",
            ),
          );
      };
      pre.append(button);
      buttons.push(button);
    });
    if (location.hash)
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView();
    return () => buttons.forEach((button) => button.remove());
  }, [html, page]);
  const results = pages.filter((p) =>
    `${p.title} ${p.body}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const index = pages.findIndex((p) => p.id === id);
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href="?page=start">
          <span className="mark">⌘</span>
          <strong>OpenScratch</strong>
          <span className="docs-label">/ docs</span>
        </a>
        <div className="header-actions">
          <a href={repo} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <button
            aria-label="Toggle color theme"
            onClick={() => setDark(!dark)}
          >
            {dark ? "☀" : "◐"}
          </button>
          <button
            className="menu-button"
            aria-expanded={menu}
            aria-controls="navigation"
            onClick={() => setMenu(!menu)}
          >
            Menu
          </button>
        </div>
      </header>
      <div className="layout">
        <aside id="navigation" className={`sidebar ${menu ? "is-open" : ""}`}>
          <div className="search">
            <span>⌕</span>
            <input
              aria-label="Search documentation"
              placeholder="Search the docs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query ? (
            <nav aria-label="Search results">
              <p className="nav-label">{results.length} RESULTS</p>
              {results.map((p) => (
                <a key={p.id} href={`?page=${p.id}`}>
                  {p.title}
                </a>
              ))}
              {!results.length && <p>No matching pages.</p>}
            </nav>
          ) : (
            <nav aria-label="Documentation">
              {[...new Set(pages.map((p) => p.group))].map((group) => (
                <section key={group}>
                  <p className="nav-label">{group}</p>
                  {pages
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <a
                        aria-current={id === p.id ? "page" : undefined}
                        key={p.id}
                        href={`?page=${p.id}`}
                      >
                        {p.title}
                        {id === p.id && <span>↗</span>}
                      </a>
                    ))}
                </section>
              ))}
            </nav>
          )}
          <div className="sidebar-note">
            <span className="online-dot" />
            Local by design.
            <br />
            <small>No accounts. No execution quotas.</small>
          </div>
        </aside>
        <main id="content">
          <div className="breadcrumb">
            Documentation <span>/</span> {page?.group ?? "Not found"}
          </div>
          <div className="article" dangerouslySetInnerHTML={{ __html: html }} />
          {id === "start" && (
            <div className="language-cards">
              {[
                {
                  title: "Python",
                  id: "python",
                  tag: "PY",
                  text: "Small experiments. Real Python.",
                },
                {
                  title: "C# / .NET",
                  id: "csharp",
                  tag: "C#",
                  text: "Compile an idea into a result.",
                },
              ].map((item) => (
                <a key={item.id} href={`?page=${item.id}`}>
                  <span className="code-tag">{item.tag}</span>
                  <h3>
                    {item.title} <span>↗</span>
                  </h3>
                  <p>{item.text}</p>
                </a>
              ))}
            </div>
          )}
          {id === "learn" && (
            <section className="examples" aria-label="Code examples">
              <h2>Try an example</h2>
              <p>
                Copy code into OpenScratch and select its language. On the
                desktop, clicking a Learn example opens a new tab.
              </p>
              {lessons.map((lesson) => (
                <article key={lesson.id}>
                  <div className="example-heading">
                    <h3>{lesson.title}</h3>
                    <span className="code-tag">
                      {lesson.language.toUpperCase()}
                    </span>
                  </div>
                  <p>{lesson.summary}</p>
                  <pre>
                    <code>{lesson.code}</code>
                  </pre>
                  <button
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(lesson.code)
                        .then(() => setNotice("Code copied to clipboard."))
                        .catch(() =>
                          setNotice(
                            "Clipboard unavailable. Select the code manually.",
                          ),
                        )
                    }
                  >
                    Copy example
                  </button>{" "}
                  <a href={lesson.reference} target="_blank" rel="noreferrer">
                    Reference ↗
                  </a>
                </article>
              ))}
            </section>
          )}
          <div className="page-meta">
            <span>OpenScratch 0.3 · MIT licensed</span>
            {page && (
              <a
                href={`${repo}/edit/main/${page.source}`}
                target="_blank"
                rel="noreferrer"
              >
                Improve this page ↗
              </a>
            )}
          </div>
          <nav className="pagination" aria-label="Adjacent pages">
            {index > 0 ? (
              <a href={`?page=${pages[index - 1].id}`}>
                <small>← PREVIOUS</small>
                {pages[index - 1].title}
              </a>
            ) : (
              <span />
            )}
            {index >= 0 && index < pages.length - 1 && (
              <a href={`?page=${pages[index + 1].id}`}>
                <small>NEXT →</small>
                {pages[index + 1].title}
              </a>
            )}
          </nav>
          <footer>
            Built for curiosity. Kept open for everyone. ·{" "}
            <a
              href={
                import.meta.env.DEV
                  ? `${repo}/blob/main/THIRD_PARTY_NOTICES.md`
                  : "./third-party-notices.txt"
              }
            >
              Third-party notices
            </a>
          </footer>
        </main>
        <aside className="toc">
          <p className="nav-label">ON THIS PAGE</p>
          {headings.map((h) => (
            <a href={`#${h.id}`} key={h.id}>
              {h.title}
            </a>
          ))}
          <div className="toc-card">
            <strong>Make something click.</strong>
            <p>
              Use the desktop playground to turn these guides into running code.
            </p>
            <a href={`${repo}#develop-and-run`}>Build OpenScratch ↗</a>
          </div>
        </aside>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
