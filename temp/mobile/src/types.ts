export type Envelope = {
  id: number
  to: string
  from: string
  subject: string
  created_at: string
}

export type Attachment = {
  id: string
  filename: string
}

export type MailDetail = {
  content: string
  attachments: Attachment[]
}

export type TurnstileStatus = {
  enabled: boolean
  verified: boolean
  site_key: string
}

export type TurnstileBridgeMessage = {
  type: "turnstile-verified"
  accessToken: string
  expiresAt: number
}
