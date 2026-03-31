"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Globe,
  Activity,
  Search,
  AlertTriangle,
  Gauge,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface OverviewData {
  users: {
    total_users: string;
    new_signups_today: string;
    google_users: string;
    credentials_users: string;
  };
  traffic: {
    total_page_views: string;
    page_views_today: string;
    total_sessions: string;
    sessions_today: string;
  };
}

interface GeoRow {
  country: string;
  sessions: string;
  page_views: string;
}

interface EngagementData {
  dailyActiveUsers: Array<{
    date: string;
    sessions: string;
    page_views: string;
  }>;
  popularPages: Array<{
    path: string;
    views: string;
  }>;
}

interface FeatureData {
  searchQueries: Array<{ query: string; count: string }>;
  mostViewedMatches: Array<{ path: string; views: string }>;
  deviceBreakdown: Array<{ device_type: string; count: string }>;
}

interface Incident {
  id: number;
  severity: string;
  metric_name: string;
  triggered_at: string;
  resolved_at: string | null;
  duration_seconds: number | null;
  auto_description: string;
}

interface LoadTest {
  id: number;
  test_name: string;
  virtual_users_peak: number;
  total_requests: number;
  requests_per_second: string;
  p50_response_ms: string;
  p95_response_ms: string;
  p99_response_ms: string;
  error_rate_pct: string;
  passed: boolean;
  started_at: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchAdmin<T>(path: string): Promise<T | null> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAdmin } = useAuth();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [geo, setGeo] = useState<GeoRow[] | null>(null);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [features, setFeatures] = useState<FeatureData | null>(null);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [loadTests, setLoadTests] = useState<LoadTest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Protect admin route
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/login");
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    async function loadData() {
      const [o, g, e, f, i, l] = await Promise.all([
        fetchAdmin<OverviewData>("/admin/analytics/overview"),
        fetchAdmin<GeoRow[]>("/admin/analytics/geography"),
        fetchAdmin<EngagementData>("/admin/analytics/engagement"),
        fetchAdmin<FeatureData>("/admin/analytics/features"),
        fetchAdmin<Incident[]>("/admin/analytics/incidents"),
        fetchAdmin<LoadTest[]>("/admin/analytics/load-tests"),
      ]);
      setOverview(o);
      setGeo(g);
      setEngagement(e);
      setFeatures(f);
      setIncidents(i);
      setLoadTests(l);
      setIsLoading(false);
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          icon={BarChart3}
          title="Analytics Dashboard"
          subtitle="Admin-only analytics and system health"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        icon={BarChart3}
        title="Analytics Dashboard"
        subtitle="Admin-only analytics and system health"
      />

      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          title="Registered Users"
          value={overview?.users.total_users || "0"}
          subtitle={`${overview?.users.new_signups_today || 0} new today`}
        />
        <StatCard
          icon={Activity}
          title="Page Views"
          value={Number(overview?.traffic.total_page_views || 0).toLocaleString()}
          subtitle={`${Number(overview?.traffic.page_views_today || 0).toLocaleString()} today`}
        />
        <StatCard
          icon={Globe}
          title="Sessions"
          value={Number(overview?.traffic.total_sessions || 0).toLocaleString()}
          subtitle={`${Number(overview?.traffic.sessions_today || 0).toLocaleString()} today`}
        />
      </div>

      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="engagement">
            <Activity className="mr-1.5 size-3.5" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="geography">
            <Globe className="mr-1.5 size-3.5" />
            Geography
          </TabsTrigger>
          <TabsTrigger value="features">
            <Search className="mr-1.5 size-3.5" />
            Features
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="mr-1.5 size-3.5" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="load-tests">
            <Gauge className="mr-1.5 size-3.5" />
            Load Tests
          </TabsTrigger>
        </TabsList>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Activity (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {engagement?.dailyActiveUsers.slice(0, 14).map((day) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex gap-4">
                        <span>{day.sessions} sessions</span>
                        <span className="text-muted-foreground">
                          {day.page_views} views
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!engagement?.dailyActiveUsers ||
                    engagement.dailyActiveUsers.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No engagement data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Popular Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {engagement?.popularPages.map((page) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono text-xs">{page.path}</span>
                      <span className="font-medium">{page.views}</span>
                    </div>
                  ))}
                  {(!engagement?.popularPages ||
                    engagement.popularPages.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No page view data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Users by Country</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase text-muted-foreground">
                  <span>Country</span>
                  <div className="flex gap-8">
                    <span>Sessions</span>
                    <span>Page Views</span>
                  </div>
                </div>
                {geo?.map((row) => (
                  <div
                    key={row.country}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{row.country}</span>
                    <div className="flex gap-12">
                      <span>{row.sessions}</span>
                      <span className="text-muted-foreground">
                        {row.page_views}
                      </span>
                    </div>
                  </div>
                ))}
                {(!geo || geo.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No geography data yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {features?.searchQueries.map((q) => (
                    <div
                      key={q.query}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{q.query}</span>
                      <span className="font-medium">{q.count}</span>
                    </div>
                  ))}
                  {(!features?.searchQueries ||
                    features.searchQueries.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No search data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Viewed Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {features?.mostViewedMatches.map((m) => (
                    <div
                      key={m.path}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono text-xs">{m.path}</span>
                      <span className="font-medium">{m.views}</span>
                    </div>
                  ))}
                  {(!features?.mostViewedMatches ||
                    features.mostViewedMatches.length === 0) && (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {features?.deviceBreakdown.map((d) => {
                    const total = features.deviceBreakdown.reduce(
                      (sum, x) => sum + Number(x.count),
                      0,
                    );
                    const pct = total > 0
                      ? ((Number(d.count) / total) * 100).toFixed(1)
                      : "0";
                    return (
                      <div key={d.device_type}>
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{d.device_type}</span>
                          <span>
                            {d.count} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!features?.deviceBreakdown ||
                    features.deviceBreakdown.length === 0) && (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents?.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            incident.severity === "critical"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {incident.severity}
                        </span>
                        <span className="font-medium">
                          {incident.metric_name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(incident.triggered_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {incident.auto_description}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Status:{" "}
                        {incident.resolved_at ? (
                          <span className="text-green-600">Resolved</span>
                        ) : (
                          <span className="text-red-600">Active</span>
                        )}
                      </span>
                      {incident.duration_seconds && (
                        <span>Duration: {incident.duration_seconds}s</span>
                      )}
                    </div>
                  </div>
                ))}
                {(!incidents || incidents.length === 0) && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Calendar className="mb-2 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No incidents recorded
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Load Tests Tab */}
        <TabsContent value="load-tests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Load Test Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground">
                      <th className="pb-2 text-left font-medium">Test</th>
                      <th className="pb-2 text-right font-medium">VUs</th>
                      <th className="pb-2 text-right font-medium">Requests</th>
                      <th className="pb-2 text-right font-medium">RPS</th>
                      <th className="pb-2 text-right font-medium">p95</th>
                      <th className="pb-2 text-right font-medium">Error%</th>
                      <th className="pb-2 text-right font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadTests?.map((test) => (
                      <tr key={test.id}>
                        <td className="py-2 font-medium">{test.test_name}</td>
                        <td className="py-2 text-right">
                          {test.virtual_users_peak}
                        </td>
                        <td className="py-2 text-right">
                          {test.total_requests}
                        </td>
                        <td className="py-2 text-right">
                          {test.requests_per_second}
                        </td>
                        <td className="py-2 text-right">
                          {test.p95_response_ms}ms
                        </td>
                        <td className="py-2 text-right">
                          {test.error_rate_pct}%
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              test.passed
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {test.passed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!loadTests || loadTests.length === 0) && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Gauge className="mb-2 size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No load tests recorded yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
