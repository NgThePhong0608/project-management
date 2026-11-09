import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white shadow hover:bg-indigo-700",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700",
        destructive:
          "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
        outline:
          "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700",
        success:
          "border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
        warning:
          "border-amber-200 dark:border-amber-800 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
        info: "border-blue-200 dark:border-blue-800 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
