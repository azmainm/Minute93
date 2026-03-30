import Image from "next/image";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function PageHeader({ icon: Icon, title, subtitle, showLogo }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {showLogo ? (
          <Image src="/logo.png" alt="Minute93" width={40} height={40} className="rounded-lg" />
        ) : Icon ? (
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
