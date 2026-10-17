import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';

interface ManualDraftModalProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const ManualDraftModal: React.FC<ManualDraftModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [headline, setHeadline] = useState('');
  const [snippet, setSnippet] = useState('');
  const [question, setQuestion] = useState('');
  const [closeAt, setCloseAt] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [resolutionSource, setResolutionSource] = useState('');
  const [resolutionSourceUrl, setResolutionSourceUrl] = useState('');
  const [yesCriteria, setYesCriteria] = useState('');
  const [noCriteria, setNoCriteria] = useState('');
  const [resolutionRules, setResolutionRules] = useState('');
  const [edgeCases, setEdgeCases] = useState('');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || !question.trim() || !closeAt.trim() || !resolutionSource.trim()) {
      setErrorMsg('Headline, question, close timestamp, and resolution source are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        headline: headline.trim(),
        snippet: snippet.trim() || undefined,
        question: question.trim(),
        closeAt: closeAt.trim(),
        resolutionSource: resolutionSource.trim(),
        resolutionSourceUrl: resolutionSourceUrl.trim() || undefined,
        yesCriteria: yesCriteria.trim() || undefined,
        noCriteria: noCriteria.trim() || undefined,
        resolutionRules: resolutionRules.trim() || undefined,
        edgeCases: edgeCases.trim() || undefined,
        rationale: rationale.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create manual draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <PlusCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Manual Prediction Market Drafting</h3>
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Source News Headline <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. RBI MPC meeting rate decision"
              className="input-field text-xs font-serif"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Prediction Question (Yes/No format) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will the Reserve Bank of India cut the repo rate...?"
              className="input-field text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Close Timestamp (ISO 8601 with timezone) <span className="text-rose-400">*</span>
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
                Named Resolution Source <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={resolutionSource}
                onChange={(e) => setResolutionSource(e.target.value)}
                placeholder="e.g. Reserve Bank of India (rbi.org.in)"
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
                placeholder="Exact condition for YES settlement..."
                className="input-field text-xs resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-rose-400 block mb-1">
                Conditions for NO
              </label>
              <textarea
                value={noCriteria}
                onChange={(e) => setNoCriteria(e.target.value)}
                placeholder="Exact condition for NO settlement..."
                className="input-field text-xs resize-none"
                rows={2}
              />
            </div>
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
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Manual Draft'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
