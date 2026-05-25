import type { Metadata, Viewport } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  applicationName: "Bowling Score Calculator",
  title: {
    default: "Bowling Score Calculator",
    template: "%s | Bowling Score Calculator",
  },
  description: "Calculadora oficial de puntuación de bowling con historial local, estadísticas y soporte PWA.",
  keywords: ["bowling", "score calculator", "puntuación bowling", "PWA", "bolos"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Bowling Score",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Bowling Score",
    "mobile-web-app-capable": "yes",
    "color-scheme": "dark",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
  ],
};

// Script inline: lee la preferencia antes del primer paint para evitar flash de tema.
const themeBootstrap = `(() => {
  try {
    var stored = localStorage.getItem('bowling-score-calculator-theme');
    var pref = (stored === 'dark' || stored === 'light' || stored === 'system') ? stored : 'system';
    var resolved = pref;
    if (pref === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
