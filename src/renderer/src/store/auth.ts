import { User } from '@cherrystudio/api-sdk'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
  user?: User
  accessToken?: string
  serverUrl?: string
}

const initialState: AuthState = {
  user: undefined,
  accessToken: undefined,
  serverUrl: undefined
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | undefined>) => {
      state.user = action.payload
    },
    setAccessToken: (state, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload
    },
    setServerUrl: (state, action: PayloadAction<string | undefined>) => {
      state.serverUrl = action.payload
    }
  }
})

export const { setUser, setAccessToken, setServerUrl } = authSlice.actions

export default authSlice.reducer
