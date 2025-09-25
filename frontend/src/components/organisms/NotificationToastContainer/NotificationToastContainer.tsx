import { NotificationToast } from '../../molecules/NotificationToast/NotificationToast'
import { useNotifications } from '../../../contexts/NotificationContext'
import './NotificationToastContainer.css'

export function NotificationToastContainer(): React.ReactElement {
  const { state } = useNotifications()

  if (state.toasts.length === 0) {
    return <></>
  }

  return (
    <div
      className="notification-toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {state.toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
        />
      ))}
    </div>
  )
}

export default NotificationToastContainer