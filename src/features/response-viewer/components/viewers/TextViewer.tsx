export function TextViewer({ value }: { value: string | null }) {
  return (
    <pre className="min-h-full whitespace-pre-wrap break-words rounded-md bg-background/70 p-3 font-mono text-xs leading-5 text-foreground">
      {value ?? ""}
    </pre>
  );
}
