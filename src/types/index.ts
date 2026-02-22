import type { PlanKey } from '@/lib/constants';

// ─── 入力 ───────────────────────────────────────────────
export interface RoadmapInput {
  planKey: PlanKey;              // 選択プラン（3/4/5/6/9/10ヶ月）
  targetMonthlyIncome: number;   // 月◯万円（稼ぎたい金額）
  monthlySavings: number;        // 月◯万円（貯金したい金額）
  startDate: string;             // "YYYY-MM-DD"
  showGrid: boolean;             // 方眼紙背景ON/OFF
  showIcons: boolean;            // 落書きアイコンON/OFF
}

// ─── 計算結果 ─────────────────────────────────────────
export interface RoadmapData {
  planKey: PlanKey;
  totalMonths: number;
  learningMonths: number;
  acquisitionMonths: number;     // 案件獲得期間
  freelanceMonths: number;       // フリーランス期間（= 60 - totalMonths）
  // 入力値
  targetMonthlyIncome: number;
  monthlySavings: number;
  // 集計
  acquisitionIncomePerMonth: number; // 案件獲得期間の平均月収（万円）
  acquisitionTotalIncome: number;    // 案件獲得期間の合計収入見込み（万円）
  totalSavings: number;           // フリーランス期間の貯金合計（万円）
  // 日付
  startDate: Date;
  learningEndDate: Date;
  graduationDate: Date;          // 案件獲得期間終了 = 卒業日
  // オプション
  showGrid: boolean;
  showIcons: boolean;
}
