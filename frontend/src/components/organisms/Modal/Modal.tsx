import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  className?: string
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}: ModalProps) => {
  // Ensure onClose is stable to prevent re-renders
  const handleClose = () => {
    onClose()
  }
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Prevent close if clicking on modal content
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      handleClose()
    }
  }
  
  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleClose()
  }
  // Responsive size classes with mobile-first approach
  const sizes = {
    sm: 'max-w-sm w-[90%] sm:w-full',
    md: 'max-w-md w-[90%] sm:w-full',
    lg: 'max-w-lg w-[90%] sm:w-full',
    xl: 'max-w-xl w-[90%] sm:w-full',
  }
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleOverlayClick}
          />
          
          {/* Modal - Responsive positioning and sizing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]',
              'bg-secondary-bg rounded-xl shadow-2xl border border-primary/20',
              'pointer-events-auto',
              'max-h-[90vh] overflow-y-auto', // Prevent modal from being taller than viewport
              'mx-auto', // Center with margin auto
              sizes[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Responsive padding */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-primary/10 sticky top-0 bg-secondary-bg rounded-t-xl">
                {title && (
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary text-center flex-1">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleCloseButtonClick}
                    className="ml-2 p-2 text-gray-400 hover:text-text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer relative z-10 flex-shrink-0"
                    aria-label="Close modal"
                    data-testid="modal-close-button"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content - Responsive padding */}
            <div className="p-4 sm:p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
  
  // Create or get modal root
  const getModalRoot = () => {
    let modalRoot = document.getElementById('modal-root')
    if (!modalRoot) {
      modalRoot = document.createElement('div')
      modalRoot.id = 'modal-root'
      modalRoot.style.position = 'relative'
      modalRoot.style.zIndex = '9999'
      document.body.appendChild(modalRoot)
    }
    return modalRoot
  }
  
  return createPortal(modalContent, getModalRoot())
}

export default Modal