import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#141418] text-[#8888A0]",
        blue: "bg-[#818CF8]/10 text-[#818CF8]",
        green: "bg-[#34D399]/10 text-[#34D399]",
        yellow: "bg-[#F59E0B]/10 text-[#F59E0B]",
        red: "bg-[#F87171]/10 text-[#F87171]",
        outline: "border border-[#333340] bg-transparent text-[#8888A0]",
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
