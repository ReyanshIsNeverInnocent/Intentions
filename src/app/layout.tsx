import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intentions",
  description: "A personal playlist of songs, album art, and lyrics.",
  applicationName: "Intentions",
  icons: {
    icon: "/branding/intentions-icon.png",
    shortcut: "/branding/intentions-icon.png",
    apple: "/branding/intentions-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#171815"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
