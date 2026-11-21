import { cn } from '../../utils/helpers'

export function Table({ className, children, ...props }) {
  return (
    <div className={cn('table-container', className)} {...props}>
      <table className={cn('table')}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn(className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn(className)} {...props}>
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }) {
  return (
    <th className={cn('px-4 py-3 text-left font-semibold text-dark-400 bg-dark-800/50 border-b border-dark-700 uppercase tracking-wider', className)} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('px-4 py-3 text-dark-200 border-b border-dark-700/50', className)} {...props}>
      {children}
    </td>
  )
}