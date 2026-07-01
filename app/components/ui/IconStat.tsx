import type { LucideIcon } from 'lucide-react'
import Card from './Card'

type IconStatProps = {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'success' | 'danger'
  className?: string
}

const TONE: Record<NonNullable<IconStatProps['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  danger: 'text-danger',
}

export default function IconStat({ icon: Icon, label, value, sub, tone = 'default', className = '' }: IconStatProps) {
  return (
    <Card padding="sm" className={className}>
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-columbia-soft">
        <Icon className="h-4 w-4 text-columbia" strokeWidth={1.8} />
      </div>
      <p className="eyebrow mt-3">{label}</p>
      <p className={`font-numeric mt-1 text-2xl font-bold leading-none tracking-tight sm:text-3xl ${TONE[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  )
}
