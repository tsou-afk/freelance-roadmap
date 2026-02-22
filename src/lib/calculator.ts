/**
 * calculator.ts
 * 入力値 → ロードマップデータへの変換（純関数）
 */

import { PLANS, TOTAL_MONTHS } from './constants';
import type { RoadmapInput, RoadmapData } from '@/types';

/** 月を加算した Date を返す */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * メイン計算関数
 * バリデーション済みの入力を受け取り RoadmapData を返す。
 */
export function calculateRoadmap(input: RoadmapInput): RoadmapData {
  const plan = PLANS[input.planKey];

  const acquisitionIncomePerMonth = plan.acquisitionIncomePerMonth;
  const acquisitionTotalIncome    = acquisitionIncomePerMonth * plan.acquisitionMonths;
  const freelanceMonths = TOTAL_MONTHS - plan.totalMonths;
  const totalSavings    = input.monthlySavings * freelanceMonths;

  const startDate       = new Date(input.startDate);
  const learningEndDate = addMonths(startDate, plan.learningMonths);
  const graduationDate  = addMonths(startDate, plan.totalMonths);

  return {
    planKey: input.planKey,
    totalMonths: plan.totalMonths,
    learningMonths: plan.learningMonths,
    acquisitionMonths: plan.acquisitionMonths,
    freelanceMonths,
    targetMonthlyIncome: input.targetMonthlyIncome,
    monthlySavings: input.monthlySavings,
    acquisitionIncomePerMonth,
    acquisitionTotalIncome,
    totalSavings,
    startDate,
    learningEndDate,
    graduationDate,
    showGrid: input.showGrid,
    showIcons: input.showIcons,
  };
}

/** 入力バリデーション。エラーメッセージの辞書を返す（空=OK） */
export function validateInput(
  input: Partial<RoadmapInput>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.planKey) {
    errors.planKey = 'プランを選択してください';
  }

  if (!input.targetMonthlyIncome || input.targetMonthlyIncome < 1)
    errors.targetMonthlyIncome = '1万円以上を入力してください';
  if (input.targetMonthlyIncome && input.targetMonthlyIncome > 9999)
    errors.targetMonthlyIncome = '値が大きすぎます（〜9999万円）';

  if (input.monthlySavings === undefined || input.monthlySavings < 0)
    errors.monthlySavings = '0万円以上を入力してください';
  if (
    input.monthlySavings !== undefined &&
    input.targetMonthlyIncome !== undefined &&
    input.monthlySavings > input.targetMonthlyIncome
  )
    errors.monthlySavings = '稼ぎたい金額以下にしてください';

  return errors;
}
