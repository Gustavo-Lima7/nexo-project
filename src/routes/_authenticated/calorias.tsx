import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateCalories,
  type ActivityLevel,
  type CalorieGoal,
  type CalorieProfile,
  type Sex,
} from "@/lib/fitness-math";
import {
  DEFAULT_CALORIE_PROFILE,
  fetchCalorieProfile,
  fetchMeals,
  todayIso,
} from "@/lib/nexo-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/calorias")({
  head: () => ({
    meta: [
      { title: "Calorias — Nexo" },
      { name: "description", content: "Calcule TMB, gasto calórico diário e acompanhe refeições no Nexo." },
      { property: "og:title", content: "Calorias — Nexo" },
      { property: "og:description", content: "Calculadora de calorias, macros e diário alimentar na sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaloriesPage,
});

function CaloriesPage() {
  const queryClient = useQueryClient();
  const [mealDate, setMealDate] = useState(todayIso);

  const { data: savedProfile } = useQuery({
    queryKey: ["calorie-profile"],
    queryFn: fetchCalorieProfile,
  });
  const { data: meals = [] } = useQuery({
    queryKey: ["meals", mealDate],
    queryFn: () => fetchMeals(mealDate),
  });

  const [profile, setProfile] = useState<CalorieProfile>(DEFAULT_CALORIE_PROFILE);
  const [mealName, setMealName] = useState("");
  const [mealKcal, setMealKcal] = useState("");
  const [mealProtein, setMealProtein] = useState("");

  useEffect(() => {
    if (savedProfile) setProfile(savedProfile);
  }, [savedProfile]);

  const result = calculateCalories(profile);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("Revise idade, peso e altura com valores válidos.");
      const { error } = await supabase.from("calorie_profiles").upsert(
        {
          sex: profile.sex,
          age: profile.age,
          weight_kg: profile.weightKg,
          height_cm: profile.heightCm,
          activity: profile.activity,
          goal: profile.goal,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calorie-profile"] });
      toast.success("Cálculo salvo na sua conta.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao salvar perfil."),
  });

  const addMeal = useMutation({
    mutationFn: async () => {
      const clean = mealName.trim();
      const kcal = Number(mealKcal);
      const prot = mealProtein.trim() === "" ? 0 : Number(mealProtein);
      if (!clean) throw new Error("Informe a refeição.");
      if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 10000) throw new Error("Informe calorias válidas.");
      if (!Number.isFinite(prot) || prot < 0 || prot > 500) throw new Error("Informe proteína válida.");
      const { error } = await supabase.from("meal_entries").insert({
        meal_date: mealDate,
        name: clean,
        calories: Math.round(kcal),
        protein_grams: Math.round(prot),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMealName("");
      setMealKcal("");
      setMealProtein("");
      queryClient.invalidateQueries({ queryKey: ["meals", mealDate] });
      toast.success("Refeição registrada.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao registrar refeição."),
  });

  const deleteMeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meals", mealDate] }),
    onError: () => toast.error("Erro ao remover refeição."),
  });

  const consumedKcal = meals.reduce((sum, m) => sum + m.calories, 0);
  const consumedProtein = meals.reduce((sum, m) => sum + m.proteinGrams, 0);
  const kcalPct = result ? Math.min(100, Math.round((consumedKcal / result.targetCalories) * 100)) : 0;

  return (
    <div className="doc-canvas space-y-8">
      <div className="border-b border-border pb-4">
        <h1 className="page-title text-3xl font-medium">Calorias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calcule seu gasto diário (Mifflin-St Jeor), defina sua meta e acompanhe o consumo do dia.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="page-title text-xl font-medium">Calculadora de meta diária</h2>
          <Button type="button" size="sm" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {saveProfile.isPending ? "Salvando..." : "Salvar cálculo"}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cal-sex">Sexo</Label>
            <select
              id="cal-sex"
              value={profile.sex}
              onChange={(e) => setProfile((p) => ({ ...p, sex: e.target.value as Sex }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-age">Idade (anos)</Label>
            <Input
              id="cal-age"
              type="number"
              min={12}
              max={110}
              value={profile.age}
              onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-weight">Peso (kg)</Label>
            <Input
              id="cal-weight"
              type="number"
              step="0.1"
              min={25}
              max={350}
              value={profile.weightKg}
              onChange={(e) => setProfile((p) => ({ ...p, weightKg: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-height">Altura (cm)</Label>
            <Input
              id="cal-height"
              type="number"
              min={100}
              max={250}
              value={profile.heightCm}
              onChange={(e) => setProfile((p) => ({ ...p, heightCm: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-activity">Nível de atividade</Label>
            <select
              id="cal-activity"
              value={profile.activity}
              onChange={(e) => setProfile((p) => ({ ...p, activity: e.target.value as ActivityLevel }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="sedentario">Sedentário</option>
              <option value="leve">Leve (1–2x/sem)</option>
              <option value="moderado">Moderado (3–5x/sem)</option>
              <option value="intenso">Intenso (6–7x/sem)</option>
              <option value="atleta">Muito intenso</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-goal">Objetivo</Label>
            <select
              id="cal-goal"
              value={profile.goal}
              onChange={(e) => setProfile((p) => ({ ...p, goal: e.target.value as CalorieGoal }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="deficit">Emagrecimento (-400 kcal)</option>
              <option value="manutencao">Manutenção</option>
              <option value="superavit">Ganho de massa (+300 kcal)</option>
            </select>
          </div>
        </div>

        {result ? (
          <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Taxa basal (TMB)</p>
              <p className="metric-num mt-1 text-xl font-semibold">{result.bmr} kcal</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gasto diário (TDEE)</p>
              <p className="metric-num mt-1 text-xl font-semibold">{result.tdee} kcal</p>
            </div>
            <div>
              <p className="text-xs text-primary">Meta diária</p>
              <p className="metric-num mt-1 text-xl font-semibold text-primary">{result.targetCalories} kcal</p>
              <p className="metric-num mt-1 text-xs text-muted-foreground">
                P {result.proteinGrams}g · C {result.carbGrams}g · G {result.fatGrams}g
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-destructive">Informe idade (12–110), peso (25–350 kg) e altura (100–250 cm).</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="page-title text-xl font-medium">Registro do dia</h2>
            <p className="metric-num mt-1 text-sm text-muted-foreground">
              {consumedKcal} / {result?.targetCalories ?? "—"} kcal · Proteína: {consumedProtein}g
            </p>
          </div>
          <Input
            type="date"
            aria-label="Data das refeições"
            value={mealDate}
            onChange={(e) => setMealDate(e.target.value)}
            className="w-40"
          />
        </div>

        <Progress value={kcalPct} className="mt-3 h-2" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMeal.mutate();
          }}
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_110px_110px_auto] sm:items-end"
        >
          <div className="space-y-1">
            <Label htmlFor="meal-name">Refeição</Label>
            <Input
              id="meal-name"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Ex.: Frango grelhado com arroz"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meal-kcal">Calorias</Label>
            <Input id="meal-kcal" type="number" min={1} max={10000} value={mealKcal} onChange={(e) => setMealKcal(e.target.value)} placeholder="550" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meal-protein">Proteína (g)</Label>
            <Input id="meal-protein" type="number" min={0} max={500} value={mealProtein} onChange={(e) => setMealProtein(e.target.value)} placeholder="42" />
          </div>
          <Button type="submit" disabled={addMeal.isPending}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar
          </Button>
        </form>

        {meals.length > 0 && (
          <ul className="mt-5 divide-y divide-border border-t border-border">
            {meals.map((meal) => (
              <li key={meal.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{meal.name}</p>
                  <p className="metric-num text-xs text-muted-foreground">
                    {meal.calories} kcal · {meal.proteinGrams}g proteína
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${meal.name}`}
                  onClick={() => deleteMeal.mutate(meal.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}