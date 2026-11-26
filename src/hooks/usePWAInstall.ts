import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface ApkMeta {
  available: boolean;
  file: string;
  version?: string;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const [isAndroidBrowser, setIsAndroidBrowser] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [apkMeta, setApkMeta] = useState<ApkMeta | null>(null);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const uaLower = ua.toLowerCase();

    const insideAndroidApk = ua.includes('FolioAndroid');
    setIsAndroidApp(insideAndroidApk);
    setIsAndroidBrowser(/android/.test(uaLower) && !insideAndroidApk);
    setIsIOS(/iphone|ipad|ipod/.test(uaLower));

    const isStandalone =
      insideAndroidApk ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check whether the GitHub Pages workflow published folio.apk alongside the site
    if (!insideAndroidApk) {
      const base = import.meta.env.BASE_URL || '/';
      fetch(`${base}apk-meta.json`, { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: ApkMeta | null) => {
          if (data && data.available && data.file) {
            setApkMeta(data);
          }
        })
        .catch(() => {
          // Not present in local dev preview; gracefully fall back to PWA install
        });
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const base = import.meta.env.BASE_URL || '/';
  const apkUrl = apkMeta?.available ? `${base}${apkMeta.file}` : null;

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isAndroidApp,
    isAndroidBrowser,
    isIOS,
    apkUrl,
    apkVersion: apkMeta?.version ?? '1.0.0',
    installPWA,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
