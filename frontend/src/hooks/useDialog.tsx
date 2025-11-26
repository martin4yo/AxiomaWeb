import { useState } from 'react'
import { AlertDialog } from '../components/ui/AlertDialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

type AlertType = 'error' | 'warning' | 'info' | 'success'
type ConfirmType = 'warning' | 'danger' | 'info' | 'success'

interface AlertState {
  show: boolean
  title: string
  message: string
  type: AlertType
}

interface ConfirmState {
  show: boolean
  title: string
  message: string
  type: ConfirmType
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
}

export function useDialog() {
  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  })

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    show: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  })

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info'
  ) => {
    setAlertState({ show: true, title, message, type })
  }

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: ConfirmType = 'warning',
    confirmText?: string,
    cancelText?: string
  ) => {
    setConfirmState({
      show: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText
    })
  }

  const closeAlert = () => {
    setAlertState({ ...alertState, show: false })
  }

  const closeConfirm = () => {
    setConfirmState({ ...confirmState, show: false })
  }

  const handleConfirm = () => {
    confirmState.onConfirm()
    closeConfirm()
  }

  const AlertComponent = () => (
    <AlertDialog
      isOpen={alertState.show}
      onClose={closeAlert}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
    />
  )

  const ConfirmComponent = () => (
    <ConfirmDialog
      isOpen={confirmState.show}
      onClose={closeConfirm}
      onConfirm={handleConfirm}
      title={confirmState.title}
      message={confirmState.message}
      type={confirmState.type}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
    />
  )

  return {
    showAlert,
    showConfirm,
    AlertComponent,
    ConfirmComponent
  }
}
