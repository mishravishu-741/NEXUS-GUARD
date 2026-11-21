import { cn } from '../../utils/helpers'

export function Card({ className, children, hover, ...props }) {
  return (
    <div
      className={cn('card', hover && 'card-hover', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-b border-dark-700', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-t border-dark-700 bg-dark-800/50', className)} {...props}>
      {children}
    </div>
  )
}