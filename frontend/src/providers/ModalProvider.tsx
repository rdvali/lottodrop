import { useState, type ReactNode } from 'react'
import { ModalContext, type ModalContextType } from '../contexts/ModalContext'

interface ModalProviderProps {
  children: ReactNode
}

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const openAuthModal = () => {
    setAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
  }

  const value: ModalContextType = {
    authModalOpen,
    openAuthModal,
    closeAuthModal,
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}