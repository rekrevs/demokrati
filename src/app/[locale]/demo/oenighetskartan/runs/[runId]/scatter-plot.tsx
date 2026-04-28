"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type {
  OenighetskartanCluster,
  OenighetskartanDimension,
  OenighetskartanPoint,
} from "@/lib/demos/oenighetskartan/schemas";

const CLUSTER_COLOURS = [
  "#0ea5e9", // sky
  "#f97316", // orange
  "#10b981", // emerald
  "#a855f7", // purple
  "#ef4444", // red
];

export function clusterColour(idx: number): string {
  return CLUSTER_COLOURS[idx % CLUSTER_COLOURS.length];
}

interface Props {
  dimensions: OenighetskartanDimension[];
  clusters: OenighetskartanCluster[];
  points: OenighetskartanPoint[];
  selectedStatementId: string | null;
  onSelect: (statementId: string | null) => void;
}

export function ScatterPlot({
  dimensions,
  clusters,
  points,
  selectedStatementId,
  onSelect,
}: Props) {
  const t = useTranslations("oenighetskartan");
  const [xDimId, setXDimId] = React.useState<string>(
    () => dimensions[0]?.id ?? "",
  );
  const [yDimId, setYDimId] = React.useState<string>(
    () => dimensions[1]?.id ?? dimensions[0]?.id ?? "",
  );

  const xDim = dimensions.find((d) => d.id === xDimId);
  const yDim = dimensions.find((d) => d.id === yDimId);
  const clusterIndex = React.useMemo(() => {
    const m = new Map<string, number>();
    clusters.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [clusters]);

  if (!xDim || !yDim) {
    return (
      <p className="text-sm italic text-muted-foreground">
        {t("notEnoughDimensions")}
      </p>
    );
  }

  const W = 640;
  const H = 480;
  const PAD = 60;

  const toX = (s: number) =>
    PAD + ((s + 1) / 2) * (W - 2 * PAD);
  const toY = (s: number) =>
    H - PAD - ((s + 1) / 2) * (H - 2 * PAD);

  const sameAxis = xDim.id === yDim.id;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <AxisPicker
          label={t("xAxisLabel")}
          dimensions={dimensions}
          value={xDimId}
          onChange={setXDimId}
        />
        <AxisPicker
          label={t("yAxisLabel")}
          dimensions={dimensions}
          value={yDimId}
          onChange={setYDimId}
        />
      </div>

      {sameAxis ? (
        <p className="text-xs italic text-amber-600">
          {t("sameAxisHint")}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-muted/20 p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full max-w-full"
          role="img"
          aria-label={`${xDim.leftLabel}–${xDim.rightLabel} mot ${yDim.leftLabel}–${yDim.rightLabel}`}
        >
          {/* zero gridlines */}
          <line
            x1={toX(0)}
            x2={toX(0)}
            y1={PAD}
            y2={H - PAD}
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeDasharray="2 4"
          />
          <line
            x1={PAD}
            x2={W - PAD}
            y1={toY(0)}
            y2={toY(0)}
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeDasharray="2 4"
          />
          {/* outer frame */}
          <rect
            x={PAD}
            y={PAD}
            width={W - 2 * PAD}
            height={H - 2 * PAD}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
          />
          {/* axis labels */}
          <text
            x={PAD - 6}
            y={toY(0) + 4}
            fontSize="11"
            textAnchor="end"
            fill="currentColor"
            fillOpacity="0.7"
          >
            {xDim.leftLabel}
          </text>
          <text
            x={W - PAD + 6}
            y={toY(0) + 4}
            fontSize="11"
            textAnchor="start"
            fill="currentColor"
            fillOpacity="0.7"
          >
            {xDim.rightLabel}
          </text>
          <text
            x={toX(0)}
            y={PAD - 8}
            fontSize="11"
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.7"
          >
            {yDim.rightLabel}
          </text>
          <text
            x={toX(0)}
            y={H - PAD + 18}
            fontSize="11"
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.7"
          >
            {yDim.leftLabel}
          </text>

          {/* points */}
          {points.map((p) => {
            const xs = clamp(p.scores[xDim.id] ?? 0);
            const ys = clamp(p.scores[yDim.id] ?? 0);
            const cx = toX(xs);
            const cy = toY(ys);
            const colour = clusterColour(clusterIndex.get(p.clusterId) ?? 0);
            const selected = selectedStatementId === p.statementId;
            return (
              <g
                key={p.statementId}
                className="cursor-pointer"
                onClick={() =>
                  onSelect(selected ? null : p.statementId)
                }
              >
                <title>{p.text}</title>
                <circle
                  cx={cx}
                  cy={cy}
                  r={selected ? 9 : 6}
                  fill={colour}
                  fillOpacity={selected ? 1 : 0.75}
                  stroke={selected ? "currentColor" : colour}
                  strokeWidth={selected ? 2 : 1}
                />
                <text
                  x={cx + 11}
                  y={cy + 4}
                  fontSize="10"
                  fill="currentColor"
                  fillOpacity="0.65"
                  className="select-none"
                >
                  {p.statementId}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ClusterLegend clusters={clusters} />
    </div>
  );
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < -1) return -1;
  if (n > 1) return 1;
  return n;
}

function AxisPicker({
  label,
  dimensions,
  value,
  onChange,
}: {
  label: string;
  dimensions: OenighetskartanDimension[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <select
        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {dimensions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.leftLabel} ↔ {d.rightLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClusterLegend({ clusters }: { clusters: OenighetskartanCluster[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {clusters.map((c, i) => (
        <span key={c.id} className="inline-flex items-center gap-2">
          <span
            className={cn("inline-block h-3 w-3 rounded-full")}
            style={{ background: clusterColour(i) }}
          />
          <span>
            <strong>{c.label}</strong>{" "}
            <span className="text-muted-foreground">
              · {c.memberStatementIds.length}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
