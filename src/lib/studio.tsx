import { createContext, useContext } from "react";
import type { StudioContextValue } from "./types";

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error("StudioContext is required");
  return context;
}
