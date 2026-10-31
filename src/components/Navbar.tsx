'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Database, 
  FolderGit2, 
  Search, 
  BookOpen, 
  Sparkles, 
  PlusCircle, 
  Layers 
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Layers },
    { href: '/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/projects/new', label: 'Submit Project', icon: PlusCircle },
    { href: '/discover', label: 'Discover Papers', icon: Search },
    { href: '/papers', label: 'Saved Papers', icon: BookOpen },
    { href: '/similarity', label: 'Vector Similarity', icon: Sparkles },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Research<span className="text-cyan-400">X</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  pgvector
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Intelligent Research Platform</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-cyan-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* University Project Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden lg:block">
              <span className="text-xs font-semibold text-slate-200 block">PES University</span>
              <span className="text-[10px] text-slate-400 block font-mono">UE23CS351A DBMS</span>
            </div>
            <Link
              href="/projects/new"
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-colors"
              title="Submit Project"
            >
              <PlusCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-800 gap-2 scrollbar-none bg-slate-950/40">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                isActive
                  ? 'bg-brand-600/20 text-cyan-300 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
