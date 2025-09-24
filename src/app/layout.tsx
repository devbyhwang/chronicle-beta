// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Chronicle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}