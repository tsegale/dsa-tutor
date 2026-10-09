import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useThemeStore } from "@/store/useThemeStore"

// Sonner on the design tokens. The theme comes from the app's own theme
// store: this used next-themes, whose provider is never mounted here, so
// toasts followed the OS setting instead of the app's toggle.
const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeStore((state) => state.theme)

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-ink-2" />,
        warning: <TriangleAlertIcon className="size-4 text-secondary" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />,
      }}
      toastOptions={{
        classNames: {
          toast: "font-sans text-small shadow-e2",
          title: "font-medium text-ink",
          description: "text-ink-2",
        },
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--rule)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
