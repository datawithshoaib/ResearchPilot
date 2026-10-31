import { analystColor } from "@/lib/analyst-palette";
import { cn, initials } from "@/lib/utils";

export function AnalystAvatar({
  name,
  index,
  className,
}: {
  name: string;
  index: number;
  className?: string;
}) {
  const color = analystColor(index);
  return (
    <span
      className={cn(
        "ring-background flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ring-2",
        className,
      )}
      style={{ background: color.gradient, boxShadow: `0 6px 20px -6px ${color.solid}` }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
