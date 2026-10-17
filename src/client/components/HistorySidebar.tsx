import React, { useState } from 'react';
import { Search, Clock, CheckCircle2, AlertOctagon, Trash2, ListFilter } from 'lucide-react';
import { MarketDraftRecord } from '../../shared/types.js';
import { DraftStatus } from '../../shared/schema.js';

interface HistorySidebarProps {
  drafts: MarketDraftRecord[];
  selectedDraftId?: string;
  onSelectDraft: (draft: MarketDraftRecord) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  drafts,
  selectedDraftId,
  onSelectDraft,
}) => {
  const [activeTab, setActiveTab] = useState<DraftStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrafts = drafts.filter((d) => {
    const matchesTab = activeTab === 'all' || d.status === activeTab;
    const matchesQuery =
      searchQuery.trim() === '' ||
      d.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ('question' in d.currentPayload &&
        (d.currentPayload as any).question?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesQuery;
  });

  return (
    <div className="glass-panel p-4 flex flex-col h-full min-h-[500px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ListFilter className="w-4 h-4 text-indigo-400" />
          Desk Activity Log ({drafts.length})
        </h3>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter drafts..."
          className="input-field text-xs pl-8 py-1.5 bg-slate-900 border-slate-800"
        />
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-5 gap-1 mb-3 text-[11px] font-medium bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-1 rounded text-center transition-colors ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`py-1 rounded text-center transition-colors ${
            activeTab === 'draft'
              ? 'bg-amber-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Draft
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`py-1 rounded text-center transition-colors ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setActiveTab('unresolvable')}
          className={`py-1 rounded text-center transition-colors ${
            activeTab === 'unresolvable'
              ? 'bg-rose-600 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Rej
        </button>
        <button
          onClick={() => setActiveTab('discarded')}
          className={`py-1 rounded text-center transition-colors ${
            activeTab === 'discarded'
              ? 'bg-slate-700 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Disc
        </button>
      </div>

      {/* Drafts List */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {filteredDrafts.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No market drafts found.
          </div>
        ) : (
          filteredDrafts.map((d) => {
            const isSelected = d.id === selectedDraftId;
            return (
              <div
                key={d.id}
                onClick={() => onSelectDraft(d)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {d.status === 'draft' && (
                      <span className="badge badge-draft text-[9px] py-0 px-1.5">
                        <Clock className="w-2.5 h-2.5" /> Draft
                      </span>
                    )}
                    {d.status === 'approved' && (
                      <span className="badge badge-approved text-[9px] py-0 px-1.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                      </span>
                    )}
                    {d.status === 'unresolvable' && (
                      <span className="badge badge-unresolvable text-[9px] py-0 px-1.5">
                        <AlertOctagon className="w-2.5 h-2.5" /> Rejected
                      </span>
                    )}
                    {d.status === 'discarded' && (
                      <span className="badge badge-discarded text-[9px] py-0 px-1.5">
                        <Trash2 className="w-2.5 h-2.5" /> Discarded
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="font-serif text-xs text-slate-200 line-clamp-2">
                  {d.headline}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
