import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";

import "./globals.css";

export const metadata: Metadata = {
  title: "ALA Legal",
  description: "Centro de control de ALA Legal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
