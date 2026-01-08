import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
            {props.required && <span className="ml-1" style={{ color: 'var(--color-primary)' }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg shadow-sm
            text-gray-100 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:border-gray-600
            disabled:bg-gray-800/30 disabled:cursor-not-allowed
            transition-all duration-200
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
                    style={!error ? { '--focus-color': 'var(--color-primary)' } as React.CSSProperties : {}}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
