import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Per UI-SPEC §5: "Primary actions in this app are marks, not buttons. Everything else is a
 * quiet text button: Assistant 300 12.5px at `dim`, no border, no fill, turning `lamp` on
 * hover. Reserve a bordered button for genuinely destructive confirmation only."
 *
 * So there are really only two shapes here — quiet text, and a bordered destructive confirm.
 * The remaining variant names are kept so call sites don't churn, but they all resolve to the
 * quiet treatment rather than reintroducing fills.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-ui text-[12.5px] font-light transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-dim hover:text-lamp",
        destructive:
          "border border-status-absent/40 text-status-absent hover:border-status-absent",
        outline: "text-dim hover:text-lamp",
        secondary: "text-dim hover:text-lamp",
        ghost: "text-dim hover:text-lamp",
        link: "text-dim underline-offset-4 hover:text-lamp hover:underline",
      },
      size: {
        default: "h-9 px-2 py-2",
        sm: "h-8 px-2",
        lg: "h-10 px-3",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
