# Provider switching design

`CHAT_PROVIDER=blackbox` selects `zai/glm-5.2` through Vercel AI Gateway and
hard-pins Blackbox with `gateway.only`. `CHAT_PROVIDER=openai` selects any
OpenAI-compatible service using `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and
`CHAT_MODEL`. Existing `vercel`, `liara`, and `openrouter` values remain.

The Blackbox path must compile under Eve and complete a real Eve session. The
generic path must expose the configured base URL, key, and model through the
existing AI SDK OpenAI-compatible adapter without adding another dependency.
