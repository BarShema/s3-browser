import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "S3 File Browser",
  description: "A modern file browser for Amazon S3 buckets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --background: #ffffff;
              --foreground: #171717;
            }
            
            @media (prefers-color-scheme: dark) {
              :root {
                --background: #0a0a0a;
                --foreground: #ededed;
              }
            }
            
            body {
              background: var(--background);
              color: var(--foreground);
              font-family: Arial, Helvetica, sans-serif;
            }
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
