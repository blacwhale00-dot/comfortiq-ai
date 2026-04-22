import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, MessageSquareQuote } from "lucide-react";
import { buildCoraMessage, CoraInputs } from "@/lib/cora-empathy";

interface Props {
  inputs: CoraInputs;
}

export const CoraPreviewBox = ({ inputs }: Props) => {
  const message = buildCoraMessage(inputs);
  const tier = inputs.confidenceTier ?? "Low";

  return (
    <Card className="shadow-card border-primary/20 bg-gradient-to-br from-primary/[0.03] to-accent/[0.04]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Cora — Evidence-Based Empathy
          </CardTitle>
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {tier} Confidence
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg bg-card border border-border p-4">
          <MessageSquareQuote className="absolute -top-2 -left-2 h-5 w-5 text-primary bg-background rounded-full p-0.5" />
          <p className="text-sm leading-relaxed text-foreground italic">
            "{message}"
          </p>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Generated from verified property intelligence. Cora will only reference facts she can cite.
        </p>
      </CardContent>
    </Card>
  );
};
