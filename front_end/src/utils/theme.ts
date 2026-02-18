export type ThemeMode = "light" | "dark";

const THEME_KEY = "themeMode";

export function getStoredTheme(): ThemeMode {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "dark" ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme(theme: ThemeMode): ThemeMode {
  return theme === "light" ? "dark" : "light";
}
