"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, SearchIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminUserRow } from "@/server/admin/admin-service";

type ApiEnvelope<T> = {
  data: T | null;
  error?: { message?: string } | null;
};

function statusLabel(status: AdminUserRow["status"]) {
  return status === "active" ? "Active" : "Passive";
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readAdminResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? "Admin işlemi tamamlanamadı.");
  }

  if (!payload?.data) {
    throw new Error("Admin API boş yanıt döndürdü.");
  }

  return payload.data;
}

export function AdminUsersTable({
  users,
  currentUserId,
  query,
}: {
  users: AdminUserRow[];
  currentUserId: string;
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState(users);
  const [search, setSearch] = useState(query);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [productRoleFilter, setProductRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt-desc");

  const totalAdmins = useMemo(
    () => rows.filter((row) => row.platformRole === "ADMIN" && row.status === "active").length,
    [rows],
  );
  const productRoles = useMemo(() => Array.from(new Set(rows.map((row) => row.productRole))).sort(), [rows]);
  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const productMatch = productRoleFilter === "all" || row.productRole === productRoleFilter;
      const statusMatch = statusFilter === "all" || row.status === statusFilter;
      const platformMatch = platformFilter === "all" || row.platformRole === platformFilter;
      return productMatch && statusMatch && platformMatch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "lastLogin-desc") {
        return Date.parse(b.lastLoginAt ?? "1970-01-01") - Date.parse(a.lastLoginAt ?? "1970-01-01");
      }
      if (sortBy === "lastLogin-asc") {
        return Date.parse(a.lastLoginAt ?? "1970-01-01") - Date.parse(b.lastLoginAt ?? "1970-01-01");
      }
      if (sortBy === "createdAt-asc") {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [platformFilter, productRoleFilter, rows, sortBy, statusFilter]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);

    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.replace(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  async function updateRole(userId: string, platformRole: AdminUserRow["platformRole"]) {
    setError(null);
    setPendingId(userId);

    try {
      const updated = await readAdminResponse<AdminUserRow>(
        await fetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ platformRole }),
        }),
      );
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rol güncellenemedi.");
    } finally {
      setPendingId(null);
    }
  }

  async function updateStatus(userId: string, nextStatus: "active" | "suspended") {
    setError(null);
    setPendingId(userId);

    try {
      const updated = await readAdminResponse<AdminUserRow>(
        await fetch(`/api/admin/users/${userId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        }),
      );
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form className="relative w-full max-w-md" onSubmit={submitSearch}>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kullanıcı, e-posta veya departman ara"
            className="pl-8"
            aria-label="Admin kullanıcı arama"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{rows.length} users</Badge>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
            {totalAdmins} active admins
          </Badge>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Select value={productRoleFilter} onValueChange={setProductRoleFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Product role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All product roles</SelectItem>
            {productRoles.map((role) => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Passive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Platform role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platform roles</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="USER">USER</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">Newest first</SelectItem>
            <SelectItem value="createdAt-asc">Oldest first</SelectItem>
            <SelectItem value="lastLogin-desc">Last login desc</SelectItem>
            <SelectItem value="lastLogin-asc">Last login asc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Product Role</TableHead>
            <TableHead>Platform Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Security</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((user) => {
            const disabled = pendingId === user.id || isPending;
            const isCurrentUser = user.id === currentUserId;

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium text-[var(--text-primary)]">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.organizationName ?? "No organization"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.productRole}</Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.platformRole}
                    onValueChange={(value) => void updateRole(user.id, value as AdminUserRow["platformRole"])}
                    disabled={disabled || user.isSystemOwner}
                  >
                    <SelectTrigger size="sm" className="w-[112px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">USER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        user.status === "active"
                          ? "border-emerald-500/30 text-emerald-300"
                          : "border-amber-500/30 text-amber-300"
                      }
                    >
                      {statusLabel(user.status)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled || isCurrentUser}
                      title={isCurrentUser ? "Kendi hesabını buradan pasifleştiremezsin." : undefined}
                      onClick={() => void updateStatus(user.id, user.status === "active" ? "suspended" : "active")}
                    >
                      {user.status === "active" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={user.mfaEnabled ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}
                    >
                      2FA {user.mfaEnabled ? "on" : "off"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={user.failedAttempts ? "border-rose-500/30 text-rose-300" : undefined}
                    >
                      Failed {user.failedAttempts}
                    </Badge>
                    {user.isSystemOwner ? (
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">Owner</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon-sm" aria-label={`${user.name} detayı`}>
                    <Link href={`/admin/users/${user.id}`}>
                      <EyeIcon />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
