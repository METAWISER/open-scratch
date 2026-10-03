import ts from "typescript";
import MagicString from "magic-string";
export interface InstrumentOptions {
  autoLog: boolean;
  logpoints: number[];
  hook: string;
}
export function instrument(
  code: string,
  filename: string,
  options: InstrumentOptions,
): string {
  const source = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith("tsx")
      ? ts.ScriptKind.TSX
      : filename.endsWith("jsx")
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.TS,
  );
  const output = new MagicString(code);
  const selected = new Map<ts.Expression, string>();
  const line = (node: ts.Node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const expressions: ts.Expression[] = [];
  const loops: (ts.ForOfStatement | ts.ForInStatement)[] = [];
  const consoleCall = (e: ts.Expression) =>
    ts.isCallExpression(e) &&
    ts.isPropertyAccessExpression(e.expression) &&
    e.expression.expression.getText(source) === "console";
  const walk = (node: ts.Node) => {
    if (ts.isExpression(node)) expressions.push(node);
    if (
      ts.isExpressionStatement(node) &&
      !(
        ts.isStringLiteral(node.expression) &&
        ["use strict", "use asm"].includes(node.expression.text)
      )
    ) {
      if (
        (options.autoLog &&
          node.parent === source &&
          !consoleCall(node.expression)) ||
        options.logpoints.includes(line(node))
      )
        selected.set(node.expression, "");
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      options.logpoints.includes(line(node))
    )
      selected.set(node.initializer, "");
    if (
      ts.isReturnStatement(node) &&
      node.expression &&
      options.logpoints.includes(line(node))
    )
      selected.set(node.expression, "");
    if (
      ts.isArrowFunction(node) &&
      !ts.isBlock(node.body) &&
      options.logpoints.includes(line(node.body))
    )
      selected.set(node.body, "");
    if (ts.isForOfStatement(node) || ts.isForInStatement(node))
      loops.push(node);
    ts.forEachChild(node, walk);
  };
  walk(source);
  // Tokenized comments, never regex rewriting of JavaScript expressions.
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    filename.endsWith("x")
      ? ts.LanguageVariant.JSX
      : ts.LanguageVariant.Standard,
    code,
  );
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    const kind = scanner.getToken();
    if (
      kind !== ts.SyntaxKind.SingleLineCommentTrivia &&
      kind !== ts.SyntaxKind.MultiLineCommentTrivia
    )
      continue;
    const raw = scanner.getTokenText();
    if (!raw.startsWith("//?") && !raw.startsWith("/*?")) continue;
    const start = scanner.getTokenPos();
    const transform = raw.startsWith("//?")
      ? raw.slice(3).trim()
      : raw.slice(3, -2).trim();
    const loop = loops.find(
      (n) =>
        ts.isBlock(n.statement) &&
        n.expression.end < start &&
        n.statement.getStart(source) > start,
    );
    if (loop && ts.isBlock(loop.statement)) {
      const names: string[] = [];
      const binding = (n: ts.Node) => {
        if (ts.isIdentifier(n)) names.push(n.text);
        else if (ts.isVariableDeclarationList(n))
          n.declarations.forEach((d) => binding(d.name));
        else if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n))
          n.elements.forEach((e) => {
            if (ts.isBindingElement(e)) binding(e.name);
          });
      };
      binding(loop.initializer);
      if (names.length)
        output.appendLeft(
          loop.statement.getStart(source) + 1,
          `${options.hook}(${names.length === 1 ? names[0] : `[${names.join(",")}]`},${line(loop)}${transform ? `,($)=>(${transform})` : ""});`,
        );
      continue;
    }
    const candidates = expressions.filter((e) => {
      if (e.end > start) return false;
      const gap = code.slice(e.end, start).trim();
      if (gap.replace(/;$/, "").trim() === "") return true;
      return (
        gap === ")" &&
        (((ts.isIfStatement(e.parent) || ts.isWhileStatement(e.parent)) &&
          e.parent.expression === e) ||
          (ts.isForStatement(e.parent) && e.parent.condition === e))
      );
    });
    candidates.sort(
      (a, b) => b.end - a.end || a.getStart(source) - b.getStart(source),
    );
    if (candidates[0]) selected.set(candidates[0], transform);
  }
  for (const [expr, transform] of selected) {
    if (
      (ts.isPropertyAccessExpression(expr) ||
        ts.isElementAccessExpression(expr)) &&
      ts.isCallExpression(expr.parent) &&
      expr.parent.expression === expr
    )
      throw new Error(
        "An inspection marker between a method reference and its call is unsupported; place it after the call.",
      );
    const start = expr.getStart(source),
      end = expr.end;
    output.prependLeft(start, `${options.hook}(`);
    output.appendRight(
      end,
      `,${line(expr)}${transform ? `,($)=>(${transform})` : ""})`,
    );
  }
  return (
    output.toString() +
    `\n//# sourceMappingURL=${output.generateMap({ source: filename, includeContent: true, hires: true }).toUrl()}`
  );
}
