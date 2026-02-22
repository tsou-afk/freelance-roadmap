/**
 * svgGenerator.ts  v4
 * ─────────────────────────────────────────────────────────
 * 変更点（v4）
 *  - Canvas measureText による正確なテキスト幅計測
 *  - fitFontSize / wrapText で自動縮小 & 自動改行
 *  - 全要素をアンカー定数から相対配置
 *  - 計算ボックスを 4 列（案件収入 / 月収目標 / 月貯金 / 5年貯金合計）
 *  - 万円フォーマットにカンマ区切りを追加
 */

import rough from 'roughjs';
import type { RoadmapData } from '@/types';
import { SVG_W, SVG_H, TOTAL_MONTHS } from './constants';

// ════════════════════════════════════════════════════════════
// ▌ Layout anchors  — ここだけ変えれば全体が追従する
// ════════════════════════════════════════════════════════════
const PAD_L    = 80;
const PAD_R    = 70;
const CHART_W  = SVG_W - PAD_L - PAD_R;   // 1050

const TITLE_Y      = 40;
const UNDERLINE_Y  = 50;
const AXIS_Y       = 108;
const BAR_TOP      = 132;
const BAR_H        = 130;
const BAR_BOTTOM   = BAR_TOP + BAR_H;       // 262
const GRAD_BANNER_OFFSET  = 54;             // バナー上端 = BAR_BOTTOM + 54（「仕事やめる？」バブルと重ならないよう下げる）
const GRAD_BANNER_H       = 32;
const ICON_OFFSET  = 56;                    // スティック人形 cy = BAR_BOTTOM + ICON_OFFSET
const CALC_OFFSET_NO_ICON = 100;            // バナーが下に移動した分を反映
const CALC_OFFSET_ICON    = 120;
const BOX_GAP      = 14;
const BOX_H        = 90;
const BOX_COUNT    = 4;
const BOX_W        = Math.floor((CHART_W - BOX_GAP * (BOX_COUNT - 1)) / BOX_COUNT); // ~252
const MEMO_H       = 24;
const MEMO_PAD_B   = 12;

// ════════════════════════════════════════════════════════════
// ▌ Canvas テキスト計測ユーティリティ
// ════════════════════════════════════════════════════════════

let _ctx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!_ctx) {
    _ctx = document.createElement('canvas').getContext('2d')!;
  }
  return _ctx;
}

/** sans-serif でフォントサイズ size px のテキスト幅を返す（Yomogi は等幅に近いので安全マージン×1.05） */
function measureW(str: string, size: number, weight = 'bold'): number {
  const ctx = getMeasureCtx();
  ctx.font = `${weight} ${size}px sans-serif`;
  return ctx.measureText(str).width * 1.05;
}

/** maxWidth に収まる最大フォントサイズを返す */
function fitFontSize(
  str: string,
  maxWidth: number,
  startSize: number,
  minSize = 8,
  weight = 'bold'
): number {
  for (let s = startSize; s >= minSize; s--) {
    if (measureW(str, s, weight) <= maxWidth) return s;
  }
  return minSize;
}

/** テキストを maxWidth に収まるように行分割する（日本語対応・文字単位） */
function wrapText(str: string, maxWidth: number, size: number, weight = 'bold'): string[] {
  const ctx = getMeasureCtx();
  ctx.font = `${weight} ${size}px sans-serif`;
  if (ctx.measureText(str).width * 1.05 <= maxWidth) return [str];

  const lines: string[] = [];
  let line = '';
  // スペースや句読点で区切れる場合は単語単位、そうでなければ文字単位
  for (const char of str) {
    const test = line + char;
    if (ctx.measureText(test).width * 1.05 > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 万円の数値をカンマ付き文字列に変換 */
function fmtMan(n: number): string {
  return n.toLocaleString() + '万円';
}

// ════════════════════════════════════════════════════════════
// ▌ SVG DOM ヘルパー
// ════════════════════════════════════════════════════════════

type RoughOpts = Parameters<ReturnType<typeof rough.svg>['rectangle']>[4];
const NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function svgText(
  content: string, x: number, y: number,
  opts: { size?: number; anchor?: 'start' | 'middle' | 'end'; fill?: string;
          weight?: string; opacity?: number; rotate?: number } = {}
): SVGTextElement {
  const el = svgEl('text', {
    x, y,
    'text-anchor': opts.anchor ?? 'middle',
    'font-family': "'Yomogi', cursive",
    'font-size':   opts.size ?? 14,
    fill:          opts.fill ?? '#333',
    'font-weight': opts.weight ?? 'normal',
    opacity:       opts.opacity ?? 1,
  });
  if (opts.rotate !== undefined) {
    el.setAttribute('transform', `rotate(${opts.rotate}, ${x}, ${y})`);
  }
  el.textContent = content;
  return el;
}

// ════════════════════════════════════════════════════════════
// ▌ テキストブロック描画（自動縮小 + 自動改行 + 中央揃え）
// ════════════════════════════════════════════════════════════

/**
 * ボックス内に1行のテキストを描画。
 * maxWidth に収まるようフォントを自動縮小し、さらに収まらない場合は折り返す。
 * @returns 実際に使用した行高さ合計（次のテキストのY計算に使用）
 */
function drawFitText(
  svg: SVGSVGElement,
  str: string,
  cx: number, y: number,
  maxWidth: number,
  size: number,
  fill: string,
  weight = 'bold',
  minSize = 8
): number {
  const fs = fitFontSize(str, maxWidth, size, minSize, weight);
  const lines = wrapText(str, maxWidth, fs, weight);
  const lineH = fs + 5;
  for (const line of lines) {
    svg.appendChild(svgText(line, cx, y, { size: fs, fill, weight, anchor: 'middle' }));
    y += lineH;
  }
  return lines.length * lineH;
}

// ════════════════════════════════════════════════════════════
// ▌ 落書きアイコン
// ════════════════════════════════════════════════════════════

function stickFigure(
  rc: ReturnType<typeof rough.svg>,
  cx: number, cy: number, color = '#FF6B00'
): SVGGElement {
  const g = svgEl('g', {});
  const o: RoughOpts = { stroke: color, strokeWidth: 2, roughness: 2, bowing: 0 };
  g.appendChild(rc.circle(cx, cy - 22, 16, { ...o, fill: 'none' }));
  g.appendChild(rc.line(cx, cy - 14, cx, cy + 10, o));
  g.appendChild(rc.line(cx - 12, cy - 4, cx + 12, cy - 4, o));
  g.appendChild(rc.line(cx, cy + 10, cx - 10, cy + 26, o));
  g.appendChild(rc.line(cx, cy + 10, cx + 10, cy + 26, o));
  return g;
}

function sparkle(x: number, y: number, color = '#F59E0B'): SVGGElement {
  const g = svgEl('g', {});
  for (const [x1, y1, x2, y2] of [[0,-8,0,8],[8,0,-8,0],[6,-6,-6,6],[-6,-6,6,6]] as [number,number,number,number][]) {
    g.appendChild(svgEl('line', {
      x1: x+x1, y1: y+y1, x2: x+x2, y2: y+y2,
      stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round',
    }));
  }
  return g;
}

// ════════════════════════════════════════════════════════════
// ▌ 吹き出し
// ════════════════════════════════════════════════════════════

function speechBubble(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  label: string, tipX: number, tipY: number,
  dir: 'down' | 'up' = 'down', fillColor = '#FFF8F0'
): void {
  const bw  = Math.max(measureW(label, 13) + 28, 80);
  const bh  = 32;
  const by  = dir === 'down' ? tipY - bh - 14 : tipY + 14;
  const bx  = Math.max(PAD_L, Math.min(SVG_W - PAD_R - bw, tipX - bw / 2));
  const arX = Math.min(bx + bw - 10, Math.max(bx + 10, tipX));

  svg.appendChild(rc.rectangle(bx, by, bw, bh, {
    fill: fillColor, fillStyle: 'solid',
    stroke: '#FF6B00', strokeWidth: 1.8, roughness: 2,
  }));
  const py = dir === 'down' ? by + bh : by;
  svg.appendChild(svgEl('polygon', {
    points: `${arX-7},${py} ${arX+7},${py} ${arX},${dir==='down' ? py+12 : py-12}`,
    fill: fillColor, stroke: '#FF6B00', 'stroke-width': 1.5,
  }));
  svg.appendChild(svgText(label, bx + bw / 2, by + bh / 2 + 5,
    { size: 13, fill: '#E65100', weight: 'bold' }));
}

// ════════════════════════════════════════════════════════════
// ▌ 卒業マイルストーン（縦仕切り線 + バナー）
// ════════════════════════════════════════════════════════════

function graduationMilestone(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  x: number
): void {
  // フェーズをまたぐ縦の仕切り線
  svg.appendChild(rc.line(x, BAR_TOP - 6, x, BAR_BOTTOM + 6, {
    stroke: '#388E3C', strokeWidth: 2.8, roughness: 1.6,
  }));
  // バナー（右側）
  const bx = x + 4;
  const by = BAR_BOTTOM + GRAD_BANNER_OFFSET;
  svg.appendChild(rc.rectangle(bx, by, 108, GRAD_BANNER_H, {
    fill: '#E8F5E9', fillStyle: 'solid',
    stroke: '#388E3C', strokeWidth: 2, roughness: 2.2,
  }));
  svg.appendChild(svgText('🎓 卒業！', bx + 54, by + GRAD_BANNER_H - 8,
    { size: 13, fill: '#1B5E20', weight: 'bold' }));
}

// ════════════════════════════════════════════════════════════
// ▌ バー内ラベル（幅に応じて水平 / 縦書き / 省略）
// ════════════════════════════════════════════════════════════

function barLabel(
  svg: SVGSVGElement,
  barX: number, barW: number,
  line1: string, line2: string,
  color1: string, color2: string
): void {
  const cx = barX + barW / 2;
  const cy = BAR_TOP + BAR_H / 2;
  const innerW = barW - 8;

  if (barW >= 80) {
    // 水平テキスト 2 行
    drawFitText(svg, line1, cx, cy - 12, innerW, 14, color1);
    drawFitText(svg, line2, cx, cy + 14, innerW, 22, color2);
  } else if (barW >= 22) {
    // 縦書き（-90° 回転）
    const label   = `${line1} ${line2}`;
    const fontSize = fitFontSize(label, BAR_H - 8, Math.min(12, Math.floor(barW * 0.72)));
    svg.appendChild(svgText(label, cx, cy, {
      size: fontSize, fill: color1, weight: 'bold', rotate: -90,
    }));
  }
  // barW < 22 → テキスト省略（バーの色で識別）
}

// ════════════════════════════════════════════════════════════
// ▌ 情報ボックス描画（Canvas 計測 + 自動縮小・改行）
// ════════════════════════════════════════════════════════════

interface BoxSpec {
  label:      string;   // 小見出し
  formulaStr: string;   // 計算式行（中段）
  resultStr:  string;   // 結果行（下段・大きく）
  subStr?:    string;   // サブテキスト（最下段・小さく）
  fill:       string;
  stroke:     string;
  formulaColor: string;
  resultColor:  string;
  subColor?:    string;
}

function drawInfoBox(
  svg: SVGSVGElement, rc: ReturnType<typeof rough.svg>,
  bx: number, by: number, bw: number, bh: number,
  spec: BoxSpec
): void {
  svg.appendChild(rc.rectangle(bx, by, bw, bh, {
    fill: spec.fill, fillStyle: 'solid',
    stroke: spec.stroke, strokeWidth: 2, roughness: 2,
  }));

  const cx    = bx + bw / 2;
  const innerW = bw - 16;

  // ─ 小見出し（固定 11px）
  const labelFs = fitFontSize(spec.label, innerW, 11, 8, 'normal');
  svg.appendChild(svgText(spec.label, cx, by + 16, { size: labelFs, fill: '#888', weight: 'normal' }));

  // ─ 計算式行
  const fmlFs    = fitFontSize(spec.formulaStr, innerW, 13, 8);
  const fmlLines = wrapText(spec.formulaStr, innerW, fmlFs);
  const fmlLineH = fmlFs + 4;

  // ─ 結果行
  const resFs    = fitFontSize(spec.resultStr, innerW, 19, 8);
  const resLines = wrapText(spec.resultStr, innerW, resFs);
  const resLineH = resFs + 4;

  // ─ サブテキスト（あれば）
  const subFs = spec.subStr ? fitFontSize(spec.subStr, innerW, 10, 7, 'normal') : 0;

  // ─ 垂直中央に配置
  const usedH = fmlLines.length * fmlLineH + resLines.length * resLineH + (spec.subStr ? subFs + 6 : 0);
  let y = by + 22 + (bh - 22 - usedH) / 2 + fmlFs;

  for (const l of fmlLines) {
    svg.appendChild(svgText(l, cx, y, { size: fmlFs, fill: spec.formulaColor, weight: 'bold' }));
    y += fmlLineH;
  }
  for (const l of resLines) {
    svg.appendChild(svgText(l, cx, y, { size: resFs, fill: spec.resultColor, weight: 'bold' }));
    y += resLineH;
  }
  if (spec.subStr && spec.subColor) {
    svg.appendChild(svgText(spec.subStr, cx, y + 2, { size: subFs, fill: spec.subColor, weight: 'normal' }));
  }
}

// ════════════════════════════════════════════════════════════
// ▌ 月数 → X 座標（5年スケール）
// ════════════════════════════════════════════════════════════

function mX(month: number): number {
  return PAD_L + (month / TOTAL_MONTHS) * CHART_W;
}

function monthsToYearStr(months: number): string {
  const yr = Math.floor(months / 12);
  const mo = months % 12;
  return mo === 0 ? `${yr}年` : `${yr}年${mo}ヶ月`;
}

// ════════════════════════════════════════════════════════════
// ▌ メイン生成関数
// ════════════════════════════════════════════════════════════

export function generateSVGElement(data: RoadmapData): SVGSVGElement {
  const { totalMonths, learningMonths, acquisitionMonths, freelanceMonths } = data;

  const svg = svgEl('svg', {
    width: SVG_W, height: SVG_H,
    viewBox: `0 0 ${SVG_W} ${SVG_H}`,
    xmlns: NS,
  }) as SVGSVGElement;

  const rc = rough.svg(svg);

  // ── defs (グリッドパターン) ──────────────────────────────
  const defs = svgEl('defs', {});
  const pat  = svgEl('pattern', { id: 'grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  pat.appendChild(svgEl('line', { x1:0, y1:20, x2:20, y2:20, stroke:'#C5D8F1', 'stroke-width':0.6 }));
  pat.appendChild(svgEl('line', { x1:20, y1:0, x2:20, y2:20, stroke:'#C5D8F1', 'stroke-width':0.6 }));
  defs.appendChild(pat);
  svg.appendChild(defs);

  const style = svgEl('style', {});
  (style as SVGStyleElement).textContent =
    "@import url('https://fonts.googleapis.com/css2?family=Yomogi&display=swap');";
  svg.appendChild(style);

  // ── 背景 ────────────────────────────────────────────────
  svg.appendChild(svgEl('rect', { width: SVG_W, height: SVG_H, fill: '#FFFDF8' }));
  if (data.showGrid) {
    svg.appendChild(svgEl('rect', { width: SVG_W, height: SVG_H, fill: 'url(#grid)' }));
  }

  // ── タイトル（TITLE_Y アンカー） ────────────────────────
  svg.appendChild(svgText('フリーランス 5年ロードマップ', SVG_W / 2, TITLE_Y,
    { size: 26, fill: '#2D1B00', weight: 'bold' }));
  svg.appendChild(rc.line(160, UNDERLINE_Y, 1040, UNDERLINE_Y,
    { stroke: '#FF6B00', strokeWidth: 2.5, roughness: 2.5 }));
  const startLabel = data.startDate.toLocaleDateString('ja-JP',
    { year: 'numeric', month: 'long', day: 'numeric' });
  svg.appendChild(svgText(`開始日: ${startLabel}`, SVG_W - PAD_R, TITLE_Y - 14,
    { size: 11, fill: '#888', anchor: 'end' }));

  // ── 時間軸（AXIS_Y アンカー） ───────────────────────────
  svg.appendChild(rc.line(PAD_L - 12, AXIS_Y, SVG_W - PAD_R + 12, AXIS_Y,
    { stroke: '#555', strokeWidth: 2, roughness: 1.2, bowing: 0.5 }));
  svg.appendChild(rc.linearPath([
    [SVG_W - PAD_R + 2, AXIS_Y - 6],
    [SVG_W - PAD_R + 14, AXIS_Y],
    [SVG_W - PAD_R + 2, AXIS_Y + 6],
  ], { stroke: '#555', strokeWidth: 2, roughness: 1 }));

  // 年マーカー（現在 / 1年 / … / 5年）
  for (let yr = 0; yr <= 5; yr++) {
    const x = mX(yr * 12);
    svg.appendChild(svgEl('line', { x1:x, y1:AXIS_Y-7, x2:x, y2:AXIS_Y+7, stroke:'#555', 'stroke-width':2 }));
    svg.appendChild(svgText(yr === 0 ? '現在' : `${yr}年`, x, AXIS_Y - 13,
      { size: 12, fill: '#444', weight: 'bold' }));
  }
  // フェーズ境界の小ティック
  for (const [m, col] of [[learningMonths, '#FF6B00'], [totalMonths, '#388E3C']] as [number, string][]) {
    const x = mX(m);
    svg.appendChild(svgEl('line', { x1:x, y1:AXIS_Y-4, x2:x, y2:AXIS_Y+4, stroke:col, 'stroke-width':2 }));
  }

  // ── フェーズバー（BAR_TOP アンカー） ─────────────────────
  const lX = mX(0);
  const lW = mX(learningMonths) - lX;
  const aX = mX(learningMonths);
  const aW = mX(totalMonths) - aX;
  const fX = mX(totalMonths);
  const fW = mX(TOTAL_MONTHS) - fX;

  // 学習期間（オレンジ）
  svg.appendChild(rc.rectangle(lX, BAR_TOP, lW, BAR_H, {
    fill: '#FFE0B2', fillStyle: 'solid', stroke: '#FF6B00', strokeWidth: 2.2, roughness: 2.2, bowing: 1,
  }));
  // 案件獲得期間（アンバー）
  svg.appendChild(rc.rectangle(aX, BAR_TOP, aW, BAR_H, {
    fill: '#FFF9C4', fillStyle: 'solid', stroke: '#F59E0B', strokeWidth: 2, roughness: 2.2, bowing: 1,
  }));
  // フリーランス期間（ティール）
  svg.appendChild(rc.rectangle(fX, BAR_TOP, fW, BAR_H, {
    fill: '#E0F7FA', fillStyle: 'solid', stroke: '#00ACC1', strokeWidth: 2.2, roughness: 2, bowing: 0.5,
  }));

  // ── バー内ラベル ─────────────────────────────────────────
  barLabel(svg, lX, lW, '学習期間',    `${learningMonths}ヶ月`,    '#E65100', '#BF360C');
  barLabel(svg, aX, aW, '案件獲得期間', `${acquisitionMonths}ヶ月`, '#B8860B', '#A0522D');

  // フリーランス期間（常に広いので水平・3 行）
  const fCX = fX + fW / 2;
  const fCY = BAR_TOP + BAR_H / 2;
  const fInnerW = fW - 24;
  drawFitText(svg, 'フリーランス期間', fCX, fCY - 26, fInnerW, 18, '#006064');
  drawFitText(svg, `${freelanceMonths}ヶ月（${monthsToYearStr(freelanceMonths)}）`, fCX, fCY, fInnerW, 15, '#00838F');
  drawFitText(svg, `目標: 月 ${data.targetMonthlyIncome}万円`, fCX, fCY + 26, fInnerW, 14, '#00838F');

  // ── 吹き出し ─────────────────────────────────────────────
  if (lW >= 58) {
    speechBubble(svg, rc, '学習終わり！🎉', mX(learningMonths), BAR_TOP - 2, 'down');
  }
  speechBubble(svg, rc, '仕事やめる？', mX(totalMonths), BAR_BOTTOM, 'up', '#FFFDE7');

  // ── 卒業マイルストーン（BAR_BOTTOM アンカー） ─────────────
  graduationMilestone(svg, rc, mX(totalMonths));

  // ── 落書きアイコン ───────────────────────────────────────
  if (data.showIcons) {
    svg.appendChild(stickFigure(rc, PAD_L + 22, BAR_BOTTOM + ICON_OFFSET, '#FF6B00'));
    svg.appendChild(sparkle(fX + fW * 0.15, BAR_TOP - 16, '#00ACC1'));
    svg.appendChild(sparkle(fX + fW * 0.40, BAR_TOP - 20, '#0097A7'));
    svg.appendChild(sparkle(fX + fW * 0.72, BAR_TOP - 16, '#00BCD4'));
  }

  // ── 4 列 計算ボックス（CALC_TOP アンカー） ───────────────
  const calcTop = BAR_BOTTOM + (data.showIcons ? CALC_OFFSET_ICON : CALC_OFFSET_NO_ICON);

  const boxes: BoxSpec[] = [
    {
      label:        '案件獲得期間の収入見込み',
      formulaStr:   `平均 ${data.acquisitionIncomePerMonth}万円 × ${acquisitionMonths}ヶ月`,
      resultStr:    `＝ ${fmtMan(data.acquisitionTotalIncome)}`,
      fill:         '#FFF8E1', stroke: '#F59E0B',
      formulaColor: '#B8860B', resultColor: '#E65100',
    },
    {
      label:        '卒業後の月収目標',
      formulaStr:   `月 ${fmtMan(data.targetMonthlyIncome)}`,
      resultStr:    'フリーランス達成！',
      fill:         '#E8F5E9', stroke: '#388E3C',
      formulaColor: '#2E7D32', resultColor: '#4CAF50',
      subStr: '', subColor: '',
    },
    {
      label:        '月貯金目標',
      formulaStr:   `月 ${fmtMan(data.monthlySavings)}`,
      resultStr:    '将来への投資💪',
      fill:         '#FFF3E0', stroke: '#FF6B00',
      formulaColor: '#FF6B00', resultColor: '#FF9500',
    },
    {
      label:        '5年間の貯金合計',
      formulaStr:   `月${data.monthlySavings}万円 × ${freelanceMonths}ヶ月`,
      resultStr:    `＝ ${fmtMan(data.totalSavings)}`,
      subStr:       'フリーランス期間の積み立て',
      fill:         '#EDE7F6', stroke: '#7B1FA2',
      formulaColor: '#6A1B9A', resultColor: '#4A148C',
      subColor:     '#9C27B0',
    },
  ];

  boxes.forEach((spec, i) => {
    const bx = PAD_L + i * (BOX_W + BOX_GAP);
    drawInfoBox(svg, rc, bx, calcTop, BOX_W, BOX_H, spec);
  });

  // ── プランメモ（SVG 下端アンカー） ─────────────────────
  const memoY    = SVG_H - MEMO_PAD_B - MEMO_H;
  const memoW    = 520;
  const memoText = `${totalMonths}ヶ月プラン（学習${learningMonths}m + 案件${acquisitionMonths}m + フリーランス${freelanceMonths}m）= 5年計画`;
  svg.appendChild(rc.rectangle(PAD_L, memoY, memoW, MEMO_H, {
    fill: '#FFF3E0', fillStyle: 'solid', stroke: '#FF6B00', strokeWidth: 1.5, roughness: 2,
  }));
  const memoFs = fitFontSize(memoText, memoW - 14, 10, 7, 'normal');
  svg.appendChild(svgText(memoText, PAD_L + memoW / 2, memoY + MEMO_H - 7,
    { size: memoFs, fill: '#E65100', weight: 'normal' }));

  return svg;
}
