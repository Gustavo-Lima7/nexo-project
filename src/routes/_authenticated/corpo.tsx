import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculateBodyMass } from "@/lib/fitness-math";
import { fetchCalorieProfile, fetchWeightLogs, todayIso } from "@/lib/nexo-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/corpo")({
  head: () => ({
    meta: [
      { title: "Massa e peso — Nexo" },
      { name: "description", content: "Calcule IMC, massa magra e acompanhe a evolução do peso no Nexo." },
      { property: "og:title", content: "Massa e peso — Nexo" },
      { property: "og:description", content: "Cálculo de IMC, composição corporal e histórico de peso na nuvem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BodyMassPage,
});

function BodyMassPage() {
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["weight-logs"],
    queryFn: fetchWeightLogs,
  });
  const { data: profile } = useQuery({
    queryKey: ["calorie-profile"],
    queryFn: fetchCalorieProfile,
  });

  const [date, setDate] = useState(todayIso);
  const [weightInput, setWeightInput] = useState("78");
  const [heightInput, setHeightInput] = useState("178");
  const [bodyFatInput, setBodyFatInput] = useState("");

  useEffect(() => {
    if (profile) setHeightInput(String(profile.heightCm));
  }, [profile]);

  useEffect(() => {
    const latest = logs.at(-1);
    if (latest) {
      setWeightInput(String(latest.weightKg));
      if (latest.bodyFatPercent !== null) setBodyFatInput(String(latest.bodyFatPercent));
    }
  }, [logs.length]);

  const parsedWeight = Number(weightInput);
  const parsedHeight = Number(heightInput);
  const parsedBodyFat = bodyFatInput.trim() === "" ? null : Number(bodyFatInput);
  const bodyResult = calculateBodyMass(parsedWeight, parsedHeight, parsedBodyFat);

  const addLog = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(parsedWeight) || parsedWeight < 25 || parsedWeight > 350) {
        throw new Error("Informe um peso entre 25 kg e 350 kg.");
      }
      if (parsedBodyFat !== null && (!Number.isFinite(parsedBodyFat) || parsedBodyFat < 3 || parsedBodyFat > 65)) {
        throw new Error("Percentual de gordura deve ficar entre 3% e 65%.");
      }
      const { error } = await supabase.from("weight_logs").insert({
        log_date: date,
        weight_kg: Number(parsedWeight.toFixed(1)),
        body_fat_percent: parsedBodyFat !== null ? Number(parsedBodyFat.toFixed(1)) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      toast.success("Medição salva no histórico.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao salvar medição."),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-logs"] });
      toast.success("Registro removido.");
    },
    onError: () => toast.error("Erro ao remover registro."),
  });

  const chartData = logs.map((l) => ({
    label: l.date.slice(5).split("-").reverse().join("/"),
    peso: l.weightKg,
  }));

  const firstLog = logs[0];
  const lastLog = logs.at(-1);
  const totalDelta =
    firstLog && lastLog && logs.length > 1
      ? Number((lastLog.weightKg - firstLog.weightKg).toFixed(1))
      : null;

  return (
    <div className="doc-canvas space-y-8">
      <div className="border-b border-border pb-4">
        <h1 className="page-title text-3xl font-medium">Massa e peso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calcule IMC, faixa saudável e massa magra/gorda, e acompanhe sua evolução corporal.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="page-title text-xl font-medium">Cálculo e nova medição</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addLog.mutate();
          }}
          className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="body-date">Data</Label>
            <Input id="body-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body-weight">Peso (kg)</Label>
            <Input
              id="body-weight"
              type="number"
              step="0.1"
              min={25}
              max={350}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body-height">Altura (cm)</Label>
            <Input
              id="body-height"
              type="number"
              min={100}
              max={250}
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body-fat">% Gordura (opcional)</Label>
            <Input
              id="body-fat"
              type="number"
              step="0.1"
              min={3}
              max={65}
              value={bodyFatInput}
              onChange={(e) => setBodyFatInput(e.target.value)}
              placeholder="Ex.: 17.5"
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={addLog.isPending}>
              <Plus className="mr-1.5 h-4 w-4" />
              {addLog.isPending ? "Salvando..." : "Registrar medição"}
            </Button>
          </div>
        </form>

        {bodyResult ? (
          <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">IMC</p>
              <p className="metric-num mt-1 text-2xl font-semibold text-primary">{bodyResult.bmi}</p>
              <p className="text-xs text-muted-foreground">{bodyResult.classification}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faixa saudável (IMC 18,5–24,9)</p>
              <p className="metric-num mt-1 text-xl font-semibold">
                {bodyResult.idealMinKg} – {bodyResult.idealMaxKg} kg
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Composição corporal</p>
              {bodyResult.leanMassKg !== null && bodyResult.fatMassKg !== null ? (
                <p className="metric-num mt-1 text-sm font-medium">
                  Magra: {bodyResult.leanMassKg} kg · Gorda: {bodyResult.fatMassKg} kg
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Preencha o % de gordura para ver massa magra e gorda.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-destructive">Informe peso (25–350 kg) e altura (100–250 cm) válidos.</p>
        )}
      </section>

      {chartData.length >= 2 && (
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="page-title text-xl font-medium">Evolução de peso</h2>
            {totalDelta !== null && (
              <span className="metric-num text-xs text-muted-foreground">
                Variação total: {totalDelta > 0 ? `+${totalDelta}` : totalDelta} kg
              </span>
            )}
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="page-title text-xl font-medium">Histórico registrado</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando histórico...</p>
        ) : logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma medição registrada ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {[...logs].reverse().map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="metric-num text-sm font-medium">
                    {entry.weightKg} kg
                    {entry.bodyFatPercent !== null ? ` · ${entry.bodyFatPercent}% gordura` : ""}
                  </p>
                  <p className="metric-num text-xs text-muted-foreground">
                    {entry.date.split("-").reverse().join("/")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir medição"
                  onClick={() => deleteLog.mutate(entry.id)}
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