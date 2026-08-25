import type { Metadata } from "next";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
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
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </body>
    </html>
  );
}
