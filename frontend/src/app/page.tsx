"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";

import { fetchHistory, sendChatMessage } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const userId = session?.user?.id ?? "";
  const accessToken = session?.access_token ?? "";

  const isAuthed = Boolean(session);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthed || !isSupabaseConfigured) {
      setMessages([]);
      return;
    }

    const loadHistory = async () => {
      try {
        const history = await fetchHistory({ userId, accessToken });
        setMessages(history);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    loadHistory();
  }, [isAuthed, accessToken, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const greeting = useMemo(() => {
    if (!session?.user?.email) {
      return "Your private chat";
    }
    return `Your private chat, ${session.user.email.split("@")[0]}`;
  }, [session]);

  const handleSignIn = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleSignOut = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      return;
    }
    await supabase.auth.signOut();
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !isAuthed) return;

    const messageText = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    const optimistic: ChatMessage = {
      role: "user",
      content: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await sendChatMessage({
        userId,
        accessToken,
        message: messageText,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col px-4 py-6 text-white sm:px-8 lg:px-12">
      <div className="absolute inset-0 -z-10">
        <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-amber-300/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 top-16 h-80 w-80 rounded-full bg-sky-300/20 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-rose-300/10 blur-[130px]" />
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Eon</p>
          <h1 className="font-display text-3xl sm:text-4xl">{greeting}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
              onClick={handleSignOut}
              disabled={!isSupabaseConfigured}
            >
              Sign out
            </button>
          ) : (
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-slate-900/60"
              onClick={handleSignIn}
              disabled={!isSupabaseConfigured}
            >
              {isSupabaseConfigured ? "Sign in with Google" : "Set Supabase env"}
            </button>
          )}
        </div>
      </header>

      <section className="mt-8 flex min-h-[420px] flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur animate-fade-up-delay">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Conversation
            </p>
            <h3 className="font-display text-2xl">Chat</h3>
          </div>
          <span className="text-xs text-white/60">
            {messages.length} message{messages.length === 1 ? "" : "s"}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2"
        >
          {!isAuthed && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              {isSupabaseConfigured
                ? "Sign in to start chatting."
                : "Add Supabase env vars to enable authentication."}
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-auto w-full max-w-[70%] rounded-2xl bg-white px-4 py-3 text-sm text-slate-900 shadow-lg"
                  : "mr-auto w-full max-w-[70%] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white"
              }
            >
              <p
                className={
                  message.role === "user"
                    ? "text-[11px] uppercase tracking-[0.3em] text-black/40"
                    : "text-[11px] uppercase tracking-[0.3em] text-white/50"
                }
              >
                {message.role === "user" ? "You" : "Eon"}
              </p>
              <p className="mt-2 leading-6">{message.content}</p>
              {message.created_at && (
                <p
                  className={
                    message.role === "user"
                      ? "mt-2 text-[11px] uppercase tracking-[0.2em] text-black/40"
                      : "mt-2 text-[11px] uppercase tracking-[0.2em] text-white/50"
                  }
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="mr-auto w-full max-w-[60%] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/70">
              Eon is thinking...
            </div>
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <textarea
            className="min-h-[90px] w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
            placeholder={
              isAuthed ? "Message Eon..." : "Sign in to start chatting"
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!isAuthed || isLoading}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {error ? (
              <p className="text-xs text-rose-200">{error}</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="rounded-full bg-amber-300 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/70"
              disabled={!isAuthed || isLoading || !input.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
