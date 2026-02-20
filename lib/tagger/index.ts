import Anthropic from "@anthropic-ai/sdk";
import { ALL_TAGS } from "./taxonomy";

const anthropic = new Anthropic();

export async function autoTag(
  title: string,
  description: string | null
): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `You are a tagging assistant for data visualization content.
Select the most relevant tags from the list below. Return ONLY a JSON array of tag strings, nothing else.

Available tags: ${ALL_TAGS.join(", ")}

Title: ${title}
Description: ${description ?? "(none)"}

Rules:
- Select 1 to 5 tags maximum
- Only use tags from the provided list
- Return JSON array only, e.g. ["chart", "election"]`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: unknown) => typeof t === "string" && ALL_TAGS.includes(t));
  } catch {
    return [];
  }
}
