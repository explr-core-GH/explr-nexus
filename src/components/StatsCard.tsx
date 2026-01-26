import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'available' | 'checked-out' | 'maintenance';
}

export function StatsCard({ title, value, icon: Icon, variant = 'default' }: StatsCardProps) {
  const variantClasses = {
    default: 'bg-secondary text-foreground',
    available: 'bg-available/10 text-available',
    'checked-out': 'bg-checked-out/10 text-checked-out',
    maintenance: 'bg-maintenance/10 text-maintenance',
  };

  return (
    <div className="p-5 bg-card rounded-xl border border-border animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${variantClasses[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
