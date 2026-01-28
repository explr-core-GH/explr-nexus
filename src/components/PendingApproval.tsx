import { Clock, LogOut, Mail } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function PendingApproval() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <img src={logo} alt="ExplrNexus" className="h-16 w-auto" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-slide-up">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
            <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <Clock className="h-10 w-10 text-accent animate-pulse" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Account Pending Approval
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Welcome, <span className="font-medium text-foreground">{profile?.full_name || 'User'}</span>! 
              Your account has been created successfully.
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                What happens next?
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">1.</span>
                  An administrator will review your account
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">2.</span>
                  You'll be assigned the appropriate access level
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">3.</span>
                  Log back in to access the inventory system
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              If you have an access code, sign out and sign up again with the code to get immediate access.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
