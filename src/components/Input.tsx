import React from 'react'

interface InputProps {
  value: string
  onChange: (value: string) => void
  type: string
  placeholder: string
  className?: string
  inputClassName?: string
  inputProps?: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
}

function Input({
  value,
  onChange,
  type,
  placeholder,
  className,
  inputClassName,
  inputProps
}: InputProps) {
  return (
    <div className={className}>
      <input
        className={`border-[1px] border-slate-300 p-2 rounded-md text-sm w-full ${
          inputClassName ? inputClassName : ''
        }`}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        {...inputProps}
      />
    </div>
  )
}

export default Input
