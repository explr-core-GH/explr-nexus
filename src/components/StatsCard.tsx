import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'available' | 'checked-out' | 'maintenance';
  onClick?: () => void;
  isActive?: boolean;
}

export function StatsCard({ title, value, icon: Icon, variant = 'default', onClick, isActive }: StatsCardProps) {
  const variantClasses = {
    default: 'bg-secondary text-foreground',
    available: 'bg-available/10 text-available',
    'checked-out': 'bg-checked-out/10 text-checked-out',
    maintenance: 'bg-maintenance/10 text-maintenance',
  };

  return (
    <div 
      className={cn(
        "p-5 bg-card rounded-xl border border-border animate-slide-up transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-accent/50",
        isActive && "ring-2 ring-accent border-accent"
      )}
      onClick={onClick}
    >
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