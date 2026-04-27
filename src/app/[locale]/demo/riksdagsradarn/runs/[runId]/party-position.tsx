"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PARTY_LABELS,
  type RiksdagsradarnClaim,
  type RiksdagsradarnClaimType,
  type RiksdagsradarnConfidence,
  type RiksdagsradarnPartyPosition,
} from "@/lib/demos/riksdagsradarn/schemas";

interface Props {
  position: RiksdagsradarnPartyPosition;
  /** Used to render index numbers on chunk-id chips. */
  chunkIndex: Map<string, number>;
}

export function PartyPositionCard({ position, chunkIndex }: Props) {
  const t = useTranslations("riksdagsradarn");
  const partyLabel = PARTY_LABELS[position.parti] ?? position.parti;

  return (
    <Card className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Badge variant="secondary" className="text-sm">
            {position.parti}
          </Badge>
          <span>{partyLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{position.summary}</p>

        {position.claims.length > 0 ? (
          <div className="space-y-3 border-l-2 border-border pl-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("claimsHeader", { n: position.claims.length })}
            </h4>
            {position.claims.map((c, i) => (
              <ClaimItem key={i} claim={c} chunkIndex={chunkIndex} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ClaimItem({
  claim,
  chunkIndex,
}: {
  claim: RiksdagsradarnClaim;
  chunkIndex: Map<string, number>;
}) {
  const t = useTranslations("riksdagsradarn");
  return (
    <div className="space-y-1.5">
      <p className="text-sm">{claim.text}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge
          variant={claimTypeVariant(claim.type)}
          className="font-mono"
        >
          {t(`claimTypes.${claim.type}`)}
        </Badge>
        <Badge
          variant={confidenceVariant(claim.confidence)}
          className="font-mono"
        >
          {t(`confidenceLabels.${claim.confidence}`)}
        </Badge>
        {claim.sourceChunkIds.map((id) => {
          const idx = chunkIndex.get(id);
          return (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] tracking-tight transition-colors hover:bg-muted",
              )}
              title={t("jumpToSource")}
            >
              #{idx === undefined ? "?" : idx + 1}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function claimTypeVariant(
  t: RiksdagsradarnClaimType,
): React.ComponentProps<typeof Badge>["variant"] {
  if (t === "empirical") return "default";
  if (t === "normative") return "secondary";
  if (t === "critique") return "destructive";
  if (t === "proposal") return "warning";
  return "outline";
}

function confidenceVariant(
  c: RiksdagsradarnConfidence,
): React.ComponentProps<typeof Badge>["variant"] {
  if (c === "high") return "default";
  if (c === "low") return "warning";
  return "secondary";
}
