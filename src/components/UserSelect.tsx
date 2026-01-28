import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck, Eye } from 'lucide-react';

export interface SelectableUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'user' | 'member' | null;
}

interface UserSelectProps {
  users: SelectableUser[];
  value?: string;
  onValueChange: (userId: string, userName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filterRoles?: ('admin' | 'user' | 'member')[];
}

export function UserSelect({
  users,
  value,
  onValueChange,
  placeholder = 'Select user',
  disabled = false,
  filterRoles,
}: UserSelectProps) {
  const filteredUsers = filterRoles 
    ? users.filter(u => u.role && filterRoles.includes(u.role))
    : users.filter(u => u.role !== null);

  const handleChange = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    if (user) {
      onValueChange(userId, user.full_name);
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'user':
        return <UserCheck className="h-3 w-3" />;
      case 'member':
        return <Eye className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeClass = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-accent text-accent-foreground';
      case 'user':
        return 'bg-primary text-primary-foreground';
      case 'member':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border z-50">
        {filteredUsers.length === 0 ? (
          <div className="py-2 px-3 text-sm text-muted-foreground">
            No users available
          </div>
        ) : (
          filteredUsers.map((user) => (
            <SelectItem key={user.user_id} value={user.user_id}>
              <div className="flex items-center gap-2">
                <span>{user.full_name}</span>
                {user.role && (
                  <Badge className={`text-xs px-1.5 py-0 ${getRoleBadgeClass(user.role)}`}>
                    {getRoleIcon(user.role)}
                    <span className="ml-1 capitalize">{user.role}</span>
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
