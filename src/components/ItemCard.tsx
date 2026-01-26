import { Package, MapPin, User, Clock, QrCode } from 'lucide-react';
import { InventoryItem } from '@/types/inventory';
import { formatDistanceToNow } from 'date-fns';

interface ItemCardProps {
  item: InventoryItem;
  onClick?: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const statusClasses = {
    'available': 'status-available',
    'checked-out': 'status-checked-out',
    'maintenance': 'status-maintenance',
  };

  const statusLabels = {
    'available': 'Available',
    'checked-out': 'Checked Out',
    'maintenance': 'Maintenance',
  };

  return (
    <div
      onClick={onClick}
      className="group p-5 bg-card rounded-xl border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-200 cursor-pointer animate-slide-up"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="p-3 rounded-lg bg-secondary group-hover:bg-accent/10 transition-colors">
            <Package className="h-5 w-5 text-foreground group-hover:text-accent transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {item.description}
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <QrCode className="h-3 w-3" />
                {item.qrCode}
              </span>
            </div>
          </div>
        </div>
        <span className={`status-pill ${statusClasses[item.status]}`}>
          {statusLabels[item.status]}
        </span>
      </div>

      {item.status === 'checked-out' && item.checkedOutBy && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {item.checkedOutBy}
          </span>
          {item.checkedOutAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(item.checkedOutAt), { addSuffix: true })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
