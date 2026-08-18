import { Package, FileText, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryItem } from '@/hooks/useInventoryDB';
import { Project, curriculumUrl } from '@/hooks/useProjects';
import { availableQuantity } from '@/lib/availability';
import { RequestProjectDialog, ProjectRequestLine } from '@/components/RequestProjectDialog';

interface ProjectCardProps {
  project: Project;
  items: InventoryItem[];
  reservedByItem: Record<string, number>;
  onRequested?: () => void;
}

export function ProjectCard({ project, items, reservedByItem, onRequested }: ProjectCardProps) {
  const rows = project.materials.map(material => {
    const item = items.find(i => i.id === material.itemId);
    const available = item ? availableQuantity(item, reservedByItem[material.itemId] ?? 0) : 0;
    return {
      material,
      item,
      available,
      ok: available >= material.quantity,
    };
  });

  const fullyAvailable = rows.length > 0 && rows.every(r => r.ok);
  // If any needed item is physically out (checked out / maintenance) that's the
  // headline reason; otherwise the shortfall is another teacher's active hold.
  const anyCheckedOut = rows.some(r => r.item && r.item.status !== 'available');
  const isWaitlist = rows.length > 0 && !fullyAvailable;
  const unavailableReason = anyCheckedOut ? 'Currently checked out' : 'On hold for another request';

  const lines: ProjectRequestLine[] = rows
    .filter(r => r.item)
    .map(r => ({ itemId: r.material.itemId, itemName: r.item!.name, quantity: r.material.quantity }));

  return (
    <Card className="flex flex-col overflow-hidden">
      {project.imageUrl ? (
        <img src={project.imageUrl} alt={`${project.name} project`} className="h-40 w-full object-contain bg-secondary" loading="lazy" />
      ) : (
        <div className="h-40 w-full bg-secondary flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <Badge variant={fullyAvailable ? 'default' : 'secondary'} className="shrink-0 gap-1">
            {fullyAvailable ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {fullyAvailable ? 'Available' : unavailableReason}
          </Badge>
        </div>
        {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materials</p>
          {rows.map(({ material, item, available, ok }) => (
            <div key={material.itemId} className="flex items-center justify-between text-sm">
              <span className={item ? '' : 'text-muted-foreground italic'}>
                {item?.name ?? 'Removed item'} <span className="text-muted-foreground">×{material.quantity}</span>
              </span>
              <span className={ok ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
                {available} available
              </span>
            </div>
          ))}
        </div>

        {project.curriculum.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Curriculum</p>
            {project.curriculum.map(entry => {
              const href = curriculumUrl(entry);
              return (
                <a
                  key={entry.id}
                  href={href ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {entry.type === 'file' ? <FileText className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                  {entry.title}
                </a>
              );
            })}
          </div>
        )}

        <RequestProjectDialog
          project={{ id: project.id, name: project.name }}
          lines={lines}
          disabled={lines.length === 0}
          waitlist={isWaitlist}
          unavailableReason={unavailableReason}
          onRequested={onRequested}
        />
      </CardContent>
    </Card>
  );
}
