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
      'Installable as an app on phones and tablets so staff can scan and manage equipment in the field, offline-friendly.',
  },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already signed in, send them straight to the inventory dashboard.
  useEffect(() => {
    if (user) navigate('/inventory', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <img src={logo} alt="ExplrNexus" className="h-16 w-auto" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Link to="/auth">
                  Register
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="container py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium mb-6">
              <Package className="h-4 w-4" />
              A Cleveland State University + MAGNET partnership
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Hands-on learning,<br />
              <span className="text-accent">shared and tracked.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground">
              Nexus is the equipment lending library behind EXPLR — letting
              Northeast Ohio educators and organizations borrow STEM kits,
              robotics gear, and teaching materials, and capturing the student
              impact that makes the case to funders.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/auth">
                  <GraduationCap className="h-5 w-5" />
                  Register as an Educator
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2">
                <Link to="/auth">
                  <Heart className="h-5 w-5" />
                  Register an Organization
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Who we are */}
      <section className="container py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Who we are</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Nexus is part of EXPLR, a partnership between{' '}
              <span className="text-foreground font-medium">Cleveland State University</span>{' '}
              and <span className="text-foreground font-medium">MAGNET</span>, the
              Manufacturing Advocacy &amp; Growth Network. Together we inspire the
              next generation through hands-on STEM education, mentorship, and
              career exploration — K-12 robotics teams, STEMways and Pathways
              programming, summer camps, and paid high school internships across
              Cleveland.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">
              Great hands-on learning takes equipment that no single classroom can
              afford alone. Nexus is how we share it: one lending library of kits,
              robotics parts, and materials that any partner educator or
              organization can borrow — with every loan tracked so the student
              impact is visible.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Lead. Learn. Experience.', body: 'Authentic, work-based learning that builds skills and confidence.' },
              { label: 'K-12 Robotics', body: 'FIRST Robotics teams practicing problem solving through competition.' },
              { label: 'Camps & Internships', body: 'Summer STEM camps for middle school and paid internships for high schoolers.' },
            ].map((c) => (
              <div key={c.label} className="bg-card rounded-xl border border-border p-6 text-center">
                <h3 className="font-semibold text-foreground mb-2">{c.label}</h3>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              How the lending library works
            </h2>
            <p className="mt-4 text-muted-foreground">
              From request to return, ExplrNexus makes borrowing equipment simple
              — and turns every loan into measurable student impact.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => (
              <div
                key={step.title}
                className="bg-card rounded-xl border border-border p-6 text-center"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-accent" />
                </div>
                <div className="text-xs font-mono text-accent mb-2">
                  STEP {i + 1}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do / Features */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-foreground">What ExplrNexus does</h2>
          <p className="mt-4 text-muted-foreground">
            More than a sign-out sheet — a complete system for managing shared
            educational equipment and proving your program’s reach.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-xl border border-border p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For educators vs organizations */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container py-16">
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="bg-card rounded-xl border border-border p-8">
              <GraduationCap className="h-8 w-8 text-accent mb-4" />
              <h3 className="text-xl font-bold text-foreground">For Educators</h3>
              <p className="mt-2 text-muted-foreground">
                Borrow kits for your classroom, track what your students use, and
                build an automatic record of instructional hours and student reach
                for your own reporting.
              </p>
              <ul className="mt-4 space-y-2">
                {['Browse and request materials', 'Pickup & return scheduling', 'Automatic impact tracking'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/auth">
                  Register as an Educator
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="bg-card rounded-xl border border-border p-8">
              <Heart className="h-8 w-8 text-accent mb-4" />
              <h3 className="text-xl font-bold text-foreground">For Organizations</h3>
              <p className="mt-2 text-muted-foreground">
                Manage equipment across multiple sites and educators, generate
                grant-ready impact reports, and demonstrate the reach of your
                programming to funders.
              </p>
              <ul className="mt-4 space-y-2">
                {['Multi-site inventory management', 'Grant & impact reporting', 'Map of material distribution'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full gap-2">
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
      <section className="container py-20">
        <div className="max-w-3xl mx-auto text-center bg-primary rounded-2xl p-10 md:p-14">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Ready to start borrowing?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Create a free account to browse the catalog and request materials for
            your students. Registration is open to educators and organizations.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/auth">
                Create your account
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ExplrNexus" className="h-8 w-auto" />
            <span className="text-sm text-muted-foreground">ExplrNexus</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ExplrNexus. Equipment lending library for educators.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
