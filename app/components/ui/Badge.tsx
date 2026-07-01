type BadgeProps = {
  tone?: 'neutral' | 'columbia' | 'success' | 'danger' | 'muted'
  size?: 'sm' | 'md'
  className?: string
  children: React.ReactNode
}

const TONE: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-muted text-muted-foreground',
  columbia: 'bg-columbia-soft text-columbia',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/5 text-danger',
  muted: 'bg-muted text-muted-foreground',
}

const SIZE: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-[11px]',
}

export default function Badge({ tone = 'neutral', size = 'sm', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${TONE[tone]} ${SIZE[size]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
