import { useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Printer,
  KeyRound,
  Trash2,
  Loader2,
  Check,
  Search,
  MapPin,
  GraduationCap,
  School as SchoolIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useTeachers, type Teacher } from '@/hooks/useTeachers';
import { usePartnerSchools, type OhioSchool } from '@/hooks/usePartnerSchools';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { useOhioSchools } from '@/hooks/useOhioSchools';
import { buildSnapshot } from '@/lib/schoolDemographics';
import { currentAcademicYear } from '@/lib/schoolYears';
import { supabase } from '@/integrations/supabase/client';
import { printTeacherCredentials } from '@/lib/printCredentials';
import { useToast } from '@/hooks/use-toast';

/** Mailing address for a teacher, derived from their Ohio school record. */
function ohioAddress(o: OhioSchool): string {
  const cityState = [o.city, o.city ? 'OH' : null].filter(Boolean).join(', ');
  const parts = [o.building_name, o.address, cityState].filter(Boolean);
  return parts.join(', ');
}

/** Searchable Ohio-school picker; shows a confirmed chip once one is chosen. */
function OhioSchoolPicker({
  value,
  onChange,
}: {
  value: OhioSchool | null;
  onChange: (s: OhioSchool | null) => void;
}) {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useOhioSchools(query);

  if (value) {
    return (
      <div className="border rounded-lg p-2.5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Check className="h-4 w-4 text-available shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{value.building_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {[value.district_name, value.city].filter(Boolean).join(' · ')} · IRN {value.irn}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search Ohio schools by name, district, or IRN"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="border rounded-lg max-h-44 overflow-y-auto divide-y mt-1">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            results.map((s) => (
              <button
                key={s.irn}
                type="button"
                onClick={() => onChange(s)}
                className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{s.building_name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">IRN {s.irn}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[s.district_name, s.city].filter(Boolean).join(' · ')}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}

export function TeachersPanel() {
  const {
    teachers,
    isLoading,
    updateTeacher,
    createTeacherAccount,
    resetTeacherPassword,
    deleteTeacher,
  } = useTeachers();
  const { schools, findOrCreateByOhioIrn } = usePartnerSchools();
  const { assignments, addAssignment, updateAssignment, deleteAssignment } = useTeacherAssignments();
  const { toast } = useToast();

  const schoolNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schools) map.set(s.id, s.name);
    return map;
  }, [schools]);

  const assignmentsByTeacher = useMemo(() => {
    const map = new Map<string, { school: string; year: string | null }[]>();
    for (const a of assignments) {
      if (!a.teacher_id) continue;
      const list = map.get(a.teacher_id) ?? [];
      list.push({ school: schoolNameById.get(a.school_id ?? '') ?? a.partner_schools?.name ?? 'School', year: a.school_year });
      map.set(a.teacher_id, list);
    }
    return map;
  }, [assignments, schoolNameById]);

  /**
   * Links a teacher to an Ohio school for the current year (creating or updating
   * their assignment) and refreshes their mailing address from the Ohio record.
   */
  const linkTeacherToSchool = async (teacherId: string, ohio: OhioSchool): Promise<boolean> => {
    const partner = await findOrCreateByOhioIrn(ohio);
    if (!partner) return false;
    const year = currentAcademicYear();
    const existing = assignments.find((a) => a.teacher_id === teacherId && a.school_year === year);
    const gl = existing?.grade_low ?? (ohio.low_grade || 'PK');
    const gh = existing?.grade_high ?? (ohio.high_grade || '12');
    const served = existing?.students_served ?? null;
    const snapshot = buildSnapshot(ohio, gl, gh, served);

    if (existing) {
      await updateAssignment(existing.id, {
        school_id: partner.id,
        grade_low: gl,
        grade_high: gh,
        subject: existing.subject ?? null,
        students_served: served,
        school_year: year,
        demographics_snapshot: snapshot,
      });
    } else {
      await addAssignment({
        teacher_id: teacherId,
        school_id: partner.id,
        grade_low: gl,
        grade_high: gh,
        subject: null,
        students_served: served,
        school_year: year,
        demographics_snapshot: snapshot,
      });
    }
    await updateTeacher(teacherId, { address: ohioAddress(ohio) });
    return true;
  };

  // ---- Generate account dialog ------------------------------------------
  const [genOpen, setGenOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [genSchool, setGenSchool] = useState<OhioSchool | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCred, setLastCred] = useState<{ fullName: string; email: string; password: string } | null>(null);

  const openGenerate = () => {
    setName('');
    setEmail('');
    setGenSchool(null);
    setLastCred(null);
    setGenOpen(true);
  };

  const handleGenerate = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Missing information', description: 'Enter the teacher name and email.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const address = genSchool ? ohioAddress(genSchool) : null;
    const result = await createTeacherAccount({ fullName: name.trim(), email: email.trim(), address });
    if (result) {
      if (genSchool && result.teacherId) {
        await linkTeacherToSchool(result.teacherId, genSchool);
      }
      const full = { fullName: name.trim(), email: result.email, password: result.password };
      setLastCred(full);
      printTeacherCredentials(full);
    }
    setBusy(false);
  };

  // ---- Manage schools dialog (add / change / remove) --------------------
  const [schoolTeacher, setSchoolTeacher] = useState<Teacher | null>(null);
  const [pickSchool, setPickSchool] = useState<OhioSchool | null>(null);
  const [linking, setLinking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const openManageSchools = (t: Teacher) => {
    setSchoolTeacher(t);
    setPickSchool(null);
  };

  const handleChangeSchool = async () => {
    if (!schoolTeacher || !pickSchool) return;
    setLinking(true);
    const ok = await linkTeacherToSchool(schoolTeacher.id, pickSchool);
    setLinking(false);
    if (ok) setPickSchool(null);
  };

  const handleRemoveAssignment = async (id: string) => {
    setRemovingId(id);
    await deleteAssignment(id);
    setRemovingId(null);
  };

  const dialogAssignments = schoolTeacher
    ? assignments.filter((a) => a.teacher_id === schoolTeacher.id)
    : [];

  // ---- Reset password ----------------------------------------------------
  const [resettingId, setResettingId] = useState<string | null>(null);

  const handleReset = async (teacher: Teacher) => {
    if (!teacher.profile_id) return;
    setResettingId(teacher.id);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', teacher.profile_id)
        .maybeSingle();
      if (!data?.user_id) {
        toast({ title: 'No login account', description: 'This teacher has no login to reset.', variant: 'destructive' });
        return;
      }
      const password = await resetTeacherPassword(data.user_id);
      if (password) {
        printTeacherCredentials({ fullName: teacher.full_name, email: teacher.email ?? '', password });
      }
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Teachers</h2>
            <p className="text-muted-foreground">
              Create teacher logins and link each to an Ohio school — address and demographics come
              from the Ohio data automatically.
            </p>
          </div>
        </div>
        <Button onClick={openGenerate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Generate Teacher Account
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Teacher</TableHead>
              <TableHead className="hidden lg:table-cell">Address</TableHead>
              <TableHead className="hidden sm:table-cell">School</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading teachers…
                </TableCell>
              </TableRow>
            ) : teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No teachers yet — generate an account to get started.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((t) => {
                const teacherAssignments = assignmentsByTeacher.get(t.id) ?? [];
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t.email ?? 'No email'}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[220px]">
                      <div className="flex items-start gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className={t.address ? '' : 'text-muted-foreground italic'}>
                          {t.address || 'From school'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {teacherAssignments.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Not linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {teacherAssignments.map((a, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 text-xs">
                              <GraduationCap className="h-3 w-3" />
                              {a.school}
                              {a.year ? ` · ${a.year}` : ''}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.profile_id ? (
                        <Badge variant="outline" className="bg-available/10 text-available border-available/30">Has login</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No login</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openManageSchools(t)}
                        >
                          <SchoolIcon className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">
                            {teacherAssignments.length ? 'Manage schools' : 'Set school'}
                          </span>
                        </Button>
                        {t.profile_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={resettingId === t.id}
                            onClick={() => handleReset(t)}
                          >
                            {resettingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden xl:inline">Reset &amp; print</span>
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove teacher</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove <strong>{t.full_name}</strong> from the teachers list? This does not delete
                                their login account — remove that from the Users tab if needed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteTeacher(t.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Generate account dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Teacher Account</DialogTitle>
            <DialogDescription>
              Creates a login with a generated password. Pick the teacher's Ohio school — their
              address and demographics come from the Ohio data.
            </DialogDescription>
          </DialogHeader>

          {lastCred ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-secondary/40 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email / username</p>
                  <p className="font-mono font-semibold break-all">{lastCred.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Password</p>
                  <p className="font-mono font-semibold text-lg">{lastCred.password}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This password is shown once. Print it now — if it's lost, use “Reset &amp; print” on the teacher row.
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => printTeacherCredentials(lastCred)}>
                  <Printer className="h-4 w-4" />
                  Print again
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setGenOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="teacher-name">Full name *</Label>
                <Input id="teacher-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-email">Email *</Label>
                <Input id="teacher-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@school.org" />
              </div>
              <div className="space-y-1.5">
                <Label>School (Ohio data)</Label>
                <OhioSchoolPicker value={genSchool} onChange={setGenSchool} />
                {genSchool && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {ohioAddress(genSchool)}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGenOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create &amp; print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage schools dialog */}
      <Dialog open={!!schoolTeacher} onOpenChange={(o) => { if (!o) setSchoolTeacher(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{schoolTeacher?.full_name}'s schools</DialogTitle>
            <DialogDescription>
              Linked schools feed grant reporting. Remove a link, or set/change the school for
              {' '}{currentAcademicYear()} — the address and demographics come from the Ohio data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current links */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Current links</Label>
              {dialogAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not linked to a school yet.</p>
              ) : (
                <div className="border rounded-lg divide-y">
                  {dialogAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <SchoolIcon className="h-4 w-4 text-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.partner_schools?.name ?? schoolNameById.get(a.school_id ?? '') ?? 'School'}
                          </p>
                          <p className="text-xs text-muted-foreground">{a.school_year ?? 'No year'}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive shrink-0"
                        disabled={removingId === a.id}
                        onClick={() => handleRemoveAssignment(a.id)}
                      >
                        {removingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Set / change for the current year */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Set school for {currentAcademicYear()}
              </Label>
              <OhioSchoolPicker value={pickSchool} onChange={setPickSchool} />
              {pickSchool && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {ohioAddress(pickSchool)}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setSchoolTeacher(null)} disabled={linking}>Close</Button>
                <Button onClick={handleChangeSchool} disabled={!pickSchool || linking} className="gap-2">
                  {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save school
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
