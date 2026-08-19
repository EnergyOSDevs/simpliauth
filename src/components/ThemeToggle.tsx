import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";
const KEY = "simpliauth-theme";

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem(KEY) as Theme | null) ?? "system") applyTheme(theme);
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "system", icon: Monitor, label: "System" },
    { value: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full border border-border p-0.5"
      role="group"
      aria-label="Color theme"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={`grid size-7 place-items-center rounded-full transition-colors ${
            theme === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
