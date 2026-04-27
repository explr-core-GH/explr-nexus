import { useMemo } from 'react';
import { Download, Users, GraduationCap, Utensils, Timer, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useItemRequests } from '@/hooks/useItemRequests';

type Stat = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
};

export function ImpactDashboard() {
  const { requests, loading } = useItemRequests();

  const data = useMemo(() => {
    // Only count requests that were approved (real impact)
    const approved = requests.filter((r) => r.status === 'approved');

    let totalStudents = 0;
    let totalHours = 0;
    let totalDays = 0;
    let frlYes = 0;
    let frlMixed = 0;
    let frlNo = 0;
    let frlUnknown = 0;
    const groupCounts = new Map<string, number>();
    const groupStudentCounts = new Map<string, number>();
    const orgCounts = new Map<string, { requests: number; students: number }>();

    for (const r of approved) {
      const students = r.numberOfStudents ?? 0;
      totalStudents += students;
      totalHours += r.usageHours ?? 0;
      totalDays += r.usageDays ?? 0;

      switch (r.freeReducedLunch) {
        case 'yes': frlYes += students; break;
        case 'mixed': frlMixed += students; break;
        case 'no': frlNo += students; break;
        default: frlUnknown += students;
      }

      for (const g of r.specialGroups || []) {
        groupCounts.set(g, (groupCounts.get(g) || 0) + 1);
        groupStudentCounts.set(g, (groupStudentCounts.get(g) || 0) + students);
      }

      const org = r.requesterOrganization || 'Unspecified';
      const prev = orgCounts.get(org) || { requests: 0, students: 0 };
      orgCounts.set(org, {
        requests: prev.requests + 1,
        students: prev.students + students,
      });
    }

    const frlReached = frlYes + frlMixed;
    const frlPercent = totalStudents > 0
      ? Math.round((frlReached / totalStudents) * 100)
      : 0;

    const sortedGroups = [...groupStudentCounts.entries()]
      .sort((a, b) => b[1] - a[1]);

    const sortedOrgs = [...orgCounts.entries()]
      .sort((a, b) => b[1].students - a[1].students)
      .slice(0, 8);

    return {
      approvedCount: approved.length,
      totalStudents,
      totalHours,
      totalDays,
      frlYes,
      frlMixed,
      frlNo,
      frlUnknown,
      frlReached,
      frlPercent,
      sortedGroups,
      sortedOrgs,
    };
  }, [requests]);

  const stats: Stat[] = [
    {
      label: 'Students Reached',
      value: data.totalStudents.toLocaleString(),
      icon: Users,
      hint: `${data.approvedCount} approved requests`,
    },
    {
      label: 'Free / Reduced Lunch',
      value: `${data.frlReached.toLocaleString()} (${data.frlPercent}%)`,
      icon: Utensils,
      hint: 'Students from FRL or mixed-FRL groups',
    },
    {
      label: 'Instructional Hours',
      value: data.totalHours.toLocaleString(),
      icon: Timer,
      hint: `${data.totalDays.toLocaleString()} total days`,
    },
    {
      label: 'Special Populations',
      value: data.sortedGroups.length,
      icon: Sparkles,
      hint: 'Distinct groups served',
    },
  ];

  const exportCsv = () => {
    const header = [
      'Approved At',
      'Item',
      'Organization',
      'Requester',
      'Students',
      'Free/Reduced Lunch',
      'Hours',
      'Days',
      'Special Groups',
    ];
    const escape = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = requests
      .filter((r) => r.status === 'approved')
      .map((r) =>
        [
          r.confirmedDate || r.updatedAt,
          r.itemName,
          r.requesterOrganization || '',
          r.requesterName,
          r.numberOfStudents ?? '',
          r.freeReducedLunch || '',
          r.usageHours ?? '',
          r.usageDays ?? '',
          (r.specialGroups || []).join('; '),
        ]
          .map(escape)
          .join(',')
      );
    const csv = [header.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `impact-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading impact data...
      </div>
    );
  }

  if (data.approvedCount === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-xl bg-card">
        <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>No approved requests yet — impact metrics will appear here.</p>
      </div>
    );
  }

  const maxGroupValue = data.sortedGroups[0]?.[1] || 1;
  const maxOrgValue = data.sortedOrgs[0]?.[1].students || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Student Impact Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Aggregated from approved equipment requests — useful for grants & reporting.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report (CSV)
        </Button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <s.icon className="h-4 w-4" />
              {s.label}
            </div>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
            {s.hint && (
              <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* FRL breakdown */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold">Free / Reduced Lunch Breakdown</h4>
          </div>
          {[
            { label: 'Yes (FRL eligible)', value: data.frlYes, color: 'bg-available' },
            { label: 'Mixed', value: data.frlMixed, color: 'bg-warning' },
            { label: 'No', value: data.frlNo, color: 'bg-muted-foreground' },
            { label: 'Unknown', value: data.frlUnknown, color: 'bg-muted' },
          ].map((row) => {
            const pct = data.totalStudents > 0
              ? Math.round((row.value / data.totalStudents) * 100)
              : 0;
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="font-medium">
                    {row.value.toLocaleString()} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full ${row.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Special groups */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold">Students by Special Population</h4>
          </div>
          {data.sortedGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No special group data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.sortedGroups.map(([group, count]) => {
                const pct = Math.round((count / maxGroupValue) * 100);
                return (
                  <div key={group} className="space-y-1">
                    <div className="flex justify-between text-sm gap-2">
                      <span className="truncate">{group}</span>
                      <span className="font-medium whitespace-nowrap">
                        {count.toLocaleString()} students
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top organizations */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold">Top Organizations by Students Served</h4>
        </div>
        {data.sortedOrgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organization data yet.</p>
        ) : (
          <div className="space-y-2">
            {data.sortedOrgs.map(([org, info]) => {
              const pct = Math.round((info.students / maxOrgValue) * 100);
              return (
                <div key={org} className="space-y-1">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="truncate font-medium">{org}</span>
                    <span className="text-muted-foreground whitespace-nowrap flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {info.requests} req
                      </Badge>
                      {info.students.toLocaleString()} students
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
