import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Viz Collector",
  description: "データ可視化コンテンツ収集ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="border-b bg-white px-6 py-3 shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Data Viz Collector
            </Link>
            <div className="flex gap-6 text-sm font-medium text-gray-600">
              <Link href="/publishers" className="hover:text-blue-600 transition-colors">
                パブリッシャー
              </Link>
              <Link href="/sources" className="hover:text-blue-600 transition-colors">
                ソース
              </Link>
              <Link href="/contents" className="hover:text-blue-600 transition-colors">
                コンテンツ
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
