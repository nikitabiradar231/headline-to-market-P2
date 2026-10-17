import React from 'react';
import {
  AlertOctagon,
  HelpCircle,
  ArrowRight,
  Edit2,
  Terminal,
  ShieldAlert,
} from 'lucide-react';
import { MarketDraftRecord } from '../../shared/types.js';
import { UnresolvableOutcome } from '../../shared/schema.js';

interface UnresolvableCardProps {
  draft: MarketDraftRecord;
  onApplyRevision: (revisedHeadline: string) => void;
  onDraftManually: () => void;
}

export const UnresolvableCard: React.FC<UnresolvableCardProps> = ({
  draft,
  onApplyRevision,
  onDraftManually,
}) => {
  const payload = draft.currentPayload as UnresolvableOutcome;
  const isInjection = payload.reasonCode === 'prompt_injection_attempt';

  return (
    <div className="glass-panel p-6 mb-6 border-rose-500/40 bg-gradient-to-b from-slate-900/90 to-rose-950/10">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-rose-900/30">
        <div className="flex items-center gap-3">
          <span className="badge badge-unresolvable flex items-center gap-1.5">
            {isInjection ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            )}
            Cannot Resolve Fairly
          </span>

          <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
            Category: {payload.reasonCode}
          </span>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Draft ID: {draft.id.slice(0, 8)}
        </div>
      </div>

      {/* Source Headline Quote */}
      <div className="my-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Submitted Headline
        </div>
        <div className="font-serif text-sm text-slate-200 italic">
          "{draft.headline}"
        </div>
      </div>

      {/* Rejection Reason */}
      <div className="mb-5 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4" />
          Editorial Rejection Explanation
        </h4>
        <p className="text-sm leading-relaxed mt-1 text-slate-200">{payload.reason}</p>
      </div>

      {/* Suggested Revision Box */}
      {payload.suggestedRevision && (
        <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 mb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5" />
            Suggested Headline Revision
          </div>
          <p className="font-serif text-sm text-slate-200 italic my-2">
            "{payload.suggestedRevision}"
          </p>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onApplyRevision(payload.suggestedRevision!)}
              className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>Use Suggested Revision</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Fallback Manual Drafting option */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Know the specific missing metrics or official announcement date?
        </span>
        <button
          onClick={onDraftManually}
          className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Draft Manually Anyway</span>
        </button>
      </div>
    </div>
  );
};
