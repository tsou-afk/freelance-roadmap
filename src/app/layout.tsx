import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'フリーランスロードマップ ジェネレーター',
  description: '入力するだけで手書き風ロードマップを自動生成',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        {/* 手書き風日本語フォント */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Yomogi&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
