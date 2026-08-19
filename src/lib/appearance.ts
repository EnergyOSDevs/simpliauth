export type ThemeMode = "light" | "dark" | "system";
export type Tone = "neutral" | "warm" | "cool" | "contrast";

export type Appearance = {
  theme: ThemeMode;
  accent: string; // hex
  tone: Tone;
  radius: number; // rem
  codeSize: number; // rem
  groupDigits: boolean;
};

export const THEME_KEY = "simpliauth-theme";
export const APPEARANCE_KEY = "simpliauth-appearance";

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "system",
  accent: "#12b3a1",
  tone: "neutral",
  radius: 0.75,
  codeSize: 1.5,
  groupDigits: true,
};

export const ACCENT_PRESETS = [
  { name: "Teal", value: "#12b3a1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
];

const TONES: Record<Tone, { light: string[]; dark: string[] }> = {
  // [background, card, secondary/muted, border]
  neutral: {
    light: ["oklch(0.985 0.002 264)", "oklch(1 0 0)", "oklch(0.955 0.003 264)", "oklch(0.905 0.005 264)"],
    dark: ["oklch(0.165 0.006 264)", "oklch(0.21 0.007 264)", "oklch(0.26 0.008 264)", "oklch(1 0 0 / 12%)"],
  },
  warm: {
    light: ["oklch(0.985 0.008 80)", "oklch(1 0.004 80)", "oklch(0.955 0.012 80)", "oklch(0.9 0.014 80)"],
    dark: ["oklch(0.17 0.008 60)", "oklch(0.215 0.01 60)", "oklch(0.265 0.012 60)", "oklch(1 0 0 / 12%)"],
  },
  cool: {
    light: ["oklch(0.985 0.008 240)", "oklch(1 0.003 240)", "oklch(0.95 0.012 240)", "oklch(0.9 0.016 240)"],
    dark: ["oklch(0.17 0.012 250)", "oklch(0.215 0.014 250)", "oklch(0.265 0.016 250)", "oklch(1 0 0 / 12%)"],
  },
  contrast: {
    light: ["oklch(1 0 0)", "oklch(1 0 0)", "oklch(0.95 0 0)", "oklch(0.82 0 0)"],
    dark: ["oklch(0 0 0)", "oklch(0.13 0 0)", "oklch(0.2 0 0)", "oklch(1 0 0 / 22%)"],
  },
};

export function loadAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Appearance>) : {};
    const theme = (localStorage.getItem(THEME_KEY) as ThemeMode | null) ?? parsed.theme;
    return { ...DEFAULT_APPEARANCE, ...parsed, theme: theme ?? DEFAULT_APPEARANCE.theme };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(appearance: Appearance) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    localStorage.setItem(THEME_KEY, appearance.theme);
  } catch {
    /* storage unavailable */
  }
}

export function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readableOn(hex: string) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#111418" : "#ffffff";
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = appearance.theme === "dark" || (appearance.theme === "system" && prefersDark());
  root.classList.toggle("dark", dark);

  const [background, card, secondary, border] = TONES[appearance.tone][dark ? "dark" : "light"];
  root.style.setProperty("--background", background);
  root.style.setProperty("--card", card);
  root.style.setProperty("--popover", card);
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--muted", secondary);
  root.style.setProperty("--border", border);
  root.style.setProperty("--input", border);

  root.style.setProperty("--accent", appearance.accent);
  root.style.setProperty("--ring", appearance.accent);
  root.style.setProperty("--accent-foreground", readableOn(appearance.accent));
  root.style.setProperty("--radius", `${appearance.radius}rem`);
  root.style.setProperty("--code-size", `${appearance.codeSize}rem`);
}
