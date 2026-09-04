import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user";
import { logout } from "@/lib/actions/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DengueWatch",
  description: "Community dengue breeding-site reporting and response.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b bg-background">
          <div className="container mx-auto max-w-5xl flex h-16 items-center justify-between px-4">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              DengueWatch
            </Link>
            <nav className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:inline-block">
                    {user.name} ({user.role})
                  </span>
                  <form action={async () => {
                    "use server";
                    await logout();
                  }}>
                    <Button variant="outline" size="sm" type="submit">
                      Sign out
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Toaster richColors />
      </body>
    </html>
  );
}
