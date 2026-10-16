import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { graphApi } from '../../api/graph';
import { GraphSubgraphResponse, GraphFindingResponse, GraphNode, GraphEdge } from '../../types/api';
import { getErrorMessage } from '../../api/client';
import { GitBranch, ShieldAlert, List, Eye } from 'lucide-react';

export const GraphExplorerPage: React.FC = () => {
  const [subgraph, setSubgraph] = useState<GraphSubgraphResponse | null>(null);
  const [findings, setFindings] = useState<GraphFindingResponse[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [timeWindowHours, setTimeWindowHours] = useState<number>(72);
  const [depth, setDepth] = useState<number>(2);

  const fetchGraphData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [graphData, findingsData] = await Promise.all([
        graphApi.getSubgraph({ depth, time_window_hours: timeWindowHours }),
        graphApi.listFindings({ limit: 20 }),
      ]);
      setSubgraph(graphData);
      setFindings(findingsData);
      if (graphData.nodes.length > 0) {
        setSelectedNode(graphData.nodes[0]);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [timeWindowHours, depth]);

  // Compute 2D node layout positions for SVG visualization
  const getNodeCoordinates = (nodes: GraphNode[], width = 600, height = 380) => {
    const coords: Record<string, { x: number; y: number }> = {};
    const count = nodes.length;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / (count || 1);
      coords[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    return coords;
  };

  const nodeCoords = subgraph ? getNodeCoordinates(subgraph.nodes) : {};

  return (
    <div className="space-y-5">
      <PageHeader
        title="LedgerGraph: Temporal Money-Flow Network Explorer"
        description="Deterministic graph pattern detection over PostgreSQL relational ledger data: Fan-In, Pass-Through, Multi-Hop, and Circular cycles."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'visual' ? 'table' : 'visual')}
              className="px-3 py-1.5 rounded bg-[#121820] border border-[#222b38] text-xs text-slate-200 hover:bg-[#18202b] transition-colors flex items-center gap-1.5 font-mono"
            >
              {viewMode === 'visual' ? <List className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {viewMode === 'visual' ? 'Accessible Table View' : 'Visual Graph View'}
            </button>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-forensic-850 border border-forensic-700 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sage-300 font-bold uppercase text-[10px]">Time Window:</span>
            <select
              value={timeWindowHours}
              onChange={(e) => setTimeWindowHours(Number(e.target.value))}
              className="bg-forensic-900 border border-forensic-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-forest-500 font-mono"
            >
              <option value={24}>Last 24 Hours</option>
              <option value={72}>Last 72 Hours</option>
              <option value={168}>Last 7 Days</option>
              <option value={720}>Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sage-300 font-bold uppercase text-[10px]">Hop Depth:</span>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="bg-forensic-900 border border-forensic-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-forest-500 font-mono"
            >
              <option value={1}>1 Hop (Direct Counterparties)</option>
              <option value={2}>2 Hops (Layering Chains)</option>
              <option value={3}>3 Hops (Extended Network)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sage-300 text-[11px] font-mono">
          <span>Nodes: <strong className="text-white">{subgraph?.node_count || 0}</strong></span>
          <span>Edges: <strong className="text-white">{subgraph?.edge_count || 0}</strong></span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual or Table Area */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-forensic-850 border border-forensic-700 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-forensic-700 bg-forensic-800 flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                  Network Money Movements
                </span>
                <span className="text-[10px] text-sage-300 font-mono">
                  Point-In-Time Bounded Relational Graph
                </span>
              </div>

              {viewMode === 'visual' ? (
                <div className="p-4 flex items-center justify-center bg-forensic-950 min-h-[400px]">
                  {subgraph && subgraph.nodes.length > 0 ? (
                    <svg
                      viewBox="0 0 600 380"
                      className="w-full h-auto max-h-[420px] select-none"
                    >
                      <defs>
                        <marker
                          id="arrow"
                          viewBox="0 0 10 10"
                          refX="18"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                        </marker>
                      </defs>

                      {/* Edges */}
                      {subgraph.edges.map((edge) => {
                        const src = nodeCoords[edge.source_account_id];
                        const dst = nodeCoords[edge.destination_account_id];
                        if (!src || !dst) return null;
                        const isSelected = selectedEdge?.id === edge.id;
                        return (
                          <g key={edge.id} onClick={() => setSelectedEdge(edge)} className="cursor-pointer">
                            <line
                              x1={src.x}
                              y1={src.y}
                              x2={dst.x}
                              y2={dst.y}
                              stroke={isSelected ? '#34d399' : '#1D382D'}
                              strokeWidth={isSelected ? 2.5 : 1.5}
                              markerEnd="url(#arrow)"
                              className="transition-colors hover:stroke-emerald-400"
                            />
                            <text
                              x={(src.x + dst.x) / 2}
                              y={(src.y + dst.y) / 2 - 4}
                              fill="#9EB9A0"
                              fontSize="9"
                              textAnchor="middle"
                              className="font-mono pointer-events-none"
                            >
                              ₹{parseFloat(edge.amount).toLocaleString('en-IN')}
                            </text>
                          </g>
                        );
                      })}

                      {/* Nodes */}
                      {subgraph.nodes.map((node) => {
                        const pos = nodeCoords[node.id];
                        if (!pos) return null;
                        const isSelected = selectedNode?.id === node.id;
                        return (
                          <g
                            key={node.id}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            onClick={() => setSelectedNode(node)}
                            className="cursor-pointer"
                          >
                            <circle
                              r={isSelected ? 16 : 12}
                              fill={isSelected ? '#206A4C' : '#0E1B15'}
                              stroke={isSelected ? '#34d399' : '#25473A'}
                              strokeWidth={isSelected ? 2.5 : 1.5}
                              className="transition-all hover:stroke-emerald-400"
                            />
                            <text
                              y={24}
                              fill="#DCE8D8"
                              fontSize="10"
                              textAnchor="middle"
                              className="font-mono font-medium pointer-events-none"
                            >
                              {node.account_number.replace('ACC-', '')}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="text-center py-12 text-sage-400 text-xs font-mono">
                      No transfer activity detected within the selected time window.
                    </div>
                  )}
                </div>
              ) : (
                /* Accessible Table Alternative */
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-forensic-900 border-b border-forensic-700 text-[10px] uppercase text-sage-300 text-left font-bold">
                      <tr>
                        <th className="p-2.5">Source Account</th>
                        <th className="p-2.5">Destination Account</th>
                        <th className="p-2.5 text-right">Amount (INR)</th>
                        <th className="p-2.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forensic-750">
                      {subgraph?.edges.map((e) => (
                        <tr key={e.id} className="hover:bg-forensic-800/70 transition-colors">
                          <td className="p-2.5 text-sage-200 truncate max-w-[140px]">{e.source_account_id}</td>
                          <td className="p-2.5 text-sage-200 truncate max-w-[140px]">{e.destination_account_id}</td>
                          <td className="p-2.5 text-right text-emerald-400 font-semibold tabular-nums">
                            {parseFloat(e.amount).toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                            })}
                          </td>
                          <td className="p-2.5 text-sage-400 text-[10px]">
                            {new Date(e.timestamp).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pattern Findings Stream */}
            <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-5 space-y-3 font-mono shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                Detected Graph Patterns ({findings.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-lg bg-forensic-900 border border-forensic-700 text-xs space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{f.pattern_type}</span>
                      <Badge
                        variant={f.severity === 'CRITICAL' ? 'danger' : f.severity === 'SUSPICIOUS' ? 'warning' : 'info'}
                        size="sm"
                      >
                        {f.severity} ({f.heuristic_score})
                      </Badge>
                    </div>
                    <p className="text-[11px] text-sage-300 leading-tight font-sans">{f.explanation}</p>
                    <div className="flex items-center justify-between text-[10px] text-sage-400 pt-1">
                      <span>Account: {f.primary_account_number || f.primary_account_id.slice(0, 8)}</span>
                      <span>{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="lg:col-span-1 space-y-5 font-mono">
            {selectedNode && (
              <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-5 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sage-300">
                  Inspected Account Node
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-forensic-900 border border-forensic-700">
                    <span className="text-[10px] text-sage-400 block uppercase font-bold">Account Number</span>
                    <span className="text-sm font-semibold text-white font-mono">{selectedNode.account_number}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-forensic-900 border border-forensic-700">
                    <span className="text-[10px] text-sage-400 block uppercase font-bold">Account Holder</span>
                    <span className="font-semibold text-sage-100 font-sans">{selectedNode.customer_name}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-forensic-900 border border-forensic-700">
                    <span className="text-[10px] text-sage-400 block uppercase font-bold">Type & Status</span>
                    <span className="text-white">{selectedNode.account_type} • {selectedNode.status}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-5 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sage-300">
                  Inspected Transfer Edge
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-forensic-900 border border-forensic-700">
                    <span className="text-[10px] text-sage-400 block uppercase font-bold">Transfer Amount</span>
                    <span className="text-base font-bold text-emerald-400 tabular-nums">
                      {parseFloat(selectedEdge.amount).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-forensic-900 border border-forensic-700">
                    <span className="text-[10px] text-sage-400 block uppercase font-bold">Transfer Reference</span>
                    <span className="text-xs text-sage-200 truncate block font-mono">{selectedEdge.transfer_id}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-forensic-900 border border-forensic-700">
                    <span className="text-[10px] text-sage-400 block uppercase font-bold">Posted Timestamp</span>
                    <span className="text-sage-300 text-xs">
                      {new Date(selectedEdge.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pattern Catalog Reference */}
            <div className="bg-forensic-850 border border-forensic-700 rounded-xl p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sage-300">
                Pattern Detector Semantics
              </h4>
              <div className="text-[11px] text-sage-300 space-y-2.5 leading-relaxed">
                <div>
                  <strong className="text-white block font-mono">FAN-IN:</strong>
                  Multiple distinct origin accounts funnel funds into one target account within 24h.
                </div>
                <div>
                  <strong className="text-white block font-mono">RAPID PASS-THROUGH:</strong>
                  Funds credited and onward forwarded within 4 hours with minimal delta.
                </div>
                <div>
                  <strong className="text-white block font-mono">CIRCULAR WASH:</strong>
                  Bounded closed-loop cycles returning money to an originating account.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
