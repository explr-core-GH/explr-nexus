import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  QrCode,
  Search,
  MapPin,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  GraduationCap,
  Heart,
  CheckCircle2,
  BookOpen,
  Users,
  Bot,
  Flame,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const howItWorks = [
  {
    icon: Search,
    title: 'Browse & Request',
    description:
      'Search the catalog of kits, manipulatives, and equipment. Request the materials you need for a lesson or unit and choose your pickup and return dates.',
  },
  {
    icon: QrCode,
    title: 'Scan & Check Out',
    description:
      'Admins and staff scan a QR code to instantly check items out to you and record where they are going — no paperwork, no ambiguity.',
  },
  {
    icon: BookOpen,
    title: 'Use & Teach',
    description:
      'Bring hands-on learning to your classroom or program. Materials come ready to use, with resources linked in the app.',
  },
  {
    icon: QrCode,
    title: 'Return & Report',
    description:
      'Scan items back in when you are done. The system tracks student impact — demographics, hours, and reach — for grant reporting automatically.',
  },
];

const features = [
  {
    icon: MapPin,
    title: 'Live Location Tracking',
    description:
      'See exactly where every kit is on a map — at the library, checked out to a school, or in maintenance.',
  },
  {
    icon: BarChart3,
    title: 'Impact & Grant Reporting',
    description:
      'Capture free/reduced lunch status, special populations, students reached, and instructional hours to prove your program’s reach.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description:
      'Admins manage inventory, staff handle check-in/out, and members browse and request only what they are authorized to see.',
  },
  {
    icon: Smartphone,
    title: 'Works on Any Device',
    description:
      'Installable as an app on phones and tablets so staff can scan and manage equipment anywhere, always in sync with live data.',
  },
];

const whoWeAre = [
  {
    icon: Users,
    title: 'Lead. Learn. Experience.',
    body: 'Authentic, work-based learning that builds skills and confidence.',
  },
  { icon: Bot, title: 'K-12 Robotics', body: 'FIRST Robotics teams practicing problem solving through competition.' },
  {
    icon: Flame,
    title: 'Camps & Internships',
    body: 'Summer STEM camps for middle school and paid internships for high schoolers.',
  },
];

const Landing = () => {
  const { user, userRole, isLoading, roleLoading } = useAuth();
  const navigate = useNavigate();

  // If already signed in, route by role once it's known: educators go to
  // Projects (their default view), everyone else to the inventory dashboard.
  useEffect(() => {
    if (!user || isLoading || roleLoading) return;
    navigate(userRole === 'member' ? '/projects' : '/inventory', { replace: true });
  }, [user, userRole, isLoading, roleLoading, navigate]);

  // Avoid flashing the marketing page to a logged-in user mid-redirect.
  if (user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background font-['Manrope']">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-primary border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" aria-label="Nexus home" className="flex items-center gap-2">
            <img src={logo} alt="Nexus" className="h-9 w-auto" />
            <span className="font-['Sora'] font-bold text-primary-foreground text-xl tracking-tight">
              NEXUS
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-full shadow-[0_0_20px_hsl(var(--accent)/0.25)]"
            >
              <Link to="/auth">
                Register
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-12 bg-background">
        <div
          className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-semibold mb-8">
              <Package className="h-4 w-4" />
              A Cleveland State University + MAGNET partnership
            </div>
            <h1 className="font-['Sora'] text-5xl md:text-7xl lg:text-8xl font-extrabold text-foreground leading-[1.05] tracking-tighter">
              NEXUS <span className="text-accent">/</span>
              <br />
              LENDING LIBRARY
            </h1>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              The equipment lending library behind EXPLR — letting Northeast Ohio
              educators and organizations borrow STEM kits, robotics gear, and
              teaching materials, and capturing the student impact that makes the
              case to funders.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                size="lg"
                asChild
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold"
              >
                <Link to="/auth">
                  <GraduationCap className="h-5 w-5" />
                  Register as an Educator
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="gap-2 rounded-lg font-bold border-2 border-border hover:border-accent hover:text-foreground"
              >
                <Link to="/auth">
                  <Heart className="h-5 w-5" />
                  Register an Organization
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth" className="text-accent hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Transition connector */}
      <div className="h-24 bg-gradient-to-b from-background to-secondary/40" />

      {/* Who we are */}
      <section className="bg-secondary/40 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 max-w-3xl">
            <span className="text-accent font-bold uppercase tracking-widest text-sm">
              The Core
            </span>
            <h2 className="font-['Sora'] text-4xl font-bold text-foreground mt-2">
              Who We Are
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Nexus is part of EXPLR, a partnership between{' '}
              <span className="text-foreground font-semibold">
                Cleveland State University
              </span>{' '}
              and <span className="text-foreground font-semibold">MAGNET</span>, the
              Manufacturing Advocacy & Growth Network. Together we inspire the
              next generation through hands-on STEM education, mentorship, and
              career exploration — K-12 robotics teams, STEMways and Pathways
              programming, summer camps, and paid high school internships across
              Cleveland.
            </p>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Great hands-on learning takes equipment that no single classroom can
              afford alone. Nexus is how we share it: one lending library of kits,
              robotics parts, and materials that any partner educator or
              organization can borrow — with every loan tracked so the student
              impact is visible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {whoWeAre.map((c) => (
              <div
                key={c.title}
                className="group bg-card p-10 rounded-2xl border border-border hover:border-accent/50 transition-all hover:shadow-xl"
              >
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-8 group-hover:bg-accent/10 transition-colors">
                  <c.icon className="h-6 w-6 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="font-['Sora'] text-xl font-bold text-foreground mb-4">
                  {c.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-14 max-w-2xl">
            <span className="text-accent font-bold uppercase tracking-widest text-sm">
              The Flow
            </span>
            <h2 className="font-['Sora'] text-4xl font-bold text-foreground mt-2">
              How the lending library works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From request to return, Nexus makes borrowing equipment simple — and
              turns every loan into measurable student impact.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => (
              <div
                key={step.title}
                className="group bg-card rounded-2xl border border-border p-8 hover:border-accent/50 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <step.icon className="h-5 w-5 text-accent group-hover:text-accent-foreground transition-colors" />
                  </div>
                  <span className="font-['Sora'] text-3xl font-extrabold text-border group-hover:text-accent/30 transition-colors">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-['Sora'] text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do / Features */}
      <section className="bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-14 max-w-2xl">
            <span className="text-accent font-bold uppercase tracking-widest text-sm">
              The Tools
            </span>
            <h2 className="font-['Sora'] text-4xl font-bold text-foreground mt-2">
              What Nexus does
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              More than a sign-out sheet — a complete system for managing shared
              educational equipment and proving your program’s reach.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-card rounded-2xl border border-border p-8 hover:border-accent/50 hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-accent/10 transition-colors">
                  <f.icon className="h-6 w-6 text-foreground group-hover:text-accent transition-colors" />
                </div>
                <h3 className="font-['Sora'] text-lg font-bold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For educators vs organizations */}
      <section className="bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-14 max-w-2xl">
            <span className="text-accent font-bold uppercase tracking-widest text-sm">
              The Path
            </span>
            <h2 className="font-['Sora'] text-4xl font-bold text-foreground mt-2">
              Join the library
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="group bg-card rounded-2xl border border-border p-10 hover:border-accent/50 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <GraduationCap className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-['Sora'] text-2xl font-bold text-foreground">
                For Educators
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Borrow kits for your classroom, track what your students use, and
                build an automatic record of instructional hours and student reach
                for your own reporting.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Browse and request materials',
                  'Pickup & return scheduling',
                  'Automatic impact tracking',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-lg"
              >
                <Link to="/auth">
                  Register as an Educator
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="group bg-card rounded-2xl border border-border p-10 hover:border-accent/50 hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <Heart className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-['Sora'] text-2xl font-bold text-foreground">
                For Organizations
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Manage equipment across multiple sites and educators, generate
                grant-ready impact reports, and demonstrate the reach of your
                programming to funders.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Multi-site inventory management',
                  'Grant & impact reporting',
                  'Map of material distribution',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="mt-8 w-full gap-2 font-bold rounded-lg border-2 border-border hover:border-accent hover:text-foreground"
              >
                <Link to="/auth">
                  Register an Organization
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-secondary/40 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto text-center bg-primary rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(hsl(var(--accent)) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <div className="relative z-10">
              <h2 className="font-['Sora'] text-3xl md:text-4xl font-bold text-primary-foreground">
                Ready to start borrowing?
              </h2>
              <p className="mt-4 text-primary-foreground/80 max-w-2xl mx-auto">
                Create a free account to browse the catalog and request materials
                for your students. Registration is open to educators and
                organizations.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  asChild
                  className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-lg"
                >
                  <Link to="/auth">
                    Create your account
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  asChild
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Link to="/auth">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Nexus" className="h-8 w-auto" />
            <span className="font-['Sora'] font-semibold text-foreground">Nexus</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} EXPLR Nexus — a Cleveland State University
            & MAGNET partnership.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
