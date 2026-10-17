import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { MarketDraftRecord } from '../../shared/types.js';

interface DiscardConfirmModalProps {
  draft: MarketDraftRecord;
  onClose: () => void;
  onConfirmDiscard: (id: string) => Promise<void>;
}

export const DiscardConfirmModal: React.FC<DiscardConfirmModalProps> = ({
  draft,
  onClose,
  onConfirmDiscard,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDiscard = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmDiscard(draft.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Discard Market Draft?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Are you sure you want to discard this draft? Discarding marks the draft as archived
          and locks it from further editing or approval.
        </p>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-serif text-slate-300 italic mb-5">
          "{draft.headline}"
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
            disabled={isSubmitting}
            onClick={handleDiscard}
            className="btn btn-discard text-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Discarding...' : 'Yes, Discard Draft'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
