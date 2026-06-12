import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { parseTeacherCSV, teacherCsvTemplate, type DraftRow, type ParseResult } from '@/lib/csvAssignments';

interface TeacherCSVImportDialogProps {
  onImport: (rows: DraftRow[]) => void;
  mode?: 'teacher' | 'program';
}

export function TeacherCSVImportDialog({ onImport, mode = 'teacher' }: TeacherCSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const downloadTemplate = () => {
    const blob = new Blob([teacherCsvTemplate(mode)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = mode === 'program' ? 'program_schools_template.csv' : 'teacher_assignments_template.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Template downloaded', description: 'Fill it out and upload to bulk-add assignments' });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please select a CSV file', variant: 'destructive' });
      return;
    }
    setFile(selected);
    try {
      setResult(parseTeacherCSV(await selected.text(), { requireTeacher: mode === 'teacher' }));
    } catch {
      toast({ title: 'Error', description: 'Failed to read file', variant: 'destructive' });
    }
  };

  const handleImport = () => {
    if (!result || result.rows.length === 0) return;
    onImport(result.rows);
    toast({ title: 'Added to grid', description: `${result.rows.length} row(s) ready to review` });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {mode === 'program' ? 'Import Program Schools' : 'Import Teacher Assignments'}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV to bulk-add teacher assignments. They land in the editable grid so you can
            fix any unmatched schools before saving.
          </DialogDescription>
        </DialogHeader>

        <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          Download Template
        </Button>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="teacher-csv-upload"
            />
            <label htmlFor="teacher-csv-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2"
                    onClick={(e) => {
                      e.preventDefault();
                      reset();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                </>
              )}
            </label>
          </div>

          {result && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {result.rows.length > 0 && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {result.rows.length} rows
                  </Badge>
                )}
                {result.errors.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {result.errors.length} notes
                  </Badge>
                )}
              </div>

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ScrollArea className="max-h-24">
                      <ul className="text-sm space-y-1">
                        {result.errors.map((err, i) => (
                          <li key={i}>Row {err.row}: {err.message}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview of what will be added */}
              {result.rows.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-sm font-medium">Preview</div>
                  <ScrollArea className="max-h-56">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="text-left font-normal px-3 py-1.5">Teacher</th>
                          <th className="text-left font-normal px-3 py-1.5">School</th>
                          <th className="text-left font-normal px-3 py-1.5">Grades</th>
                          <th className="text-left font-normal px-3 py-1.5">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((r) => (
                          <tr key={r.id} className="border-b last:border-0">
                            <td className="px-3 py-1.5 font-medium">{r.teacherName}</td>
                            <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[160px]">
                              {r.schoolText || <span className="text-destructive">— missing —</span>}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {r.gradeLow && r.gradeHigh ? `${r.gradeLow}–${r.gradeHigh}` : '—'}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{r.schoolYear}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Nothing is uploaded yet. These rows open in the editable grid where you can match
                  schools, fix details, and then click <strong>Save All</strong> to upload for real.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!result && (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {mode === 'program' ? (
                  <>
                    <strong>Required:</strong> school<br />
                    <strong>Optional:</strong> grade_low, grade_high, students_served, school_year,
                    subject. (Program name &amp; type are set in the app.)
                  </>
                ) : (
                  <>
                    <strong>Required:</strong> teacher_name<br />
                    <strong>Optional:</strong> teacher_email, school, grade_low, grade_high,
                    students_served, school_year, subject
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!result || result.rows.length === 0}>
            Review {result?.rows.length || 0} in grid →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
