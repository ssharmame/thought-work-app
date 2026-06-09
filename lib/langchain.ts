import { ChatOpenAI } from "@langchain/openai"
import { CallbackHandler } from "langfuse-langchain"

/**
 * Returns a LangChain ChatOpenAI model pre-configured with:
 * - gpt-4o-mini (same model as the rest of the app)
 * - temperature 0.3
 * - Langfuse callback handler so every call is automatically traced
 *
 * Usage:
 *   const model = getLangChainModel()
 *   const response = await model.invoke([{ role: "user", content: "Hello" }])
 *
 * For a specific trace, pass a traceId:
 *   const model = getLangChainModel({ traceId: "abc-123" })
 */
export function getLangChainModel(options?: { traceId?: string; temperature?: number }) {
  const langfuseHandler = new CallbackHandler({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
    ...(options?.traceId ? { traceId: options.traceId } : {}),
  })

  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: options?.temperature ?? 0.3,
    callbacks: [langfuseHandler],
  })
}
