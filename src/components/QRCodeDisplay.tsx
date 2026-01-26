import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRCodeDisplayProps {
  value: string;
  itemName: string;
  size?: number;
}

export function QRCodeDisplay({ value, itemName, size = 180 }: QRCodeDisplayProps) {
  const handleDownload = () => {
    const svg = document.getElementById(`qr-${value}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size + 40;
      canvas.height = size + 80;
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, canvas.width / 2, size + 45);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(itemName.slice(0, 25), canvas.width / 2, size + 62);
      }

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${value}-qrcode.png`;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg border border-border">
      <div className="p-4 bg-background rounded-lg">
        <QRCodeSVG
          id={`qr-${value}`}
          value={value}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="transparent"
          fgColor="hsl(215, 50%, 23%)"
        />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-medium text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{itemName}</p>
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
        <Download className="h-4 w-4" />
        Download QR
      </Button>
    </div>
  );
}
