import { forwardRef } from 'react'
import { cn } from '../../utils/helpers'

const Input = forwardRef(({ className, error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn('input', error && 'input-error', className)}
      {...props}
    />
  )
})

Input.displayName = 'Input'

export { Input }