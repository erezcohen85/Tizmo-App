"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-stand group-[.toaster]:text-score group-[.toaster]:border-border group-[.toaster]:font-ui group-[.toaster]:font-light",
          description: "group-[.toast]:text-dim",
          // Quiet text buttons, per spec §5 — no fill, turning lamp on hover.
          actionButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-dim hover:group-[.toast]:text-lamp",
          cancelButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-faint hover:group-[.toast]:text-lamp",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
