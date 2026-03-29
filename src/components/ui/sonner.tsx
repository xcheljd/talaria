import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useSyncExternalStore } from "react"

function useThemeAttribute() {
  const theme = useSyncExternalStore(
    (callback) => {
      const observer = new MutationObserver(callback)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "class"],
      })
      return () => observer.disconnect()
    },
    () => {
      const dataTheme = document.documentElement.getAttribute("data-theme")
      if (dataTheme === "dark") return "dark"
      if (document.documentElement.classList.contains("dark")) return "dark"
      return "light"
    }
  )
  return theme
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeAttribute()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
