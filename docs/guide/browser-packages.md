# Browser and packages

Select **Browser** for DOM, Canvas, and web APIs. It runs in an isolated view below the console, with no access to the privileged application bridge.

## A first web preview

```js
const root = document.getElementById("root");
root.innerHTML = "<h1>Hello, OpenScratch</h1>";
root.style.color = "#168967";
```

Inject style elements for CSS. Direct CSS file imports and dedicated HTML/CSS editor panels are not supported yet. Browser + Node in the same realm is not implemented.

## npm packages

Open **npm packages** to search the public registry, install a specific version, update, list, or remove dependencies. Scoped packages are supported. Install scripts are disabled unless explicitly enabled for that operation.

The Popular packages section offers one-click installation for a curated selection: lodash, date-fns, axios, zod, react, and react-dom. This is not a live download ranking. Each button installs the latest npm version and changes to Installed after success. Use the search/version fields for a specific version. Installation requires network access and preserves the install-script opt-in policy.

Packages live in a separate application dependency workspace with a package.json and lockfile. They become available without restarting the app. Included declarations and manually installed @types packages feed JS/TS completion; type loading is bounded to 8 MB / 1500 files.

npm does not manage Python or C# packages. Python uses the selected interpreter's environment. C# currently supports SDK framework libraries only.

## React with TSX

Install react, react-dom, @types/react, and @types/react-dom. Select TSX and Browser, then run:

```tsx
import { createRoot } from "react-dom/client";
function App() {
  return <h1>Hello from React</h1>;
}
createRoot(document.getElementById("root")!).render(<App />);
```

Browser-compatible dependencies are bundled locally. Node-only imports produce compilation errors. Stop destroys the preview context; the next Run starts a fresh one.
