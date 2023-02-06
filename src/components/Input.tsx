import React from 'react'

interface InputProps {
  value: string
  onChange: (value: string) => void
  type: string
  placeholder: string
  className?: string
}

function Input({
  value,
  onChange,
  type,
  placeholder,
  className
}: InputProps) {
  return (
    <div className={className}>
      <input
        className='border-[1px] border-slate-300 p-2 rounded-md text-sm w-full'
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default Input
