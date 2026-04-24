import * as React from "react";
import { cn } from "@/lib/utils";

export interface ComparisonGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns at the md breakpoint. Responsive below that. */
  columns?: 2 | 3 | 4;
}

export function ComparisonGrid({
  columns = 2,
  className,
  ...props
}: ComparisonGridProps) {
  const cols =
    columns === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2";
  return (
    <div
      data-testid="comparison-grid"
      className={cn("grid grid-cols-1 gap-4", cols, className)}
      {...props}
    />
  );
}
