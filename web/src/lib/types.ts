export type Envelope = {
  id: number
  to: string
  from: string
  subject: string
  created_at: string
  animate?: boolean
}

export type Attachment = {
  id: string
  filename: string
}

export type FetchPagination = {
  page: number
  total: number
  total_pages: number
}

export type FetchPage = {
  envelopes: Envelope[]
  pagination: FetchPagination
}
