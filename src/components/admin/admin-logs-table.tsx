"use client";

import { useMemo, useState } from "react";
import { BracesIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminLogRow = {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  actorUserId: string | null;
  actorEmail: string | null;
  targetType: string;
  targetId: string;
  result: string;
  severity: string;
  details: string;
  ipAddress: string | null;
  device: string | null;
  metadata: unknown;
  createdAt: string;
  error: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function severityTone(severity: string) {
  if (severity === "critical") return "border-rose-500/30 text-rose-300";
  if (severity === "high") return "border-orange-500/30 text-orange-300";
  if (severity === "warning") return "border-amber-500/30 text-amber-300";
  return "border-cyan-500/30 text-cyan-300";
}

export function AdminLogsTable({ logs }: { logs: AdminLogRow[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [result, setResult] = useState("all");
  const [selectedMetadata, setSelectedMetadata] = useState<unknown>(null);
  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))).sort(), [logs]);
  const severities = useMemo(() => Array.from(new Set(logs.map((log) => log.severity))).sort(), [logs]);
  const results = useMemo(() => Array.from(new Set(logs.map((log) => log.result))).sort(), [logs]);
  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return logs.filter((log) => {
      const queryMatch = !lower || `${log.action} ${log.actorName} ${log.targetId} ${log.details}`.toLowerCase().includes(lower);
      return queryMatch &&
        (action === "all" || log.action === action) &&
        (severity === "all" || log.severity === severity) &&
        (result === "all" || log.result === result);
    });
  }, [action, logs, query, result, severity]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px_180px_180px]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Action, actor veya target ara" className="pl-8" />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {severities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={result} onValueChange={setResult}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {results.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedMetadata ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Metadata JSON</p>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMetadata(null)}>Close</Button>
          </div>
          <pre className="hcsc-scrollbar max-h-64 overflow-auto text-xs leading-5 text-[var(--text-secondary)]">
            {JSON.stringify(selectedMetadata, null, 2)}
          </pre>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Error</TableHead>
            <TableHead>Metadata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <div className="font-medium">{log.action}</div>
                <div className="text-xs text-muted-foreground">{log.id}</div>
              </TableCell>
              <TableCell>
                <div>{log.actorName}</div>
                <div className="text-xs text-muted-foreground">{log.actorUserId ?? log.actorRole}</div>
              </TableCell>
              <TableCell>
                <div>{log.targetType}</div>
                <div className="text-xs text-muted-foreground">{log.targetId}</div>
              </TableCell>
              <TableCell>{formatDate(log.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={log.result === "success" ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}>
                  {log.result}
                </Badge>
              </TableCell>
              <TableCell><Badge variant="outline" className={severityTone(log.severity)}>{log.severity}</Badge></TableCell>
              <TableCell className="max-w-[220px] truncate">{log.ipAddress ?? log.device ?? "unknown"}</TableCell>
              <TableCell className="max-w-[280px] truncate text-muted-foreground">{log.error ?? "-"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-sm" disabled={!log.metadata} onClick={() => setSelectedMetadata(log.metadata)} aria-label="Metadata görüntüle">
                  <BracesIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
