"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Send, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "rep"] },
  { name: "Intake", href: "/intake", icon: Building2, roles: ["admin", "rep"] },
  { name: "Submissions", href: "/submissions", icon: Send, roles: ["admin", "rep"] },
  { name: "Admin", href: "/admin", icon: Settings, roles: ["admin"] },
];

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading } = useCurrentUser();

  // Filter navigation based on user role
  const navigation = baseNavigation.filter((item) => {
    if (!user) return true; // Show all during loading/unauthenticated
    return item.roles.includes(user.role);
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

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
        <nav className="flex flex-col h-full p-4">
          <div className="space-y-1 flex-1">
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
          </div>

          {/* User Info & Logout */}
          {user && !loading && (
            <div className="border-t border-border pt-4 mt-4">
              <div className="px-4 py-2 text-xs text-[color:var(--muted)]">
                <div className="font-medium text-foreground">{user.name}</div>
                <div className="mt-1">{user.email}</div>
                <div className="mt-1">
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded text-xs font-medium",
                    isAdmin ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
                  )}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors w-full mt-2"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          )}
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
