import axios from 'axios'
import { ENV } from 'lib/env'
import Input from 'components/Input'
import Modal from 'components/Modal'
import React, { useState } from 'react'
import { useMutation } from 'react-query'
import { toast } from 'react-toastify'
import { useAppDispatch } from 'store/hooks'
import {
  setSelectedAccount,
  setAccounts
} from 'store/slices/auth.slice'

interface LoginModalProps {
  isLoginVisible: boolean
  toggleIsLoginVisible: () => void
}

interface ILoginUser {
  username: string
  password: string
}

function LoginModal({
  isLoginVisible,
  toggleIsLoginVisible
}: LoginModalProps) {
  const dispatch = useAppDispatch()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleUsernameChange = (value: string) => {
    setUsername(value)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
  }

  const registerUser = useMutation(
    (user: ILoginUser) => {
      return axios.post(`${ENV.API_URL}/login`, user)
    },
    {
      onSuccess: ({ data }) => {
        dispatch(setAccounts(data.data))
        dispatch(setSelectedAccount(data.data[0]))
        toggleIsLoginVisible()
      },
      onError: () => {
        toast.error('Username or password incorrect!')
      }
    }
  )

  function handleLoginUser() {
    if (username && password) {
      registerUser.mutate({
        username,
        password
      })
    } else {
      toast.error('Username & Password required!')
    }
  }

  return (
    <Modal
      isVisible={isLoginVisible}
      toggleVisible={toggleIsLoginVisible}
    >
      <div className='p-4 w-full h-full'>
        <h2 className='mb-4'>Login</h2>
        <Input
          value={username}
          onChange={handleUsernameChange}
          type='text'
          placeholder='Enter Username'
          className='mb-4 md:w-[300px] w-full'
        />

        <Input
          value={password}
          onChange={handlePasswordChange}
          type='password'
          placeholder='Enter Password'
        />
        <div
          className={`mt-4 cursor-pointer ${
            registerUser.isLoading ? 'bg-slate-600' : 'bg-blue-600'
          } px-4 py-2 rounded-md text-white flex justify-center items-center`}
          onClick={() => !registerUser.isLoading && handleLoginUser()}
        >
          <p className='text-sm'>
            {registerUser.isLoading ? 'Loading...' : 'Login'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default LoginModal
