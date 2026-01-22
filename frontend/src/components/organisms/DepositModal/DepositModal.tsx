import { useState, useEffect, useCallback } from 'react'
import Modal from '../Modal/Modal'
import NetworkSelector from './NetworkSelector'
import AmountInput from './AmountInput'
import DepositAddress from './DepositAddress'
import DepositStatusDisplay from './DepositStatusDisplay'
import { depositAPI } from '../../../services/api/deposit.service'
import { socketService } from '../../../services/socket/socket.service'
import type {
  NetworkConfig,
  CreateDepositResponse,
  CryptoDeposit,
  DepositStatusUpdate
} from '../../../types/deposit'
import { DepositStatus } from '../../../types/deposit'
import clsx from 'clsx'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (deposit: CryptoDeposit) => void
}

type DepositStep = 'select' | 'address' | 'status'

const DepositModal = ({ isOpen, onClose, onSuccess }: DepositModalProps) => {
  // State
  const [step, setStep] = useState<DepositStep>('select')
  const [networks, setNetworks] = useState<NetworkConfig[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [deposit, setDeposit] = useState<CreateDepositResponse | null>(null)
  const [depositStatus, setDepositStatus] = useState<CryptoDeposit | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch networks on mount
  useEffect(() => {
    if (isOpen && networks.length === 0) {
      fetchNetworks()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Socket listener for deposit status updates
  useEffect(() => {
    if (!deposit?.paymentId) return

    const handleStatusUpdate = (update: DepositStatusUpdate) => {
      if (update.paymentId === deposit.paymentId) {
        // Fetch full deposit status
        fetchDepositStatus(deposit.id)
      }
    }

    socketService.on('deposit-status-update', handleStatusUpdate)

    return () => {
      socketService.off('deposit-status-update', handleStatusUpdate)
    }
  }, [deposit?.paymentId, deposit?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch supported networks
  const fetchNetworks = async () => {
    try {
      const data = await depositAPI.getNetworks()
      setNetworks(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load networks')
    }
  }

  // Fetch deposit status
  const fetchDepositStatus = useCallback(async (depositId: string) => {
    try {
      const status = await depositAPI.getDepositById(depositId)
      setDepositStatus(status)

      // Move to status step if not already there
      if (step !== 'status') {
        setStep('status')
      }

      // Notify success
      if (
        (status.status === DepositStatus.CONFIRMED || status.status === DepositStatus.OVERPAID) &&
        onSuccess
      ) {
        onSuccess(status)
      }
    } catch (err) {
      console.error('Failed to fetch deposit status:', err)
    }
  }, [step, onSuccess])

  // Create deposit
  const handleCreateDeposit = async () => {
    if (!selectedNetwork || amount <= 0) return

    setIsLoading(true)
    setError(null)

    try {
      const newDeposit = await depositAPI.createDeposit({
        amount,
        network: selectedNetwork.network,
        tokenStandard: selectedNetwork.tokenStandard
      })

      setDeposit(newDeposit)
      setStep('address')

      // Start polling for status (as backup to webhooks)
      startStatusPolling(newDeposit.id)
    } catch (err: any) {
      setError(err.message || 'Failed to create deposit')
    } finally {
      setIsLoading(false)
    }
  }

  // Poll for status updates
  const startStatusPolling = (depositId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await depositAPI.getDepositById(depositId)
        setDepositStatus(status)

        // Stop polling on final status
        if (
          status.status !== DepositStatus.PENDING ||
          new Date(status.expiresAt) < new Date()
        ) {
          clearInterval(pollInterval)
          setStep('status')

          if (
            (status.status === DepositStatus.CONFIRMED || status.status === DepositStatus.OVERPAID) &&
            onSuccess
          ) {
            onSuccess(status)
          }
        }
      } catch (err) {
        console.error('Status poll failed:', err)
      }
    }, 10000) // Poll every 10 seconds

    // Clear on unmount
    return () => clearInterval(pollInterval)
  }

  // Handle expired
  const handleExpired = () => {
    if (deposit) {
      fetchDepositStatus(deposit.id)
    }
  }

  // Reset modal
  const handleReset = () => {
    setStep('select')
    setSelectedNetwork(null)
    setAmount(0)
    setDeposit(null)
    setDepositStatus(null)
    setError(null)
  }

  // Handle close
  const handleClose = () => {
    handleReset()
    onClose()
  }

  // Check if can proceed
  const canProceed = selectedNetwork && amount >= (selectedNetwork.minAmount ?? 10)

  // Get modal title
  const getTitle = () => {
    switch (step) {
      case 'select':
        return 'Deposit USDT'
      case 'address':
        return 'Send USDT'
      case 'status':
        return 'Deposit Status'
      default:
        return 'Deposit'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      size="md"
      closeOnOverlayClick={step === 'select'}
    >
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {(['select', 'address', 'status'] as DepositStep[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === s
                  ? 'bg-primary text-white'
                  : ['address', 'status'].indexOf(step) > ['select', 'address', 'status'].indexOf(s)
                  ? 'bg-primary/30 text-primary'
                  : 'bg-gray-700 text-gray-400'
              )}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={clsx(
                  'w-12 h-0.5 mx-1',
                  ['address', 'status'].indexOf(step) > i
                    ? 'bg-primary/30'
                    : 'bg-gray-700'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Select network and amount */}
      {step === 'select' && (
        <div className="space-y-6">
          <NetworkSelector
            networks={networks}
            selectedNetwork={selectedNetwork}
            onSelect={setSelectedNetwork}
          />

          <AmountInput
            value={amount}
            onChange={setAmount}
            selectedNetwork={selectedNetwork}
          />

          <button
            type="button"
            onClick={handleCreateDeposit}
            disabled={!canProceed || isLoading}
            className={clsx(
              'w-full py-3 px-4 rounded-lg font-medium transition-all',
              canProceed && !isLoading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating Deposit...
              </span>
            ) : (
              'Generate Deposit Address'
            )}
          </button>
        </div>
      )}

      {/* Step 2: Show deposit address */}
      {step === 'address' && deposit && (
        <DepositAddress deposit={deposit} onExpired={handleExpired} />
      )}

      {/* Step 3: Show status */}
      {step === 'status' && depositStatus && (
        <DepositStatusDisplay
          deposit={depositStatus}
          onClose={handleClose}
          onNewDeposit={handleReset}
        />
      )}
    </Modal>
  )
}

export default DepositModal
