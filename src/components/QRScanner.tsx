import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {} // Ignore scan failures
      );
      setIsScanning(true);
      setError(null);
    } catch (err) {
      setError('Unable to access camera. Please grant camera permissions.');
      console.error('Scanner error:', err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Camera className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Scan QR Code</h2>
            <p className="text-sm text-muted-foreground">Point camera at item QR code</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XCircle className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error ? (
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={startScanner}>Retry</Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            <div 
              id="qr-reader" 
              className="rounded-xl overflow-hidden border-2 border-accent/50"
            />
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-accent rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-accent rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-accent rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-accent rounded-br-lg" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
