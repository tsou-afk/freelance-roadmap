/**
 * constants.ts
 * 運用で変更したい定数を一元管理。
 * 変更する場合はこのファイルのみ編集すればOK。
 */

// ─── プラン定義 ───────────────────────────────────────────
export interface PlanDef {
  label: string;
  totalMonths: number;
  learningMonths: number;
  acquisitionMonths: number;        // 案件獲得期間
  acquisitionTotalIncome: number;   // 案件獲得期間の合計収入（万円）
}

export const PLANS: Record<number, PlanDef> = {
  3:  { label: '3ヶ月',  totalMonths: 3,  learningMonths: 2, acquisitionMonths: 1, acquisitionTotalIncome:  5 },
  4:  { label: '4ヶ月',  totalMonths: 4,  learningMonths: 2, acquisitionMonths: 2, acquisitionTotalIncome:  5 },
  5:  { label: '5ヶ月',  totalMonths: 5,  learningMonths: 4, acquisitionMonths: 1, acquisitionTotalIncome: 10 },
  6:  { label: '6ヶ月',  totalMonths: 6,  learningMonths: 4, acquisitionMonths: 2, acquisitionTotalIncome: 10 },
  9:  { label: '9ヶ月',  totalMonths: 9,  learningMonths: 8, acquisitionMonths: 1, acquisitionTotalIncome: 20 },
  10: { label: '10ヶ月', totalMonths: 10, learningMonths: 8, acquisitionMonths: 2, acquisitionTotalIncome: 20 },
};

export const PLAN_KEYS = [3, 4, 5, 6, 9, 10] as const;
export type PlanKey = typeof PLAN_KEYS[number];

// ─── 5年計画の総月数 ─────────────────────────────────────
export const TOTAL_MONTHS = 60; // 5年 = 60ヶ月

// ─── SVGキャンバスサイズ ─────────────────────────────────
export const SVG_W = 1200;
export const SVG_H = 620;
