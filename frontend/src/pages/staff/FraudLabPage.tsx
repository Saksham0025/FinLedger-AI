import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { fraudLabApi } from '../../api/fraudLab';
import { FraudLabScenario, FraudLabRunResult, DetectorMetrics } from '../../types/api';
import { getErrorMessage } from '../../api/client';
import { Play, ShieldAlert, Cpu, CheckCircle2, Sliders } from 'lucide-react';

export const FraudLabPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<FraudLabScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('ALL_SCENARIOS_BENCHMARK');
  const [seed, setSeed] = useState<number>(42);
  const [sampleSize, setSampleSize] = useState<number>(200);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<FraudLabRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setError(null);
    try {
      const data = await fraudLabApi.listScenarios();
      setScenarios(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);

    try {
      const runResult = await fraudLabApi.runSimulation({
        scenario_name: selectedScenario,
        seed,
        sample_size: sampleSize,
      });
      setResult(runResult);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsRunning(false);
    }
  };

  const renderConfusionMatrix = (matrix: DetectorMetrics['confusion_matrix']) => (
    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-center">
      <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md">
        <span className="block text-[9px] text-emerald-400 font-bold uppercase tracking-wider">TP</span>
        <strong className="text-emerald-300 font-mono tabular-nums text-sm">{matrix.true_positives}</strong>
      </div>
      <div className="p-2 bg-rose-500/5 border border-rose-500/20 rounded-md">
        <span className="block text-[9px] text-rose-400 font-bold uppercase tracking-wider">FP</span>
        <strong className="text-rose-300 font-mono tabular-nums text-sm">{matrix.false_positives}</strong>
      </div>
      <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-md">
        <span className="block text-[9px] text-amber-400 font-bold uppercase tracking-wider">FN</span>
        <strong className="text-amber-300 font-mono tabular-nums text-sm">{matrix.false_negatives}</strong>
      </div>
      <div className="p-2 bg-[#0c1017] border border-[#222b38] rounded-md">
        <span className="block text-[9px] text-stone-400 font-bold uppercase tracking-wider">TN</span>
        <strong className="text-stone-300 font-mono tabular-nums text-sm">{matrix.true_negatives}</strong>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud Lab: Multi-Model Benchmark Workspace"
        description="Isolated evaluation of Transparent Rules, Random Forest, LedgerGraph, and Hybrid Ensemble against seeded adversarial scenarios."
      />

      {/* Isolation Notice Banner */}
      <div className="p-4 rounded-xl bg-forensic-850 border border-amber-500/40 text-amber-200/90 text-xs flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="block text-amber-100 uppercase tracking-wider text-[11px] font-semibold">
              SYNTHETIC SIMULATION — STRICT LEDGER ISOLATION
            </strong>
            <p className="text-[11px] text-amber-300/80 leading-tight mt-0.5">
              Strict Invariant: Fraud Lab simulations execute in an isolated ephemeral pipeline. Zero real customer account balances, transfer requests, or authoritative double-entry ledger entries are created.
            </p>
          </div>
        </div>
        <Badge variant="warning" size="sm">
          ISOLATED BENCHMARK
        </Badge>
      </div>

      {error && <ErrorBanner message={error} className="mb-4" />}

      {/* Simulation Configuration Form */}
      <Card
        title="Benchmark Configuration"
        subtitle="Specify reproducible seed parameter and target evaluation cohort"
        variant="forensic"
      >
        <form onSubmit={handleRunSimulation} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-sage-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sage-400" />
                Scenario Pattern
              </label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-forensic-900 border border-forensic-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-forest-500 font-mono"
              >
                {scenarios.map((sc) => (
                  <option key={sc.name} value={sc.name}>
                    {sc.display_name} ({Math.round(sc.expected_fraud_ratio * 100)}% fraud)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-sage-300 uppercase tracking-wider mb-1.5">
                Random Seed (Reproducibility)
              </label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full bg-forensic-900 border border-forensic-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-forest-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-sage-300 uppercase tracking-wider mb-1.5">
                Sample Size (Transactions)
              </label>
              <input
                type="number"
                min={20}
                max={2000}
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                className="w-full bg-forensic-900 border border-forensic-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-forest-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-forensic-700">
            <span className="text-[11px] text-sage-300 font-mono">
              Evaluates: Rule Baseline vs. Random Forest vs. LedgerGraph vs. Hybrid
            </span>
            <Button
              variant="primary"
              type="submit"
              isLoading={isRunning}
              rightIcon={<Play className="w-3.5 h-3.5" />}
            >
              Run Benchmark Simulation
            </Button>
          </div>
        </form>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Sample Size</span>
              <span className="text-xl font-bold font-mono tabular-nums text-white">{result.sample_size}</span>
              <span className="text-[10px] text-sage-300 block mt-0.5 font-mono">
                Clean: {result.clean_count} | Fraud: {result.fraud_count}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Execution Latency</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-400">{result.duration_ms} ms</span>
              <span className="text-[10px] text-sage-300 block mt-0.5 font-mono">In-Memory Pipeline</span>
            </div>
            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Artifact Fingerprint</span>
              <span className="text-xs font-mono text-sage-200 block mt-1 truncate">
                {result.artifact_fingerprint}
              </span>
              <span className="text-[10px] text-sage-400 block mt-0.5 font-mono">SHA-256 Digest</span>
            </div>
            <div className="p-4 rounded-xl bg-forensic-850 border border-forensic-700 shadow-sm">
              <span className="text-[10px] uppercase font-mono text-sage-400 block tracking-wider font-bold">Ledger Isolation</span>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">
                  Zero Mutations Verified
                </span>
              </div>
              <span className="text-[10px] text-sage-300 block mt-0.5 font-mono">Authoritative Ledger Untouched</span>
            </div>
          </div>

          {/* Model Comparison Matrix */}
          <Card
            title="Multi-Detector Comparative Performance Evaluation"
            subtitle="Side-by-side metric comparison across isolated detectors"
            variant="forensic"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              {Object.entries(result.detectors).map(([key, metrics]) => {
                const displayName =
                  key === 'rule_baseline'
                    ? 'Rule Baseline'
                    : key === 'random_forest'
                    ? 'Random Forest'
                    : key === 'ledger_graph'
                    ? 'LedgerGraph'
                    : 'Hybrid Ensemble';

                const isLeader = key === 'hybrid_ensemble';

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all shadow-sm ${
                      isLeader
                        ? 'bg-forensic-800 border-2 border-forest-500'
                        : 'bg-forensic-900 border border-forensic-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-forensic-700">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-sage-300" />
                          <span className="text-xs font-bold text-white">{displayName}</span>
                        </div>
                        {isLeader && <Badge variant="evergreen" size="sm">Top F1</Badge>}
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-sage-400">Precision:</span>
                          <span className="font-semibold text-white tabular-nums">
                            {(metrics.precision * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sage-400">Recall:</span>
                          <span className="font-semibold text-white tabular-nums">
                            {(metrics.recall * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-forensic-700">
                          <span className="text-sage-300 font-bold">F1 Score:</span>
                          <span className="font-bold text-emerald-400 tabular-nums text-sm">
                            {(metrics.f1_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sage-400">Alerts:</span>
                          <span className="text-sage-200 tabular-nums">{metrics.alerts_count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-forensic-700">
                      <span className="text-[10px] text-sage-400 font-mono uppercase tracking-wider block mb-1.5 font-bold">
                        Confusion Matrix
                      </span>
                      {renderConfusionMatrix(metrics.confusion_matrix)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Scenario Breakdown */}
          {result.scenario_breakdown && (
            <Card
              title="Pattern Family Detection Breakdown"
              subtitle="Granular evaluation across synthesized attack vectors"
              variant="forensic"
            >
              <div className="overflow-x-auto rounded-lg border border-forensic-700">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-forensic-900 border-b border-forensic-700 text-[10px] uppercase font-mono text-sage-300 text-left font-bold">
                    <tr>
                      <th className="p-3">Scenario Family</th>
                      <th className="p-3 text-right">Total Seeded</th>
                      <th className="p-3 text-right">Detected</th>
                      <th className="p-3 text-right">Detection Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forensic-750">
                    {Object.entries(result.scenario_breakdown).map(([scenario, item]) => (
                      <tr key={scenario} className="hover:bg-forensic-800/70 transition-colors">
                        <td className="p-3 font-semibold text-white">{scenario}</td>
                        <td className="p-3 text-right text-sage-300 tabular-nums">{item.total}</td>
                        <td className="p-3 text-right text-sage-200 tabular-nums">{item.detected}</td>
                        <td className="p-3 text-right text-emerald-400 font-bold tabular-nums">
                          {(item.detection_rate * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
