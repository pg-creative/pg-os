import type { Metadata, Viewport } from "next";
import { ModeProvider } from "./_components/ModeProvider";
import { TabProvider } from "./_components/useActiveTab";
import { SoundProvider } from "./_components/SoundProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PG OS",
  description: "Personal operating system dashboard",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,500&family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ModeProvider>
          <SoundProvider>
            <TabProvider>{children}</TabProvider>
          </SoundProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
