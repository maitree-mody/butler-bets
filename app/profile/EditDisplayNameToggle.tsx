'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import EditDisplayName from './EditDisplayName'

export default function EditDisplayNameToggle({ current }: { current: string | null }) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="pressable inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-columbia hover:text-columbia"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
        Edit profile
      </button>
    )
  }

  return (
    <div className="mt-3">
      <EditDisplayName current={current} />
    </div>
  )
}
