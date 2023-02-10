import Image from 'next/image'
import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import LoginModal from './pages/home/LoginModal'
import RegisterModal from './pages/home/RegisterModal'
import Avatar from 'assets/avatar.png'
import {
  logout,
  setSelectedAccount,
  User
} from 'store/slices/auth.slice'

function Header() {
  const dispatch = useAppDispatch()
  const { accounts, selectedAccount } = useAppSelector(
    state => state.auth
  )

  const [isRegisterVisible, setIsRegisterVisible] = useState(false)
  const [isLoginVisible, setIsLoginVisible] = useState(false)

  const [openAccount, setOpenAccount] = useState(false)

  const toggleIsRegisterVisible = () => {
    setIsRegisterVisible(prev => !prev)
  }

  const toggleIsLoginVisible = () => {
    setIsLoginVisible(prev => !prev)
  }

  const toggleOpenAccount = () => {
    setOpenAccount(prev => !prev)
  }

  const switchAccount = (account: User) => {
    dispatch(setSelectedAccount(account))
    toggleOpenAccount()
  }

  const logoutUser = () => {
    dispatch(logout())
    toggleOpenAccount()
  }

  return (
    <React.Fragment>
      <header className='bg-white flex items-center justify-center p-0 fixed left-0 right-0 top-0 z-[2] h-14'>
        <div
          className='grid h-full max-w-[40rem]'
          style={{
            flex: '1 1 0%'
          }}
        >
          <div className='flex justify-between items-center pb-2'>
            <h2 className='cursor-pointer text-xl pl-4'>News@HERE</h2>

            <div className='flex flex-row gap-4'>
              {selectedAccount ? (
                <div className='relative mr-4'>
                  <div
                    className='flex flex-row items-center border-[1px] bg-white border-slate-400 px-2 py-2 rounded-full cursor-pointer hover:bg-slate-400 hover:text-white'
                    onClick={toggleOpenAccount}
                  >
                    <div className='relative w-[1.625rem] h-[1.625rem]'>
                      <Image
                        src={Avatar}
                        alt='avatar'
                        fill
                        className='rounded-full'
                      />
                    </div>
                    <p className='text-sm ml-2 font-semibold'>
                      {selectedAccount.displayName}
                      <span
                        className={`${
                          selectedAccount.reputation === 5
                            ? 'bg-yellow-400'
                            : 'bg-blue-400 text-white'
                        } ml-1 px-2 py-[2px] rounded-md text-xs`}
                      >
                        {selectedAccount.reputation}
                      </span>
                    </p>
                    <p className='ml-4 text-xs'>▼</p>
                  </div>

                  {openAccount && (
                    <div className='z-[-1] w-full bg-white absolute top-0 left-0 rounded-bl-lg rounded-br-lg pt-[2.75rem] pb-2'>
                      <p className='text-xs text-slate-400 pl-2 mt-2'>
                        Switch to
                      </p>
                      {accounts?.map(account => {
                        if (account._id === selectedAccount._id)
                          return null

                        return (
                          <div
                            key={account._id}
                            onClick={() => switchAccount(account)}
                          >
                            {
                              <React.Fragment>
                                <p className='text-sm font-semibold px-2 py-3 border-t-[1px] border-slate-400 cursor-pointer hover:bg-slate-400 hover:text-white'>
                                  {account.displayName}
                                  <span
                                    className={`${
                                      account.reputation === 5
                                        ? 'bg-yellow-400'
                                        : 'bg-blue-400 text-white'
                                    } ml-1 px-2 py-[2px] rounded-md text-xs`}
                                  >
                                    {account.reputation}
                                  </span>
                                </p>
                              </React.Fragment>
                            }
                          </div>
                        )
                      })}
                      <div onClick={() => logoutUser()}>
                        <p className='text-sm px-2 py-3 border-t-[1px] border-slate-400 text-red-500 cursor-pointer hover:bg-slate-400 hover:text-white'>
                          Logout
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <React.Fragment>
                  <p
                    className='cursor-pointer text-md text-blue-500 pl-4 underline'
                    onClick={() => toggleIsLoginVisible()}
                  >
                    Log In
                  </p>
                  <p
                    className='cursor-pointer text-md text-blue-500 pr-4 underline'
                    onClick={() => toggleIsRegisterVisible()}
                  >
                    Register
                  </p>
                </React.Fragment>
              )}
            </div>
          </div>
        </div>
      </header>
      <RegisterModal
        isRegisterVisible={isRegisterVisible}
        toggleIsRegisterVisible={toggleIsRegisterVisible}
      />
      <LoginModal
        isLoginVisible={isLoginVisible}
        toggleIsLoginVisible={toggleIsLoginVisible}
      />
    </React.Fragment>
  )
}

export default Header
