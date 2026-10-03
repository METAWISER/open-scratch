# Learn and reference

Open **Learn** for offline practical guides. **Look up** searches the word under the cursor; the command palette offers the same action. Search by method name or intent, such as `sum`, `iterate`, or `reduce`. Filter by language or choose All. TypeScript includes JavaScript cards.

Click an example's **title**, **code block**, or **Open example in a new tab** button. OpenScratch preserves your existing tabs, creates a new tab in the correct language and runtime, and disables Auto Run. Press Run when you are ready. This is the primary action because it avoids replacing work or silently changing your clipboard. A separate **Copy** action is also available.

The initial catalog contains thirteen original examples for JS/TS, Python, and C#. Explanations follow the app's English/Spanish interface setting; identifiers and example code are shared between both languages. Search recognizes keywords in both languages.

The guides work offline. **View reference** explicitly opens your default browser and may require Internet. MDN is a community reference for JavaScript, not the official ECMAScript specification. TypeScript, Python, and C# link to their official documentation. Only known catalog IDs can be opened through the application bridge; arbitrary URLs are rejected.

Contextual lookup is lexical, not semantic. Check that a card refers to the same method or library as your code. The catalog is a starting point, not a complete language manual. It uses no AI and does not fetch content in the background.

## Contributing a guide

Add a Lesson to `src/learning/catalog.ts`: unique ID, language, English title/summary/tip/source, Spanish equivalents, bilingual keywords, original executable code, a version indication, and an HTTPS reference. Keep examples deterministic and independent of packages, network access, and user files. Integration tests execute every catalog example in its actual engine.

Sources include [Python AST](https://docs.python.org/3/library/ast.html), [MDN reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce), [MDN forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach), and [Microsoft C# documentation](https://learn.microsoft.com/en-us/dotnet/csharp/).
