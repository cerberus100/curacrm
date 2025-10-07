"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Send, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Intake", href: "/intake", icon: Building2 },
  { name: "Submissions", href: "/submissions", icon: Send },
  { name: "Admin", href: "/admin", icon: Settings },
];

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <img 
            src="/curagenesis-logo.jpg" 
            alt="CuraGenesis Logo" 
            className="h-10 w-10 object-contain"
          />
          <h1 className="text-xl font-bold text-foreground">
            CuraGenesis
          </h1>
        </div>
        <nav className="space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <div className="h-16 border-b border-border brand-gradient flex items-center px-8">
          <div className="flex items-center gap-3">
            <img 
              src="/curagenesis-logo.jpg" 
              alt="CuraGenesis" 
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-semibold text-white">
              Intake CRM
            </span>
          </div>
        </div>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
