import { createContext } from 'react'

export interface ModalContextType {
  authModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  depositModalOpen: boolean
  openDepositModal: () => void
  closeDepositModal: () => void
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined)