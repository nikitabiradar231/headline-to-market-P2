import React from 'react';
import { Newspaper, Terminal } from 'lucide-react';

interface HeaderProps {
  stats: {
    total: number;
    drafts: number;
    approved: number;
    unresolvable: number;
  };
  onOpenManualModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ stats, onOpenManualModal }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Headline to Market
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                P2 Desk
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Turn news headlines into precise, reviewable, and resolvable prediction market drafts.
            </p>
          </div>
        </div>

        {/* Status Counters & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs border border-slate-800 bg-slate-950/60 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Drafts: <strong className="text-white">{stats.drafts}</strong></span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Approved: <strong className="text-white">{stats.approved}</strong></span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Rejections: <strong className="text-white">{stats.unresolvable}</strong></span>
            </div>
          </div>

          <button
            onClick={onOpenManualModal}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Draft a market directly without AI"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Manual Draft</span>
          </button>
        </div>
      </div>
    </header>
  );
};
