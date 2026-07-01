// Static price display — purely informational, not interactive.
// Trading happens exclusively in the Trade ticket.
export default function PriceCards({ yesPct, noPct }: { yesPct: number; noPct: number }) {
  return (
    <div className="flex items-stretch divide-x divide-border">
      <div className="flex-1 pr-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Yes</p>
        <p className="font-display mt-1 text-3xl font-bold tabular-nums leading-none text-columbia">
          {yesPct}¢
        </p>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{yesPct}% chance</p>
      </div>
      <div className="flex-1 pl-5 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">No</p>
        <p className="font-display mt-1 text-3xl font-bold tabular-nums leading-none text-danger">
          {noPct}¢
        </p>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{noPct}% chance</p>
      </div>
    </div>
  )
}
