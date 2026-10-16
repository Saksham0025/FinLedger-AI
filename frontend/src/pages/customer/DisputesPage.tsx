import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LedgerMotif } from '../../components/common/LedgerMotif';
import { DisputeResponse } from '../../types/api';
import { disputesApi } from '../../api/disputes';
import { getErrorMessage } from '../../api/client';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Clock,
  MessageSquare,
  Send,
  AlertTriangle,
  UserCheck,
  Scale,
  Lock,
} from 'lucide-react';

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeResponse[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const fetchDisputes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await disputesApi.listDisputes();
      setDisputes(data);
      if (data.length > 0 && !selectedDispute) {
        setSelectedDispute(data[0]);
      } else if (selectedDispute) {
        const updated = data.find((d: DisputeResponse) => d.id === selectedDispute.id);
        if (updated) setSelectedDispute(updated);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !noteContent.trim()) return;

    setIsSubmittingNote(true);
    try {
      const updated = await disputesApi.addNote(selectedDispute.id, { notes: noteContent.trim() });
      setSelectedDispute(updated);
      setNoteContent('');
      fetchDisputes();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning" size="sm">OPEN</Badge>;
      case 'INVESTIGATING':
        return <Badge variant="info" size="sm">INVESTIGATING</Badge>;
      case 'NEEDS_INFO':
        return <Badge variant="danger" size="sm">ACTION REQUIRED</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" size="sm">RESOLVED</Badge>;
      case 'REJECTED':
        return <Badge variant="neutral" size="sm">CLOSED</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Folio Header with Zero Overlap */}
      <div className="pb-5 border-b border-hairline space-y-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-copper-900 bg-clay-200/90 px-2.5 py-1 rounded border border-copper-300 shadow-xs">
            FOLIO // RECOURSE DOSSIER • SECTION § 06
          </span>
          <span className="text-xs text-ink-600 font-mono font-medium">
            Forensic Case Management & Transaction Inquiries
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink-950 leading-tight">
              Customer Recourse & Dispute Tracking
            </h1>
            <Badge variant="copper" size="sm">
              FORMAL INQUIRY
            </Badge>
          </div>

          <Link to="/transfers">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BookOpen className="w-4 h-4 text-forest-800" />}
              className="shadow-sm font-semibold"
            >
              Transfer Receipt Lookup
            </Button>
          </Link>
        </div>

        <p className="text-xs text-ink-600 font-sans max-w-2xl leading-relaxed">
          Formal inquiry workflow and append-only forensic case timeline for disputed or unrecognized financial movements. In compliance with ledger immutability, all determinations are recorded as permanent audit evidence.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : disputes.length === 0 ? (
        /* Meaningful, Richly Composed Green-Themed Two-Column Empty State */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Settlement Status & Action */}
          <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="bg-forest-900 text-white px-6 py-4 flex items-center justify-between border-b border-forest-950">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-forest-800 text-sage-200 border border-forest-700">
                  <LedgerMotif type="balance" size="sm" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-sage-300 font-bold block">
                    SETTLEMENT LEDGER STATUS
                  </span>
                  <h3 className="text-base font-serif font-bold text-white">
                    Zero Active Disputed Postings
                  </h3>
                </div>
              </div>
              <Badge variant="evergreen" size="sm">BALANCED</Badge>
            </div>

            <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-xs text-forest-950 leading-relaxed font-sans font-medium">
                  All debit and credit legs across your accounts are currently reconciled without open dispute notices. If you observe an unrecognized transaction, amount discrepancy, or suspicious payee, you can initiate a formal claim directly from the confirmed transfer receipt.
                </p>

                {/* Strict Non-Reversal Disclosure Inset */}
                <div className="p-4 rounded-lg bg-white border border-copper-300 text-xs text-copper-950 font-sans space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 font-bold text-copper-900 font-mono text-[10px] uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 text-copper-800" /> Statutory Non-Reversal Disclosure
                  </div>
                  <p className="leading-relaxed text-[11px] text-ink-800">
                    Filing a dispute initiates an independent compliance review. In accordance with strict double-entry ledger immutability, filing a claim <strong>never autonomously deletes or overwrites</strong> committed PostgreSQL records. Any approved compensation is posted through an explicit double-entry reversal transaction.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-eucalyptus-300">
                <Link to="/transfers">
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5 text-white" />} className="font-semibold shadow-sm w-full sm:w-auto">
                    Look Up Transfer Receipt to File Claim
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: How Case Review Operates */}
          <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="bg-forest-900 text-white px-6 py-4 flex items-center justify-between border-b border-forest-950">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-sage-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
                  Forensic Recourse & Resolution Lifecycle
                </h3>
              </div>
              <span className="text-[10px] font-mono text-sage-300">§ 3-STEP REVIEW</span>
            </div>

            <div className="p-6 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3 font-sans text-xs">
                <div className="p-3.5 rounded-lg bg-white border border-eucalyptus-200 space-y-1 shadow-xs">
                  <div className="flex items-center gap-2 text-forest-900 font-bold font-mono text-[11px]">
                    <span className="w-5 h-5 rounded-full bg-forest-800 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                    TRANSACTION IDENTIFICATION
                  </div>
                  <p className="text-forest-900/80 pl-7 text-[11px] leading-relaxed">
                    Identify the exact transaction UUID and attach relevant grounds (unauthorized payment, suspicious payee, or discrepancy).
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-eucalyptus-200 space-y-1 shadow-xs">
                  <div className="flex items-center gap-2 text-forest-900 font-bold font-mono text-[11px]">
                    <span className="w-5 h-5 rounded-full bg-forest-800 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                    FORENSIC EVIDENCE AUDIT
                  </div>
                  <p className="text-forest-900/80 pl-7 text-[11px] leading-relaxed">
                    Compliance officers examine PayeeGuard validation facts, client IP fingerprints, and LedgerGraph transaction flows.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-eucalyptus-200 space-y-1 shadow-xs">
                  <div className="flex items-center gap-2 text-forest-900 font-bold font-mono text-[11px]">
                    <span className="w-5 h-5 rounded-full bg-forest-800 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                    IMMUTABLE CASE DETERMINATION
                  </div>
                  <p className="text-forest-900/80 pl-7 text-[11px] leading-relaxed">
                    Determinations are permanently logged in the case events timeline. If upheld, compensating double-entry legs are committed immutably.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-eucalyptus-300 flex items-center justify-between text-xs font-mono text-forest-900">
                <span className="flex items-center gap-1 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-forest-800" />
                  Append-Only Case Log
                </span>
                <Link to="/accounts" className="text-forest-800 font-bold hover:underline">
                  View Accounts Passbook →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Populated Master-Detail Case Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispute Case Register (Left Column) */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-forest-900 text-white rounded-lg shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
                Active Inquiries ({disputes.length})
              </h3>
              <span className="text-[10px] font-mono text-sage-200 bg-forest-800 px-2 py-0.5 rounded border border-forest-700">
                Append-Only
              </span>
            </div>

            <div className="space-y-3">
              {disputes.map((disp) => {
                const isSelected = selectedDispute?.id === disp.id;
                return (
                  <div
                    key={disp.id}
                    onClick={() => setSelectedDispute(disp)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border space-y-2 relative ${
                      isSelected
                        ? 'surface-selected-green bg-forest-800 text-white border-2 border-forest-900 ring-2 ring-forest-800/30 shadow-md border-l-4 border-l-sage-200'
                        : 'bg-mist-100 border-2 border-eucalyptus-300 hover:border-forest-700 text-forest-950 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono font-bold text-xs truncate max-w-[170px] ${isSelected ? 'text-white' : 'text-forest-950'}`}>
                        {disp.id}
                      </span>
                      {getStatusBadge(disp.status)}
                    </div>

                    <p className={`line-clamp-2 font-sans text-xs leading-relaxed ${isSelected ? 'text-sage-100' : 'text-forest-900/90'}`}>
                      {disp.description}
                    </p>

                    <div className={`flex items-center justify-between text-[10px] font-mono pt-2 border-t ${isSelected ? 'text-sage-200 border-forest-700' : 'text-forest-800 border-eucalyptus-200'}`}>
                      <span>Tx: {disp.transfer_request_id.slice(0, 8)}...</span>
                      <span>{new Date(disp.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispute Detail Dossier (Right Column) */}
          <div className="lg:col-span-2">
            {selectedDispute ? (
              <div className="bg-mist-100 border-2 border-eucalyptus-300 rounded-xl shadow-sm overflow-hidden space-y-6">
                {/* Dossier Header Strip */}
                <div className="px-6 py-4 bg-forest-900 text-white border-b border-forest-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4 text-copper-300" />
                      <h3 className="text-base font-serif font-bold text-white">
                        Case Dossier: <span className="font-mono text-sm text-sage-200">{selectedDispute.id}</span>
                      </h3>
                    </div>
                    <p className="text-xs text-sage-200 font-sans">
                      Target Transaction UUID:{' '}
                      <code className="font-mono text-white font-bold">{selectedDispute.transfer_request_id}</code>
                    </p>
                  </div>
                  {getStatusBadge(selectedDispute.status)}
                </div>

                <div className="px-6 space-y-6">
                  {/* Claim Details Card */}
                  <div className="p-4 rounded-lg bg-white border border-eucalyptus-200 space-y-2 text-xs font-sans shadow-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-forest-800 font-mono block">
                      Customer Stated Grounds:
                    </span>
                    <p className="text-forest-950 leading-relaxed font-medium">
                      "{selectedDispute.description}"
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-forest-700 font-mono pt-2 border-t border-eucalyptus-200">
                      <span>Filed: {new Date(selectedDispute.created_at).toLocaleString('en-IN')}</span>
                      <span>Updated: {new Date(selectedDispute.updated_at).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Investigation Resolution Notice (if any) */}
                  {selectedDispute.resolution_notes && (
                    <div className="p-4 rounded-lg bg-sage-100 border border-moss-300 space-y-1.5 text-xs font-sans">
                      <div className="flex items-center gap-1.5 text-forest-900 font-bold uppercase text-[10px] font-mono">
                        <UserCheck className="w-3.5 h-3.5 text-forest-800" /> Staff Investigation Resolution Determination
                      </div>
                      <p className="text-forest-950 leading-relaxed">
                        {selectedDispute.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Append-Only Chronological Case Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest-950 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-forest-800" />
                      Chronological Investigation Timeline & Notes
                    </h4>

                    {(!selectedDispute.events || selectedDispute.events.length === 0) ? (
                      <p className="text-xs text-forest-800/80 italic p-3 bg-white rounded-lg border border-eucalyptus-200">
                        No additional supplemental events or notes recorded on this inquiry yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDispute.events.map((evt) => (
                          <div
                            key={evt.id}
                            className="p-3.5 rounded-lg bg-white border border-eucalyptus-200 space-y-1 text-xs font-sans shadow-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-forest-700">
                              <span className="font-bold text-forest-900 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-forest-700" />
                                {evt.actor_role} ({evt.event_type})
                              </span>
                              <span>{new Date(evt.created_at).toLocaleString('en-IN')}</span>
                            </div>
                            <p className="text-forest-950 leading-relaxed font-sans mt-0.5">
                              {evt.notes || `Case state transitioned${evt.to_status ? ` to ${evt.to_status}` : ''}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Append New Supplemental Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-3 pt-2 border-t border-eucalyptus-300">
                    <label className="block text-xs font-semibold text-forest-950 font-sans">
                      Append Supplemental Evidence or Customer Response:
                    </label>
                    <textarea
                      rows={3}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Provide additional transaction context, vendor receipts, or dispute clarifications..."
                      className="w-full bg-white border border-eucalyptus-300 rounded-lg p-3 text-xs text-forest-950 placeholder:text-forest-700/50 focus:outline-none focus:border-forest-800 focus:ring-1 focus:ring-forest-800 transition-colors font-sans"
                      required
                    />
                    <div className="flex justify-end pb-6">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmittingNote}
                        rightIcon={<Send className="w-3.5 h-3.5 text-white" />}
                      >
                        Append to Case Record
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-forest-800 text-xs font-sans bg-mist-100 border-2 border-eucalyptus-300 rounded-xl">
                Select a dispute case from the register to inspect forensic timeline.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
