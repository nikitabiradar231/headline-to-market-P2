import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { MarketDraftRecord } from '../../shared/types.js';
import { MarketDraftOutcome } from '../../shared/schema.js';

interface EditDraftModalProps {
  draft: MarketDraftRecord;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, any>) => Promise<void>;
}

export const EditDraftModal: React.FC<EditDraftModalProps> = ({
  draft,
  onClose,
  onSave,
}) => {
  const current = (draft.currentPayload || {}) as Partial<MarketDraftOutcome>;

  const [question, setQuestion] = useState(current.question || draft.headline);
  const [closeAt, setCloseAt] = useState(
    current.closeAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [resolutionSource, setResolutionSource] = useState(current.resolutionSource || '');
  const [resolutionSourceUrl, setResolutionSourceUrl] = useState(current.resolutionSourceUrl || '');
  const [yesCriteria, setYesCriteria] = useState(current.yesCriteria || '');
  const [noCriteria, setNoCriteria] = useState(current.noCriteria || '');
  const [resolutionRules, setResolutionRules] = useState(current.resolutionRules || '');
  const [edgeCases, setEdgeCases] = useState(current.edgeCases || '');
  const [rationale, setRationale] = useState(current.rationale || '');
  const [editorNotes, setEditorNotes] = useState(draft.editorNotes || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMsg('Question is required.');
      return;
    }
    if (!resolutionSource.trim()) {
      setErrorMsg('Resolution source is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(draft.id, {
        question: question.trim(),
        closeAt: closeAt.trim(),
        resolutionSource: resolutionSource.trim(),
        resolutionSourceUrl: resolutionSourceUrl.trim() || undefined,
        yesCriteria: yesCriteria.trim(),
        noCriteria: noCriteria.trim(),
        resolutionRules: resolutionRules.trim(),
        edgeCases: edgeCases.trim(),
        rationale: rationale.trim(),
        editorNotes: editorNotes.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h3 className="text-base font-bold text-white">Edit Market Draft</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Prediction Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input-field text-sm font-serif resize-none"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Close Timestamp (ISO 8601 with explicit timezone)
              </label>
              <input
                type="text"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
                placeholder="2027-04-11T23:59:00Z"
                className="input-field text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Resolution Source (Named Authority)
              </label>
              <input
                type="text"
                value={resolutionSource}
                onChange={(e) => setResolutionSource(e.target.value)}
                placeholder="e.g. Reserve Bank of India"
                className="input-field text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Resolution Source URL (Optional)
            </label>
            <input
              type="url"
              value={resolutionSourceUrl}
              onChange={(e) => setResolutionSourceUrl(e.target.value)}
              placeholder="https://..."
              className="input-field text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">
                Conditions for YES
              </label>
              <textarea
                value={yesCriteria}
                onChange={(e) => setYesCriteria(e.target.value)}
                className="input-field text-xs resize-none"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-rose-400 block mb-1">
                Conditions for NO
              </label>
              <textarea
                value={noCriteria}
                onChange={(e) => setNoCriteria(e.target.value)}
                className="input-field text-xs resize-none"
                rows={3}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Settlement Instructions
            </label>
            <textarea
              value={resolutionRules}
              onChange={(e) => setResolutionRules(e.target.value)}
              className="input-field text-xs resize-none"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Edge-Case Rules (Delays, Postponement, Cancellation)
            </label>
            <textarea
              value={edgeCases}
              onChange={(e) => setEdgeCases(e.target.value)}
              className="input-field text-xs resize-none"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Editor Notes / Changelog
            </label>
            <input
              type="text"
              value={editorNotes}
              onChange={(e) => setEditorNotes(e.target.value)}
              placeholder="e.g. Revised source link and tightened criteria"
              className="input-field text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Draft Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
