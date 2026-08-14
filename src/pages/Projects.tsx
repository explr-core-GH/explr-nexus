import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, BookOpen, Boxes } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/UserMenu';
import { ProjectCard } from '@/components/ProjectCard';
import { useProjects } from '@/hooks/useProjects';
import { useReservations } from '@/hooks/useReservations';
import { useInventoryDB } from '@/hooks/useInventoryDB';

const Projects = () => {
  const { activeProjects, isLoading } = useProjects();
  const { items } = useInventoryDB();
  const { reservedByItem, refetch: refetchReservations } = useReservations();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return activeProjects.filter(
      p => p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false)
    );
  }, [activeProjects, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" aria-label="Nexus home">
            <img src={logo} alt="Nexus" className="h-16 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/inventory">
                <Boxes className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Inventory</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/resources">
                <BookOpen className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Resources</span>
              </Link>
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground">
            Ready-made projects with all materials and curriculum bundled together — request everything in one click.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading projects...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No projects found</h2>
            <p className="text-muted-foreground mt-1">Check back soon — new projects are added regularly.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                items={items}
                reservedByItem={reservedByItem}
                onRequested={refetchReservations}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
