import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input: React.FC<InputProps> = ({ label, error, helperText, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm bg-card text-primary placeholder:text-muted ${error
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-subtle focus:ring-blue-500 focus:border-blue-500 hover:border-text-muted'
          } ${className}`}
        style={{ letterSpacing: '-0.01em', lineHeight: '1.5', fontSize: '0.9375rem' }}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  )
}

export default Input

