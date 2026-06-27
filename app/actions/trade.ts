'use server'

// Stub — full implementation lives in kritvi/execute-trade.
export async function executeTradeAction(
  _marketId: string,
  _side: 'yes' | 'no',
  _shares: number,
): Promise<{ message: string }> {
  throw new Error('executeTradeAction is not yet implemented.')
}
