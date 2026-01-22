import { useState, type ReactNode } from 'react'
import { ModalContext, type ModalContextType } from '../contexts/ModalContext'

interface ModalProviderProps {
  children: ReactNode
}

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [depositModalOpen, setDepositModalOpen] = useState(false)

  const openAuthModal = () => {
    setAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
  }

  const openDepositModal = () => {
    setDepositModalOpen(true)
  }

  const closeDepositModal = () => {
    setDepositModalOpen(false)
  }

  const value: ModalContextType = {
    authModalOpen,
    openAuthModal,
    closeAuthModal,
    depositModalOpen,
    openDepositModal,
    closeDepositModal,
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}