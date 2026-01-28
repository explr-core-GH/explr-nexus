import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, Share, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-available/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-available" />
            </div>
            <CardTitle>App Installed!</CardTitle>
            <CardDescription>
              ExplrNexus is installed on your device. You can now access it from your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Open App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={logo} alt="ExplrNexus" className="h-20 w-auto mx-auto" />
          </div>
          <CardTitle className="text-2xl">Install ExplrNexus</CardTitle>
          <CardDescription>
            Install the app on your device for the best experience with offline access and quick launching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="h-5 w-5" />
              Install Now
            </Button>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Install on iOS
                </h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Tap the <Share className="h-4 w-4 inline mx-1" /> Share button in Safari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Scroll down and tap "Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Tap "Add" to confirm</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Install on Android
                </h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Tap the <MoreVertical className="h-4 w-4 inline mx-1" /> menu in Chrome</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Tap "Install app" or "Add to Home screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Tap "Install" to confirm</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          <div className="text-center">
            <Button variant="link" onClick={() => window.location.href = '/'}>
              Continue in browser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
