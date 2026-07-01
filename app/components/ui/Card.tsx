type CardProps = {
  as?: 'div' | 'section' | 'article'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
  id?: string
  'aria-labelledby'?: string
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7',
}

export default function Card({
  as: Tag = 'div',
  padding = 'md',
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={`rounded-2xl border border-border bg-card shadow-sm ${PADDING[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  )
}
