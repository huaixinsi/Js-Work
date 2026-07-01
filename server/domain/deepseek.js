const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

class DeepSeekClientError extends Error {}

export async function requestDeepSeek({
  apiKey,
  model = "deepseek-v4-flash",
  systemPrompt,
  messages,
  fetchImpl = fetch,
  timeoutMs = 30_000
}) {
  if (!apiKey) {
    throw new Error("电影助手尚未配置 DeepSeek API");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(DEEPSEEK_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: false,
        temperature: 0.7,
        max_tokens: 900
      })
    });

    if (!response.ok) {
      throw new DeepSeekClientError("电影助手服务暂时不可用，请稍后重试");
    }

    const body = await response.json();
    const answer = String(body?.choices?.[0]?.message?.content ?? "").trim();
    if (!answer) {
      throw new DeepSeekClientError("电影助手未返回有效回答，请重试");
    }

    return answer;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("电影助手请求超时，请稍后重试");
    }
    if (error instanceof DeepSeekClientError) {
      throw error;
    }
    throw new Error("电影助手服务暂时不可用，请稍后重试");
  } finally {
    clearTimeout(timer);
  }
}
