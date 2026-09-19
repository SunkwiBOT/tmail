export function randomAddress(domain: string) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let local = ""
  for (let index = 0; index < 8; index += 1) {
    local += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${local}@${domain}`
}

export function formatSender(value: string) {
  const match = value.match(/^(.+?)\s*<(.+?)>$/)
  return match ? match[1].replace(/^"|"$/g, "") : value
}

export function formatInboxDate(value: string) {
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date)
}

export function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function emailDomain(address: string) {
  return address.split("@")[1] ?? ""
}

export function safeFilename(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_")
  return cleaned || "piece-jointe"
}
