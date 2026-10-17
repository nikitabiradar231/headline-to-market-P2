import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { HeadlineInputPanel } from './components/HeadlineInputPanel.js';
import { DraftResultCard } from './components/DraftResultCard.js';
import { UnresolvableCard } from './components/UnresolvableCard.js';
import { EditDraftModal } from './components/EditDraftModal.js';
import { ApproveConfirmModal } from './components/ApproveConfirmModal.js';
import { DiscardConfirmModal } from './components/DiscardConfirmModal.js';
import { ManualDraftModal } from './components/ManualDraftModal.js';
import { HistorySidebar } from './components/HistorySidebar.js';
import { MarketDraftRecord } from '../shared/types.js';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const [drafts, setDrafts] = useState<MarketDraftRecord[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<MarketDraftRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    code?: string;
    canRetry?: boolean;
    lastHeadline?: string;
    lastSnippet?: string;
  } | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Load existing drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
        if (data.drafts && data.drafts.length > 0 && !selectedDraft) {
          setSelectedDraft(data.drafts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load drafts:', err);
    }
  };

  const handleGenerate = async (headline: string, snippet?: string) => {
    setIsLoading(true);
    setErrorState(null);
    try {
      const res = await fetch('/api/markets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, snippet }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorState({
          message: data.error || 'Failed to generate market draft.',
          code: data.code,
          canRetry: data.canRetry ?? true,
          lastHeadline: headline,
          lastSnippet: snippet,
        });
        return;
      }

      // Add to drafts list and set as selected
      setDrafts((prev) => [data.draft, ...prev]);
      setSelectedDraft(data.draft);
    } catch (err: any) {
      setErrorState({
        message: err.message || 'Network error occurred while contacting prediction desk service.',
        canRetry: true,
        lastHeadline: headline,
        lastSnippet: snippet,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async (id: string, updates: Record<string, any>) => {
    const res = await fetch(`/api/markets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update draft');
    }

    setDrafts((prev) => prev.map((d) => (d.id === id ? data.draft : d)));
    setSelectedDraft(data.draft);
  };

  const handleConfirmApprove = async (id: string) => {
    const res = await fetch(`/api/markets/${id}/approve`, {
      method: 'POST',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to approve draft');
    }

    setDrafts((prev) => prev.map((d) => (d.id === id ? data.draft : d)));
    setSelectedDraft(data.draft);
  };

  const handleConfirmDiscard = async (id: string) => {
    const res = await fetch(`/api/markets/${id}/discard`, {
      method: 'POST',
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to discard draft');
    }

    setDrafts((prev) => prev.map((d) => (d.id === id ? data.draft : d)));
    setSelectedDraft(data.draft);
  };

  const handleManualCreate = async (payload: any) => {
    const res = await fetch('/api/markets/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create manual draft');
    }

    setDrafts((prev) => [data.draft, ...prev]);
    setSelectedDraft(data.draft);
  };

  // Compute desk stats
  const stats = {
    total: drafts.length,
    drafts: drafts.filter((d) => d.status === 'draft').length,
    approved: drafts.filter((d) => d.status === 'approved').length,
    unresolvable: drafts.filter((d) => d.status === 'unresolvable').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header stats={stats} onOpenManualModal={() => setIsManualModalOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Editorial Workspace (8 Cols) */}
          <div className="lg:col-span-8">
            <HeadlineInputPanel onGenerate={handleGenerate} isLoading={isLoading} />

            {/* Visible Error Fallback State */}
            {errorState && (
              <div className="glass-panel p-6 mb-6 border-rose-500/50 bg-rose-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-rose-300">
                      Market Draft Generation Fallback
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {errorState.message}
                    </p>
                    {errorState.code && (
                      <span className="inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/40 text-rose-300 border border-rose-800">
                        Code: {errorState.code}
                      </span>
                    )}

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-rose-900/40">
                      {errorState.canRetry && (
                        <button
                          onClick={() =>
                            handleGenerate(errorState.lastHeadline || '', errorState.lastSnippet)
                          }
                          className="btn btn-secondary text-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Generation</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="btn btn-primary text-xs flex items-center gap-1.5"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Draft Manually Instead</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Draft Result Card */}
            {selectedDraft ? (
              selectedDraft.outcomeType === 'market' ? (
                <DraftResultCard
                  draft={selectedDraft}
                  onEdit={() => setIsEditModalOpen(true)}
                  onApprove={() => setIsApproveModalOpen(true)}
                  onDiscard={() => setIsDiscardModalOpen(true)}
                />
              ) : (
                <UnresolvableCard
                  draft={selectedDraft}
                  onApplyRevision={(revised) => handleGenerate(revised)}
                  onDraftManually={() => setIsManualModalOpen(true)}
                />
              )
            ) : (
              <div className="glass-panel p-12 text-center text-slate-400">
                <p className="text-sm">
                  No headline analyzed yet. Select a golden set preset above or paste a news headline to begin.
                </p>
              </div>
            )}
          </div>

          {/* History & Desk Log Sidebar (4 Cols) */}
          <div className="lg:col-span-4">
            <HistorySidebar
              drafts={drafts}
              selectedDraftId={selectedDraft?.id}
              onSelectDraft={(draft) => setSelectedDraft(draft)}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {isEditModalOpen && selectedDraft && (
        <EditDraftModal
          draft={selectedDraft}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
        />
      )}

      {isApproveModalOpen && selectedDraft && (
        <ApproveConfirmModal
          draft={selectedDraft}
          onClose={() => setIsApproveModalOpen(false)}
          onConfirmApprove={handleConfirmApprove}
        />
      )}

      {isDiscardModalOpen && selectedDraft && (
        <DiscardConfirmModal
          draft={selectedDraft}
          onClose={() => setIsDiscardModalOpen(false)}
          onConfirmDiscard={handleConfirmDiscard}
        />
      )}

      {isManualModalOpen && (
        <ManualDraftModal
          onClose={() => setIsManualModalOpen(false)}
          onSubmit={handleManualCreate}
        />
      )}
    </div>
  );
};
