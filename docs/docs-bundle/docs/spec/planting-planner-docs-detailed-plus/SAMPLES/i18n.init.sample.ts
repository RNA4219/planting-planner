import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export async function initI18n(lang?: string) {
  const search = new URLSearchParams(location.search);
  const lng = lang || search.get('lang') || localStorage.getItem('lang') || navigator.language.slice(0,2) || 'ja';
  const dict = await import(`./locales/${lng}.json`).catch(() => import('./locales/en.json'));
  await i18n.use(initReactI18next).init({ lng, resources: { [lng]: { translation: dict } } });
  return i18n;
}
