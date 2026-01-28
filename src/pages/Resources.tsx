import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Link as LinkIcon, 
  Video, 
  FileText, 
  GraduationCap,
  Search,
  ArrowLeft,
  ExternalLink,
  Download,
  Filter
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useResources, Resource } from '@/hooks/useResources';
import { UserMenu } from '@/components/UserMenu';
import { VISIBILITY_TAGS } from '@/constants/tags';

const typeIcons = {
  link: LinkIcon,
  video: Video,
  manual: FileText,
  curriculum: GraduationCap,
};

const typeLabels = {
  link: 'Link',
  video: 'Video',
  manual: 'Manual',
  curriculum: 'Curriculum',
};

const Resources = () => {
  const { userTags, userRole } = useAuth();
  const { resources, isLoading, getFileUrl } = useResources();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Filter resources based on user tags (members see only matching tags)
  const visibleResources = useMemo(() => {
    return resources.filter(resource => {
      // Admins and users see all resources
      if (userRole === 'admin' || userRole === 'user') return true;
      
      // Members see resources with matching tags or 'All' tag
      const resourceTags = resource.tags || [];
      if (resourceTags.length === 0) return false;
      if (resourceTags.includes('All')) return true;
      return resourceTags.some(tag => userTags.includes(tag));
    });
  }, [resources, userRole, userTags]);

  const filteredResources = useMemo(() => {
    return visibleResources.filter(resource => {
      const matchesSearch = 
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesTag = selectedTag === 'all' || resource.tags.includes(selectedTag);
      const matchesType = selectedType === 'all' || resource.type === selectedType;
      
      return matchesSearch && matchesTag && matchesType;
    });
  }, [visibleResources, searchQuery, selectedTag, selectedType]);

  // Group resources by tag for the tabbed view
  const resourcesByTag = useMemo(() => {
    const grouped: Record<string, Resource[]> = {};
    VISIBILITY_TAGS.forEach(tag => {
      grouped[tag] = filteredResources.filter(r => r.tags.includes(tag));
    });
    return grouped;
  }, [filteredResources]);

  const handleResourceClick = (resource: Resource) => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else if (resource.file_path) {
      const url = getFileUrl(resource.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Get file extension from file_path
  const getFileExtension = (filePath: string | null): string | null => {
    if (!filePath) return null;
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
  };

  // Document type colors and labels
  const documentTypeStyles: Record<string, { bg: string; text: string; label: string }> = {
    pdf: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'PDF' },
    doc: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'DOC' },
    docx: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'DOCX' },
    ppt: { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'PPT' },
    pptx: { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'PPTX' },
    xls: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'XLS' },
    xlsx: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'XLSX' },
    txt: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'TXT' },
  };

  const ResourceCard = ({ resource }: { resource: Resource }) => {
    const Icon = typeIcons[resource.type];
    const isFile = !!resource.file_path;
    const fileExt = getFileExtension(resource.file_path);
    const docStyle = fileExt ? documentTypeStyles[fileExt] : null;
    
    // Handle both external URLs (YouTube/Vimeo) and uploaded file paths
    const thumbnailUrl = resource.thumbnail_url 
      ? (resource.thumbnail_url.startsWith('http') ? resource.thumbnail_url : getFileUrl(resource.thumbnail_url))
      : null;
    
    // Show document placeholder for files without thumbnails
    const showDocPlaceholder = isFile && !thumbnailUrl && docStyle;
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden"
        onClick={() => handleResourceClick(resource)}
      >
        {/* Thumbnail Image */}
        {thumbnailUrl ? (
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img 
              src={thumbnailUrl} 
              alt={resource.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : showDocPlaceholder ? (
          <div className={`aspect-video w-full overflow-hidden ${docStyle.bg} flex flex-col items-center justify-center gap-2`}>
            <FileText className={`h-12 w-12 ${docStyle.text}`} />
            <span className={`text-sm font-semibold ${docStyle.text}`}>{docStyle.label}</span>
          </div>
        ) : null}
        <CardHeader className={thumbnailUrl || showDocPlaceholder ? "pb-3 pt-4" : "pb-3"}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <Badge variant="outline" className="text-xs">
                {typeLabels[resource.type]}
              </Badge>
            </div>
            {isFile ? (
              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          <CardTitle className="text-base mt-2">{resource.title}</CardTitle>
          {resource.description && (
            <CardDescription className="line-clamp-2">
              {resource.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {resource.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading resources...</p>
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
              <img src={logo} alt="ExplrNexus" className="h-16 w-auto" />
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
            <BookOpen className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Resources & Curriculum</h1>
            <p className="text-muted-foreground">
              Access learning materials, videos, links, and support documentation
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Types</option>
              <option value="curriculum">Curriculum</option>
              <option value="video">Videos</option>
              <option value="link">Links</option>
              <option value="manual">Manuals</option>
            </select>
          </div>
        </div>

        {/* Tabbed Content by Tag */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger 
              value="all" 
              onClick={() => setSelectedTag('all')}
              className="text-sm"
            >
              All
            </TabsTrigger>
            {VISIBILITY_TAGS.map(tag => (
              <TabsTrigger 
                key={tag} 
                value={tag}
                onClick={() => setSelectedTag(tag)}
                className="text-sm"
              >
                {tag}
                {resourcesByTag[tag]?.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                    {resourcesByTag[tag].length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {filteredResources.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No resources found</h3>
                <p className="text-muted-foreground mt-1">
                  {resources.length === 0 
                    ? "No resources have been added yet"
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </TabsContent>

          {VISIBILITY_TAGS.map(tag => (
            <TabsContent key={tag} value={tag} className="mt-6">
              {resourcesByTag[tag]?.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No {tag} resources</h3>
                  <p className="text-muted-foreground mt-1">
                    No resources have been tagged with {tag}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resourcesByTag[tag]?.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default Resources;
