import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { NavLinks } from "@/components/nav-links";
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
          {/* px-6 matches the p-6 every page root uses, so the logo lines up
              with the page heading below it. Wraps rather than hiding the nav
              on narrow screens — a phone with no nav is a dead end. */}
          <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <Link href="/" className="text-xl font-semibold tracking-tight">
                DengueWatch
              </Link>
              <NavLinks role={user?.role ?? null} />
            </div>
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
        <div className="flex flex-1 flex-col">
          {children}
        </div>
        <Toaster richColors />
      </body>
    </html>
  );
}
