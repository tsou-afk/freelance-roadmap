'use client';

import { useState, useEffect } from 'react';
import type { RoadmapInput } from '@/types';
import { validateInput } from '@/lib/calculator';
import { PLANS, PLAN_KEYS, type PlanKey } from '@/lib/constants';
import styles from './InputForm.module.css';

interface Props {
  onGenerate: (input: RoadmapInput) => void;
}

const today = new Date().toISOString().split('T')[0];

export default function InputForm({ onGenerate }: Props) {
  const [planKey, setPlanKey]   = useState<PlanKey | null>(null);
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState('40');
  const [monthlySavings, setMonthlySavings] = useState('25');
  const [startDate, setStartDate] = useState(today);
  const [showGrid,  setShowGrid]  = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初回：デフォルトで6ヶ月プランを選択して生成
  useEffect(() => {
    setPlanKey(6);
    onGenerate({
      planKey: 6,
      targetMonthlyIncome: 40,
      monthlySavings: 25,
      startDate: today,
      showGrid: true,
      showIcons: true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit() {
    const input = {
      planKey: planKey ?? undefined,
      targetMonthlyIncome: Number(targetMonthlyIncome),
      monthlySavings: Number(monthlySavings),
    };
    const errs = validateInput(input as Partial<RoadmapInput>);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onGenerate({
      planKey: planKey!,
      targetMonthlyIncome: Number(targetMonthlyIncome),
      monthlySavings: Number(monthlySavings),
      startDate: startDate || today,
      showGrid,
      showIcons,
    });
  }

  return (
    <div className={styles.form}>
      <h2 className={styles.title}>📝 入力フォーム</h2>

      {/* ── プラン選択 */}
      <div className={styles.field}>
        <label className={styles.label}>📅 プランを選択</label>
        <div className={styles.planGrid}>
          {PLAN_KEYS.map(key => {
            const plan = PLANS[key];
            const selected = planKey === key;
            return (
              <button
                key={key}
                type="button"
                className={`${styles.planCard} ${selected ? styles.planCardSelected : ''}`}
                onClick={() => setPlanKey(key)}
              >
                <span className={styles.planCheck}>✓</span>
                <div className={styles.planMonths}>{key}</div>
                <div className={styles.planUnit}>ヶ月プラン</div>
                <div className={styles.planDetail}>
                  学習 {plan.learningMonths}ヶ月
                </div>
                <div className={styles.planDetail}>
                  案件 {plan.acquisitionMonths}ヶ月
                </div>
              </button>
            );
          })}
        </div>
        {errors.planKey && (
          <p className={styles.error}>{errors.planKey}</p>
        )}
      </div>

      {/* ── 稼ぎたい金額 */}
      <div className={styles.field}>
        <label className={styles.label}>💰 稼ぎたい金額</label>
        <div className={styles.inputRow}>
          <span className={styles.prefix}>月</span>
          <input
            type="number"
            className={styles.input}
            value={targetMonthlyIncome}
            min={1}
            max={9999}
            onChange={e => setTargetMonthlyIncome(e.target.value)}
          />
          <span className={styles.unit}>万円</span>
        </div>
        {errors.targetMonthlyIncome && (
          <p className={styles.error}>{errors.targetMonthlyIncome}</p>
        )}
      </div>

      {/* ── 貯金したい金額 */}
      <div className={styles.field}>
        <label className={styles.label}>🐷 貯金したい金額</label>
        <div className={styles.inputRow}>
          <span className={styles.prefix}>月</span>
          <input
            type="number"
            className={styles.input}
            value={monthlySavings}
            min={0}
            onChange={e => setMonthlySavings(e.target.value)}
          />
          <span className={styles.unit}>万円</span>
        </div>
        {errors.monthlySavings && (
          <p className={styles.error}>{errors.monthlySavings}</p>
        )}
      </div>

      {/* ── 開始日 */}
      <div className={styles.field}>
        <label className={styles.label}>📅 開始日（任意）</label>
        <input
          type="date"
          className={styles.inputDate}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </div>

      {/* ── オプション */}
      <div className={styles.options}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={e => setShowGrid(e.target.checked)}
          />
          <span>方眼紙背景</span>
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showIcons}
            onChange={e => setShowIcons(e.target.checked)}
          />
          <span>落書きアイコン</span>
        </label>
      </div>

      <button className={styles.btn} onClick={handleSubmit}>
        🗺️ ロードマップを生成
      </button>
    </div>
  );
}
