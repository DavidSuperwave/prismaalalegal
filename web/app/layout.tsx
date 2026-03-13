import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";

import "./globals.css";

export const metadata: Metadata = {
  title: "PrismaProject",
  description: "PrismaProject — AI Agent Control Center",
};

const themeInitializer = `
(() => {
  const storageKey = "prisma-theme";
  const root = document.documentElement;
  try {
    const stored = window.localStorage.getItem(storageKey);
    const nextTheme = stored === "regular" ? "regular" : "dark";
    root.classList.toggle("dark", nextTheme === "dark");
    root.dataset.theme = nextTheme;
  } catch {
    root.classList.add("dark");
    root.dataset.theme = "dark";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
