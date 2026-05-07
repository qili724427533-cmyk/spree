import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Slot } from '@/components/ui/slot'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        // Mirrors the `destructive` recipe (tinted bg + matching text) with a
        // green hue for "succeeded / completed / paid / shipped" states. Dark
        // mode bumps text to `green-400` so it stays legible on dark fills.
        success:
          'bg-green-500/15 text-green-700 dark:bg-green-500/15 dark:text-green-400 [a]:hover:bg-green-500/25',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// Maps order/payment/etc. status strings to one of the canonical Badge
// variants. Success-y states ("active", "paid", "shipped", …) route through
// the `success` variant so the UI stays color-coded; everything else leans
// on the canonical shadcn variants with shape + label carrying meaning.
const statusVariantMap: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  active: 'success',
  complete: 'success',
  completed: 'success',
  paid: 'success',
  shipped: 'success',
  published: 'success',
  approved: 'success',
  ready: 'success',
  draft: 'outline',
  pending: 'outline',
  processing: 'outline',
  inactive: 'outline',
  cart: 'outline',
  address: 'outline',
  delivery: 'outline',
  payment: 'outline',
  confirm: 'outline',
  resumed: 'secondary',
  partial: 'secondary',
  archived: 'secondary',
  returned: 'secondary',
  backorder: 'secondary',
  balance_due: 'secondary',
  credit_owed: 'secondary',
  canceled: 'destructive',
  failed: 'destructive',
  void: 'destructive',
  error: 'destructive',
  rejected: 'destructive',
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = statusVariantMap[status] ?? 'outline'
  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}

export { Badge, badgeVariants, StatusBadge }
