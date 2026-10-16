import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { Button } from '../../components/common/Button';
import { fraudApi } from '../../api/fraud';
import { AIHealthResponse } from '../../types/api';
import { getErrorMessage } from '../../api/client';
import { ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export const AIHealthPage: React.FC = () => {
  const [health, setHealth] = useState<AIHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fraudApi.getHealth();
      setHealth(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Runtime Health & Governance Dashboard"
        description="Transparent model runtime state, artifact fingerprint verification, fallback mode disclosure, and feature drift monitoring."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHealth}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Health State
          </Button>
        }
      />

      {error && <ErrorBanner message={error} className="mb-4" />}

      {isLoading || !health ? (
        <div className="flex items-center justify-center p-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Model Runtime</span>
              <div className="flex items-center gap-2 mt-1.5">
                {health.is_model_loaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Random Forest Online</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">Rule-Only Fallback</span>
                  </>
                )}
              </div>
              <span className="text-[11px] font-mono text-sage-300 block mt-1">
                Version: {health.active_model_version}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Artifact Fingerprint</span>
              <span className="text-xs font-mono text-sage-200 block mt-1.5 truncate">
                {health.artifact_fingerprint}
              </span>
              <span className="text-[10px] text-sage-400 block mt-0.5 font-mono">SHA-256 Provenance</span>
            </div>

            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Triage Queue Backlog</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xl font-bold font-mono tabular-nums text-white">
                  {health.triage_metrics.pending_review}
                </span>
                <span className="text-xs text-sage-300">pending alerts</span>
              </div>
              <span className="text-[10px] text-sage-400 block mt-0.5 font-mono">
                Backlog ratio: {health.triage_metrics.backlog_ratio_percent}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Advisory Safety Boundary</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">
                  Zero Autonomous Actions
                </span>
              </div>
              <span className="text-[10px] text-sage-400 block mt-0.5 font-mono">Human Review Mandated</span>
            </div>
          </div>

          {/* Fallback Disclosure (if applicable) */}
          {health.fallback_mode_active && (
            <div className="p-4 rounded-xl bg-forensic-850 border border-amber-500/40 text-amber-200/90 text-xs space-y-1 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-amber-100 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Deterministic Fallback Engine Active</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                {health.fallback_reason || 'Trained Random Forest artifact not loaded; transactions are evaluated transparently via deterministic statistical outlier rules.'}
              </p>
            </div>
          )}

          {/* Feature Schema Columns */}
          <Card
            title="Active Tabular Feature Schema"
            subtitle={`${health.feature_schema_columns.length} Engineered signals utilized in ML inference pipeline`}
            variant="forensic"
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {health.feature_schema_columns.map((col) => (
                <span
                  key={col}
                  className="px-2.5 py-1 rounded bg-forensic-900 border border-forensic-700 font-mono text-[11px] text-sage-200"
                >
                  {col}
                </span>
              ))}
            </div>
          </Card>

          {/* Feature Drift (PSI) Monitoring */}
          <Card
            title="Feature Distribution Drift Monitoring (Population Stability Index)"
            subtitle="Reference population: Synthetic Baseline Training Cohort. Current evaluation window: Last 7 days."
            variant="forensic"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {Object.entries(health.feature_drift_indicators).map(([feature, drift]) => (
                <div key={feature} className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 text-xs shadow-xs">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-forensic-700">
                    <span className="font-mono text-white font-semibold">{feature}</span>
                    <Badge
                      variant={drift.status === 'STABLE' ? 'evergreen' : drift.status === 'MODERATE_DRIFT' ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {drift.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-sage-300 font-mono">
                    <span>PSI Score:</span>
                    <strong className="text-emerald-400 tabular-nums">{drift.psi_score.toFixed(4)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Documented Academic Limitations & Governance Principles */}
          <Card
            title="Academic Governance, Compliance & Known Limitations"
            subtitle="Rigorous disclosure of engineering and statistical boundary assumptions"
            variant="forensic"
          >
            <ul className="space-y-2.5 text-xs text-sage-300 list-disc list-inside pt-1">
              {health.known_limitations.map((lim, idx) => (
                <li key={idx} className="leading-relaxed">
                  <strong className="text-white">{lim.split(':')[0]}:</strong>{' '}
                  {lim.split(':').slice(1).join(':')}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
};
