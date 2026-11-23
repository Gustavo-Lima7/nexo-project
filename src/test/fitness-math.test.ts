import { describe, expect, it } from "vitest";
import { calculateBodyMass, calculateCalories, calculateExerciseVolume } from "@/lib/fitness-math";

describe("Cálculos de calorias e massa corporal", () => {
  it("calcula TMB, TDEE e meta de déficit corretamente pela fórmula Mifflin-St Jeor", () => {
    const res = calculateCalories({
      sex: "masculino",
      age: 28,
      weightKg: 78,
      heightCm: 178,
      activity: "moderado",
      goal: "deficit",
    });

    expect(res).not.toBeNull();
    expect(res?.bmr).toBe(1758);
    expect(res?.tdee).toBe(2725);
    expect(res?.targetCalories).toBe(2325);
    expect(res?.proteinGrams).toBe(156);
  });

  it("rejeita valores fora de faixa na calculadora de calorias", () => {
    expect(
      calculateCalories({
        sex: "feminino",
        age: 5,
        weightKg: 60,
        heightCm: 165,
        activity: "leve",
        goal: "manutencao",
      }),
    ).toBeNull();
  });

  it("calcula IMC, classificação e massa magra/gorda quando % de gordura é informado", () => {
    const res = calculateBodyMass(80, 180, 20);
    expect(res).toEqual({
      bmi: 24.7,
      classification: "Peso adequado",
      idealMinKg: 59.9,
      idealMaxKg: 80.7,
      leanMassKg: 64,
      fatMassKg: 16,
    });
  });

  it("calcula volume de exercício e zera valores inválidos", () => {
    expect(calculateExerciseVolume(4, 10, 60)).toBe(2400);
    expect(calculateExerciseVolume(0, 10, 60)).toBe(0);
    expect(calculateExerciseVolume(4, 10, -5)).toBe(0);
  });
});