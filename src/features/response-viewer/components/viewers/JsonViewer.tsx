import { Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Tabs } from "../../../../components/ui/tabs";
import { TextViewer } from "./TextViewer";

type JsonMode = "tree" | "raw";

export function JsonViewer({ value }: { value: string | null }) {
  const [mode, setMode] = useState<JsonMode>("tree");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(true);
  const parsed = useMemo(() => parseJson(value), [value]);
  const formatted = useMemo(() => {
    if (parsed.valid)
      return JSON.stringify(parsed.value, null, expanded ? 2 : 0);
    return value ?? "";
  }, [expanded, parsed, value]);
  const visible = useMemo(() => {
    if (!search.trim()) return formatted;
    return formatted
      .split("\n")
      .filter((line) =>
        line.toLowerCase().includes(search.trim().toLowerCase()),
      )
      .join("\n");
  }, [formatted, search]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs<JsonMode>
          value={mode}
          onValueChange={setMode}
          items={[
            { value: "tree", label: "Tree" },
            { value: "raw", label: "Raw" },
          ]}
        />
        <Input
          className="h-8 w-52"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search JSON"
        />
        <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
          Collapse All
        </Button>
        <Button
          className="ml-auto"
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(visible)}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Node
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText("$")}
        >
          Copy Path
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <TextViewer value={mode === "raw" ? (value ?? "") : visible} />
      </div>
    </div>
  );
}

function parseJson(
  value: string | null,
): { valid: true; value: unknown } | { valid: false } {
  if (value === null) return { valid: false };
  try {
    return { valid: true, value: JSON.parse(value) as unknown };
  } catch {
    return { valid: false };
  }
}
