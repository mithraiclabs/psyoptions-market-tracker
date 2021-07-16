export interface DataMessage {
  readonly serumMarketAddress: string
  readonly slot: number
  readonly timestamp: string
}
export type OrderItem = {
  readonly price: number
  readonly size: number
  readonly side: 'buy' | 'sell'
  readonly orderId: string
  readonly clientId: string
  readonly account: string
  readonly accountSlot: number
  readonly feeTier: number
}
export interface Fill extends DataMessage, OrderItem {
  readonly type: 'fill'
  readonly maker: boolean
  readonly feeCost: number
}
export interface Done extends DataMessage {
  readonly type: 'done'
  readonly side: 'buy' | 'sell'
  readonly orderId: string
  readonly clientId?: string
  readonly account: string
  readonly accountSlot: number
}
export interface Change extends DataMessage, OrderItem {
  readonly type: 'change'
}

export type EventTypes = Fill | Done | Change;