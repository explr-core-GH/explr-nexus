import { useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { GrantReport } from '@/components/GrantReport';
import type { TeacherAssignment } from '@/hooks/useTeacherAssignments';
import type { PartnerSchool } from '@/hooks/usePartnerSchools';

interface GrantReportDialogProps {
  assignments: TeacherAssignment[];
  schools: PartnerSchool[];
  yearLabel: string;
  typeLabel: string;
}

export function GrantReportDialog({ assignments, schools, yearLabel, typeLabel }: GrantReportDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          PDF Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[860px] max-h-[92vh] overflow-y-auto p-0">
        {/* On-screen toolbar (hidden when printing) */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 print:hidden">
          <div className="text-sm text-muted-foreground">
            Preview — use <strong>Save as PDF</strong> in the print dialog for the best output.
          </div>
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Save as PDF
          </Button>
        </div>
        <div className="p-4">
          <GrantReport
            assignments={assignments}
            schools={schools}
            yearLabel={yearLabel}
            typeLabel={typeLabel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
