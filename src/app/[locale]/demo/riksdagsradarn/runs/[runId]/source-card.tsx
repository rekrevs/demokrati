"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  PARTY_LABELS,
  type RiksdagsradarnSourceCard,
} from "@/lib/demos/riksdagsradarn/schemas";

interface Props {
  card: RiksdagsradarnSourceCard;
  index: number;
}

export function SourceCard({ card, index }: Props) {
  const partyLabel = PARTY_LABELS[card.parti] ?? card.parti;
  return (
    <Card id={card.chunkId} className="scroll-mt-24">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <div className="text-xs font-mono text-muted-foreground">
            #{index + 1} · {card.chunkId.slice(0, 8)}
          </div>
          <div className="text-sm font-semibold">
            {card.talare}{" "}
            <Badge variant="outline" className="ml-1 align-middle">
              {card.parti}
            </Badge>
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({partyLabel})
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {card.dokDatum.slice(0, 10)} · {card.avsnittsrubrik}
            {card.underrubrik ? ` · ${card.underrubrik}` : ""}
          </div>
        </div>
        <a
          href={card.anforandeUrlHtml}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
        >
          riksdagen.se
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed">
        <p className="whitespace-pre-wrap">{card.text}</p>
      </CardContent>
    </Card>
  );
}
