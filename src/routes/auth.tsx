import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POST_AUTH_STORAGE_KEY } from "./index";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

function safeRedirectPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/auth")) {
    return "/anotacoes";
  }
  return raw;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Entrar — Nexo" },
      { name: "description", content: "Acesse sua conta do Nexo para sincronizar anotações, diário e treinos." },
      { property: "og:title", content: "Entrar — Nexo" },
      { property: "og:description", content: "Acesse sua conta do Nexo para sincronizar anotações e treinos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const { redirect: rawRedirect } = Route.useSearch();
  const targetPath = safeRedirectPath(rawRedirect);
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        navigate({ to: targetPath as "/anotacoes", replace: true });
      }
    });
  }, [navigate, targetPath]);

  const handleOAuth = async (provider: "google" | "lovable") => {
    setNotice(null);
    window.sessionStorage.setItem(POST_AUTH_STORAGE_KEY, targetPath);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar agora. Tente novamente.");
      return;
    }
    if (result.redirected) return;
    window.sessionStorage.removeItem(POST_AUTH_STORAGE_KEY);
    navigate({ to: targetPath as "/anotacoes", replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Informe seu e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error("Não foi possível enviar o link de recuperação.");
          return;
        }
        setNotice("Enviamos um link para redefinir sua senha. Confira seu e-mail.");
        return;
      }

      if (password.length < 6) {
        toast.error("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          toast.error("E-mail ou senha inválidos.");
          return;
        }
        navigate({ to: targetPath as "/anotacoes", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data.session) {
          navigate({ to: targetPath as "/anotacoes", replace: true });
        } else {
          setNotice("Conta criada! Confira seu e-mail para confirmar o cadastro antes de entrar.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 sm:p-8">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            N
          </span>
          <span className="page-title text-xl font-semibold">Nexo</span>
        </Link>

        <h1 className="page-title mt-6 text-2xl font-medium">
          {mode === "login" && "Entrar no seu espaço"}
          {mode === "signup" && "Criar sua conta"}
          {mode === "forgot" && "Recuperar senha"}
        </h1>

        {mode !== "forgot" && (
          <div className="mt-5 space-y-2.5">
            <Button
              type="button"
              variant="outline"
              className="btn-google-signin h-10 w-full justify-center"
              onClick={() => handleOAuth("google")}
            >
              <GoogleLogo />
              <span>Continuar com Google</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-center gap-2.5"
              onClick={() => handleOAuth("lovable")}
            >
              <LovableMark className="size-[18px]" />
              <span>Continuar com Lovable</span>
            </Button>
            <div className="relative py-2 text-center text-xs text-muted-foreground">
              <span className="bg-card px-2">ou com e-mail</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">E-mail</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Senha</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          )}

          {notice && (
            <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">{notice}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : mode === "signup"
                  ? "Criar conta"
                  : "Enviar link"}
          </Button>
        </form>

        <div className="mt-5 flex flex-col gap-2 text-center text-xs text-muted-foreground">
          {mode === "login" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setNotice(null);
                }}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Esqueci minha senha
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setNotice(null);
                }}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Ainda não tem conta? Criar agora
              </button>
            </>
          )}
          {mode !== "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setNotice(null);
              }}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Voltar para entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}