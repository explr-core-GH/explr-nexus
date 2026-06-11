import { useMemo, useState } from 'react';
import { School, Map as MapIcon, Search, Trash2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LocationsMap } from '@/components/LocationsMap';
import { AddSchoolDialog } from '@/components/AddSchoolDialog';
import { AssignTeacherDialog } from '@/components/AssignTeacherDialog';
import { GrantImpactDashboard } from '@/components/GrantImpactDashboard';
import { usePartnerSchools } from '@/hooks/usePartnerSchools';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';

export function SchoolsPanel() {
  const { schools, addSchool, deleteSchool } = usePartnerSchools();
  const { assignments, addAssignment, deleteAssignment } = useTeacherAssignments();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address ?? '').toLowerCase().includes(q) ||
        (s.ohio_irn ?? '').toLowerCase().includes(q)
    );
  }, [schools, query]);

  const assignmentsBySchool = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) map.set(a.school_id, (map.get(a.school_id) ?? 0) + 1);
    return map;
  }, [assignments]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <School className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Schools & Teachers</h2>
            <p className="text-muted-foreground">
              Map the schools you work with and pull Ohio Report Card demographics
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AssignTeacherDialog schools={schools} onAssign={addAssignment} />
          <AddSchoolDialog onAdd={addSchool} />
        </div>
      </div>

      {/* Map */}
      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">School Map</h3>
        </div>
        <LocationsMap locations={[]} items={[]} schools={schools} />
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(173, 80%, 40%)' }} />
            <span>Partner School</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Partner Schools</p>
          <p className="text-2xl font-bold">{schools.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">With Ohio Data</p>
          <p className="text-2xl font-bold text-accent">
            {schools.filter((s) => s.ohio_schools).length}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-sm text-muted-foreground">Teacher Assignments</p>
          <p className="text-2xl font-bold">{assignments.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search schools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Schools table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>School</TableHead>
              <TableHead className="hidden sm:table-cell">Enrollment</TableHead>
              <TableHead className="hidden md:table-cell">Econ. Disadv.</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {schools.length === 0 ? 'No schools added yet' : 'No matching schools'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((school) => {
                const oh = school.ohio_schools;
                return (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                          <School className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{school.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {school.ohio_irn ? `IRN ${school.ohio_irn}` : 'Manual entry'}
                            {school.address ? ` · ${school.address}` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {oh?.total_enrollment?.toLocaleString() ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {oh?.pct_economically_disadvantaged != null
                        ? `${Math.round(oh.pct_economically_disadvantaged)}%`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {assignmentsBySchool.get(school.id) ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete School</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete <strong>{school.name}</strong>? This also removes its teacher
                              assignments and their demographic snapshots.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSchool(school.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assignments + grant reporting */}
      <GrantImpactDashboard
        schools={schools}
        assignments={assignments}
        onDeleteAssignment={deleteAssignment}
      />
    </div>
  );
}
