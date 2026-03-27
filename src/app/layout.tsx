import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "調整くん - スケジュール調整ツール",
  description: "みんなの予定をサクッと調整。候補日を出して、◯△×で回答するだけ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-sumi/10 bg-shironeri/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-aka flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm group-hover:shadow-md transition-shadow">
                調
              </div>
              <div>
                <h1 className="font-serif text-lg font-bold text-sumi tracking-wide leading-tight">
                  調整くん
                </h1>
                <p className="text-[10px] text-usuzumi tracking-widest">
                  SCHEDULE COORDINATOR
                </p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t border-sumi/10 py-6 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-xs text-usuzumi">
            調整くん — みんなの予定をサクッと調整
          </div>
        </footer>
      </body>
    </html>
  );
}
