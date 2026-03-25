import Link from "next/link";
import Image from "next/image";
import { ExternalLink, GitFork } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerLinks = [
  {
    title: "Explore",
    links: [
      { label: "Live Matches", href: "/matches" },
      { label: "Standings", href: "/standings" },
      { label: "Top Scorers", href: "/top-scorers" },
      { label: "Teams", href: "/teams" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Search", href: "/search" },
      { label: "About", href: "/about" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Minute93" width={28} height={28} className="rounded-md" />
              <span className="text-base font-bold tracking-tight">
                Minute<span className="text-primary">93</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Real-time football intelligence. Live scores, stats, standings, and search — built for the beautiful game.
            </p>
          </div>

          {/* Link Groups */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Minute93. A portfolio project by Azmain Morshed.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/azmainm/Minute93"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="GitHub"
            >
              <GitFork className="size-4" />
            </a>
            <a
              href="https://minute93.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-primary"
              aria-label="Website"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
