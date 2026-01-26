import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  ShieldOff, 
  ArrowLeft,
  Search,
  Loader2,
  Crown
} from 'lucide-react';
import logo from '@/assets/logo.png';
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
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement, UserWithRole } from '@/hooks/useUserManagement';
import { UserMenu } from '@/components/UserMenu';
import { format } from 'date-fns';

const Admin = () => {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const { users, isLoading, promoteToAdmin, removeAdmin } = useUserManagement();
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect non-admins
  if (!authLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleToggleAdmin = async (userItem: UserWithRole) => {
    if (userItem.isAdmin) {
      await removeAdmin(userItem.user_id, userItem.full_name);
    } else {
      await promoteToAdmin(userItem.user_id, userItem.full_name);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ExplrNexus" className="h-14 w-auto logo-accent" />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Inventory
                </Link>
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-muted-foreground">
              Manage user roles and permissions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Administrators</p>
            <p className="text-2xl font-bold text-accent">
              {users.filter(u => u.isAdmin).length}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-sm text-muted-foreground">Regular Users</p>
            <p className="text-2xl font-bold">
              {users.filter(u => !u.isAdmin).length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {users.length === 0 ? 'No users found' : 'No matching users'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userItem) => {
                  const isCurrentUser = userItem.user_id === user?.id;
                  return (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                            {userItem.isAdmin ? (
                              <Crown className="h-4 w-4 text-accent" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {userItem.full_name}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {userItem.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {userItem.isAdmin ? (
                          <Badge className="bg-accent text-accent-foreground">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {isCurrentUser ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : userItem.isAdmin ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <ShieldOff className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Remove Admin</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Admin Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove admin privileges from{' '}
                                  <strong>{userItem.full_name}</strong>? They will no longer be able
                                  to add, edit, or delete inventory items.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleToggleAdmin(userItem)}>
                                  Remove Admin
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <Shield className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Make Admin</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to give admin privileges to{' '}
                                  <strong>{userItem.full_name}</strong>? They will be able to add,
                                  edit, and delete inventory items.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleToggleAdmin(userItem)}>
                                  Make Admin
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Admin;
