import { FaInfinity } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";

const AssistantMessageSkeleton = () => {
  return (
    <div className="flex gap-3" aria-label="Assistant is responding">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
        <FaInfinity className="size-4 animate-pulse [animation-duration:700ms]" />
      </div>
      <div className="w-[min(90%,42rem)] rounded-lg border border-border/60 bg-muted/80 px-4 py-3 shadow-sm">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-duration:600ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:120ms] [animation-duration:600ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:240ms] [animation-duration:600ms]" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-11/12 bg-foreground/10 [animation-duration:650ms]" />
          <Skeleton className="h-3 w-4/5 bg-foreground/10 [animation-delay:100ms] [animation-duration:650ms]" />
          <Skeleton className="h-3 w-2/3 bg-foreground/10 [animation-delay:200ms] [animation-duration:650ms]" />
        </div>
      </div>
    </div>
  );
};

export default AssistantMessageSkeleton;
