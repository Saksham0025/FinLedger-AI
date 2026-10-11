import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DateDisplay } from '../../components/common/DateDisplay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { Modal } from '../../components/common/Modal';
import { AuditLog } from '../../types/api';
import { auditApi } from '../../api/audit';
import { getErrorMessage } from '../../api/client';
import { RefreshCw, Eye } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await auditApi.listLogs({
        action: actionFilter.trim() || undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Append-Only Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-proof forensic audit trail enforced by PostgreSQL BEFORE UPDATE OR DELETE triggers
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={fetchLogs}
          leftIcon={<RefreshCw className="w-4 h-4 text-slate-400" />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Action quick filters */}
      <div className="p-4 rounded-xl glass-panel flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-400 mr-1">Filter Action:</span>
        {[
          'ALL',
          'AUTH_LOGIN_SUCCESS',
          'AUTH_LOGIN_FAILURE',
          'TRANSFER_POSTED',
          'TRANSFER_FAILED',
          'INVESTMENT_PURCHASE_FAILED',
          'FRAUD_ALERT_REVIEW',
        ].map((act) => (
          <button
            key={act}
            onClick={() => setActionFilter(act === 'ALL' ? '' : act)}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all border ${
              (act === 'ALL' && !actionFilter) || actionFilter === act
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchLogs} />}

      {/* Audit Logs Table */}
      <Card
        title={`Audit Records (${logs.length})`}
        subtitle="Chronological audit events with user actor and forensic client metadata"
      >
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No audit records matching query parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="pb-3 px-3">Log ID</th>
                  <th className="pb-3 px-3">Action</th>
                  <th className="pb-3 px-3">Entity Type</th>
                  <th className="pb-3 px-3">Entity ID</th>
                  <th className="pb-3 px-3">Actor UUID</th>
                  <th className="pb-3 px-3">Timestamp (UTC)</th>
                  <th className="pb-3 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 text-slate-400 font-bold">#{log.id}</td>
                    <td className="py-3 px-3 font-sans">
                      <Badge
                        variant={
                          log.action.includes('FAILURE') || log.action.includes('FAILED')
                            ? 'danger'
                            : log.action.includes('SUCCESS')
                            ? 'success'
                            : log.action.includes('REVIEW')
                            ? 'purple'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{log.entity_type}</td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[120px]">
                      {log.entity_id}
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[120px]">
                      {log.actor_user_id || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      <DateDisplay date={log.created_at} />
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* JSON Metadata Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Log #${selectedLog.id} Forensic Details`}
          description={`Action: ${selectedLog.action} • Entity: ${selectedLog.entity_type} (${selectedLog.entity_id})`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Actor User ID</span>
                <span className="font-mono text-slate-200">
                  {selectedLog.actor_user_id || 'SYSTEM_INTERNAL'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Recorded Timestamp</span>
                <DateDisplay date={selectedLog.created_at} />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Client IP Address</span>
                <span className="font-mono text-slate-200">
                  {selectedLog.ip_address || '127.0.0.1'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">User Agent</span>
                <span className="font-mono text-slate-300 truncate block text-[11px]">
                  {selectedLog.user_agent || 'FinLedger-AI/System'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Appended Metadata Payload (JSON)
              </h4>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.metadata_json, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
