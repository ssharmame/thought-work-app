import { headers } from "next/headers"

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
}

export async function getAppUrl() {
  const configuredUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (configuredUrl) return configuredUrl

  const headerStore = await headers()
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https"
  const forwardedHost = headerStore.get("x-forwarded-host")
  const host = forwardedHost ?? headerStore.get("host")

  if (host) {
    return `${forwardedProto}://${host}`
  }

  return "http://localhost:3000"
}
