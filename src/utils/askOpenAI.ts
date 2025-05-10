import { OpenAI } from "@langchain/openai";
import dotenv from "dotenv";

dotenv.config();
const llm = new OpenAI({
  model: "gpt-3.5-turbo-instruct",
  temperature: 0.5,
  maxTokens: 200,
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
});

interface AccentResult {
  accent: string;
  confidence: number;
  distribution: { accent: string; percentage: number }[];
  processed_chunks: number;
}

 async function generateSummary(result: AccentResult): Promise<string> {
  const prompt = `
Here is the result of an accent recognition AI system:

${JSON.stringify(result, null, 2)}

Please write a short and simple summary:
1. Start by explaining what accent was detected and how confident the system is.
2. Mention what makes this accent distinct compared to others. For example, what are the key features (like pronunciation of certain vowels or intonation patterns) that make this accent stand out, especially when differentiating it from other similar accents (e.g., Australian vs. British or American)?
3. Optionally, mention how many audio chunks were analyzed.
4. Use a friendly tone that a non-technical person can understand.
`;

  const summary = await llm.invoke(prompt);
  return summary.trim();
}

export default generateSummary;
