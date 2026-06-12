import * as React from "react";
import { cn } from "../../lib/utils";

type TabsProps<T extends string> = {
  value: T;
  items: Array<{ value: T; label: string }>;
  onValueChange: (value: T) => void;
  className?: string;
};

export function Tabs<T extends string>({ value, items, onValueChange, className }: TabsProps<T>) {
  return (
    <div className={cn("inline-flex rounded-md border border-border bg-background/60 p-0.5", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          className={cn(
            "focus-ring h-7 rounded px-2 text-xs font-medium text-muted transition-colors",
            value === item.value && "bg-panel text-foreground shadow-sm"
          )}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onValueChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

