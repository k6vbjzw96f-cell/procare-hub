import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone, Monitor, Tablet } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else if (/tablet|ipad/.test(userAgent)) {
      setDeviceType('tablet');
    } else {
      setDeviceType('desktop');
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Show prompt if not dismissed recently (within 7 days)
      if (!isStandalone && daysSinceDismissed > 7) {
        setTimeout(() => setShowPrompt(true), 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallPrompt(null);
      console.log('[PWA] App installed successfully');
    });

    // For iOS - show custom prompt since beforeinstallprompt doesn't fire
    if (deviceType === 'ios' && !isStandalone && daysSinceDismissed > 7) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deviceType]);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  const DeviceIcon = deviceType === 'ios' || deviceType === 'android' 
    ? Smartphone 
    : deviceType === 'tablet' 
      ? Tablet 
      : Monitor;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="shadow-2xl border-primary/20 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DeviceIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                  Install ProCare Hub
                </h3>
                <button 
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 p-1 -m-1"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {deviceType === 'ios' ? (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Tap <span className="inline-flex items-center px-1 py-0.5 bg-slate-100 rounded text-xs font-medium">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" transform="rotate(90 10 10)"/>
                    </svg>
                    Share
                  </span> then <strong>"Add to Home Screen"</strong>
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Get quick access from your {deviceType === 'android' ? 'home screen' : 'desktop'}
                </p>
              )}
              
              {deviceType !== 'ios' && (
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={handleInstall}
                    className="flex-1 h-9 text-sm"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Install App
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={handleDismiss}
                    className="text-slate-500 h-9 text-sm"
                  >
                    Not now
                  </Button>
                </div>
              )}
              
              {deviceType === 'ios' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDismiss}
                  className="w-full mt-3 h-9 text-sm"
                >
                  Got it
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
