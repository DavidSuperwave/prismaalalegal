"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LogOut, Mail, Target } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { id: "chat", label: "Agent", icon: Bot, href: "/chat" },
  { id: "crm", label: "Pipeline", icon: Target, href: "/crm" },
  { id: "inbox", label: "Inbox", icon: Mail, href: "/inbox" },
];

function PrismaLogoMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
      <path d="M20 4L36 36H4L20 4Z" stroke="#818CF8" strokeWidth="2.5" />
      <path d="M20 12L30 32H10L20 12Z" stroke="#A78BFA" strokeWidth="1.5" opacity="0.6" />
      <line x1="20" y1="4" x2="20" y2="36" stroke="url(#sidebarLogoGrad)" strokeWidth="1" opacity="0.3" />
      <defs>
        <linearGradient id="sidebarLogoGrad" x1="20" y1="4" x2="20" y2="36">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#08080A]">
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

  const userName = user?.name || user?.email?.split("@")[0] || "Admin";
  const userEmail = user?.email || "admin@example.com";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[#2A2A32] bg-[#0E0E12]">
      <div className="flex h-16 items-center gap-3 border-b border-[#2A2A32] px-6">
        <PrismaLogoMark />
        <div>
          <h1 className="font-display text-lg font-extrabold text-[#E8E8ED]">Prisma</h1>
          <p className="text-xs text-[#8888A0]">Legal Agent</p>
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
                  ? "border-[#818CF8]/20 bg-[#818CF8]/10 text-[#818CF8]"
                  : "border-transparent text-[#8888A0] hover:bg-[#1A1A20] hover:text-[#E8E8ED]"
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
          <Avatar className="h-9 w-9 border border-[#2A2A32]">
            <AvatarFallback className="bg-[#818CF8]/10 text-[#818CF8]">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#E8E8ED]">{userName}</p>
            <p className="truncate text-xs text-[#8888A0]">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[#55556A] transition hover:text-[#E8E8ED]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
