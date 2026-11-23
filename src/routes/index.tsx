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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              N
            </span>
            <span className="page-title text-xl font-semibold">Nexo</span>
          </div>
          <div className="flex items-center gap-3">
            {checked && userEmail ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
                <Button asChild size="sm">
                  <Link to="/anotacoes">Abrir Nexo</Link>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-1.5 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth" search={{ redirect: undefined }}>Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-24">
        <section className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            Espaço pessoal e academia
          </p>
          <h1 className="page-title mt-4 text-4xl font-medium leading-[1.08] text-foreground sm:text-6xl">
            Anotações, rotina e treinos no mesmo lugar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Escreva em páginas de blocos, acompanhe lembretes e diário, ajuste suas cargas na academia e calcule calorias e massa corporal com sincronização na nuvem.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {userEmail ? (
              <Button asChild size="lg">
                <Link to="/anotacoes">
                  Abrir meu espaço
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/auth" search={{ redirect: undefined }}>
                  Entrar ou criar conta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-10 border-t border-border pt-12 md:grid-cols-2">
          <div>
            <h2 className="page-title text-2xl font-medium">Organização estilo Notion</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="border-b border-border/70 pb-3">
                <strong className="font-medium text-foreground">Anotações em blocos</strong> — títulos, texto, listas e checklists editáveis salvos na sua conta.
              </li>
              <li className="border-b border-border/70 pb-3">
                <strong className="font-medium text-foreground">Lembretes</strong> — compromissos com data, horário e marcação rápida de concluído.
              </li>
              <li>
                <strong className="font-medium text-foreground">Diário pessoal</strong> — uma página por dia com registro de humor e reflexões.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="page-title text-2xl font-medium">Academia e métricas</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="border-b border-border/70 pb-3">
                <strong className="font-medium text-foreground">Treinos e ajustes</strong> — monte fichas, ajuste cargas em segundos e marque séries feitas.
              </li>
              <li className="border-b border-border/70 pb-3">
                <strong className="font-medium text-foreground">Cálculo de calorias</strong> — taxa metabólica, gasto diário, meta por objetivo e registro de refeições.
              </li>
              <li>
                <strong className="font-medium text-foreground">Massa e peso</strong> — IMC, faixa ideal, massa magra e evolução em gráfico.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
