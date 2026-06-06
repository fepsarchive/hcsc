"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminRecordRow } from "@/server/admin/admin-service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminRecordsTable({ records }: { records: AdminRecordRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const types = useMemo(() => Array.from(new Set(records.map((record) => record.type))).sort(), [records]);
  const statuses = useMemo(() => Array.from(new Set(records.map((record) => record.status))).sort(), [records]);
  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return records.filter((record) => {
      const queryMatch = !lower || `${record.title} ${record.owner} ${record.detail}`.toLowerCase().includes(lower);
      return queryMatch && (type === "all" || record.type === type) && (status === "all" || record.status === status);
    });
  }, [query, records, status, type]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Record, owner veya detail ara" className="pl-8" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Record</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner/Source</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((record) => (
            <TableRow key={`${record.type}-${record.id}`}>
              <TableCell className="font-medium">{record.title}</TableCell>
              <TableCell><Badge variant="outline">{record.type}</Badge></TableCell>
              <TableCell><Badge variant="outline">{record.status}</Badge></TableCell>
              <TableCell>{record.owner}</TableCell>
              <TableCell>{formatDate(record.createdAt)}</TableCell>
              <TableCell>{formatDate(record.updatedAt)}</TableCell>
              <TableCell className="max-w-[260px] truncate text-muted-foreground">{record.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
