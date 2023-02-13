import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from 'store/hooks'
import LoginModal from './pages/home/LoginModal'
import RegisterModal from './pages/home/RegisterModal'
import Avatar from 'assets/avatar.png'
import { logout, setSelectedAccount } from 'store/slices/auth.slice'
import { IUser } from 'types/interfaces'
import { MdAttachMoney } from 'react-icons/md'
import AnimatedNumber from 'react-awesome-animated-number'
import 'react-awesome-animated-number/dist/index.css'
import Link from 'next/link'

function Header() {
  const dispatch = useAppDispatch()
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const { accounts, selectedAccount } = useAppSelector(
    state => state.auth
  )

  const [isRegisterVisible, setIsRegisterVisible] = useState(false)
  const [isLoginVisible, setIsLoginVisible] = useState(false)

  const [openAccount, setOpenAccount] = useState(false)

  useEffect(() => {
    if (!openAccount) {
      document.removeEventListener('mousedown', handleClickOutside)
      return
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openAccount])

  function handleClickOutside(e: MouseEvent) {
    if (!e) return
    const target = e.target as Node

    if (accountMenuRef?.current?.contains(target)) return
    setOpenAccount(false)
  }

  const toggleIsRegisterVisible = () => {
    setIsRegisterVisible(prev => !prev)
  }

  const toggleIsLoginVisible = () => {
    setIsLoginVisible(prev => !prev)
  }

  const toggleOpenAccount = () => {
    if (openAccount) return setOpenAccount(false)
    setOpenAccount(prev => !prev)
  }

  const switchAccount = (account: IUser) => {
    dispatch(setSelectedAccount(account))
    toggleOpenAccount()
  }

  const logoutUser = () => {
    dispatch(logout())
    toggleOpenAccount()
  }

  return (
    <React.Fragment>
      <header className='bg-white flex items-center justify-center p-0 fixed left-0 right-0 top-0 z-[3] h-14'>
        <div
          className='grid h-full max-w-[40rem]'
          style={{
            flex: '1 1 0%'
          }}
        >
          <div className='flex justify-between items-center pb-2 px-2'>
            <Link href='/'>
              <h2 className='cursor-pointer text-xl'>Posts</h2>
            </Link>

            <div className='flex flex-row gap-2 items-center'>
              {selectedAccount ? (
                <React.Fragment>
                  <div className='ml-2 flex flex-row items-center bg-violet-600 text-white pl-1 pr-2 py-[0.3125rem] rounded-xl font-semibold h-full'>
                    <MdAttachMoney className='text-md' />
                    <p className='text-xs'>
                      <AnimatedNumber
                        className='select-none'
                        value={selectedAccount.balance}
                        hasComma={false}
                        size={12}
                      />
                    </p>
                  </div>
                  <div className='relative' ref={accountMenuRef}>
                    <div
                      className='flex flex-row items-center border-[1px] bg-white border-slate-400 px-1 py-1 rounded-full cursor-pointer hover:bg-slate-400 hover:text-white'
                      onClick={toggleOpenAccount}
                    >
                      <div className='relative w-[18px] h-[18px]'>
                        <Image
                          src={Avatar}
                          alt='avatar'
                          fill
                          className='rounded-full'
                        />
                      </div>
                      <p className='text-xs ml-2 font-semibold select-none'>
                        {selectedAccount.displayName}
                        <span
                          className={`${
                            selectedAccount.reputation === 5
                              ? 'bg-yellow-400'
                              : 'bg-blue-400 text-white'
                          } ml-2 px-[0.375rem] py-[0.125rem] rounded-md text-[0.625rem]`}
                        >
                          {selectedAccount.reputation}
                        </span>
                      </p>
                      <p className='ml-2 text-xs'>▼</p>
                    </div>

                    {openAccount && (
                      <div className='z-[-1] w-full shadow-lg bg-white absolute top-0 left-0 rounded-bl-lg rounded-br-lg pt-7 pb-2'>
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
                                  <p className='text-xs font-semibold px-2 py-2 border-t-[1px] border-slate-400 cursor-pointer hover:bg-slate-400 hover:text-white'>
                                    {account.displayName}
                                    <span
                                      className={`${
                                        account.reputation === 5
                                          ? 'bg-yellow-400'
                                          : 'bg-blue-400 text-white'
                                      } ml-1 px-[0.375rem] py-[0.125rem] rounded-md text-[0.625rem]`}
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
                          <p className='text-xs font-semibold px-2 py-[6px] border-t-[1px] border-slate-400 text-red-500 cursor-pointer hover:bg-slate-400 hover:text-white'>
                            Logout
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <p
                    className='cursor-pointer text-md text-blue-500 pl-4 underline'
                    onClick={() => toggleIsLoginVisible()}
                  >
                    Log In
                  </p>
                  <p
                    className='cursor-pointer text-md text-blue-500 pr-4 underline ml-2'
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
