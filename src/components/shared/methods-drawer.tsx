"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MethodsDrawerEntry {
  label: string;
  value: string | React.ReactNode;
}

export interface MethodsDrawerProps {
  title?: string;
  description?: string;
  entries: MethodsDrawerEntry[];
  triggerLabel?: string;
  className?: string;
}

export function MethodsDrawer({
  title = "Metod",
  description = "Vad vi skickade till modellen, och vad som påverkar resultatet.",
  entries,
  triggerLabel = "Visa metod",
  className,
}: MethodsDrawerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("text-xs", className)}
          data-testid="methods-drawer-trigger"
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          {entries.map((e, i) => (
            <React.Fragment key={i}>
              <dt className="font-medium text-muted-foreground">{e.label}</dt>
              <dd className="whitespace-pre-wrap break-words">
                {typeof e.value === "string" ? (
                  <span>{e.value}</span>
                ) : (
                  e.value
                )}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
