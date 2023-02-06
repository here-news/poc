import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from 'store'

export interface User {
  _id: string
  username: string
  password: string
  displayName: string
  reputation: number
}

type AuthState = {
  accounts: User[] | null
  selectedAccount: User | null
}

const initialState: AuthState = {
  accounts: null,
  selectedAccount: null
}

export const authSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<User[]>) => {
      const users = action.payload
      state.accounts = users
    },
    setSelectedAccount: (state, action: PayloadAction<User>) => {
      const singleUser = action.payload
      state.selectedAccount = singleUser
    },
    logout: state => {
      state.accounts = null
      state.selectedAccount = null
    }
  }
})

// actions
export const { setAccounts, setSelectedAccount, logout } =
  authSlice.actions

// selectors
export const selectUser = (state: RootState) => state.auth.accounts

export default authSlice.reducer
