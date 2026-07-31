import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/ChatContext";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "GPT — Chat, documents, and AI PR reviews",
  description:
    "AI chat with PDF Q&A, GitHub code exploration, and free AI-assisted pull request reviews. Enable a repo and get automatic reviews as GitHub comments and emails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SFD1RMC4FF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SFD1RMC4FF');
          `}
        </Script>
        <AuthProvider>
          <main>{children}</main>
          <Toaster position="top-right" duration={2000}/>
        </AuthProvider>
      </body>
    </html>
  );
}
