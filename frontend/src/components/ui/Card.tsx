import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

const Card = ({ children, className }: CardProps) => {
  return (
    <div className={clsx('card', className)}>
      {children}
    </div>
  )
}

const CardHeader = ({ children, className }: CardHeaderProps) => {
  return (
    <div className={clsx('card-header', className)}>
      {children}
    </div>
  )
}

const CardBody = ({ children, className }: CardBodyProps) => {
  return (
    <div className={clsx('card-body', className)}>
      {children}
    </div>
  )
}

const CardFooter = ({ children, className }: CardFooterProps) => {
  return (
    <div className={clsx('card-footer', className)}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardBody, CardFooter }