import { LOCALES, useI18n } from "./I18nContext.jsx";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch-wrap">
      <label className="lang-switch">
        <span className="visually-hidden">{t("language.label")}</span>
        <select
          className="lang-select"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
          aria-label={t("language.label")}
        >
          {LOCALES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
