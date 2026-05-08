import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const EXPLAINER_MODES = {
  overview:
    "Give a balanced explanation that helps an average developer understand the code quickly.",
  simple:
    "Explain this in very simple terms for a beginner. Reduce jargon and use plain language.",
  line_by_line:
    "Focus on a line-by-line or block-by-block walkthrough of what the code is doing.",
  bugs:
    "Act like a careful reviewer. Focus on bugs, edge cases, correctness risks, and fragile assumptions.",
  improve:
    "Focus on code quality improvements, readability, maintainability, and better patterns.",
  deeper:
    "Go deeper than a normal explanation. Explain tradeoffs, hidden behavior, and why the implementation works."
};

const FALLBACK_LANGUAGE = "Unknown";
const buildAiId = () => `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const EXPLAINER_SYSTEM_PROMPT =
  "You are a world-class AI code explainer. Explain like the best modern AI products: start with the bottom line, build a crisp mental model, then walk the code in a way that is easy to skim and immediately useful. Be concrete, technically accurate, and specific to the pasted code.";

const detectLanguage = (code) => {
  const snippet = code.trim();

  if (!snippet) {
    return FALLBACK_LANGUAGE;
  }

  const checks = [
    ["TypeScript", /(interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|unknown|never|React\.|Promise<)|as\s+\w+)/],
    ["JavaScript", /(const\s+\w+|let\s+\w+|function\s+\w+|\=\>\s*{?|console\.log|import\s.+from\s)/],
    ["Python", /(def\s+\w+\(|import\s+\w+|from\s+\w+\s+import|print\(|if __name__ == ['"]__main__['"])/],
    ["Java", /(public\s+class\s+\w+|System\.out\.println|public\s+static\s+void\s+main|private\s+\w+\s+\w+\()/],
    ["C++", /(#include\s*<|std::|cout\s*<<|int\s+main\s*\()/],
    ["C#", /(using\s+System;|namespace\s+\w+|Console\.WriteLine|public\s+class\s+\w+)/],
    ["SQL", /\b(SELECT|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|JOIN)\b/i],
    ["JSON", /^\s*[\[{][\s\S]*[\]}]\s*$/],
    ["HTML", /<(!DOCTYPE|html|div|span|script|body|head)[\s>]/i],
    ["CSS", /[.#]?\w[\w-]*\s*\{[^}]*:[^}]*\}/],
    ["Shell", /^(#!\/|echo\s+|export\s+\w+=|if\s+\[|\$\w+)/m]
  ];

  for (const [language, matcher] of checks) {
    if (matcher instanceof RegExp && matcher.test(snippet)) {
      return language;
    }
  }

  return FALLBACK_LANGUAGE;
};

const normalizeMode = (value) => {
  if (typeof value !== "string") {
    return "overview";
  }

  return EXPLAINER_MODES[value] ? value : "overview";
};

const buildStructuredFallback = ({ detectedLanguage, mode, text }) => ({
  aiId: buildAiId(),
  detectedLanguage,
  mode,
  explanation: text,
  breakdown: [
    "Identify the main statement or function call first.",
    "Read each argument or block in order to understand what is being passed in.",
    "Look at what the code returns, prints, updates, or triggers."
  ],
  output: "",
  relatedExamples: [],
  summary: text,
  whatItDoes: text,
  stepByStep: [
    "Read the code from top to bottom and identify the main execution path.",
    "Track how values move through variables, functions, and conditions.",
    "Inspect outputs, mutations, and side effects."
  ],
  keyConcepts: ["Control flow", "Inputs and outputs", "State changes"],
  potentialIssues: [],
  improvements: [],
  lineByLine: [],
  followUpSuggestions: [
    "Run a bug-focused explanation.",
    "Ask for a line-by-line walkthrough.",
    "Ask for improvement suggestions."
  ]
});

const stripCodeFences = (value) =>
  value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

const parseExplanation = ({ text, detectedLanguage, mode }) => {
  try {
    const parsed = JSON.parse(stripCodeFences(text));

    return {
      aiId: typeof parsed.aiId === "string" && parsed.aiId.trim() ? parsed.aiId.trim() : buildAiId(),
      detectedLanguage:
        typeof parsed.detectedLanguage === "string" && parsed.detectedLanguage.trim()
          ? parsed.detectedLanguage.trim()
          : detectedLanguage,
      mode,
      explanation: String(parsed.explanation || parsed.summary || "").trim(),
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown.map(String).filter(Boolean) : [],
      output: String(parsed.output || "").trim(),
      relatedExamples: Array.isArray(parsed.relatedExamples)
        ? parsed.relatedExamples.map(String).filter(Boolean)
        : [],
      summary: String(parsed.summary || "").trim(),
      whatItDoes: String(parsed.whatItDoes || "").trim(),
      stepByStep: Array.isArray(parsed.stepByStep) ? parsed.stepByStep.map(String).filter(Boolean) : [],
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts.map(String).filter(Boolean) : [],
      potentialIssues: Array.isArray(parsed.potentialIssues)
        ? parsed.potentialIssues.map(String).filter(Boolean)
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.map(String).filter(Boolean)
        : [],
      lineByLine: Array.isArray(parsed.lineByLine) ? parsed.lineByLine.map(String).filter(Boolean) : [],
      followUpSuggestions: Array.isArray(parsed.followUpSuggestions)
        ? parsed.followUpSuggestions.map(String).filter(Boolean)
        : []
    };
  } catch {
    return buildStructuredFallback({
      detectedLanguage,
      mode,
      text
    });
  }
};

const EXPLANATION_JSON_SCHEMA = {
  name: "code_explanation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      aiId: { type: "string" },
      detectedLanguage: { type: "string" },
      explanation: { type: "string" },
      breakdown: {
        type: "array",
        items: { type: "string" }
      },
      output: { type: "string" },
      relatedExamples: {
        type: "array",
        items: { type: "string" }
      },
      summary: { type: "string" },
      whatItDoes: { type: "string" },
      stepByStep: {
        type: "array",
        items: { type: "string" }
      },
      keyConcepts: {
        type: "array",
        items: { type: "string" }
      },
      potentialIssues: {
        type: "array",
        items: { type: "string" }
      },
      improvements: {
        type: "array",
        items: { type: "string" }
      },
      lineByLine: {
        type: "array",
        items: { type: "string" }
      },
      followUpSuggestions: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: [
      "aiId",
      "detectedLanguage",
      "explanation",
      "breakdown",
      "output",
      "relatedExamples",
      "summary",
      "whatItDoes",
      "stepByStep",
      "keyConcepts",
      "potentialIssues",
      "improvements",
      "lineByLine",
      "followUpSuggestions"
    ]
  }
};

const buildExplainerFallbackResponse = ({ detectedLanguage, mode, summary, potentialIssues, improvements }) => ({
  aiId: buildAiId(),
  detectedLanguage,
  mode,
  explanation: summary,
  breakdown: [
    "Check whether the AI provider is configured and reachable.",
    "Retry with a smaller snippet if the request is hitting provider limits.",
    "Use a backup provider if your main provider is unavailable."
  ],
  output: "",
  relatedExamples: [],
  summary,
  whatItDoes:
    "The live AI provider is temporarily unavailable, so the explainer returned a safe fallback response instead of a full model-generated walkthrough.",
  stepByStep: [
    "Verify the AI provider credentials and billing status.",
    "Retry with a smaller code sample if the provider has strict request limits.",
    "Use an alternate provider or a cheaper model as a backup path."
  ],
  keyConcepts: ["API quota", "Model selection", "Fallback handling"],
  potentialIssues,
  improvements,
  lineByLine: [],
  followUpSuggestions: [
    "Add billing or credits to the AI account.",
    "Configure a fallback provider key.",
    "Try the explainer again after updating the model or quota."
  ]
});

const buildExplanationPrompt = ({ code, language, context, mode }) => {
  return [
    "You explain code for developers.",
    "Return valid JSON only. Do not wrap the answer in markdown fences.",
    "Keep each field practical, direct, and specific to the pasted code.",
    "Explain like a strong modern AI assistant, similar in feel to ChatGPT, Claude, or Perplexity.",
    "Lead with the bottom line first, then provide a mental model, then explain the flow.",
    "Prefer confident, compact, high-signal phrasing.",
    "Prefer short points over long paragraphs.",
    "Each bullet should contain one idea only.",
    "Avoid fluff, repetition, generic teaching language, and vague advice.",
    "Do not sound like an essay or textbook.",
    "Do not restate the code mechanically when a sharper abstraction would help more.",
    "When relevant, call out hidden behavior, tradeoffs, or non-obvious intent.",
    `Detected or provided language: ${language}`,
    `Explanation mode: ${mode}`,
    `Mode instruction: ${EXPLAINER_MODES[mode]}`,
    `Extra context from the user: ${context || "N/A"}`,
    "",
    "Return JSON with this exact shape:",
    JSON.stringify(
      {
        aiId: "ai-request-id",
        detectedLanguage: "string",
        explanation: "natural explanation paragraph",
        breakdown: ["short explanation of each important part"],
        output: "predicted output or behavior, empty string if not applicable",
        relatedExamples: ["example line of code"],
        summary: "1-2 short sentences",
        whatItDoes: "2-3 short sentences max",
        stepByStep: ["short explanation point"],
        keyConcepts: ["important concept or API"],
        potentialIssues: ["possible bug, edge case, or risk"],
        improvements: ["specific improvement suggestion"],
        lineByLine: ["short line or block level explanation when helpful"],
        followUpSuggestions: ["short next question or action"]
      },
      null,
      2
    ),
    "",
    "Requirements:",
    "- explanation should read like a polished AI answer, not like a template.",
    "- explanation should naturally explain what the code does in 2-4 sentences.",
    "- breakdown should explain the important parts one by one, similar to teaching from a concrete example.",
    "- output should contain the likely printed result or visible behavior when that is meaningful, otherwise an empty string.",
    "- relatedExamples should contain 2-4 concise example lines in the same language when helpful, otherwise an empty array.",
    "- summary should give the bottom line first in 1-2 sharp sentences.",
    "- summary should answer: what is this doing and why does it exist?",
    "- whatItDoes should describe the mental model in plain language in 2-3 short sentences max.",
    "- whatItDoes should answer: how should a developer think about this code?",
    "- stepByStep should contain 2-5 concrete points that follow the execution path or logic flow.",
    "- each stepByStep item should be 1 short sentence.",
    "- keyConcepts should usually contain 2-5 short items and name important APIs, patterns, or ideas.",
    "- potentialIssues should contain at most 3 short items and only include real risks or sharp caveats.",
    "- improvements should contain at most 3 short items and each one should be actionable.",
    "- lineByLine should be empty unless the mode is line_by_line or deeper.",
    "- for line_by_line mode, make lineByLine the richest section, but keep each item concise.",
    "- for bugs mode, make potentialIssues especially strong and specific.",
    "- for improve mode, make improvements especially strong and specific.",
    "- for simple mode, reduce jargon.",
    "- if the code is straightforward, still surface one non-obvious insight if possible.",
    "- if the input is a tiny code snippet, explain it in a friendly example-first style.",
    "- prefer verbs like 'reads', 'checks', 'returns', 'updates', 'calls'.",
    "- avoid filler like 'essentially', 'basically', 'in this code', 'overall this code'.",
    "- avoid repeating the same idea across sections.",
    "- followUpSuggestions should sound like smart next prompts a developer would actually click.",
    "",
    "Code:",
    code
  ].join("\n");
};

const extractOpenAiErrorMessage = (data) =>
  data?.error?.message || "OpenAI service did not return a successful response.";

const extractGeminiErrorMessage = (data) =>
  data?.error?.message ||
  data?.promptFeedback?.blockReason ||
  "Gemini service did not return a successful response.";

const extractGroqErrorMessage = (data) =>
  data?.error?.message || "Groq service did not return a successful response.";

const requestGroqExplanation = async ({ prompt, detectedLanguage, mode }) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.groqApiKey}`
    },
    body: JSON.stringify({
      model: env.groqModel,
      messages: [
        {
          role: "system",
          content: EXPLAINER_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: EXPLANATION_JSON_SCHEMA
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(502, extractGroqErrorMessage(data));
  }

  const output = data?.choices?.[0]?.message?.content?.trim();

  if (!output) {
    throw new ApiError(502, "Groq service did not return an explanation.");
  }

  return parseExplanation({
    text: output,
    detectedLanguage,
    mode
  });
};

const requestGeminiExplanation = async (prompt) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json"
        },
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(502, extractGeminiErrorMessage(data));
  }

  const output = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim();

  if (!output) {
    throw new ApiError(502, "Gemini service did not return an explanation.");
  }

  return output;
};

export const explainCode = async ({ code, language, context, mode }) => {
  if (!code?.trim()) {
    throw new ApiError(400, "Code is required.");
  }

  const detectedLanguage = language?.trim() || detectLanguage(code);
  const normalizedMode = normalizeMode(mode);

  if (!env.groqApiKey && !env.openAiApiKey && !env.geminiApiKey) {
    return {
      aiId: buildAiId(),
      detectedLanguage,
      mode: normalizedMode,
      summary:
        "No AI provider key is configured yet. Add GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in backend/.env to enable live code explanations.",
      whatItDoes:
        "The explainer is running in fallback mode, so it cannot generate a real code-specific walkthrough yet.",
      stepByStep: [
        "Identify the purpose of the code.",
        "Trace the control flow from top to bottom.",
        "Explain inputs, outputs, and side effects."
      ],
      keyConcepts: ["Control flow", "Data flow", "Side effects"],
      potentialIssues: ["Live AI analysis is unavailable until an AI provider key is configured."],
      improvements: [
        "Add GROQ_API_KEY in backend/.env for Groq-powered explanations.",
        "Add OPENAI_API_KEY in backend/.env for OpenAI-powered explanations.",
        "Or add GEMINI_API_KEY in backend/.env for Gemini-powered explanations."
      ],
      lineByLine: [],
      followUpSuggestions: [
        "Ask for a bug-focused explanation.",
        "Ask for improvement suggestions.",
        "Paste a smaller code sample for a tighter walkthrough."
      ]
    };
  }

  const prompt = buildExplanationPrompt({
    code: code.trim(),
    language: detectedLanguage,
    context: context?.trim(),
    mode: normalizedMode
  });

  if (env.groqApiKey) {
    try {
      return await requestGroqExplanation({
        prompt,
        detectedLanguage,
        mode: normalizedMode
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Groq request failed.";
      const quotaExceeded = /quota|rate limit|credits|billing|insufficient/i.test(message);

      if (quotaExceeded && env.openAiApiKey) {
        // Fall through to the existing OpenAI path below.
      } else if (quotaExceeded && env.geminiApiKey) {
        const geminiOutput = await requestGeminiExplanation(prompt);

        return parseExplanation({
          text: geminiOutput,
          detectedLanguage,
          mode: normalizedMode
        });
      } else if (quotaExceeded) {
        return buildExplainerFallbackResponse({
          detectedLanguage,
          mode: normalizedMode,
          summary:
            "Groq quota or rate limits were exceeded, so the explainer could not generate a live answer right now.",
          potentialIssues: [
            "The Groq project tied to this API key has no available credits or hit a rate limit."
          ],
          improvements: [
            "Check your Groq credits and limits.",
            "Set GROQ_MODEL to another supported model if needed.",
            "Add OPENAI_API_KEY or GEMINI_API_KEY in backend/.env as a fallback provider."
          ]
        });
      } else if (!env.openAiApiKey && !env.geminiApiKey) {
        throw error;
      }
    }
  }

  if (!env.openAiApiKey && env.geminiApiKey) {
    const geminiOutput = await requestGeminiExplanation(prompt);

    return parseExplanation({
      text: geminiOutput,
      detectedLanguage,
      mode: normalizedMode
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openAiApiKey}`
      },
      body: JSON.stringify({
        model: env.openAiModel,
        messages: [
          {
            role: "system",
            content: EXPLAINER_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: EXPLANATION_JSON_SCHEMA
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(502, extractOpenAiErrorMessage(data));
    }

    const output = data?.choices?.[0]?.message?.content?.trim();

    if (!output) {
      throw new ApiError(502, "OpenAI service did not return an explanation.");
    }

    return parseExplanation({
      text: output,
      detectedLanguage,
      mode: normalizedMode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed.";
    const quotaExceeded = /quota|insufficient_quota|billing/i.test(message);

    if (quotaExceeded && env.geminiApiKey) {
      const geminiOutput = await requestGeminiExplanation(prompt);

      return parseExplanation({
        text: geminiOutput,
        detectedLanguage,
        mode: normalizedMode
      });
    }

    if (quotaExceeded) {
      return buildExplainerFallbackResponse({
        detectedLanguage,
        mode: normalizedMode,
        summary:
          "OpenAI quota was exceeded, so the explainer could not generate a live answer right now.",
        potentialIssues: [
          "The OpenAI project tied to this API key has no available quota or billing credits."
        ],
        improvements: [
          "Add billing or credits to the OpenAI project.",
          "Set OPENAI_MODEL to a cheaper model like gpt-4.1-mini.",
          "Add GROQ_API_KEY or GEMINI_API_KEY in backend/.env as a fallback provider."
        ]
      });
    }

    throw error;
  }
};
