import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Analyst } from "@/lib/api";
import { initials } from "@/lib/utils";

export function AnalystCard({ analyst, index }: { analyst: Analyst; index: number }) {
  return (
    <Card className="h-full gap-4 py-5">
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initials(analyst.name)}
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            Analyst {index + 1}
          </Badge>
        </div>
        <CardTitle className="mt-1 text-base">{analyst.name}</CardTitle>
        <CardDescription className="font-medium">{analyst.role}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-5">
        <Badge variant="secondary">{analyst.affiliation}</Badge>
        <p className="text-muted-foreground text-sm leading-relaxed">{analyst.description}</p>
      </CardContent>
    </Card>
  );
}
