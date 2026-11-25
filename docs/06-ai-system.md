# SocialForge — AI Content Studio & Prompt Architecture

## 1. System Architecture & Model Selection

The AI subsystem in SocialForge orchestrates multimodal text, image copy, and short-form video scripting using OpenAI's API:

- **Primary Model**: `gpt-4o` (High-reasoning model for complex copywriting, tone matching, and multi-platform strategic adaptation).
- **Fast / Draft Model**: `gpt-4o-mini` (High-velocity, cost-efficient model for quick rewrites, hashtag variations, and spelling/grammar polishes).
- **Enforcement Mechanism**: OpenAI Structured Outputs with strict JSON Schema definitions.

---

## 2. Context Assembly Pipeline

Every generation request synthesizes a rich, multi-layered prompt context:

```
[System Layer: Master Social Media Copywriter Instructions]
                         +
[Brand Governance Layer: Brand Kit Voice, Formality, Taboo Words, Legal Disclaimers]
                         +
[Target Audience Layer: Demographics, Pain Points, Tone Descriptors]
                         +
[Campaign / Seed Prompt Layer: User Topic, Launch Details, Discount Codes, CTAs]
                         +
[Platform Constraints Layer: Char limits, Hashtag rules, Spacing etiquette]
```

### Context Injection Example:
```json
{
  "brandVoice": {
    "formality": "approachable_expert",
    "descriptors": ["empowering", "clinical", "honest"],
    "tabooWords": ["miracle", "cheap", "cure"],
    "requiredDisclaimer": "Results may vary. Clinically tested."
  },
  "userPrompt": "Promote our new Retinol Night Cream launch with code NIGHT20",
  "targetPlatforms": ["x_twitter", "linkedin", "instagram", "tiktok"]
}
```

---

## 3. Platform-Specific Adaptation Matrix

| Platform | Primary Objective | Character Budget | Structural Rules | Hashtag Policy |
| :--- | :--- | :--- | :--- | :--- |
| **X (Twitter)** | Viral hook, brevity, conversation starter. | $\le 280$ characters | Hook in first 50 chars; 1 punchy call-to-action or open question. | Max 1-2 high-traffic tags; never cluster. |
| **LinkedIn** | Professional insight, industry authority, value delivery. | $800 - 1500$ characters | 2-line attention hook; generous paragraph spacing; bullet takeaways; thought-provoking closing question. | 3-5 industry-relevant tags at footer. |
| **Instagram** | Visual caption, emotional connection, aesthetic formatting. | $300 - 800$ characters | Clean line breaks; emoji accents aligned with brand tone; clear CTA ("Link in bio"). | 15-25 contextual hashtags placed after spacing dots. |
| **TikTok / Shorts** | High-energy video script & hook. | Script: 30-60 sec speech (~75-150 words) | 3-second visual + audio hook; problem $\rightarrow$ solution flow; clear punchline. | 3-5 trending / niche discovery tags. |

---

## 4. Structured Output JSON Schema

To prevent hallucinated formats and parse errors, generations use strict JSON schemas:

```json
{
  "type": "object",
  "properties": {
    "campaignTitle": { "type": "string" },
    "coreMessage": { "type": "string" },
    "variants": {
      "type": "object",
      "properties": {
        "x_twitter": {
          "type": "object",
          "properties": {
            "content": { "type": "string" },
            "characterCount": { "type": "integer" }
          },
          "required": ["content", "characterCount"]
        },
        "linkedin": {
          "type": "object",
          "properties": {
            "content": { "type": "string" },
            "keyTakeaways": { "type": "array", "items": { "type": "string" } }
          },
          "required": ["content", "keyTakeaways"]
        },
        "instagram": {
          "type": "object",
          "properties": {
            "caption": { "type": "string" },
            "hashtags": { "type": "array", "items": { "type": "string" } },
            "visualSuggestions": { "type": "string" }
          },
          "required": ["caption", "hashtags", "visualSuggestions"]
        },
        "short_video_script": {
          "type": "object",
          "properties": {
            "hook": { "type": "string" },
            "scenes": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "sceneNumber": { "type": "integer" },
                  "visualCue": { "type": "string" },
                  "voiceover": { "type": "string" },
                  "durationSeconds": { "type": "number" }
                },
                "required": ["sceneNumber", "visualCue", "voiceover", "durationSeconds"]
              }
            },
            "callToAction": { "type": "string" }
          },
          "required": ["hook", "scenes", "callToAction"]
        }
      },
      "required": ["x_twitter", "linkedin", "instagram"]
    }
  },
  "required": ["campaignTitle", "coreMessage", "variants"]
}
```

---

## 5. Governance & Taboo Word Filtering

1. **Pre-Prompt Injection**: Taboo words are listed in the system prompt with strict negative instructions (`"Under no circumstances use the following forbidden terms..."`).
2. **Post-Generation Sanitization Guardrail**:
   - The worker runs an automated regex inspection against the returned copy.
   - If any taboo word is detected, the worker automatically flags the output or triggers a single fast retry (`gpt-4o-mini`) asking to replace the flagged term with an approved synonym.
