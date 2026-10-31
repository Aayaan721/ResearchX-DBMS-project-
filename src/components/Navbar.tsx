'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Sparkles, 
  PlusCircle, 
  Compass, 
  FolderGit2, 
  BookmarkCheck,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/discover', label: 'Explore Literature', icon: Compass },
    { href: '/projects', label: 'Projects', icon: FolderGit2 },
    { href: '/similarity', label: 'Find Similar', icon: Sparkles },
    { href: '/papers', label: 'Saved Papers', icon: BookmarkCheck },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:shadow-cyan-500/30 transition-all">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                    Research<span className="text-cyan-400">X</span>
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium tracking-wide rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
                    PES University
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block -mt-0.5">Intelligent Academic Platform</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-slate-800 text-white font-semibold shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Action: Prominent Submit Project Button */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-md shadow-cyan-600/20 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Submit Project</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/projects/new"
              className="p-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
              title="Submit Project"
            >
              <PlusCircle className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900/95 px-4 pt-3 pb-5 space-y-1 backdrop-blur-xl animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {link.icon && <link.icon className="h-4 w-4 text-cyan-400" />}
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-800/80">
            <Link
              href="/projects/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Submit Research Project</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
