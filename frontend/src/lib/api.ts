export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export type ChatResult = {
  reply: string;
  memory?: { should_store: boolean };
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

function requireBackendUrl(): string {
  if (!backendUrl) {
    throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
  }
  return backendUrl;
}

export async function sendChatMessage(params: {
  userId: string;
  accessToken: string;
  message: string;
}): Promise<ChatResult> {
  const url = requireBackendUrl();
  const response = await fetch(`${url}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      user_id: params.userId,
      message: params.message,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Chat request failed");
  }

  return response.json();
}

export async function fetchHistory(params: {
  userId: string;
  accessToken: string;
}): Promise<HistoryMessage[]> {
  const url = requireBackendUrl();
  const response = await fetch(
    `${url}/history?user_id=${encodeURIComponent(params.userId)}`,
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "History request failed");
  }

  const data = (await response.json()) as { messages: HistoryMessage[] };
  return data.messages ?? [];
}
