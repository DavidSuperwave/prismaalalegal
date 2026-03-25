"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Bot, LogOut, Mail, Settings } from "lucide-react";
import { PipelineIcon } from "@/components/icons/pipeline-icon";

import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { id: "chat", label: "Agent", icon: Bot, href: "/chat" },
  { id: "crm", label: "Pipeline", icon: PipelineIcon, href: "/crm" },
  { id: "inbox", label: "Inbox", icon: Mail, href: "/inbox" },
  { id: "guidance", label: "Reglas", icon: BookOpen, href: "/guidance" },
  { id: "admin", label: "Admin", icon: Settings, href: "/admin/whatsapp-link" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
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
    <aside className="flex h-screen w-64 flex-col border-r border-[var(--color-divider)] bg-[var(--color-surface)]">
      <div className="flex h-16 items-center gap-3 border-b border-[var(--color-divider)] px-6">
        <Image
          src="/prisma logo.png"
          alt="Prisma"
          width={30}
          height={30}
          className="h-[30px] w-[30px] object-contain"
        />
        <div>
          <h1 className="font-display text-lg font-extrabold text-[var(--color-text)]">Prisma</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Legal Agent</p>
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
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-glow)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]"
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
        <ThemeToggle />

        <div className="my-3">
          <Separator />
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-[var(--color-divider)]">
            <AvatarFallback className="bg-[var(--color-primary-glow)] text-[var(--color-primary)]">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">{userName}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[var(--color-text-faint)] transition hover:text-[var(--color-text)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
