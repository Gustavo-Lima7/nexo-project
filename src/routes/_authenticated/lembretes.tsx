import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchReminders, todayIso } from "@/lib/nexo-queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lembretes")({
  head: () => ({
    meta: [
      { title: "Lembretes — Nexo" },
      { name: "description", content: "Gerencie seus lembretes com data e horário no Nexo." },
      { property: "og:title", content: "Lembretes — Nexo" },
      { property: "og:description", content: "Crie lembretes com data, hora e acompanhe o que já concluiu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const queryClient = useQueryClient();
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: fetchReminders,
  });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState("09:00");

  const addReminder = useMutation({
    mutationFn: async () => {
      const clean = title.trim();
      if (!clean) throw new Error("Informe o texto do lembrete.");
      const { error } = await supabase
        .from("reminders")
        .insert({ title: clean, remind_date: date, remind_time: time, done: false });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Lembrete adicionado.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar lembrete."),
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("reminders").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
    onError: () => toast.error("Não foi possível atualizar o lembrete."),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Lembrete removido.");
    },
    onError: () => toast.error("Erro ao remover lembrete."),
  });

  const pending = reminders.filter((r) => !r.done);
  const completed = reminders.filter((r) => r.done);

  return (
    <div className="doc-canvas">
      <div className="border-b border-border pb-4">
        <h1 className="page-title text-3xl font-medium">Lembretes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre compromissos e hábitos com data e horário.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addReminder.mutate();
        }}
        className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_145px_110px_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="reminder-title">Lembrete</Label>
          <Input
            id="reminder-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Tomar creatina 5g após o almoço"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reminder-date">Data</Label>
          <Input id="reminder-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reminder-time">Horário</Label>
          <Input id="reminder-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <Button type="submit" disabled={addReminder.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Criar
        </Button>
      </form>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Carregando lembretes...</p>
      ) : reminders.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Nenhum lembrete por enquanto. Crie o primeiro acima.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pendentes ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Tudo em dia por aqui.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
                {pending.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleReminder.mutate({ id: item.id, done: true })}
                        aria-label={`Concluir ${item.title}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="metric-num text-xs text-muted-foreground">
                          {item.date.split("-").reverse().join("/")} às {item.time}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir lembrete"
                      onClick={() => deleteReminder.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {completed.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Concluídos ({completed.length})
              </h2>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card/60">
                {completed.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        checked
                        onCheckedChange={() => toggleReminder.mutate({ id: item.id, done: false })}
                        aria-label={`Reabrir ${item.title}`}
                      />
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm line-through text-muted-foreground")}>
                          {item.title}
                        </p>
                        <p className="metric-num text-xs text-muted-foreground">
                          {item.date.split("-").reverse().join("/")} às {item.time}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir lembrete"
                      onClick={() => deleteReminder.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}