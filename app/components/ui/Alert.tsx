type AlertProps = {
  tone: 'danger' | 'success'
  role?: 'alert' | 'status'
  className?: string
  children: React.ReactNode
}

const TONE: Record<AlertProps['tone'], string> = {
  danger: 'border-danger/30 bg-danger/5 text-danger',
  success: 'border-success/30 bg-success/10 text-success',
}

export default function Alert({ tone, role, className = '', children }: AlertProps) {
  return (
    <p
      role={role}
      className={`rounded-xl border px-3.5 py-3 text-sm ${TONE[tone]} ${className}`.trim()}
    >
      {children}
    </p>
  )
}
