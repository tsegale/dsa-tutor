import json
import os

from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
model_name = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
max_tokens = int(os.getenv("MAX_TOKENS", "1000"))


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    return stripped


async def call_claude_for_feedback(prompt: str) -> dict:
    response = await client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    cleaned = _strip_code_fences(text)
    return json.loads(cleaned)


async def call_claude_for_text(prompt: str) -> str:
    response = await client.messages.create(
        model=model_name,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()
