'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import InputForm from '@/components/InputForm';
import type { RoadmapInput, RoadmapData } from '@/types';
import { calculateRoadmap } from '@/lib/calculator';
import styles from './page.module.css';

// roughjs は DOM 依存なので SSR を無効化
const RoadmapPreview = dynamic(
  () => import('@/components/RoadmapPreview'),
  { ssr: false }
);

export default function Home() {
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);

  function handleGenerate(input: RoadmapInput) {
    setRoadmapData(calculateRoadmap(input));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          🚀 フリーランスロードマップ ジェネレーター
        </h1>
        <p className={styles.headerSub}>
          入力するだけで、あなた専用の手書き風ロードマップが完成！
        </p>
      </header>

      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <InputForm onGenerate={handleGenerate} />
        </aside>
        <section className={styles.preview}>
          <RoadmapPreview data={roadmapData} />
        </section>
      </main>
    </div>
  );
}
