import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';

interface CSVRow {
  name: string;
  description: string;
  category: string;
  location: string;
}

interface ParseResult {
  valid: CSVRow[];
  errors: { row: number; message: string }[];
}

interface CSVImportDialogProps {
  onImport: (items: CSVRow[]) => Promise<unknown>;
}

const REQUIRED_COLUMNS = ['name', 'category', 'location'];
const OPTIONAL_COLUMNS = ['description'];

function parseCSV(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }] };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  // Check for required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    return { 
      valid: [], 
      errors: [{ row: 0, message: `Missing required columns: ${missingColumns.join(', ')}` }] 
    };
  }

  const valid: CSVRow[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic quoted values)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length !== headers.length) {
      errors.push({ row: i + 1, message: `Expected ${headers.length} columns, got ${values.length}` });
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index].replace(/^["']|["']$/g, '');
    });

    // Validate required fields
    const rowErrors: string[] = [];
    if (!row.name?.trim()) rowErrors.push('name is required');
    if (!row.category?.trim()) rowErrors.push('category is required');
    if (!row.location?.trim()) rowErrors.push('location is required');

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, message: rowErrors.join(', ') });
      continue;
    }

    valid.push({
      name: row.name.trim(),
      description: row.description?.trim() || '',
      category: row.category.trim(),
      location: row.location.trim(),
    });
  }

  return { valid, errors };
}

export function CSVImportDialog({ onImport }: CSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { categories } = useCategories();
  const { locations } = useLocations();

  const downloadTemplate = () => {
    // Create template with headers and example rows
    const categoryList = categories.map(c => c.name).join(' | ') || 'Electronics | Tools | Other';
    const locationList = locations.map(l => l.name).join(' | ') || 'Warehouse A | Office B';
    
    const templateContent = [
      'name,category,location,description',
      '# INSTRUCTIONS: Fill out the template below. Lines starting with # are ignored.',
      `# Available Categories: ${categoryList}`,
      `# Available Locations: ${locationList}`,
      '# Required columns: name, category, location',
      '# Optional columns: description',
      '#',
      '# Example rows (delete these and add your own):',
      'Power Drill DeWalt,Tools,Warehouse A,Cordless 20V drill',
      'Safety Helmet,Safety Equipment,Warehouse A,OSHA approved',
      'Dell Laptop XPS 15,Electronics,Office B,Staff laptop with charger',
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'Fill out the template and upload it to import items',
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    
    try {
      const content = await selectedFile.text();
      const result = parseCSV(content);
      setParseResult(result);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to read file',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid);
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${parseResult.valid.length} items`,
      });
      handleReset();
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: 'Some items failed to import',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      handleReset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Inventory from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: name, category, location, description (optional)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2"
                    onClick={(e) => {
                      e.preventDefault();
                      handleReset();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to select a CSV file or drag and drop
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Parse Results */}
          {parseResult && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex gap-3">
                {parseResult.valid.length > 0 && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {parseResult.valid.length} valid
                  </Badge>
                )}
                {parseResult.errors.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {parseResult.errors.length} errors
                  </Badge>
                )}
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ScrollArea className="max-h-24">
                      <ul className="text-sm space-y-1">
                        {parseResult.errors.map((err, i) => (
                          <li key={i}>Row {err.row}: {err.message}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {parseResult.valid.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-2 text-sm font-medium">
                    Preview (first 5 items)
                  </div>
                  <ScrollArea className="max-h-40">
                    <div className="p-2 space-y-1">
                      {parseResult.valid.slice(0, 5).map((item, i) => (
                        <div key={i} className="text-sm p-2 bg-secondary/50 rounded flex justify-between">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{item.category} • {item.location}</span>
                        </div>
                      ))}
                      {parseResult.valid.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center py-1">
                          ...and {parseResult.valid.length - 5} more items
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* CSV Format Help */}
          {!parseResult && (
            <div className="space-y-3">
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>CSV Format:</strong><br />
                  <code className="text-xs bg-muted px-1 rounded">
                    name,category,location,description
                  </code><br />
                  <code className="text-xs bg-muted px-1 rounded">
                    Laptop Dell XPS,Electronics,Room 101,Staff laptop
                  </code>
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                className="w-full gap-2" 
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parseResult || parseResult.valid.length === 0 || isImporting}
          >
            {isImporting ? 'Importing...' : `Import ${parseResult?.valid.length || 0} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
