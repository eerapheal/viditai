import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/contexts/auth-context";

export const metadata: Metadata = {
  title: "AutoCut AI | Smart Video Editing",
  description: "Transform your raw footage into viral content with AI-powered cutting, silence removal, and social exporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors theme="dark" />
      </body>
    </html>
  );
}
