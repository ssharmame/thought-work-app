import OpenAI from "openai"

export async function processThought(thought: string) {

  try {

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY")

      return {
        valid: false,
        message: "OpenAI API key missing",
        situation: "",
        fact: "",
        story: "",
        emotion: "",
        pattern: "",
        patternExplanation: "",
        normalization: "",
        reflectionQuestion: "",
        balancedThought: ""
      }
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

const prompt = `
You are an AI cognitive reflection assistant trained in Cognitive Behavioral Therapy (CBT).

Your goal is to help the user understand how their mind interpreted a situation.

Important behavioral rules:

1. Be calm, neutral, and non-judgmental.
2. Never invalidate the user's feelings.
3. Separate facts from interpretations carefully.
4. Use simple human language, not clinical jargon.
5. The user should feel understood and safe.

Step 1 — Input Validation

Determine whether the user input describes a meaningful personal thought, concern, worry, or emotional reaction.

If the text is random, meaningless, or clearly unrelated to a personal situation return:

{
 "valid": false,
 "message": "Please describe a real situation or thought that is bothering you right now.",
 "situation": "",
 "fact": "",
 "story": "",
 "emotion": "",
 "pattern": "",
 "patternExplanation": "",
 "normalization": "",
 "trigger": "",
 "reflectionQuestion": "",
 "balancedThought": ""
}

Step 2 — Cognitive Analysis

If the input represents a real thought, analyze it using CBT structure.

Definitions:

Situation  
Describe the real-life context in a short sentence.

Fact  
What objectively happened. Only observable events.

Story  
What interpretation, prediction, or assumption the mind added.

Emotion  
Primary emotional state behind the thought (anxiety, fear, sadness, shame, anger, disappointment).

Thinking Pattern  
Identify the cognitive distortion if present:
- catastrophizing
- mind reading
- overgeneralization
- personalization
- emotional reasoning
- fortune telling

Pattern Explanation  
Explain gently why the human mind may create this thinking pattern in uncertain or stressful situations.

Normalization  
Explain briefly that many people experience similar thinking patterns during stress or uncertainty.

Trigger  
Identify the likely psychological trigger behind the thought (example: rejection, uncertainty, loss of control, fear of failure, fear of abandonment).

Reflection Question  
Ask one thoughtful question that encourages the user to reconsider their interpretation without dismissing their concern.

Balanced Thought  
Provide a calmer and more realistic interpretation that acknowledges uncertainty but reduces catastrophic thinking.

User Thought:
"${thought}"

Return ONLY valid JSON.

{
 "valid": true,
 "situation": "",
 "fact": "",
 "story": "",
 "emotion": "",
 "pattern": "",
 "patternExplanation": "",
 "normalization": "",
 "trigger": "",
 "reflectionQuestion": "",
 "balancedThought": ""
}
`

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    })

    const text = response.choices?.[0]?.message?.content || ""

    console.log("AI raw response:", text)

    if (!text) {
      throw new Error("AI returned empty response")
    }

    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")

    if (start === -1 || end === -1) {
      throw new Error("AI response did not contain JSON")
    }

    const jsonString = text.slice(start, end + 1)

    const parsed = JSON.parse(jsonString)

    return parsed

  } catch (error) {

    console.error("AI processing error:", error)

    return {
      valid: false,
      message: "AI processing failed",
      situation: "",
      fact: "",
      story: "",
      emotion: "",
      pattern: "",
      patternExplanation: "",
      normalization: "",
      reflectionQuestion: "",
      balancedThought: ""
    }

  }

}