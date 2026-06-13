import * as React from "react";
import { cn } from "../../lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "focus-ring h-8 rounded-md border border-border bg-background/70 px-2 text-sm text-foreground",
      className,
    )}
    {...props}
  />
));

Select.displayName = "Select";
