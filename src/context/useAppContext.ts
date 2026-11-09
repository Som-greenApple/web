import { useContext } from 'react'
import { AppContext } from './AppContext'

export function useAppContext() {
  const context = useContext(AppContext)

  if (context === undefined) {
    throw new Error(
      'useAppContext는 AppProvider 안에서 사용해야 합니다.',
    )
  }

  return context
}