import { ScanLine, LogIn, LogOut, Wrench, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export type ScanMode = 'default' | 'check-in' | 'check-out' | 'maintenance';

interface ScanButtonProps {
  onScan: (mode: ScanMode) => void;
  isAdmin?: boolean;
}

export function ScanButton({ onScan, isAdmin = false }: ScanButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="lg"
          className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg"
        >
          <ScanLine className="h-5 w-5" />
          <span className="hidden sm:inline">Scan QR</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Scan Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onScan('default')} className="gap-2 cursor-pointer">
          <ScanLine className="h-4 w-4" />
          Quick Scan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onScan('check-in')} className="gap-2 cursor-pointer">
          <LogIn className="h-4 w-4 text-available" />
          Scan to Check In
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onScan('check-out')} className="gap-2 cursor-pointer">
          <LogOut className="h-4 w-4 text-checked-out" />
          Scan to Check Out
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onScan('maintenance')} className="gap-2 cursor-pointer">
              <Wrench className="h-4 w-4 text-maintenance" />
              Send to Maintenance
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
