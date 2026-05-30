import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MESSAGES } from "./translations.js";

const I18nContext = createContext(null);

const LOCALE_KEY = "toms-locale-v1";

export const LOCALES = [
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "es", label: "Español" },
];

function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function pick(table, key) {
  return table && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(LOCALE_KEY);
      if (raw === "zh" || raw === "es" || raw === "en") return raw;
    } catch {
      /* ignore */
    }
    return "en";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : locale === "es" ? "es" : "en";
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      return v === "zh" || v === "es" || v === "en" ? v : "en";
    });
  }, []);

  const t = useCallback(
    (key, vars) => {
      const raw = pick(MESSAGES[locale], key) ?? pick(MESSAGES.en, key) ?? key;
      return interpolate(raw, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
