import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Dumbbell,
  FileText,
  Flame,
  LogOut,
  Menu,
  Scale,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceShellProps {
  userEmail: string;
  children: ReactNode;
}

const SPACE_NAV = [
  { to: "/anotacoes" as const, label: "Anotações", icon: FileText },
  { to: "/lembretes" as const, label: "Lembretes", icon: Bell },
  { to: "/diario" as const, label: "Diário", icon: BookOpen },
];

const GYM_NAV = [
  { to: "/treinos" as const, label: "Treinos", icon: Dumbbell },
  { to: "/calorias" as const, label: "Calorias", icon: Flame },
  { to: "/corpo" as const, label: "Massa e peso", icon: Scale },
];

export function WorkspaceShell({ userEmail, children }: WorkspaceShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const renderNavContent = (onSelect?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-3 pt-4">
          <Link to="/anotacoes" onClick={onSelect} className="flex items-center gap-2.5">
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