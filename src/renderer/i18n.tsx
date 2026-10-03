import { createContext, useContext } from "react";
import { translate, type Locale } from "../shared/i18n";
export const LocaleContext = createContext<Locale>("en");
export function useTranslation() {
  const locale = useContext(LocaleContext);
  return { locale, t: (text: string) => translate(locale, text) };
}
