import { Separator } from "react-resizable-panels";

type Props = {
  orientation: "horizontal" | "vertical";
};

export function ResizeHandle({ orientation }: Props) {
  return (
    <Separator
      className={
        orientation === "horizontal"
          ? "group relative w-1 bg-border transition-colors hover:bg-accent/40"
          : "group relative h-1 bg-border transition-colors hover:bg-accent/40"
      }
    >
      <div
        className={
          orientation === "horizontal"
            ? "absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/40 group-hover:bg-accent"
            : "absolute left-1/2 top-1/2 h-[3px] w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/40 group-hover:bg-accent"
        }
      />
    </Separator>
  );
}
