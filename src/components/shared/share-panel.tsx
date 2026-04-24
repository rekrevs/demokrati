"use client";

import * as React from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SharePanelProps {
  url: string;
  label?: string;
  className?: string;
}

export function SharePanel({ url, label = "Dela", className }: SharePanelProps) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      // Clipboard may be denied in some contexts; fall back to prompt
      window.prompt("Kopiera länken", url);
    }
  }, [url]);

  return (
    <div
      data-testid="share-panel"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Button variant="secondary" size="sm" onClick={onCopy} aria-label={label}>
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            <span>Kopierad</span>
          </>
        ) : (
          <>
            <LinkIcon className="h-4 w-4" />
            <span>{label}</span>
          </>
        )}
      </Button>
    </div>
  );
}
