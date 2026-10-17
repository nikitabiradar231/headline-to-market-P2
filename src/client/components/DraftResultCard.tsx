import React from 'react';
import {
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Edit3,
  Trash2,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { MarketDraftRecord } from '../../shared/types.js';
import { MarketDraftOutcome } from '../../shared/schema.js';

interface DraftResultCardProps {
  draft: MarketDraftRecord;
  onEdit: () => void;
  onApprove: () => void;
  onDiscard: () => void;
}

export const DraftResultCard: React.FC<DraftResultCardProps> = ({
  draft,
  onEdit,
  onApprove,
  onDiscard,
}) => {
  const payload = draft.currentPayload as MarketDraftOutcome;
  const isApproved = draft.status === 'approved';
  const isDiscarded = draft.status === 'discarded';

  // Calculate relative time or difference
  const closeDate = new Date(payload.closeAt);
  const isValidDate = !isNaN(closeDate.getTime());
  const now = new Date();
  const diffDays = Math.round((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`glass-panel p-6 mb-6 ${isApproved ? 'border-emerald-500/40 shadow-emerald-950/20 shadow-lg' : ''}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {draft.status === 'draft' && (
            <span className="badge badge-draft">
              <Clock className="w-3.5 h-3.5" />
              Market Draft (Pending Review)
            </span>
          )}
          {draft.status === 'approved' && (
            <span className="badge badge-approved">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved & Published
            </span>
          )}
          {draft.status === 'discarded' && (
            <span className="badge badge-discarded">
              <Trash2 className="w-3.5 h-3.5" />
              Discarded
            </span>
          )}

          <span className="text-xs text-slate-500 font-mono">ID: {draft.id.slice(0, 8)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isApproved && !isDiscarded && (
            <>
              <button
                onClick={onEdit}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Edit draft fields"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit Draft</span>
              </button>

              <button
                onClick={onApprove}
                className="btn btn-approve text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Review safety checklist and approve"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve & Publish</span>
              </button>

              <button
                onClick={onDiscard}
                className="btn btn-discard text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Discard draft"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            </>
          )}

          {isApproved && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Published on {new Date(draft.approvedAt || '').toLocaleString()}</span>
            </div>
          )}

          {isDiscarded && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-3 py-1.5 rounded-md">
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discarded on {new Date(draft.discardedAt || '').toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Original Headline Banner */}
      <div className="my-4 p-3 bg-slate-900/50 border border-slate-800/80 rounded-lg">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Source Headline
        </div>
        <div className="font-serif text-sm text-slate-200 italic">
          "{draft.headline}"
        </div>
        {draft.snippet && (
          <div className="text-xs text-slate-400 mt-1 border-t border-slate-800/60 pt-1">
            <strong>Snippet:</strong> {draft.snippet}
          </div>
        )}
      </div>

      {/* Main Question Display */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5" />
          Proposed Prediction Question
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
          {payload.question}
        </h3>
      </div>

      {/* Close Time & Resolution Source Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Close Date */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Close Date & Explicit Timezone</span>
          </div>
          <div className="text-sm font-semibold text-white font-mono">
            {isValidDate ? payload.closeAt : 'Invalid Date'}
          </div>
          {isValidDate && (
            <div className="text-xs text-slate-400 mt-1">
              Local: {closeDate.toLocaleString()} ({diffDays > 0 ? `${diffDays} days from now` : 'Past/Present'})
            </div>
          )}
        </div>

        {/* Resolution Source */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Authoritative Resolution Source</span>
          </div>
          <div className="text-sm font-semibold text-white flex items-center justify-between gap-2">
            <span>{payload.resolutionSource}</span>
            {payload.resolutionSourceUrl && (
              <a
                href={payload.resolutionSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs"
              >
                <span>Verify URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {payload.resolutionSourceUrl
              ? `Source Link: ${payload.resolutionSourceUrl}`
              : 'No direct registry URL provided. Manual editor verification required.'}
          </div>
        </div>
      </div>

      {/* YES and NO Criteria Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* YES Criteria */}
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Conditions for YES</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{payload.yesCriteria}</p>
        </div>

        {/* NO Criteria */}
        <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wide mb-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Conditions for NO</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{payload.noCriteria}</p>
        </div>
      </div>

      {/* Settlement Rules & Edge Cases */}
      <div className="space-y-3 mb-5">
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="text-xs font-semibold text-slate-300 mb-1">
            Settlement Instructions
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{payload.resolutionRules}</p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="text-xs font-semibold text-slate-300 mb-1">
            Edge-Case Handling (Postponement, Disruption & Cancellation)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{payload.edgeCases}</p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
          <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Resolvability Rationale</span>
          </div>
          <p className="text-xs text-slate-400 italic leading-relaxed">{payload.rationale}</p>
        </div>
      </div>

      {/* Validation Checks & Warnings */}
      {draft.validationReport && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Deterministic Semantic Integrity Report
          </div>

          {draft.validationReport.errors.length > 0 && (
            <div className="mb-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Pre-Approval Errors (Must be fixed before publishing):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {draft.validationReport.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {draft.validationReport.warnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Editor Review Warnings:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {draft.validationReport.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {draft.validationReport.checks?.map((chk, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                  chk.passed
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                {chk.passed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                <span>{chk.code}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
