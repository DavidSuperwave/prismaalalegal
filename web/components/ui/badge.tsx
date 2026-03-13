import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
        blue: "bg-[var(--color-primary-glow)] text-[var(--color-primary)]",
        green: "bg-emerald-500/10 text-emerald-500",
        yellow: "bg-amber-500/10 text-amber-600",
        red: "bg-rose-500/10 text-rose-500",
        outline: "border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
