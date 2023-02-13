import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from 'store'
import { IUser } from 'types/interfaces'

type AuthState = {
  accounts: IUser[] | null
  selectedAccount: IUser | null
  isLoginModalVisible: boolean
  isRegisterModalVisible: boolean
}

const initialState: AuthState = {
  accounts: null,
  selectedAccount: null,
  isLoginModalVisible: false,
  isRegisterModalVisible: false
}

export const authSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAccounts: (state, action: PayloadAction<IUser[]>) => {
      const users = action.payload
      state.accounts = users
    },
    setSelectedAccount: (state, action: PayloadAction<IUser>) => {
      const singleUser = action.payload
      state.selectedAccount = singleUser
    },
    deductBalance: (state, action: PayloadAction<number>) => {
      if (!state.selectedAccount || !state.accounts) return

      const account = state.accounts.find(
        acc => acc._id === state.selectedAccount?._id
      )
      if (account) {
        account.balance = Number(
          (state.selectedAccount.balance - action.payload).toFixed(2)
        )
      }
      state.selectedAccount.balance = Number(
        (state.selectedAccount.balance - action.payload).toFixed(2)
      )
    },
    toggleIsLoginModalVisible: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.isLoginModalVisible = action.payload
    },
    toggleIsRegisterModalVisible: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.isRegisterModalVisible = action.payload
    },
    logout: state => {
      state.accounts = null
      state.selectedAccount = null
    }
  }
})

// actions
export const {
  setAccounts,
  setSelectedAccount,
  deductBalance,
  toggleIsLoginModalVisible,
  toggleIsRegisterModalVisible,
  logout
} = authSlice.actions

// selectors
export const selectUser = (state: RootState) => state.auth.accounts

export default authSlice.reducer
