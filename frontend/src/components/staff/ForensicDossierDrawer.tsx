import React, { useState, useEffect } from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBanner } from '../common/ErrorBanner';
import { fraudApi } from '../../api/fraud';
import { ForensicDossierResponse } from '../../types/api';
import { getErrorMessage } from '../../api/client';
import {
  X,
  ShieldAlert,
  GitBranch,
  Scale,
  Clock,
  FileText,
  Flame,
} from 'lucide-react';

interface ForensicDossierDrawerProps {
  alertId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAlertReviewed?: () => void;
}

export const ForensicDossierDrawer: React.FC<ForensicDossierDrawerProps> = ({
  alertId,
  isOpen,
  onClose,
  onAlertReviewed,
}) => {
  const [dossier, setDossier] = useState<ForensicDossierResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Staff note form
  const [noteType, setNoteType] = useState<'OBSERVATION' | 'HYPOTHESIS' | 'CORROBORATING_EVIDENCE' | 'RESOLUTION_RATIONALE'>('OBSERVATION');
  const [noteContent, setNoteContent] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);

  // Review determination form
  const [reviewStatus, setReviewStatus] = useState<'CLEARED' | 'CONFIRMED_FRAUD' | 'ESCALATED'>('CLEARED');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && alertId) {
      loadDossier(alertId);
    } else {
      setDossier(null);
      setError(null);
    }
  }, [isOpen, alertId]);

  const loadDossier = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fraudApi.getDossier(id);
      setDossier(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertId || !noteContent.trim()) return;

    setIsAddingNote(true);
    try {
      await fraudApi.addInvestigationNote(alertId, {
        note_type: noteType,
        content: noteContent.trim(),
      });
      setNoteContent('');
      loadDossier(alertId);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleReviewDetermination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertId) return;

    setIsSubmittingReview(true);
    try {
      await fraudApi.reviewAlert(alertId, {
        review_status: reviewStatus,
        review_notes: reviewNotes.trim() || undefined,
      });
      loadDossier(alertId);
      onAlertReviewed?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-forensic-900 border-l border-forensic-700 shadow-2xl flex flex-col font-sans">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-forensic-850 border-b border-forensic-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Forensic Investigation Dossier
              </h3>
              <p className="text-[10px] text-sage-300 font-mono">
                Evidence-first audit linking predictions, ledger legs, and findings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-forensic-750 text-sage-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <ErrorBanner message={error} />}

          {isLoading || !dossier ? (
            <div className="flex items-center justify-center p-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Alert & Model Assessment Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-forensic-850 border border-forensic-700 shadow-xs">
                  <span className="text-[10px] uppercase text-sage-400 block font-bold">Risk Score</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span className="text-base font-bold text-white tabular-nums">
                      {(parseFloat(String(dossier.alert.risk_score)) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-sage-400 font-mono">({<span>{dossier.alert.risk_score}</span>})</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-forensic-850 border border-forensic-700 shadow-xs">
                  <span className="text-[10px] uppercase text-sage-400 block font-bold">Decision</span>
                  <span className="text-xs font-semibold text-white block mt-1.5">
                    {dossier.alert.decision}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-forensic-850 border border-forensic-700 shadow-xs">
                  <span className="text-[10px] uppercase text-sage-400 block font-bold">Review Status</span>
                  <span className="text-xs font-semibold text-white block mt-1.5">
                    {dossier.alert.review_status}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-forensic-850 border border-forensic-700 shadow-xs">
                  <span className="text-[10px] uppercase text-sage-400 block font-bold">Model Version</span>
                  <span className="text-xs text-sage-200 block mt-1.5 truncate">
                    {dossier.alert.model_version}
                  </span>
                </div>
              </div>

              {/* Advisory Explanation Banner */}
              <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 text-xs shadow-xs">
                <span className="font-bold text-white block mb-1 font-mono uppercase text-[10px]">Statistical Rationale:</span>
                <p className="text-sage-200 leading-relaxed font-sans text-xs">{dossier.alert.explanation}</p>
                {dossier.alert.rule_flags && dossier.alert.rule_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 font-mono">
                    {dossier.alert.rule_flags.map((flag, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-forensic-900 border border-forensic-700 text-amber-300 font-semibold">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Authoritative PostgreSQL Double-Entry Ledger Legs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    Double-Entry Ledger Legs (PostgreSQL Source of Truth)
                  </h4>
                  <Badge variant="evergreen" size="sm">
                    Balanced Posting
                  </Badge>
                </div>

                <div className="rounded-xl border border-forensic-700 overflow-hidden bg-forensic-900 shadow-xs">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-forensic-850 border-b border-forensic-700 text-[10px] uppercase text-sage-300 text-left font-bold">
                      <tr>
                        <th className="p-2.5"># Seq</th>
                        <th className="p-2.5">Account Number</th>
                        <th className="p-2.5">Leg Type</th>
                        <th className="p-2.5 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forensic-750">
                      {dossier.ledger_entries.map((leg) => (
                        <tr key={leg.id} className="hover:bg-forensic-800/70 transition-colors">
                          <td className="p-2.5 text-sage-400">#{leg.sequence_num}</td>
                          <td className="p-2.5 text-white">{leg.account_number}</td>
                          <td className="p-2.5 font-sans">
                            <Badge
                              variant={leg.entry_type === 'CREDIT' ? 'evergreen' : 'danger'}
                              size="sm"
                            >
                              {leg.entry_type}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right text-emerald-400 tabular-nums font-semibold">
                            {parseFloat(leg.amount).toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LedgerGraph Findings */}
              {dossier.graph_findings && dossier.graph_findings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    LedgerGraph Temporal Network Findings ({dossier.graph_findings.length})
                  </h4>
                  <div className="space-y-2 font-mono">
                    {dossier.graph_findings.map((gf) => (
                      <div
                        key={gf.id}
                        className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 text-xs space-y-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{gf.pattern_type}</span>
                          <Badge
                            variant={
                              gf.severity === 'CRITICAL'
                                ? 'danger'
                                : gf.severity === 'SUSPICIOUS'
                                ? 'warning'
                                : 'info'
                            }
                            size="sm"
                          >
                            Score: {gf.heuristic_score} ({gf.severity})
                          </Badge>
                        </div>
                        <p className="text-[11px] text-sage-300 font-sans">{gf.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Layer Chronological Timeline */}
              <div className="space-y-3 font-mono">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Chronological Evidentiary Timeline ({dossier.timeline.length})
                </h4>
                <div className="space-y-2.5 border-l-2 border-forensic-700 pl-4 ml-2">
                  {dossier.timeline.map((item, idx) => (
                    <div key={idx} className="relative text-xs space-y-1">
                      <div
                        className={`w-2 h-2 rounded-full absolute -left-[21px] top-1.5 ring-2 ring-forensic-900 ${
                          item.category === 'FACT'
                            ? 'bg-emerald-400'
                            : item.category === 'STATISTICAL_MODEL'
                            ? 'bg-purple-400'
                            : item.category === 'HEURISTIC_RULE'
                            ? 'bg-amber-400'
                            : 'bg-teal-400'
                        }`}
                      />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-white">
                          {item.event}
                          <span className="text-sage-400 font-normal ml-2 text-[10px]">
                            [{item.category}]
                          </span>
                        </span>
                        <span className="text-[10px] text-sage-400">
                          {new Date(item.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-sage-300 font-sans">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Forensic Notes */}
              <div className="space-y-3 font-mono">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Forensic Notes ({dossier.investigation_notes.length})
                </h4>
                <div className="space-y-2.5">
                  {dossier.investigation_notes.map((note) => (
                    <div key={note.id} className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 text-xs shadow-xs">
                      <div className="flex items-center justify-between text-[10px] text-sage-400 mb-1">
                        <span className="font-bold text-white">
                          {note.staff_username} ({note.note_type})
                        </span>
                        <span>{new Date(note.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-sage-200 text-[11px] font-sans">{note.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2 pt-3 border-t border-forensic-700">
                  <div className="flex gap-2">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="bg-forensic-950 border border-forensic-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-forest-500"
                    >
                      <option value="OBSERVATION">Observation</option>
                      <option value="HYPOTHESIS">Working Hypothesis</option>
                      <option value="CORROBORATING_EVIDENCE">Corroborating Evidence</option>
                      <option value="RESOLUTION_RATIONALE">Resolution Rationale</option>
                    </select>
                    <input
                      type="text"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add investigation observation..."
                      className="flex-1 bg-forensic-950 border border-forensic-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-sage-400/60 font-sans focus:outline-none focus:border-forest-500"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      type="submit"
                      isLoading={isAddingNote}
                      disabled={!noteContent.trim()}
                      className="font-semibold"
                    >
                      Add Note
                    </Button>
                  </div>
                </form>
              </div>

              {/* Staff Determination Action Box */}
              <div className="p-5 rounded-xl bg-forensic-850 border border-forensic-700 space-y-3 font-mono shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Staff Review Determination
                </h4>
                <form onSubmit={handleReviewDetermination} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['CLEARED', 'CONFIRMED_FRAUD', 'ESCALATED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReviewStatus(st)}
                        className={`p-2.5 rounded-lg text-xs font-bold border transition-colors ${
                          reviewStatus === st
                            ? 'bg-forest-800 border-forest-600 text-white shadow-xs'
                            : 'bg-forensic-900 border-forensic-700 text-sage-400 hover:border-forest-700 hover:text-white'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter review notes and justification..."
                    className="w-full bg-forensic-950 border border-forensic-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-sage-400/60 resize-none font-sans focus:outline-none focus:border-forest-500"
                  />

                  <div className="flex justify-end font-sans">
                    <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingReview} className="font-semibold shadow-xs">
                      Commit Determination
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
