import type { Metadata, Viewport } from "next";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
} from "@/components/theme/ThemeProvider";
import "./globals.css";

const siteUrl = "https://garranchos.vercel.app";
const siteTitle = "Garranchos — quadro branco com estilo desenhado à mão";
const siteDescription =
  "Desenhe, crie diagramas e organize ideias em um quadro branco gratuito, com estilo desenhado à mão e sem login.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Garranchos",
  },
  description: siteDescription,
  applicationName: "Garranchos",
  authors: [
    {
      name: "Luís Teixeira",
      url: "https://github.com/LuisT-ls",
    },
  ],
  generator: "Next.js",
  keywords: [
    "quadro branco",
    "whiteboard",
    "desenho online",
    "diagramas",
    "sketch",
    "garranchos",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: "Garranchos",
    locale: "pt_BR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Garranchos — quadro branco com estilo desenhado à mão",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff7d6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
                const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
                const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                document.documentElement.classList.toggle("dark", isDark);
                document.documentElement.style.colorScheme = isDark ? "dark" : "light";
              } catch {}
            })();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
