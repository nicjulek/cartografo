import { useToast } from '../store/toast'
import styles from './Toaster.module.css'

export function Toaster() {
  const message = useToast((s) => s.message)
  const key = useToast((s) => s.key)
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {message && (
        <p key={key} className={styles.toast}>
          {message}
        </p>
      )}
    </div>
  )
}
