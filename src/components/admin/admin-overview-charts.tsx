"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Point = {
  label: string;
  value?: number;
  success?: number;
  failure?: number;
};

function ChartFrame({ children }: { children: (size: { width: number; height: number }) => ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const height = 240;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => setWidth(Math.max(1, Math.floor(element.getBoundingClientRect().width)));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-60 min-w-0">
      {width > 1 ? children({ width, height }) : <div className="h-full rounded-md bg-muted/20" />}
    </div>
  );
}

export function AdminOverviewCharts({
  userGrowth,
  activity,
  recordsByStatus,
  authEvents,
}: {
  userGrowth: Point[];
  activity: Point[];
  recordsByStatus: Point[];
  authEvents: Point[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>Son 7 gün kullanıcı oluşumu.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartFrame>
            {({ width, height }) => (
            <AreaChart width={width} height={height} data={userGrowth}>
              <defs>
                <linearGradient id="adminUserGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="value" stroke="#22d3ee" fill="url(#adminUserGrowth)" strokeWidth={2} />
            </AreaChart>
            )}
          </ChartFrame>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
          <CardDescription>Audit aktivitesi ve operasyon ritmi.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartFrame>
            {({ width, height }) => (
            <BarChart width={width} height={height} data={activity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
            )}
          </ChartFrame>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Records by Status</CardTitle>
          <CardDescription>Risk ve olay durumlarının dağılımı.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartFrame>
            {({ width, height }) => (
            <PieChart width={width} height={height}>
              <Pie data={recordsByStatus} dataKey="value" nameKey="label" innerRadius={52} outerRadius={86} paddingAngle={3}>
                {recordsByStatus.map((entry, index) => (
                  <Cell key={entry.label} fill={["#22d3ee", "#f59e0b", "#fb7185", "#a78bfa", "#34d399"][index % 5]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
            </PieChart>
            )}
          </ChartFrame>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auth Events</CardTitle>
          <CardDescription>Başarılı ve başarısız kimlik doğrulama olayları.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChartFrame>
            {({ width, height }) => (
            <BarChart width={width} height={height} data={authEvents}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Bar dataKey="success" stackId="auth" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Bar dataKey="failure" stackId="auth" fill="#fb7185" radius={[6, 6, 0, 0]} />
            </BarChart>
            )}
          </ChartFrame>
        </CardContent>
      </Card>
    </div>
  );
}
