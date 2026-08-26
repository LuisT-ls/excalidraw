import type { Metadata } from "next";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
} from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whiteboard MVP",
  description: "Canvas whiteboard com estilo sketch",
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
