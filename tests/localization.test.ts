import { expect, it } from "vitest";
import { initialState, stateSchema } from "../src/shared/contracts";
import { translate } from "../src/shared/i18n";
import { searchLessons } from "../src/learning/catalog";
it("defaults legacy workspaces to English without discarding code", () => {
  const legacy = JSON.parse(JSON.stringify(initialState()));
  delete legacy.settings.locale;
  delete legacy.tabs[0].dotnetExecutable;
  const migrated = stateSchema.parse(legacy);
  expect(migrated.settings.locale).toBe("en");
  expect(migrated.tabs[0].dotnetExecutable).toBe("");
  expect(migrated.tabs[0].code).toBe(legacy.tabs[0].code);
});
it("localizes controls and lessons while preserving executable code and references", () => {
  expect(translate("es", "▶ Run")).toBe("▶ Ejecutar");
  expect(translate("en", "▶ Run")).toBe("▶ Run");
  const english = searchLessons("sum", "cs", "en")[0];
  const spanish = searchLessons("sumar", "cs", "es")[0];
  expect(english.id).toBe(spanish.id);
  expect(english.title).not.toBe(spanish.title);
  expect(english.code).toBe(spanish.code);
  expect(english.reference).toBe(spanish.reference);
});
