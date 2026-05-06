import type { Metadata, Viewport } from "next";
import { ModeProvider } from "./_components/ModeProvider";
import { TabProvider } from "./_components/useActiveTab";
import { SoundProvider } from "./_components/SoundProvider";
import { RegisterSW } from "./_components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "PG OS",
  description: "Personal operating system dashboard",
  manifest: "/manifest.json",
  applicationName: "PG OS",
  appleWebApp: {
    capable: true,
    title: "PG OS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8F0F7" },
    { media: "(prefers-color-scheme: dark)",  color: "#091433" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-variant="laputa-day" suppressHydrationWarning>
      <head>
        {/* iOS legacy fullscreen tag — Next emits the W3C name; Safari prefers
            both for the most reliable Add-to-Home-Screen behavior. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Pre-hydration palette resolution. Without this, SSR ships with
            data-variant="laputa-day" and any user landing in the evening
            sees a flash of pale-blue daytime UI until ModeProvider's effect
            runs. On iOS Safari that flash can outlast hydration entirely
            when JS stalls — making the wrong palette stick AND blocking
            event handlers. Inline blocking script flips data-variant from
            local hour the moment the doc parses, so SSR/CSR converge before
            React even mounts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=new Date().getHours();var v=h>=21||h<6?'laputa-midnight':h>=18?'laputa-twilight':'laputa-day';document.documentElement.setAttribute('data-variant',v);}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,500&family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Space+Mono:wght@400;700&family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RegisterSW />
        <ModeProvider>
          <SoundProvider>
            <TabProvider>{children}</TabProvider>
          </SoundProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
