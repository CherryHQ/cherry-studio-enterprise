import { useAppSelector } from '@renderer/store'

export const useAuth = () => {
  const { user, accessToken, serverUrl } = useAppSelector((state) => state.auth)

  return { user, accessToken, serverUrl }
}
