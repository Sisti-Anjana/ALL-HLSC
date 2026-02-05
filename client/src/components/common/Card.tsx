import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  id?: string
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick, id }) => {
  return (
    <div
      id={id}
      className={`bg-card rounded-xl border border-subtle shadow-sm p-6 transition-all duration-300 ${hover ? 'hover:shadow-md hover:border-accent-green/30 hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  )
}

export default Card

