import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, Dumbbell, FileText, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface WorkspaceShellProps {
  userEmail: string;
  children: ReactNode;
}

const BOTTOM_TABS = [
  { to: "/anotacoes" as const, label: "Notas", icon: FileText, match: ["/anotacoes"] },
  { to: "/lembretes" as const, label: "Lembretes", icon: Bell, match: ["/lembretes"] },
  { to: "/diario" as const, label: "Diário", icon: BookOpen, match: ["/diario"] },
  {
    to: "/treinos" as const,
    label: "Academia",
    icon: Dumbbell,
    match: ["/treinos", "/calorias", "/corpo"],
  },
];

const GYM_SUBTABS = [
  { to: "/treinos" as const, label: "Treinos" },
  { to: "/calorias" as const, label: "Calorias" },
  { to: "/corpo" as const, label: "Massa e peso" },
];

const ROUTE_TITLES: Record<string, string> = {
  "/anotacoes": "Anotações",
  "/lembretes": "Lembretes",
  "/diario": "Diário",
  "/treinos": "Academia",
  "/calorias": "Academia",
  "/corpo": "Academia",
};

export function WorkspaceShell({ userEmail, children }: WorkspaceShellProps) {
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isGymSection = pathname === "/treinos" || pathname === "/calorias" || pathname === "/corpo";
  const headerTitle = ROUTE_TITLES[pathname] ?? "Nexo";

  const handleSignOut = async () => {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <div className="app-frame flex min-h-dvh flex-col bg-background md:border-x md:border-border">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/anotacoes" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                N
              </span>
              <span className="page-title text-xl font-semibold text-foreground">{headerTitle}</span>
            </Link>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  aria-label="Conta"
                >
                  <User className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-3">
                <p className="text-xs font-medium text-muted-foreground">Conectado como</p>
                <p className="mt-0.5 truncate text-sm font-medium text-foreground" title={userEmail}>
                  {userEmail}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Saindo..." : "Sair da conta"}
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {isGymSection && (
            <div className="grid grid-cols-3 gap-1 px-4 pb-2.5">
              {GYM_SUBTABS.map((tab) => {
                const active = pathname === tab.to;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "rounded-lg py-1.5 text-center text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
        </header>

        <main className="flex-1 px-4 pt-4 pb-24">{children}</main>

        <nav
          aria-label="Navegação principal"
          className="safe-bottom fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur md:border-x"
        >
          <div className="grid grid-cols-4 px-1 pt-1.5">
            {BOTTOM_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.match.includes(pathname);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              N
            </span>
            <span className="page-title text-xl font-semibold text-foreground">Nexo</span>
          </Link>
          {onSelect && (
            <Button variant="ghost" size="icon" onClick={onSelect} aria-label="Fechar menu">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className="space-y-5 px-2" aria-label="Navegação principal">
          <div className="space-y-1">
            <p className="px-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Espaço
            </p>
            {SPACE_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onSelect}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Academia
            </p>
            {GYM_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onSelect}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <p className="truncate px-2 text-xs text-muted-foreground" title={userEmail}>
          {userEmail}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={signingOut}
          onClick={handleSignOut}
          className="mt-1.5 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Saindo..." : "Sair da conta"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">{renderNavContent()}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-foreground/25"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-64 border-r border-sidebar-border bg-sidebar">
            {renderNavContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="page-title text-lg font-semibold">Nexo</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-9">{children}</main>
      </div>
    </div>
  );
}