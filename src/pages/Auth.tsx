import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Building2, Briefcase, KeyRound } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';


const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
  organizationName?: string;
  position?: string;
  
  accessCode?: string;
}

const Auth = () => {
  const navigate = useNavigate();
  
  // Check if already authenticated and redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [position, setPosition] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (!isLogin) {
      if (!fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }
      if (!organizationName.trim()) {
        newErrors.organizationName = 'School/Organization name is required';
      }
      if (!position.trim()) {
        newErrors.position = 'Position is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              organization_name: organizationName,
              position: position,
            },
          },
        });
        
        if (error) throw error;

        // Update the profile with organization info after signup
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              organization_name: organizationName,
              position: position,
            })
            .eq('user_id', data.user.id);
          
          if (profileError) {
            console.error('Error updating profile:', profileError);
          }

          // Call edge function to assign role based on access code
          if (accessCode.trim()) {
            try {
              const { data: roleData, error: roleError } = await supabase.functions.invoke('assign-role', {
                body: { userId: data.user.id, accessCode: accessCode.trim() }
              });

              if (roleError) {
                console.error('Error assigning role:', roleError);
              } else if (roleData?.error) {
                toast({
                  title: 'Invalid Access Code',
                  description: 'The access code you entered is not valid. Your account will require admin approval.',
                  variant: 'destructive',
                });
              } else if (roleData?.role) {
                toast({
                  title: 'Account created!',
                  description: `Welcome! You've been granted ${roleData.role} access.`,
                });
                navigate('/');
                return;
              }
            } catch (fnError) {
              console.error('Error calling assign-role function:', fnError);
            }
          }
        }
        
        toast({
          title: 'Account created!',
          description: accessCode.trim() 
            ? 'Your account is pending admin approval.' 
            : 'Your account is pending admin approval. You can log in but will have limited access until approved.',
        });
        navigate('/');
      }
    } catch (error: any) {
      let message = error.message || 'An error occurred';
      
      if (error.message?.includes('User already registered')) {
        message = 'This email is already registered. Please log in instead.';
      } else if (error.message?.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container py-4">
          <div className="flex items-center justify-center">
            <img src={logo} alt="ExplrNexus" className="h-16 w-auto" />
          </div>
        </div>
      </header>

      {/* Auth Form */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-card rounded-xl border border-border p-8 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLogin
                  ? 'Sign in to access the ExplrNexus inventory'
                  : 'Sign up to start managing your gear with ExplrNexus'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizationName">School/Organization Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="organizationName"
                        type="text"
                        placeholder="Greenwood High School"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.organizationName && (
                      <p className="text-sm text-destructive">{errors.organizationName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="position"
                        type="text"
                        placeholder="Teacher, Administrator, etc."
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.position && (
                      <p className="text-sm text-destructive">{errors.position}</p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Access Code (Optional)</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="accessCode"
                        type="text"
                        placeholder="Enter code if provided"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If you were given an access code, enter it here for immediate access
                    </p>
                    {errors.accessCode && (
                      <p className="text-sm text-destructive">{errors.accessCode}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
