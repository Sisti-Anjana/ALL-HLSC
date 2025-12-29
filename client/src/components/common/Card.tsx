import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition-all duration-200 ${hover ? 'hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  )
}

export default Card

