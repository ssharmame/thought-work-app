import Langfuse from "langfuse"

let langfuseClient: Langfuse | null = null

export function getLangfuse() {
  if (langfuseClient) return langfuseClient

  langfuseClient = new Langfuse()
  return langfuseClient
}
