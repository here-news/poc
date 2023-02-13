import React, { useState } from 'react'
import Input from 'components/Input'
import Modal from 'components/Modal'
import { useMutation } from 'react-query'
import { toast } from 'react-toastify'
import axios from 'axios'
import { ENV } from 'lib/env'
import {
  setAccounts,
  setSelectedAccount,
  toggleIsRegisterModalVisible
} from 'store/slices/auth.slice'
import { useAppDispatch, useAppSelector } from 'store/hooks'

interface RegisterModalProps {
  isRegisterVisible: boolean
  toggleIsRegisterVisible: () => void
}

interface IRegisterUser {
  username: string
  password: string
}

function RegisterModal({
  isRegisterVisible,
  toggleIsRegisterVisible
}: RegisterModalProps) {
  const dispatch = useAppDispatch()
  const isGlobalModalVisible = useAppSelector(
    state => state.auth && state.auth.isRegisterModalVisible
  )

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleUsernameChange = (value: string) => {
    setUsername(value)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
  }

  const handleCloseModal = () => {
    setUsername('')
    setPassword('')
    isGlobalModalVisible &&
      dispatch(toggleIsRegisterModalVisible(false))
    isRegisterVisible && toggleIsRegisterVisible()
  }

  const registerUser = useMutation(
    (user: IRegisterUser) => {
      return axios.post(`${ENV.API_URL}/register`, user)
    },
    {
      onSuccess: ({ data }) => {
        dispatch(setAccounts(data.data))
        dispatch(setSelectedAccount(data.data[0]))
        handleCloseModal()
      },
      onError: () => {
        toast.error('There was an error registering user!')
      }
    }
  )

  function handleRegisterUser() {
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
      isVisible={isRegisterVisible || isGlobalModalVisible}
      toggleVisible={handleCloseModal}
      hasCloseButton
    >
      <div className='p-4 w-full h-full bg-white rounded-lg'>
        <h2 className='mb-4'>Register</h2>
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
          onClick={() =>
            !registerUser.isLoading && handleRegisterUser()
          }
        >
          <p className='text-sm'>
            {registerUser.isLoading ? 'Loading...' : 'Register'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default RegisterModal
