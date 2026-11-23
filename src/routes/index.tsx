import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const POST_AUTH_STORAGE_KEY = "nexo:post-auth-redirect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexo — Anotações, Diário e Academia" },
      {
        name: "description",
        content: "Organize anotações em blocos, lembretes, diário pessoal e treinos de academia com cálculo de calorias e massa corporal.",
      },
      { property: "og:title", content: "Nexo — Anotações, Diário e Academia" },
      {
        property: "og:description",
        content: "Seu espaço pessoal estilo Notion combinado com controle de treinos, calorias e peso na nuvem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (data.user) {
        setUserEmail(data.user.email ?? "Sua conta");
        const savedRedirect = window.sessionStorage.getItem(POST_AUTH_STORAGE_KEY);
        if (savedRedirect && savedRedirect.startsWith("/") && !savedRedirect.startsWith("//")) {
          window.sessionStorage.removeItem(POST_AUTH_STORAGE_KEY);
          navigate({ to: savedRedirect as "/anotacoes", replace: true });
          return;
        }
      } else {
        setUserEmail(null);
      }
      setChecked(true);
    };
    void checkSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <div className="app-frame flex min-h-dvh flex-col justify-between bg-background px-5 py-6 md:border-x md:border-border">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              N
            </span>
            <span className="page-title text-xl font-semibold">Nexo</span>
          </div>
          {checked && userEmail ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sair
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{ redirect: undefined }}>Entrar</Link>
            </Button>
          )}
        </header>

        <main className="my-auto py-10">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            App pessoal e academia
          </p>
          <h1 className="page-title mt-3 text-4xl font-medium leading-[1.1] text-foreground">
            Anotações, diário e treinos no bolso.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Escreva em blocos no estilo Notion, organize lembretes e diário, ajuste suas cargas na academia e acompanhe calorias e massa corporal sincronizados na nuvem.
          </p>

          <ul className="mt-7 divide-y divide-border border-y border-border text-sm">
            <li className="py-3">
              <span className="font-medium text-foreground">Notas e lembretes</span>
              <span className="block text-xs text-muted-foreground">Páginas com checklists, listas e horários</span>
            </li>
            <li className="py-3">
              <span className="font-medium text-foreground">Diário diário</span>
              <span className="block text-xs text-muted-foreground">Humor e reflexões separados por data</span>
            </li>
            <li className="py-3">
              <span className="font-medium text-foreground">Academia completa</span>
              <span className="block text-xs text-muted-foreground">Fichas, ajuste de carga, calorias e IMC/massa</span>
            </li>
          </ul>

          <div className="mt-8">
            {userEmail ? (
              <div className="space-y-2">
                <Button asChild size="lg" className="h-12 w-full text-base">
                  <Link to="/anotacoes">
                    Abrir meu Nexo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">{userEmail}</p>
              </div>
            ) : (
              <Button asChild size="lg" className="h-12 w-full text-base">
                <Link to="/auth" search={{ redirect: undefined }}>
                  Entrar ou criar conta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </main>

        <footer className="text-center text-xs text-muted-foreground">
          Pronto para adicionar à tela inicial do celular
        </footer>
      </div>
    </div>
  );
}
