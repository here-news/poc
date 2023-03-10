import { useFormContext } from 'react-hook-form'

interface IInput {
  id?: string
  name?: string
  value?: string
  className?: string
  onChange?: (e: any) => any
  placeholder?: string
  hookToForm: boolean
  type: 'text' | 'password'
}

function Input({
  id,
  name,
  value,
  type = 'text',
  placeholder,
  hookToForm,
  onChange,
  className
}: IInput) {
  const formContext = useFormContext()
  const isFullyHooked = name && hookToForm && formContext

  const fieldError =
    isFullyHooked && formContext?.formState?.errors?.[name]

  return (
    <label
      {...(id && { htmlFor: id })}
      className={'rounded-md text-sm w-full'}
    >
      <input
        {...(id && { id: id })}
        type={type}
        placeholder={placeholder}
        className={`
        w-full p-2 border-[1px] border-slate-300 
        ${className ? className : ''} ${
          hookToForm && fieldError && fieldError?.message
            ? 'border-red-600'
            : ''
        }`}
        {...(!hookToForm && {
          value: value,
          onChange: onChange
        })}
        {...(isFullyHooked ? formContext.register(name) : {})}
        name={name}
      />

      {isFullyHooked && fieldError && fieldError?.message && (
        <p className='text-red-600'>
          {fieldError?.message as string}
        </p>
      )}
    </label>
  )
}

Input.defaultProps = {
  hookToForm: false,
  type: 'text'
}

export default Input
