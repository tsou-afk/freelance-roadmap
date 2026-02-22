'use client';

import { useEffect, useRef, useState } from 'react';
import type { RoadmapData } from '@/types';
import { generateSVGElement } from '@/lib/svgGenerator';
import { SVG_W, SVG_H } from '@/lib/constants';
import styles from './RoadmapPreview.module.css';
import { jsPDF } from 'jspdf';

interface Props {
  data: RoadmapData | null;
}

export default function RoadmapPreview({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);
  const [loading, setLoading] = useState(false);

  // data が変わるたびに SVG を再生成
  useEffect(() => {
    if (!data || !containerRef.current) return;
    const el = generateSVGElement(data);
    // コンテナ内を差し替え
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);
    setSvgEl(el);
  }, [data]);

  // ── SVG ダウンロード
  function downloadSVG() {
    if (!svgEl) return;
    const str = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roadmap.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── PNG ダウンロード（Canvas 経由）
  async function downloadPNG() {
    if (!svgEl) return;
    setLoading(true);
    try {
      // フォントが読み込まれていることを確認
      await document.fonts.ready;

      // SVG を Blob → Object URL
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      // 外部フォント用に xmlns 補完
      const svgFull = svgStr.replace(
        '<svg ',
        '<svg xmlns="http://www.w3.org/2000/svg" '
      );
      const blob = new Blob([svgFull], { type: 'image/svg+xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = SVG_W * 2; // 2× 高解像度
        canvas.height = SVG_H * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'roadmap.png';
          a.click();
          setLoading(false);
        }, 'image/png');
      };
      img.onerror = () => { setLoading(false); };
      img.src = url;
    } catch {
      setLoading(false);
    }
  }

  // ── PDF ダウンロード（jsPDF + SVG 画像として埋め込み）
  async function downloadPDF() {
    if (!svgEl) return;
    setLoading(true);
    try {
      await document.fonts.ready;
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url    = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = SVG_W * 2;
        canvas.height = SVG_H * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        // A4横（mm）
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pw  = pdf.internal.pageSize.getWidth();
        const ph  = pdf.internal.pageSize.getHeight();
        // アスペクト比を保ちながら A4 に収める
        const ratio = Math.min(pw / SVG_W, ph / SVG_H);
        const iw = SVG_W * ratio;
        const ih = SVG_H * ratio;
        const ox = (pw - iw) / 2;
        const oy = (ph - ih) / 2;
        pdf.addImage(imgData, 'JPEG', ox, oy, iw, ih);
        pdf.save('roadmap.pdf');
        setLoading(false);
      };
      img.onerror = () => setLoading(false);
      img.src = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.previewBox}>
        {/* SVGはここに inject される */}
        <div
          ref={containerRef}
          className={styles.svgContainer}
          style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}
        />
        {!data && (
          <div className={styles.placeholder}>
            <span>←左のフォームを入力して<br />ロードマップを生成！</span>
          </div>
        )}
      </div>

      {/* ダウンロードボタン */}
      <div className={styles.dlRow}>
        <button
          className={`${styles.dlBtn} ${styles.dlSvg}`}
          onClick={downloadSVG}
          disabled={!data || loading}
        >
          📄 SVGで保存
        </button>
        <button
          className={`${styles.dlBtn} ${styles.dlPng}`}
          onClick={downloadPNG}
          disabled={!data || loading}
        >
          🖼 PNGで保存
        </button>
        <button
          className={`${styles.dlBtn} ${styles.dlPdf}`}
          onClick={downloadPDF}
          disabled={!data || loading}
        >
          📑 PDFで保存
        </button>
      </div>
      {loading && <p className={styles.loadingMsg}>⏳ 変換中...</p>}
    </div>
  );
}
