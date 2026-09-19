import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ありか | 空間の記憶を、みんなに。",
  description: "撮影した空間のモノを、根拠画像から探す共有ワークスペース。",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
