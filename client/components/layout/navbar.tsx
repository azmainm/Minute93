"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Trophy,
  Search,
  CalendarDays,
  Users,
  BarChart3,
  Menu,
  Info,
  LogIn,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/search", label: "Search", icon: Search },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, isLoggedIn, isAdmin, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Image
            src="/logo.png"
            alt="Minute93"
            width={36}
            height={36}
            className="rounded-md"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-foreground">
            Minute<span className="text-primary">93</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Section */}
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/about">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              About
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <BarChart3 className="mr-1.5 size-3.5" />
                Dashboard
              </Button>
            </Link>
          )}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <UserCircle className="mr-1.5 size-3.5" />
                  {user?.name || "Profile"}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground"
              >
                <LogOut className="mr-1.5 size-3.5" />
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex h-full flex-col">
              {/* Mobile Header */}
              <div className="flex items-center justify-between border-b px-4 py-4">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2"
                >
                  <Image src="/logo.png" alt="Minute93" width={28} height={28} className="rounded-md" />
                  <span className="text-base font-bold tracking-tight">
                    Minute<span className="text-primary">93</span>
                  </span>
                </Link>
              </div>

              {/* Mobile Links */}
              <div className="flex-1 overflow-y-auto px-2 py-4">
                <div className="space-y-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="my-4 border-t" />
                <div className="space-y-1">
                  <Link
                    href="/about"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === "/about"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Info className="size-4" />
                    About
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/analytics"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        pathname.startsWith("/admin")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <BarChart3 className="size-4" />
                      Dashboard
                    </Link>
                  )}
                  {isLoggedIn && (
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        pathname === "/profile"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <UserCircle className="size-4" />
                      Profile
                    </Link>
                  )}
                </div>
              </div>

              {/* Mobile Footer */}
              <div className="border-t px-4 py-4">
                {isLoggedIn ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                ) : (
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <LogIn className="mr-2 size-4" />
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
