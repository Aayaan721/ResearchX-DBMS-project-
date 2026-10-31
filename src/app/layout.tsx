import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ResearchX — Intelligent Research Discovery & Project Similarity Platform',
  description:
    'A university DBMS platform combining normalized PostgreSQL schemas with pgvector 384-dimensional dense semantic similarity embeddings and live OpenAlex academic paper integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="glass-panel border-t border-slate-800/80 py-6 mt-12 bg-slate-950/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-slate-200">ResearchX</span> — PES University UE23CS351A DBMS Mini Project
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                PostgreSQL 16.4 & pgvector (384-d)
              </span>
              <span>•</span>
              <span>OpenAlex API Connected</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
