"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/useReducedMotion"

// Underline tabs (Design Phase 1D): a 2px brand indicator that slides to the
// active trigger, never a filled pill. Sliding needs each trigger to know
// whether it is active, which Radix does not expose at render time, so Tabs
// mirrors its value into context. Controlled and uncontrolled use both keep
// working: a passed value wins, otherwise the mirrored state does.
const TabsContext = React.createContext<{ value: string | undefined; orientation: "horizontal" | "vertical"; id: string }>({
  value: undefined,
  orientation: "horizontal",
  id: "",
})

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const current = value ?? uncontrolled
  const id = React.useId()

  const handleChange = React.useCallback(
    (next: string) => {
      setUncontrolled(next)
      onValueChange?.(next)
    },
    [onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: current, orientation: orientation ?? "horizontal", id }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        value={current}
        onValueChange={handleChange}
        className={cn("group/tabs flex gap-3 data-[orientation=horizontal]:flex-col", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

// "default" and "line" render the same underline now; both stay accepted so
// existing callers need no change.
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center text-ink-2 group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=horizontal]/tabs:gap-4 group-data-[orientation=horizontal]/tabs:border-b group-data-[orientation=horizontal]/tabs:border-rule group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:border-l group-data-[orientation=vertical]/tabs:border-rule",
  {
    variants: {
      variant: {
        default: "",
        line: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, value, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value: active, orientation, id } = React.useContext(TabsContext)
  const prefersReducedMotion = useReducedMotion()
  const isActive = active === value
  const horizontal = orientation === "horizontal"

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 text-small font-medium whitespace-nowrap text-ink-2 transition-colors duration-quick hover:text-ink disabled:pointer-events-none disabled:text-ink-3 data-[state=active]:text-ink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        horizontal ? "h-full px-0.5" : "w-full justify-start px-3 py-1.5",
        className
      )}
      {...props}
    >
      {children}
      {isActive && (
        <motion.span
          layoutId={`tabs-indicator-${id}`}
          aria-hidden="true"
          className={cn("absolute bg-brand", horizontal ? "inset-x-0 bottom-0 h-0.5" : "inset-y-0 left-0 w-0.5")}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: [0.2, 0, 0, 1] }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
