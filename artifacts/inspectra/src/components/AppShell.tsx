import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  GitCompare,
  Upload,
  Home,
  Moon,
  Sun,
  Menu,
  X,
  Wheat,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { resolveApiBase } from "@/lib/api-base";
import { apiHeaders } from "@/lib/workspace";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/analyze", label: "Analyze", icon: Upload },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/csp", label: "CSP Report", icon: Wheat },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);

    const check = async () => {
      const base = resolveApiBase();
      try {
        const res = await fetch(base, {
          headers: apiHeaders() as HeadersInit,
        });
        setApiOk(res.ok);
      } catch {
        setApiOk(false);
      }
    };
    check();
  }, []);

  const navItem = (href: string, label: string, Icon: typeof Home) => {
    const active = location === href || (href !== "/" && location.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors touch-target ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/30 shrink-0">
        <div className="p-4 border-b flex items-center gap-2">
          <img src="/logo.svg" alt="" width={32} height={32} className="rounded-md shrink-0" />
          <div>
            <p className="font-bold tracking-tight">Inspectra AI</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Material intelligence
            </p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">{NAV.map(({ href, label, icon }) => navItem(href, label, icon))}</nav>
        <div className="p-3 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
            <span
              className={`h-2 w-2 rounded-full ${apiOk === null ? "bg-amber-500 animate-pulse" : apiOk ? "bg-green-500" : "bg-destructive"}`}
            />
            {apiOk === null
              ? "Connecting…"
              : apiOk
                ? "API online"
                : "API offline — set VITE_API_URL to your backend"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {mounted && theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b px-4 h-14 safe-top bg-background/95 backdrop-blur sticky top-0 z-40">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <img src="/logo.svg" alt="" width={24} height={24} className="rounded-sm shrink-0" />
            Inspectra
          </Link>
          <div className="flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full mr-2 ${apiOk ? "bg-green-500" : apiOk === false ? "bg-destructive" : "bg-amber-500"}`}
              title={apiOk ? "API online" : "API offline"}
            />
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menu">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {sidebarOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <aside className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-background border-r p-4 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1 flex-1">{NAV.map(({ href, label, icon }) => navItem(href, label, icon))}</nav>
            </aside>
          </>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
