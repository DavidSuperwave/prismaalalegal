"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LogOut, Mail, Target, Zap } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { getClientName, getClientSubtitle } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { id: "chat", label: "Agente", icon: Bot, href: "/chat" },
  { id: "crm", label: "Pipeline", icon: Target, href: "/crm" },
  { id: "inbox", label: "Bandeja", icon: Mail, href: "/inbox" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <AppSidebar />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = user?.name || user?.email?.split("@")[0] || "Administrador";
  const userEmail = user?.email || "admin@example.com";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-stone-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-stone-200 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-900">{getClientName()}</h1>
          <p className="text-xs text-stone-500">{getClientSubtitle()}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.id === "chat" ? <Badge variant="blue" className="ml-auto">AI</Badge> : null}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-stone-200">
            <AvatarFallback className="bg-blue-50 text-blue-700">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">{userName}</p>
            <p className="truncate text-xs text-stone-500">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-stone-400 transition hover:text-stone-900"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
