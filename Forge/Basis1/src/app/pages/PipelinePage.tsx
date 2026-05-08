import { useState, useCallback } from "react";
import { 
  Play, 
  Database, 
  GitBranch, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Filter,
  Send,
  FileCode
} from "lucide-react";

interface Node {
  id: string;
  type: "start" | "process" | "decision" | "data" | "end";
  label: string;
  x: number;
  y: number;
  icon: any;
  status?: "idle" | "running" | "success" | "error";
}

interface Connection {
  from: string;
  to: string;
  label?: string;
}

export function PipelinePage() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", type: "start", label: "Start Pipeline", x: 100, y: 200, icon: Play, status: "success" },
    { id: "2", type: "process", label: "Data Ingestion", x: 300, y: 200, icon: Database, status: "success" },
    { id: "3", type: "process", label: "Transform", x: 500, y: 200, icon: Zap, status: "running" },
    { id: "4", type: "decision", label: "Validate", x: 700, y: 200, icon: GitBranch, status: "idle" },
    { id: "5", type: "process", label: "Filter Data", x: 850, y: 100, icon: Filter, status: "idle" },
    { id: "6", type: "process", label: "Error Handler", x: 850, y: 300, icon: AlertCircle, status: "idle" },
    { id: "7", type: "data", label: "Export", x: 1050, y: 100, icon: FileCode, status: "idle" },
    { id: "8", type: "process", label: "Notify", x: 1050, y: 300, icon: Send, status: "idle" },
    { id: "9", type: "end", label: "Complete", x: 1250, y: 200, icon: CheckCircle, status: "idle" },
  ]);

  const [connections] = useState<Connection[]>([
    { from: "1", to: "2" },
    { from: "2", to: "3" },
    { from: "3", to: "4" },
    { from: "4", to: "5", label: "valid" },
    { from: "4", to: "6", label: "error" },
    { from: "5", to: "7" },
    { from: "6", to: "8" },
    { from: "7", to: "9" },
    { from: "8", to: "9" },
  ]);

  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - 60,
      y: e.clientY - rect.top - 60,
    });
    setDraggingNode(nodeId);
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNode) return;

    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left - dragOffset.x;
    const y = e.clientY - container.top - dragOffset.y;

    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === draggingNode
          ? { ...node, x: Math.max(50, Math.min(x, container.width - 150)), y: Math.max(50, Math.min(y, container.height - 150)) }
          : node
      )
    );
  }, [draggingNode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 60, y: node.y + 60 };
  };

  const getConnectionPath = (from: string, to: string) => {
    const start = getNodePosition(from);
    const end = getNodePosition(to);
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const controlPointOffset = Math.abs(dx) * 0.5;

    return `M ${start.x} ${start.y} C ${start.x + controlPointOffset} ${start.y}, ${end.x - controlPointOffset} ${end.y}, ${end.x} ${end.y}`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "running": return "border-[#ff6b3d] bg-[#ff6b3d]/20";
      case "success": return "border-green-500 bg-green-500/20";
      case "error": return "border-red-500 bg-red-500/20";
      default: return "border-white/20 bg-black/40";
    }
  };

  const getStatusDot = (status?: string) => {
    switch (status) {
      case "running": return "bg-[#ff6b3d] animate-pulse";
      case "success": return "bg-green-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="h-full bg-black relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-6 z-20">
        <div>
          <h2 className="text-xl font-bold text-white">Pipeline Workflow</h2>
          <p className="text-xs text-gray-400">Drag nodes to reposition • Live execution view</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[#ff6b3d] hover:bg-[#ff5a2d] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            <Play className="w-4 h-4" />
            Run Pipeline
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        className="absolute inset-0 pt-16 select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#ff6b3d"
                opacity="0.6"
              />
            </marker>
          </defs>
          
          {/* Connection Lines */}
          {connections.map((conn, index) => {
            const path = getConnectionPath(conn.from, conn.to);
            const start = getNodePosition(conn.from);
            const end = getNodePosition(conn.to);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
              <g key={index}>
                <path
                  d={path}
                  stroke="#ff6b3d"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.4"
                  markerEnd="url(#arrowhead)"
                />
                {conn.label && (
                  <g>
                    <rect
                      x={midX - 25}
                      y={midY - 10}
                      width="50"
                      height="20"
                      rx="10"
                      fill="#0a0a0a"
                      stroke="#ff6b3d"
                      strokeWidth="1"
                      opacity="0.9"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fill="#ff6b3d"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {conn.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.id}
              className={`absolute w-32 h-32 rounded-2xl border-2 ${getStatusColor(node.status)} backdrop-blur-sm cursor-move select-none hover:scale-105 ${
                draggingNode === node.id ? 'scale-110 shadow-2xl z-10' : ''
              }`}
              style={{
                left: node.x,
                top: node.y,
                transition: draggingNode === node.id ? 'none' : 'transform 0.2s ease',
                transform: draggingNode === node.id ? 'rotate(-2deg)' : 'rotate(0deg)',
                willChange: draggingNode === node.id ? 'left, top' : 'auto',
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
              {/* Status Indicator */}
              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusDot(node.status)} border-2 border-black`} />
              
              {/* Node Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-[#ff6b3d]/20 border border-[#ff6b3d]/50 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-[#ff6b3d]" />
                </div>
                <span className="text-xs font-semibold text-white leading-tight">
                  {node.label}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                  {node.type}
                </span>
              </div>

              {/* Glow effect for running state */}
              {node.status === "running" && (
                <div className="absolute inset-0 rounded-2xl bg-[#ff6b3d]/20 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 z-20">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Status</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-xs text-gray-400">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff6b3d] animate-pulse" />
            <span className="text-xs text-gray-400">Running</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-400">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-400">Error</span>
          </div>
        </div>
      </div>

      {/* Node Info */}
      <div className="absolute bottom-6 right-6 bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 z-20 max-w-xs">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Pipeline Stats</h3>
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Total Nodes:</span>
            <span className="text-white font-semibold">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Connections:</span>
            <span className="text-white font-semibold">{connections.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Running:</span>
            <span className="text-[#ff6b3d] font-semibold">{nodes.filter(n => n.status === "running").length}</span>
          </div>
          <div className="flex justify-between">
            <span>Completed:</span>
            <span className="text-green-500 font-semibold">{nodes.filter(n => n.status === "success").length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}