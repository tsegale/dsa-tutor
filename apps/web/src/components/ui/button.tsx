import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Design Phase 1D. Four looks: primary (brand fill), secondary (surface with
// a rule border), ghost, danger. The shadcn names consumers already pass map
// onto them: default = primary, outline = secondary, destructive = danger.
// "secondary" used to be an amber fill; amber now means only "the system is
// asking you something", so it is the bordered surface button instead.
//
// Disabled uses colour, not opacity: --ink-3 on --surface-sunk reads as
// unavailable in both themes without fading the label below legibility.
const LIFT = "hover:-translate-y-px active:translate-y-0 disabled:translate-y-0"

const PRIMARY = cn("bg-brand text-primary-foreground hover:bg-brand-hover", LIFT)
const SECONDARY = cn("border border-rule bg-surface text-ink hover:border-rule-strong hover:bg-surface-sunk", LIFT)
const GHOST = "text-ink-2 hover:bg-surface-sunk hover:text-ink"
const DANGER = cn("bg-destructive text-white hover:bg-destructive/90", LIFT)

const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-sm text-small font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-quick outline-none disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-sunk disabled:text-ink-3 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: PRIMARY,
        default: PRIMARY,
        secondary: SECONDARY,
        outline: SECONDARY,
        ghost: GHOST,
        danger: DANGER,
        destructive: DANGER,
        link: "text-accent-foreground underline-offset-4 hover:underline disabled:bg-transparent",
      },
      size: {
        sm: "h-7 gap-1.5 px-3 has-[>svg]:px-2.5",
        md: "h-9 px-4 has-[>svg]:px-3",
        default: "h-9 px-4 has-[>svg]:px-3",
        xs: "h-6 gap-1 px-2 text-micro has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-md": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin motion-reduce:animate-none", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Replaces the label with a spinner. The label stays in the layout
     * (invisible), so the button keeps its width. Ignored with asChild. */
    loading?: boolean
  }) {
  const classes = cn(buttonVariants({ variant, size, className }))

  if (asChild) {
    return (
      <Slot.Root data-slot="button" data-variant={variant} data-size={size} className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  // Loading keeps the variant's colours (it is busy, not unavailable), so it
  // blocks clicks through pointer-events and aria-disabled instead of the
  // disabled attribute, whose styling would grey the button out.
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(classes, loading && "pointer-events-none")}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      {...props}
      onClick={loading ? undefined : props.onClick}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-[inherit]">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-4" />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export { Button, buttonVariants, Spinner }
