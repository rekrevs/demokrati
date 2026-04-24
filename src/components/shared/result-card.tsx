import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ResultCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: React.ComponentProps<typeof Badge>["variant"];
  /** Text content of the result. Paragraphs split on `\n\n`. */
  body: string;
  footer?: React.ReactNode;
  /** Locale direction override for the body (useful when showing a single foreign-language result on an LTR page). */
  dir?: "ltr" | "rtl";
}

export function ResultCard({
  title,
  subtitle,
  badge,
  badgeVariant,
  body,
  footer,
  dir,
  className,
  ...props
}: ResultCardProps) {
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <Card
      className={cn("flex flex-col", className)}
      data-testid="result-card"
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {badge ? (
          <Badge variant={badgeVariant ?? "secondary"}>{badge}</Badge>
        ) : null}
      </CardHeader>
      <CardContent dir={dir} className="flex-1 space-y-3 text-sm leading-relaxed">
        {paragraphs.length === 0 ? (
          <p className="italic text-muted-foreground">(tomt)</p>
        ) : (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        )}
      </CardContent>
      {footer ? (
        <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
