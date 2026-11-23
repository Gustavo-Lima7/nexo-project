import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchJournalEntries, todayIso, type JournalMood } from "@/lib/nexo-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MOODS: { value: JournalMood; label: string }[] = [
  { value: "otimo", label: "Ótimo" },
  { value: "bem", label: "Bem" },
  { value: "neutro", label: "Neutro" },
  { value: "cansado", label: "Cansado" },
];

export const Route = createFileRoute("/_authenticated/diario")({
  head: () => ({
    meta: [
      { title: "Diário — Nexo" },
      { name: "description", content: "Escreva seu diário diário com registro de humor no Nexo." },
      { property: "og:title", content: "Diário — Nexo" },
      { property: "og:description", content: "Registre reflexões diárias por data na sua conta Nexo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: fetchJournalEntries,
  });

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [mood, setMood] = useState<JournalMood>("bem");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const currentEntry = entries.find((e) => e.date === selectedDate);

  useEffect(() => {
    if (currentEntry) {
      setMood(currentEntry.mood);
      setTitle(currentEntry.title);
      setContent(currentEntry.content);
    } else {
      setMood("bem");
      setTitle("");
      setContent("");
    }
  }, [selectedDate, currentEntry?.id, currentEntry?.content, currentEntry?.title, currentEntry?.mood]);

  const saveEntry = useMutation({
    mutationFn: async () => {
      if (!title.trim() && !content.trim()) {
        throw new Error("Escreva um título ou texto antes de salvar.");
      }
      const { error } = await supabase.from("journal_entries").upsert(
        {
          entry_date: selectedDate,
          mood,
          title: title.trim() || `Registro de ${selectedDate.split("-").reverse().join("/")}`,
          content: content.trim(),
        },
        { onConflict: "user_id,entry_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Página do diário salva.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao salvar diário."),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Registro excluído.");
    },
    onError: () => toast.error("Erro ao excluir registro."),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="page-title text-3xl font-medium">Diário</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uma página para cada dia — registre seu humor, rotina e reflexões.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="journal-date" className="text-xs text-muted-foreground">
            Data da página
          </Label>
          <Input
            id="journal-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr]">
        <div className="space-y-1.5">
          <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dias registrados
          </p>
          {isLoading ? (
            <p className="px-2 text-sm text-muted-foreground">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedDate(entry.date)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left transition-colors",
                  selectedDate === entry.date
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <p className="metric-num text-xs font-medium">
                  {entry.date.split("-").reverse().join("/")}
                </p>
                <p className="truncate text-sm">{entry.title}</p>
              </button>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveEntry.mutate();
          }}
          className="rounded-xl border border-border bg-card p-5 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Humor do dia">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    mood === m.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={saveEntry.isPending}>
                <Save className="mr-1.5 h-4 w-4" />
                {saveEntry.isPending ? "Salvando..." : "Salvar dia"}
              </Button>
              {currentEntry && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir página do diário"
                  onClick={() => deleteEntry.mutate(currentEntry.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              )}
            </div>
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do dia..."
            aria-label="Título do dia"
            className="page-title mt-5 h-auto border-0 bg-transparent px-0 text-2xl font-medium shadow-none focus-visible:ring-0"
          />

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Como foi o seu dia, sua energia e seus aprendizados?"
            aria-label="Texto do diário"
            rows={11}
            className="mt-4 resize-y border-0 bg-transparent px-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
          />
        </form>
      </div>
    </div>
  );
}