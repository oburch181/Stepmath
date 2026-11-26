import React from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface InstallModalProps {
  open: boolean;
  onClose: () => void;
  apkUrl: string | null;
  apkVersion: string;
  isInstallable: boolean;
  isIOS: boolean;
  onInstallPWA: () => Promise<boolean>;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  open,
  onClose,
  apkUrl,
  apkVersion,
  isInstallable,
  isIOS,
  onInstallPWA,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-folio-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-sheet border border-hairline shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-hairline flex items-center justify-between gap-4">
          <div>
            <h2
              id="install-folio-title"
              className="font-serif text-xl font-medium text-ink"
            >
              Install Folio
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Works offline with your progress saved on device
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install dialog"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink hover:bg-linen transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 divide-y divide-hairline space-y-5">
          {/* Option 1: Direct Android APK Download */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Smartphone className="w-4 h-4 text-forest mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink">
                  Android APK (v{apkVersion})
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {apkUrl
                    ? 'Download the standalone Android package built directly from this repository. Open the downloaded file to install Folio on Android.'
                    : 'When deployed via GitHub Pages, GitHub Actions automatically compiles and publishes folio.apk right alongside the site for one-tap download.'}
                </p>
              </div>
            </div>

            {apkUrl ? (
              <a
                href={apkUrl}
                download="folio.apk"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-sm font-medium hover:bg-forest-hover active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download folio.apk</span>
              </a>
            ) : (
              <div className="rounded-xl bg-paper border border-hairline px-3.5 py-2.5 text-xs text-ink-muted">
                Direct APK download activates automatically on your deployed GitHub Pages URL (<span className="font-mono text-ink">folio.apk</span>).
              </div>
            )}
          </div>

          {/* Option 2: Instant Web App / WebAPK Install */}
          <div className="pt-5 space-y-3">
            <p className="text-sm font-medium text-ink">
              {isIOS ? 'Add to Home Screen (iOS)' : 'Install as Web App'}
            </p>

            {isInstallable ? (
              <>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Install directly from your browser—launches fullscreen in your app drawer and works offline.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const installed = await onInstallPWA();
                    if (installed) onClose();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-hairline bg-paper text-sm font-medium text-ink hover:border-forest hover:text-forest transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Web App</span>
                </button>
              </>
            ) : isIOS ? (
              <ol className="text-xs text-ink-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Tap the <strong className="font-medium text-ink">Share</strong> button in Safari.
                </li>
                <li>
                  Scroll down and tap{' '}
                  <strong className="font-medium text-ink">Add to Home Screen</strong>.
                </li>
              </ol>
            ) : (
              <p className="text-xs text-ink-muted leading-relaxed">
                In Chrome or Edge on Android, open the browser menu (⋮) and tap{' '}
                <strong className="font-medium text-ink">Install app</strong> to install Folio as a standalone WebAPK.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
