export type Sex = "masculino" | "feminino";
export type ActivityLevel = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";
export type CalorieGoal = "deficit" | "manutencao" | "superavit";

export interface CalorieProfile {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: CalorieGoal;
}

export interface CalorieResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
}

export interface BodyMassResult {
  bmi: number;
  classification: string;
  idealMinKg: number;
  idealMaxKg: number;
  leanMassKg: number | null;
  fatMassKg: number | null;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  atleta: 1.9,
};

const GOAL_DELTA: Record<CalorieGoal, number> = {
  deficit: -400,
  manutencao: 0,
  superavit: 300,
};

export function calculateCalories(profile: CalorieProfile): CalorieResult | null {
  const { sex, age, weightKg, heightCm, activity, goal } = profile;
  if (
    !Number.isFinite(age) ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    age < 12 ||
    age > 110 ||
    weightKg < 25 ||
    weightKg > 350 ||
    heightCm < 100 ||
    heightCm > 250
  ) {
    return null;
  }

  const sexOffset = sex === "masculino" ? 5 : -161;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);
  const targetCalories = Math.max(1200, tdee + GOAL_DELTA[goal]);
  const proteinGrams = Math.round(weightKg * 2);
  const fatGrams = Math.round(weightKg * 0.8);
  const remainingKcal = Math.max(0, targetCalories - proteinGrams * 4 - fatGrams * 9);
  const carbGrams = Math.round(remainingKcal / 4);

  return { bmr, tdee, targetCalories, proteinGrams, fatGrams, carbGrams };
}

export function calculateBodyMass(
  weightKg: number,
  heightCm: number,
  bodyFatPercent?: number | null,
): BodyMassResult | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    weightKg < 25 ||
    weightKg > 350 ||
    heightCm < 100 ||
    heightCm > 250
  ) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  const idealMinKg = Number((18.5 * heightM * heightM).toFixed(1));
  const idealMaxKg = Number((24.9 * heightM * heightM).toFixed(1));

  let classification = "Peso adequado";
  if (bmi < 18.5) classification = "Abaixo do peso";
  else if (bmi < 25) classification = "Peso adequado";
  else if (bmi < 30) classification = "Sobrepeso";
  else classification = "Obesidade";

  let leanMassKg: number | null = null;
  let fatMassKg: number | null = null;
  if (
    bodyFatPercent !== undefined &&
    bodyFatPercent !== null &&
    Number.isFinite(bodyFatPercent) &&
    bodyFatPercent >= 3 &&
    bodyFatPercent <= 65
  ) {
    fatMassKg = Number(((weightKg * bodyFatPercent) / 100).toFixed(1));
    leanMassKg = Number((weightKg - fatMassKg).toFixed(1));
  }

  return { bmi, classification, idealMinKg, idealMaxKg, leanMassKg, fatMassKg };
}

export function calculateExerciseVolume(sets: number, reps: number, weightKg: number): number {
  if (sets <= 0 || reps <= 0 || weightKg < 0) return 0;
  return Math.round(sets * reps * weightKg);
}