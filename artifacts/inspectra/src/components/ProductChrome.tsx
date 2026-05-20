import { useLocation } from "wouter";
import { AppShell } from "./AppShell";

export function ProductChrome({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  if (location === "/login") {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
