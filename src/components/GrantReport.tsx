import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { TeacherAssignment } from '@/hooks/useTeacherAssignments';
import type { PartnerSchool } from '@/hooks/usePartnerSchools';
import { aggregate, countsFor, RACE_LABELS, GENDER_LABELS } from '@/lib/grantAggregate';

const PALETTE = ['#0ea5a4', '#0284c7', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#64748b'];
const GENDER_COLORS = ['#0284c7', '#db2777', '#64748b'];

interface GrantReportProps {
  assignments: TeacherAssignment[];
  schools: PartnerSchool[];
  yearLabel: string;
  typeLabel: string;
}

const fmt = (n: number) => n.toLocaleString();

export function GrantReport({ assignments, yearLabel, typeLabel }: GrantReportProps) {
  const served = aggregate(assignments, 'actual');
  const reach = aggregate(assignments, 'potential');
  // Charts show served composition when there are entered headcounts, else fall back to reach.
  const basis = served.students > 0 ? served : reach;
  const basisLabel = served.students > 0 ? 'Students served' : 'Potential reach';

  const distinctSchools = new Set(
    assignments.map((a) => a.school_id).filter((id): id is string => id != null)
  ).size;
  const distinctTeachers = new Set(
    assignments.map((a) => a.teacher_id).filter((id): id is string => id != null)
  ).size;

  const raceData = Object.entries(basis.race)
    .map(([k, v]) => ({ name: RACE_LABELS[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);

  const genderData = Object.entries(basis.gender)
    .map(([k, v]) => ({ name: GENDER_LABELS[k] ?? k, value: v }))
    .filter((d) => d.value > 0);

  const specialData = [
    { name: 'Econ. disadv.', value: basis.econ },
    { name: 'Disabilities', value: basis.disabilities },
    { name: 'English learners', value: basis.englishLearners },
    { name: 'Gifted', value: basis.gifted },
  ].filter((d) => d.value > 0);

  // Students by program type (using the chart basis mode)
  const typeMode = served.students > 0 ? 'actual' : 'potential';
  const byType = new Map<string, number>();
  for (const a of assignments) {
    const label = a.program_type
      ? a.program_type.charAt(0).toUpperCase() + a.program_type.slice(1)
      : 'Teachers';
    byType.set(label, (byType.get(label) ?? 0) + countsFor(a, typeMode).base);
  }
  const typeData = [...byType.entries()].map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);

  const tableRows: { label: string; served: number; reach: number }[] = [
    { label: 'Economically disadvantaged', served: served.econ, reach: reach.econ },
    { label: 'Students with disabilities', served: served.disabilities, reach: reach.disabilities },
    { label: 'English learners', served: served.englishLearners, reach: reach.englishLearners },
    { label: 'Gifted', served: served.gifted, reach: reach.gifted },
    ...Object.keys(RACE_LABELS)
      .map((k) => ({ label: RACE_LABELS[k], served: served.race[k] ?? 0, reach: reach.race[k] ?? 0 }))
      .filter((r) => r.served || r.reach),
    ...Object.keys(GENDER_LABELS)
      .map((k) => ({ label: GENDER_LABELS[k], served: served.gender[k] ?? 0, reach: reach.gender[k] ?? 0 }))
      .filter((r) => r.served || r.reach),
  ];

  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', flex: 1 }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '4px 0 8px' }}>{children}</h3>
  );

  return (
    <div
      id="grant-report-print"
      style={{
        width: 700,
        margin: '0 auto',
        background: '#fff',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '2px solid #16a34a', paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: '#16a34a' }}>EXPLR</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Grant Impact Report</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Year: <strong>{yearLabel}</strong> · Type: <strong>{typeLabel}</strong> · Generated {generated}
        </div>
      </div>

      {/* Headline stats */}
      <div className="report-section" style={{ display: 'flex', gap: 8, marginBottom: 16, breakInside: 'avoid' }}>
        <Stat label="Students Served (actual)" value={fmt(served.students)} sub="entered headcounts" />
        <Stat label="Potential Reach" value={fmt(reach.students)} sub="full grade-band enrollment" />
        <Stat label="Engagements" value={fmt(assignments.length)} />
        <Stat label="Schools" value={fmt(distinctSchools)} />
        <Stat label="Teachers" value={fmt(distinctTeachers)} />
      </div>

      {/* Race + Gender row */}
      <div className="report-section" style={{ display: 'flex', gap: 16, marginBottom: 16, breakInside: 'avoid' }}>
        <div style={{ flex: 1 }}>
          <SectionTitle>Students by Race / Ethnicity</SectionTitle>
          {raceData.length === 0 ? (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>No data.</p>
          ) : (
            <BarChart width={380} height={Math.max(160, raceData.length * 30)} data={raceData} layout="vertical" margin={{ left: 30, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {raceData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#334155' }} />
              </Bar>
            </BarChart>
          )}
        </div>
        {genderData.length > 0 && (
          <div style={{ width: 280 }}>
            <SectionTitle>Students by Gender</SectionTitle>
            <PieChart width={280} height={200}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(p: any) => fmt(p.value)}>
                {genderData.map((_, i) => (
                  <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </div>
        )}
      </div>

      {/* Special populations + program type */}
      <div className="report-section" style={{ display: 'flex', gap: 16, marginBottom: 16, breakInside: 'avoid' }}>
        {specialData.length > 0 && (
          <div style={{ flex: 1 }}>
            <SectionTitle>Special Populations</SectionTitle>
            <BarChart width={340} height={200} data={specialData} margin={{ top: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis hide />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#0ea5a4">
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#334155' }} />
              </Bar>
            </BarChart>
          </div>
        )}
        {typeData.length > 0 && (
          <div style={{ flex: 1 }}>
            <SectionTitle>Students by Program Type</SectionTitle>
            <BarChart width={340} height={200} data={typeData} margin={{ top: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis hide />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#334155' }} />
              </Bar>
            </BarChart>
          </div>
        )}
      </div>

      <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>
        Charts use <strong>{basisLabel.toLowerCase()}</strong>. Race/special-population figures for
        Ohio-matched assignments are estimates from building-level rates; program records use actual
        counts.
      </p>

      {/* Demographics table — served & reach */}
      <div className="report-section" style={{ breakInside: 'avoid' }}>
        <SectionTitle>Demographic Breakdown</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '5px 8px' }}>Dimension</th>
              <th style={{ textAlign: 'right', padding: '5px 8px' }}>Served</th>
              <th style={{ textAlign: 'right', padding: '5px 8px' }}>Reach</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 700 }}>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0' }}>Total students</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{fmt(served.students)}</td>
              <td style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{fmt(reach.students)}</td>
            </tr>
            {tableRows.map((r) => (
              <tr key={r.label}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{r.label}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{fmt(r.served)}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{fmt(r.reach)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
