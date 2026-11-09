import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileCheck2,
  Flame,
  Hammer,
  MonitorCheck,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  StemConnectorType,
  StemDepartmentId,
  StemWorkbenchBlock,
} from './stemLibraryTypes';
import { StemNodeInspectorTooltip } from './StemNodeInspectorTooltip';

const DEPT_NODE_STYLE: Record<
  StemDepartmentId,
  { icon: React.FC<{ className?: string }>; iconColor: string; borderColor: string; bgAccent: string }
> = {
  prep_bql: {
    icon: FileCheck2,
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    bgAccent: 'bg-blue-500/10 dark:bg-blue-500/15',
  },
  mep_pccc: {
    icon: Flame,
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    bgAccent: 'bg-orange-500/10 dark:bg-orange-500/15',
  },
  interior_hoarding: {
    icon: Hammer,
    iconColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-300 dark:border-purple-700',
    bgAccent: 'bg-purple-500/10 dark:bg-purple-500/15',
  },
  it_pos_handover: {
    icon: MonitorCheck,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    bgAccent: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
};

interface PositionedNode {
  block: StemWorkbenchBlock;
  index: number;
  bandRow: number;
  x: number;
  y: number;
}

const NODE_BOX_SIZE = 64;
const COL_SPACING_X = 168;
const BRANCH_SPACING_Y = 128;
const BAND_SPACING_Y = 230;
const CANVAS_PAD_X = 64;
const CANVAS_PAD_Y = 58;
const MAX_STAGE_COLS_PER_BAND = 5;

export interface StemN8nFlowCanvasProps {
  blocks: StemWorkbenchBlock[];
  anchorMode: 'forward' | 'backward';
  isPartsDrawerOpen: boolean;
  existingProjectTasks?: any[];
  onTogglePartsDrawer: () => void;
  onCycleConnector: (instanceId: string, explicitType?: StemConnectorType) => void;
  onChangeDuration: (instanceId: string, nextDuration: number) => void;
  onChangeName: (instanceId: string, nextName: string) => void;
  onChangeParty: (instanceId: string, nextParty: string) => void;
  onToggleDelegation: (instanceId: string) => void;
  onChangeParentBlock?: (
    instanceId: string,
    nextParent: { parentBlockIndex?: number | null; parentTaskId?: string }
  ) => void;
  onMoveOrder: (index: number, direction: 'up' | 'down') => void;
  onRemoveBlock: (instanceId: string) => void;
}

export const StemN8nFlowCanvas: React.FC<StemN8nFlowCanvasProps> = React.memo(
  ({
    blocks,
    anchorMode,
    isPartsDrawerOpen,
    existingProjectTasks = [],
    onTogglePartsDrawer,
    onCycleConnector,
    onChangeDuration,
    onChangeName,
    onChangeParty,
    onToggleDelegation,
    onChangeParentBlock,
    onMoveOrder,
    onRemoveBlock,
  }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1);
    const [snakeWrap, setSnakeWrap] = useState<boolean>(true);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (selectedId && !blocks.some((b) => b.instanceId === selectedId)) {
        setSelectedId(null);
      }
    }, [blocks, selectedId]);

    const layout = useMemo(() => {
      if (blocks.length === 0) {
        return { nodes: [] as PositionedNode[], edges: [], width: 640, height: 320 };
      }

      const stageGroups: { block: StemWorkbenchBlock; index: number }[][] = [];
      blocks.forEach((blk, idx) => {
        const isParallel = idx > 0 && (blk.connectorToPrev === 'SS' || blk.connectorToPrev === 'FF');
        if (isParallel && stageGroups.length > 0) {
          stageGroups[stageGroups.length - 1].push({ block: blk, index: idx });
        } else {
          stageGroups.push([{ block: blk, index: idx }]);
        }
      });

      const colsPerBand = snakeWrap ? MAX_STAGE_COLS_PER_BAND : Math.max(stageGroups.length, 1);
      const totalBands = Math.ceil(stageGroups.length / colsPerBand);
      const bandMaxBranches: number[] = Array(totalBands).fill(1);
      stageGroups.forEach((group, sIdx) => {
        const bRow = Math.floor(sIdx / colsPerBand);
        bandMaxBranches[bRow] = Math.max(bandMaxBranches[bRow], group.length);
      });

      const bandCenterY: number[] = [];
      let runningY = CANVAS_PAD_Y;
      for (let b = 0; b < totalBands; b++) {
        const bandHeight = (bandMaxBranches[b] - 1) * BRANCH_SPACING_Y + NODE_BOX_SIZE + 54;
        bandCenterY.push(runningY + bandHeight / 2 - 22);
        runningY += Math.max(bandHeight + 56, BAND_SPACING_Y);
      }

      const nodesByIndex = new Map<number, PositionedNode>();
      const nodes: PositionedNode[] = [];

      stageGroups.forEach((group, sIdx) => {
        const bandRow = Math.floor(sIdx / colsPerBand);
        const colInBand = sIdx % colsPerBand;
        const x = CANVAS_PAD_X + colInBand * COL_SPACING_X;
        const startY = bandCenterY[bandRow] - ((group.length - 1) * BRANCH_SPACING_Y) / 2;

        group.forEach((item, bIdx) => {
          const pNode: PositionedNode = {
            block: item.block,
            index: item.index,
            bandRow,
            x,
            y: startY + bIdx * BRANCH_SPACING_Y,
          };
          nodes.push(pNode);
          nodesByIndex.set(item.index, pNode);
        });
      });

      const edges: {
        id: string;
        to: PositionedNode;
        connector: StemConnectorType;
        path: string;
        labelX: number;
        labelY: number;
      }[] = [];

      stageGroups.forEach((group, sIdx) => {
        const prevGroup = sIdx > 0 ? stageGroups[sIdx - 1] : null;
        group.forEach((item, bIdx) => {
          if (item.index === 0 || item.block.connectorToPrev === 'NONE') return;
          const toNode = nodesByIndex.get(item.index);
          if (!toNode) return;

          const fromSources: PositionedNode[] =
            sIdx > 0 && prevGroup
              ? prevGroup.map((g) => nodesByIndex.get(g.index)).filter((n): n is PositionedNode => Boolean(n))
              : bIdx > 0 && nodesByIndex.get(group[bIdx - 1].index)
                ? [nodesByIndex.get(group[bIdx - 1].index)!]
                : [];

          fromSources.forEach((fromNode, fIdx) => {
            const x1 = fromNode.x + NODE_BOX_SIZE;
            const y1 = fromNode.y + NODE_BOX_SIZE / 2;
            const x2 = toNode.x;
            const y2 = toNode.y + NODE_BOX_SIZE / 2;
            let path = '';
            let labelX = (x1 + x2) / 2;
            let labelY = (y1 + y2) / 2;

            if (fromNode.bandRow === toNode.bandRow && x2 > x1) {
              const dx = Math.max(48, (x2 - x1) * 0.5);
              path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              labelY -= fromSources.length > 1 ? (fIdx - 0.5) * 8 : 0;
            } else if (fromNode.bandRow !== toNode.bandRow) {
              const midY = (y1 + y2) / 2 + 18;
              path = `M ${x1} ${y1} C ${x1 + 54} ${y1}, ${x1 + 54} ${midY}, ${labelX} ${midY} C ${x2 - 54} ${midY}, ${x2 - 54} ${y2}, ${x2} ${y2}`;
              labelY = midY;
            } else {
              const sx = fromNode.x + NODE_BOX_SIZE / 2;
              const sy = fromNode.y + NODE_BOX_SIZE;
              path = `M ${sx} ${sy} L ${toNode.x + NODE_BOX_SIZE / 2} ${toNode.y}`;
              labelX = sx + 22;
              labelY = (sy + toNode.y) / 2;
            }

            edges.push({
              id: `${fromNode.block.instanceId}->${toNode.block.instanceId}`,
              to: toNode,
              connector: item.block.connectorToPrev,
              path,
              labelX,
              labelY,
            });
          });
        });
      });

      const maxColsUsed = Math.min(stageGroups.length, colsPerBand);
      return {
        nodes,
        edges,
        width: Math.max(680, CANVAS_PAD_X * 2 + (maxColsUsed - 1) * COL_SPACING_X + NODE_BOX_SIZE + 80),
        height: Math.max(330, runningY + 20),
      };
    }, [blocks, snakeWrap]);

    const selectedNode = useMemo(
      () => layout.nodes.find((n) => n.block.instanceId === selectedId) || null,
      [layout.nodes, selectedId]
    );

    const handleFitView = () => {
      const el = scrollContainerRef.current;
      if (!el) return setZoom(1);
      const next = Math.max(
        0.65,
        Math.min(1.15, Math.min((el.clientWidth - 24) / layout.width, (el.clientHeight - 24) / layout.height))
      );
      setZoom(Number(next.toFixed(2)));
    };

    return (
      <div className="relative flex-1 min-h-[300px] overflow-hidden flex flex-col bg-[#f8fafc] dark:bg-[#111114]">
        {/* Top-Right n8n Action (+) & Hint */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-[#1c1c21]/90 border border-slate-200/80 dark:border-[#2e2e34] shadow-xs text-[11px] font-medium text-slate-500 dark:text-[#a3a3a3] backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Click vào Node để mở bảng chi tiết & Parent Task (Tooltip)</span>
          </div>
          <button
            type="button"
            onClick={onTogglePartsDrawer}
            title={isPartsDrawerOpen ? 'Đóng Kho Khối Lẻ' : 'Mở Kho Khối Lẻ (+ Thêm Node)'}
            className={cn(
              'h-9 px-3 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 touch-manipulation',
              isPartsDrawerOpen
                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                : 'bg-[#ff6d5a] hover:bg-[#ff5640] text-white ring-4 ring-[#ff6d5a]/20'
            )}
          >
            <Plus className={cn('w-4 h-4 transition-transform', isPartsDrawerOpen && 'rotate-45')} />
            <span>{isPartsDrawerOpen ? 'Ẩn Kho Khối' : 'Thêm Khối (+)'}</span>
          </button>
        </div>

        {/* Bottom-Left n8n Canvas Controls */}
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 bg-white/95 dark:bg-[#1c1c21]/95 border border-slate-200 dark:border-[#323238] rounded-xl p-1 shadow-md backdrop-blur-xs pointer-events-auto">
          <button
            type="button"
            onClick={handleFitView}
            title="Fit Workflow to View"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a30] cursor-pointer active:scale-90"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
            title="Zoom In"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a30] cursor-pointer active:scale-90"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
            title="Zoom Out"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a30] cursor-pointer active:scale-90"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title="Reset Zoom (100%)"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a2a30] cursor-pointer active:scale-90"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-[#323238] mx-0.5" />
          <button
            type="button"
            onClick={() => setSnakeWrap((v) => !v)}
            className={cn(
              'px-2 h-7 rounded-lg text-[10px] font-bold transition-colors cursor-pointer',
              snakeWrap
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2a2a30]'
            )}
          >
            {snakeWrap ? 'Grid Flow' : '1-Row Flow'}
          </button>
        </div>

        {/* Dotted n8n Scrollable Canvas */}
        <div
          ref={scrollContainerRef}
          onClick={() => setSelectedId(null)}
          className="flex-1 overflow-auto relative select-none bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#2d2d35_1.2px,transparent_1.2px)] [background-size:18px_18px]"
        >
          <div
            style={{ width: layout.width * zoom, height: layout.height * zoom, minWidth: '100%', minHeight: '100%' }}
            className="relative"
          >
            <div
              style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              className="relative"
            >
              <svg width={layout.width} height={layout.height} className="absolute inset-0 pointer-events-none overflow-visible">
                <defs>
                  <marker id="n8n-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-slate-400 dark:fill-slate-500" />
                  </marker>
                  <marker id="n8n-arrow-ss" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-amber-500" />
                  </marker>
                </defs>
                {layout.edges.map((edge) => {
                  const isSS = edge.connector === 'SS';
                  const isFF = edge.connector === 'FF';
                  return (
                    <path
                      key={edge.id}
                      d={edge.path}
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray={isSS || isFF ? '5 3' : undefined}
                      markerEnd={isSS ? 'url(#n8n-arrow-ss)' : 'url(#n8n-arrow)'}
                      className={cn(
                        isSS
                          ? 'stroke-amber-400 dark:stroke-amber-500/80'
                          : isFF
                            ? 'stroke-purple-400 dark:stroke-purple-500/80'
                            : 'stroke-slate-300 dark:stroke-slate-600'
                      )}
                    />
                  );
                })}
              </svg>

              {layout.edges.map((edge) =>
                edge.connector === 'FS' ? null : (
                  <button
                    key={`badge-${edge.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCycleConnector(edge.to.block.instanceId);
                    }}
                    style={{ left: edge.labelX, top: edge.labelY }}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border shadow-2xs cursor-pointer active:scale-90',
                      edge.connector === 'SS'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                        : 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700'
                    )}
                  >
                    {edge.connector === 'SS' ? '⚡ SS' : '🏁 FF'}
                  </button>
                )
              )}

              {layout.nodes.map(({ block, index, x, y }) => {
                const style = DEPT_NODE_STYLE[block.department] || DEPT_NODE_STYLE.prep_bql;
                const IconComp = style.icon;
                const isSelected = selectedId === block.instanceId;
                const isHoarding = anchorMode === 'backward' && /hoarding|dựng rào/i.test(block.name);
                const parentBadgeLabel =
                  typeof block.parentBlockIndex === 'number' && block.parentBlockIndex >= 0
                    ? `P:#${block.parentBlockIndex + 1}`
                    : block.parentTaskId
                      ? `P:${block.parentTaskId}`
                      : null;

                return (
                  <div
                    key={block.instanceId}
                    style={{ left: x, top: y, width: NODE_BOX_SIZE }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId((prev) => (prev === block.instanceId ? null : block.instanceId));
                    }}
                    className="absolute z-20 flex flex-col items-center group cursor-pointer"
                  >
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl bg-white dark:bg-[#1e1e24] border-2 flex items-center justify-center relative transition-all shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5',
                        style.borderColor,
                        block.isModularParent && 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30',
                        isSelected && 'ring-4 ring-blue-500/40 border-blue-600 dark:border-blue-400 scale-105 shadow-lg',
                        isHoarding && 'ring-4 ring-amber-400/50 border-amber-500'
                      )}
                    >
                      {index > 0 && (
                        <span
                          className={cn(
                            'w-3 h-3 rounded-full border-2 border-white dark:border-[#1e1e24] absolute -left-1.5 top-1/2 -translate-y-1/2',
                            block.connectorToPrev === 'SS' ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-500'
                          )}
                        />
                      )}
                      <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500 border-2 border-white dark:border-[#1e1e24] absolute -right-1.5 top-1/2 -translate-y-1/2 group-hover:bg-blue-500" />
                      <span className="absolute -top-2 -left-2 px-1.5 min-w-[20px] h-5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-[9.5px] font-mono font-extrabold flex items-center justify-center shadow-2xs">
                        #{index + 1}
                      </span>
                      {block.isModularParent && (
                        <span
                          title="Parent Summary Task"
                          className="absolute -bottom-2 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[8.5px] font-extrabold tracking-wide shadow-2xs"
                        >
                          PARENT
                        </span>
                      )}
                      {block.delegation && (
                        <span
                          title="Delegation ON"
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1e1e24]"
                        />
                      )}
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', style.bgAccent)}>
                        <IconComp className={cn('w-5 h-5', style.iconColor)} />
                      </div>
                    </div>

                    <div className="w-[136px] -mx-[36px] mt-2 text-center pointer-events-none">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 px-1">
                        {block.name}
                      </p>
                      <p className="text-[9.5px] font-mono font-semibold text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                        {block.duration}d • {block.party}
                        {parentBadgeLabel ? ` • ↳${parentBadgeLabel}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {selectedNode && (
          <StemNodeInspectorTooltip
            block={selectedNode.block}
            index={selectedNode.index}
            totalCount={blocks.length}
            allBlocks={blocks}
            existingProjectTasks={existingProjectTasks}
            onClose={() => setSelectedId(null)}
            onCycleConnector={onCycleConnector}
            onChangeDuration={onChangeDuration}
            onChangeName={onChangeName}
            onChangeParty={onChangeParty}
            onToggleDelegation={onToggleDelegation}
            onChangeParentBlock={onChangeParentBlock}
            onMoveOrder={onMoveOrder}
            onRemoveBlock={onRemoveBlock}
          />
        )}
      </div>
    );
  }
);
