export function HtmlPreview({ value }: { value: string | null }) {
  return (
    <iframe
      className="h-full min-h-[520px] w-full rounded-md border border-border bg-white"
      sandbox=""
      srcDoc={value ?? ""}
      title="HTML response preview"
    />
  );
}
