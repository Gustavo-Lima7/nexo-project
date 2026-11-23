import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { calculateExerciseVolume } from "@/lib/fitness-math";
import { fetchWorkouts, makeId, type WorkoutExercise, type WorkoutRoutine } from "@/lib/nexo-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos — Nexo" },
      { name: "description", content: "Monte fichas de academia, ajuste cargas e marque séries no Nexo." },
      { property: "og:title", content: "Treinos — Nexo" },
      { property: "og:description", content: "Controle e ajuste seus treinos de academia na nuvem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const queryClient = useQueryClient();
  const { data: workouts = [], isLoading } = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newFocus, setNewFocus] = useState("");

  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("4");
  const [exReps, setExReps] = useState("10");
  const [exWeight, setExWeight] = useState("20");
  const [exRest, setExRest] = useState("90");
  const [editingExId, setEditingExId] = useState<string | null>(null);

  const activeWorkout: WorkoutRoutine | undefined =
    workouts.find((w) => w.id === selectedId) ?? workouts[0];

  const createWorkout = useMutation({
    mutationFn: async () => {
      const clean = newName.trim();
      if (!clean) throw new Error("Informe o nome do treino.");
      const { data, error } = await supabase
        .from("workouts")
        .insert({ name: clean, focus: newFocus.trim(), exercises: [], sort_order: workouts.length })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setSelectedId(id);
      setNewName("");
      setNewFocus("");
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Ficha de treino criada.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar treino."),
  });

  const updateExercises = useMutation({
    mutationFn: async ({ workoutId, exercises }: { workoutId: string; exercises: WorkoutExercise[] }) => {
      const { error } = await supabase
        .from("workouts")
        .update({ exercises: exercises as unknown as Json })
        .eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
    onError: () => toast.error("Não foi possível atualizar o treino."),
  });

  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Treino removido.");
    },
    onError: () => toast.error("Erro ao remover treino."),
  });

  const saveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkout) return;
    const cleanName = exName.trim();
    const sets = Number(exSets);
    const reps = Number(exReps);
    const weightKg = Number(exWeight);
    const restSec = Number(exRest);

    if (!cleanName) return toast.error("Informe o nome do exercício.");
    if (!Number.isInteger(sets) || sets < 1 || sets > 20) return toast.error("Séries devem ficar entre 1 e 20.");
    if (!Number.isInteger(reps) || reps < 1 || reps > 100) return toast.error("Repetições devem ficar entre 1 e 100.");
    if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 600) return toast.error("Carga inválida.");
    if (!Number.isFinite(restSec) || restSec < 0 || restSec > 600) return toast.error("Descanso inválido.");

    const nextExercises = editingExId
      ? activeWorkout.exercises.map((ex) =>
          ex.id === editingExId
            ? { ...ex, name: cleanName, sets, reps, weightKg, restSec, completedSets: Math.min(ex.completedSets, sets) }
            : ex,
        )
      : [
          ...activeWorkout.exercises,
          { id: makeId("ex"), name: cleanName, sets, reps, weightKg, restSec, completedSets: 0 },
        ];

    updateExercises.mutate({ workoutId: activeWorkout.id, exercises: nextExercises });
    setExName("");
    setEditingExId(null);
    toast.success(editingExId ? "Exercício ajustado." : "Exercício adicionado.");
  };

  const startEdit = (ex: WorkoutExercise) => {
    setEditingExId(ex.id);
    setExName(ex.name);
    setExSets(String(ex.sets));
    setExReps(String(ex.reps));
    setExWeight(String(ex.weightKg));
    setExRest(String(ex.restSec));
  };

  const adjustWeight = (exId: string, delta: number) => {
    if (!activeWorkout) return;
    const next = activeWorkout.exercises.map((ex) =>
      ex.id === exId ? { ...ex, weightKg: Math.max(0, Number((ex.weightKg + delta).toFixed(1))) } : ex,
    );
    updateExercises.mutate({ workoutId: activeWorkout.id, exercises: next });
  };

  const toggleSet = (exId: string, setIndex: number) => {
    if (!activeWorkout) return;
    const next = activeWorkout.exercises.map((ex) => {
      if (ex.id !== exId) return ex;
      const completedSets = ex.completedSets === setIndex ? setIndex - 1 : setIndex;
      return { ...ex, completedSets };
    });
    updateExercises.mutate({ workoutId: activeWorkout.id, exercises: next });
  };

  const removeExercise = (exId: string) => {
    if (!activeWorkout) return;
    const next = activeWorkout.exercises.filter((ex) => ex.id !== exId);
    updateExercises.mutate({ workoutId: activeWorkout.id, exercises: next });
  };

  const resetCompleted = () => {
    if (!activeWorkout) return;
    const next = activeWorkout.exercises.map((ex) => ({ ...ex, completedSets: 0 }));
    updateExercises.mutate({ workoutId: activeWorkout.id, exercises: next });
    toast.success("Séries reiniciadas para o próximo treino.");
  };

  const totalVolume = activeWorkout
    ? activeWorkout.exercises.reduce(
        (sum, ex) => sum + calculateExerciseVolume(ex.sets, ex.reps, ex.weightKg),
        0,
      )
    : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b border-border pb-4">
        <h1 className="page-title text-3xl font-medium">Treinos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monte suas divisões de treino, ajuste cargas rapidamente e marque séries concluídas.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createWorkout.mutate();
        }}
        className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="workout-name">Nova ficha</Label>
          <Input
            id="workout-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Treino A — Empurrar"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workout-focus">Foco muscular (opcional)</Label>
          <Input
            id="workout-focus"
            value={newFocus}
            onChange={(e) => setNewFocus(e.target.value)}
            placeholder="Ex.: Peito, ombros e tríceps"
          />
        </div>
        <Button type="submit" disabled={createWorkout.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          Criar ficha
        </Button>
      </form>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Carregando treinos...</p>
      ) : workouts.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Crie sua primeira ficha acima para começar a montar seus exercícios.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            {workouts.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setSelectedId(w.id);
                  setEditingExId(null);
                }}
                className={cn(
                  "rounded-lg border px-3.5 py-2 text-left text-sm transition-colors",
                  activeWorkout?.id === w.id
                    ? "border-primary bg-accent font-medium text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {w.name}
              </button>
            ))}
          </div>

          {activeWorkout && (
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="page-title text-2xl font-medium">{activeWorkout.name}</h2>
                  {activeWorkout.focus && (
                    <p className="text-sm text-muted-foreground">{activeWorkout.focus}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="metric-num rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    Volume: {totalVolume.toLocaleString("pt-BR")} kg
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={resetCompleted}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reiniciar séries
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir ficha"
                    onClick={() => deleteWorkout.mutate(activeWorkout.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              {activeWorkout.exercises.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Nenhum exercício nesta ficha. Adicione o primeiro abaixo.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {activeWorkout.exercises.map((ex) => (
                    <li key={ex.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{ex.name}</p>
                        <p className="metric-num mt-0.5 text-xs text-muted-foreground">
                          {ex.sets}×{ex.reps} · descanso {ex.restSec}s
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Array.from({ length: ex.sets }, (_, i) => i + 1).map((n) => {
                            const done = n <= ex.completedSets;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => toggleSet(ex.id, n)}
                                className={cn(
                                  "metric-num inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors",
                                  done
                                    ? "border-success bg-success text-success-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-primary",
                                )}
                                aria-label={`Série ${n} de ${ex.name}`}
                              >
                                {done ? <Check className="h-3.5 w-3.5" /> : n}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-md border border-border bg-background">
                          <button
                            type="button"
                            onClick={() => adjustWeight(ex.id, -2.5)}
                            aria-label={`Reduzir carga de ${ex.name}`}
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="metric-num min-w-[68px] text-center text-sm font-medium">
                            {ex.weightKg} kg
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustWeight(ex.id, 2.5)}
                            aria-label={`Aumentar carga de ${ex.name}`}
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Ajustar ${ex.name}`}
                          onClick={() => startEdit(ex)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${ex.name}`}
                          onClick={() => removeExercise(ex.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form
                onSubmit={saveExercise}
                className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-[1.6fr_repeat(4,80px)_auto] sm:items-end"
              >
                <div className="space-y-1">
                  <Label htmlFor="ex-name">{editingExId ? "Ajustar exercício" : "Exercício"}</Label>
                  <Input
                    id="ex-name"
                    value={exName}
                    onChange={(e) => setExName(e.target.value)}
                    placeholder="Ex.: Supino reto com barra"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ex-sets">Séries</Label>
                  <Input id="ex-sets" type="number" min={1} max={20} value={exSets} onChange={(e) => setExSets(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ex-reps">Reps</Label>
                  <Input id="ex-reps" type="number" min={1} max={100} value={exReps} onChange={(e) => setExReps(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ex-weight">Carga kg</Label>
                  <Input id="ex-weight" type="number" step="0.5" min={0} max={600} value={exWeight} onChange={(e) => setExWeight(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ex-rest">Desc. (s)</Label>
                  <Input id="ex-rest" type="number" min={0} max={600} value={exRest} onChange={(e) => setExRest(e.target.value)} required />
                </div>
                <Button type="submit">{editingExId ? "Salvar ajuste" : "Adicionar"}</Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}