import React, { useState } from 'react';
import { X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { MarketDraftRecord } from '../../shared/types.js';
import { MarketDraftOutcome } from '../../shared/schema.js';

interface ApproveConfirmModalProps {
  draft: MarketDraftRecord;
  onClose: () => void;
  onConfirmApprove: (id: string) => Promise<void>;
}

export const ApproveConfirmModal: React.FC<ApproveConfirmModalProps> = ({
  draft,
  onClose,
  onConfirmApprove,
}) => {
  const payload = draft.currentPayload as MarketDraftOutcome;

  const [checkFuture, setCheckFuture] = useState(false);
  const [checkSource, setCheckSource] = useState(false);
  const [checkCriteria, setCheckCriteria] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canApprove = checkFuture && checkSource && checkCriteria;

  const handleApprove = async () => {
    if (!canApprove) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirmApprove(draft.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Editor Approval Verification</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Publishing Proposal
          </div>
          <div className="text-sm font-semibold text-white leading-snug">
            {payload.question}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex flex-col gap-1 border-t border-slate-800 pt-2 font-mono">
            <span>Close: {payload.closeAt}</span>
            <span>Source: {payload.resolutionSource}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mb-5 space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Mandatory Editor Safety Checklist
          </div>

          <label className="flex items-start gap-2.5 p-2.5 rounded bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={checkFuture}
              onChange={(e) => setCheckFuture(e.target.checked)}
              className="mt-0.5 rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
            />
            <span className="text-xs text-slate-300">
              I have verified the deadline is in the future and gives traders adequate participation time.
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={checkSource}
              onChange={(e) => setCheckSource(e.target.checked)}
              className="mt-0.5 rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
            />
            <span className="text-xs text-slate-300">
              I have confirmed the named resolution source is authoritative and publicly accessible.
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={checkCriteria}
              onChange={(e) => setCheckCriteria(e.target.checked)}
              className="mt-0.5 rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0"
            />
            <span className="text-xs text-slate-300">
              I have checked YES/NO criteria and edge cases to ensure mutual exclusivity and fair settlement.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canApprove || isSubmitting}
            onClick={handleApprove}
            className="btn btn-approve text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Approving...' : 'Confirm & Publish Market'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
