import React from 'react'
import { clsx } from 'clsx'

interface TableProps {
  children: React.ReactNode
  className?: string
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
  header?: boolean
}

const Table = ({ children, className }: TableProps) => {
  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className={clsx('table', className)}>
        {children}
      </table>
    </div>
  )
}

const TableHeader = ({ children, className }: TableHeaderProps) => {
  return (
    <thead className={clsx('table-header', className)}>
      {children}
    </thead>
  )
}

const TableBody = ({ children, className }: TableBodyProps) => {
  return (
    <tbody className={clsx('bg-white divide-y divide-gray-200', className)}>
      {children}
    </tbody>
  )
}

const TableRow = ({ children, className, onClick }: TableRowProps) => {
  return (
    <tr
      className={clsx(
        onClick && 'cursor-pointer hover:bg-gray-50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

const TableCell = ({ children, className, header = false }: TableCellProps) => {
  const Component = header ? 'th' : 'td'
  const baseClass = header ? 'table-th' : 'table-td'

  return (
    <Component className={clsx(baseClass, className)}>
      {children}
    </Component>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableCell }