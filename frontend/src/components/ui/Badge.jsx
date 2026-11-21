import { cn } from '../../utils/helpers'

const variants = {
  default: 'badge-info',
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
}

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span className={cn('badge', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}