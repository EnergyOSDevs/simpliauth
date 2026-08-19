import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  loadAppearance,
  saveAppearance,
  type Appearance,
} from "@/lib/appearance";

type Ctx = {
  appearance: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
};

const AppearanceContext = createContext<Ctx>({
  appearance: DEFAULT_APPEARANCE,
  update: () => {},
  reset: () => {},
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    const loaded = loadAppearance();
    setAppearance(loaded);
    applyAppearance(loaded);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearance(appearance);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [appearance]);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...patch };
      saveAppearance(next);
      applyAppearance(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    applyAppearance(DEFAULT_APPEARANCE);
    setAppearance(DEFAULT_APPEARANCE);
  }, []);

  const value = useMemo(() => ({ appearance, update, reset }), [appearance, update, reset]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
