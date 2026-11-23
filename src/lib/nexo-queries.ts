import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ActivityLevel, CalorieGoal, CalorieProfile, Sex } from "./fitness-math";

export type BlockKind = "heading" | "text" | "todo" | "bullet";

export interface NoteBlock {
  id: string;
  kind: BlockKind;
  text: string;
  checked?: boolean;
}

export interface NotePage {
  id: string;
  title: string;
  blocks: NoteBlock[];
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  date: string;
  time: string;
  done: boolean;
}

export type JournalMood = "otimo" | "bem" | "neutro" | "cansado";

export interface JournalEntry {
  id: string;
  date: string;
  mood: JournalMood;
  title: string;
  content: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSec: number;
  completedSets: number;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  focus: string;
  exercises: WorkoutExercise[];
  sortOrder: number;
}

export interface MealEntry {
  id: string;
  date: string;
  name: string;
  calories: number;
  proteinGrams: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPercent: number | null;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function parseBlocks(raw: Json): NoteBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, Json> => item !== null && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const kind = item["kind"];
      const validKind: BlockKind =
        kind === "heading" || kind === "text" || kind === "todo" || kind === "bullet" ? kind : "text";
      const block: NoteBlock = {
        id: typeof item["id"] === "string" ? item["id"] : makeId("b"),
        kind: validKind,
        text: typeof item["text"] === "string" ? item["text"] : "",
      };
      if (typeof item["checked"] === "boolean") block.checked = item["checked"];
      return block;
    });
}

function parseExercises(raw: Json): WorkoutExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, Json> => item !== null && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      id: typeof item["id"] === "string" ? item["id"] : makeId("ex"),
      name: typeof item["name"] === "string" ? item["name"] : "Exercício",
      sets: typeof item["sets"] === "number" ? item["sets"] : 3,
      reps: typeof item["reps"] === "number" ? item["reps"] : 10,
      weightKg: typeof item["weightKg"] === "number" ? item["weightKg"] : 0,
      restSec: typeof item["restSec"] === "number" ? item["restSec"] : 90,
      completedSets: typeof item["completedSets"] === "number" ? item["completedSets"] : 0,
    }));
}

export async function fetchNotes(): Promise<NotePage[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, blocks, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    blocks: parseBlocks(row.blocks),
    updatedAt: row.updated_at.slice(0, 10),
  }));
}

export async function fetchReminders(): Promise<ReminderItem[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, remind_date, remind_time, done")
    .order("done", { ascending: true })
    .order("remind_date", { ascending: true })
    .order("remind_time", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.remind_date,
    time: row.remind_time,
    done: row.done,
  }));
}

export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, entry_date, mood, title, content")
    .order("entry_date", { ascending: false });
  if (error) throw error;
  return data.map((row) => {
    const mood: JournalMood =
      row.mood === "otimo" || row.mood === "bem" || row.mood === "neutro" || row.mood === "cansado"
        ? row.mood
        : "bem";
    return { id: row.id, date: row.entry_date, mood, title: row.title, content: row.content };
  });
}

export async function fetchWorkouts(): Promise<WorkoutRoutine[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, name, focus, exercises, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    focus: row.focus,
    exercises: parseExercises(row.exercises),
    sortOrder: row.sort_order,
  }));
}

export const DEFAULT_CALORIE_PROFILE: CalorieProfile = {
  sex: "masculino",
  age: 28,
  weightKg: 78,
  heightCm: 178,
  activity: "moderado",
  goal: "manutencao",
};

export async function fetchCalorieProfile(): Promise<CalorieProfile> {
  const { data, error } = await supabase
    .from("calorie_profiles")
    .select("sex, age, weight_kg, height_cm, activity, goal")
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_CALORIE_PROFILE;
  const sex: Sex = data.sex === "feminino" ? "feminino" : "masculino";
  const activity: ActivityLevel =
    data.activity === "sedentario" ||
    data.activity === "leve" ||
    data.activity === "moderado" ||
    data.activity === "intenso" ||
    data.activity === "atleta"
      ? data.activity
      : "moderado";
  const goal: CalorieGoal =
    data.goal === "deficit" || data.goal === "superavit" ? data.goal : "manutencao";
  return {
    sex,
    age: data.age,
    weightKg: Number(data.weight_kg),
    heightCm: data.height_cm,
    activity,
    goal,
  };
}

export async function fetchMeals(date: string): Promise<MealEntry[]> {
  const { data, error } = await supabase
    .from("meal_entries")
    .select("id, meal_date, name, calories, protein_grams")
    .eq("meal_date", date)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    date: row.meal_date,
    name: row.name,
    calories: row.calories,
    proteinGrams: row.protein_grams,
  }));
}

export async function fetchWeightLogs(): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("id, log_date, weight_kg, body_fat_percent")
    .order("log_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    date: row.log_date,
    weightKg: Number(row.weight_kg),
    bodyFatPercent: row.body_fat_percent !== null ? Number(row.body_fat_percent) : null,
  }));
}