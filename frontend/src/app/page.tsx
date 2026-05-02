"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Send, User as UserIcon, Hexagon, LogOut, LogIn } from "lucide-react";

import { fetchHistory, sendChatMessage } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

// Markdown Renderer Component
const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-invert max-w-none text-sm md:text-base prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:m-0 prose-pre:p-0 prose-tr:border-b-white/10 prose-th:border-b-white/20 prose-td:border-b-white/5"
      components={{
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");
          if (isInline) {
            return (
              <code className="bg-white/10 rounded px-1.5 py-0.5 font-mono text-amber-200" {...props}>
                {children}
              </code>
            );
          }
          return match ? (
            <div className="overflow-hidden rounded-xl border border-white/10 my-4 bg-[#1d1f21] shadow-2xl">
              <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/5">
                <span className="text-xs uppercase tracking-wider text-white/50 font-mono">
                  {match[1]}
                </span>
              </div>
              <SyntaxHighlighter
                style={atomDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  padding: "1rem",
                }}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="bg-white/10 rounded px-1.5 py-0.5 font-mono" {...props}>
              {children}
            </code>
          );
        },
        table: ({ children }: any) => (
          <div className="overflow-x-auto my-4 w-full">
            <table className="w-full text-left text-sm border-collapse">
              {children}
            </table>
          </div>
        ),
        th: ({ children }: any) => (
          <th className="border-b border-white/20 bg-white/5 px-4 py-3 font-semibold text-white">
            {children}
          </th>
        ),
        td: ({ children }: any) => (
          <td className="border-b border-white/5 px-4 py-3 text-white/80">
            {children}
          </td>
        ),
        a: ({ href, children }: any) => (
          <a href={href} className="text-sky-300 hover:text-sky-200 underline underline-offset-4" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const userId = session?.user?.id ?? "";
  const accessToken = session?.access_token ?? "";
  const isAuthed = Boolean(session);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => data.subscription.unsubscribe();
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
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSignIn = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet.");
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const handleSignOut = async () => {
    setError(null);
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const handleSend = async (event?: FormEvent) => {
    if (event) event.preventDefault();
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
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-ink-900 text-white overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-sky-900/10 to-transparent opacity-50" />
        <div className="absolute bottom-0 inset-x-0 h-[500px] bg-gradient-to-t from-amber-900/5 to-transparent opacity-50" />
      </div>

      <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/5 backdrop-blur-sm z-10 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 border border-white/10 shadow-sm">
            <Hexagon size={16} className="text-sky-300" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-xl tracking-wide text-white/90">Eon</h1>
        </div>
        <div>
          {isAuthed ? (
            <button
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition duration-200"
              onClick={handleSignOut}
            >
              <LogOut size={14} />
              Sign out
            </button>
          ) : (
            <button
              className="flex items-center gap-2 rounded-full bg-white text-ink-900 px-5 py-2 text-sm font-semibold hover:bg-slate-200 transition duration-200"
              onClick={handleSignIn}
            >
              <LogIn size={16} />
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col max-w-4xl w-full mx-auto">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-4 animate-fade-up">
              <div className="h-16 w-16 mb-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center">
                <Hexagon size={32} className="text-amber-200/80" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-white/40 max-w-md text-sm">
                I am Eon. Feel free to ask anything, write code, or explore data.
              </p>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
            >
              <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                
                <div className="shrink-0 flex pt-1">
                  {message.role === "user" ? (
                    <div className="h-8 w-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                      <UserIcon size={14} className="text-sky-300" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      <Hexagon size={14} className="text-amber-300" />
                    </div>
                  )}
                </div>

                <div 
                  className={`relative flex flex-col space-y-2 rounded-3xl px-5 py-4 shadow-sm backdrop-blur-md ${
                    message.role === "user"
                      ? "bg-white/10 border-white/10 text-white rounded-tr-sm"
                      : "bg-transparent border-transparent text-white"
                  }`}
                >
                  <div className="flex-1">
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full justify-start animate-fade-up">
              <div className="flex gap-4 max-w-[85%] md:max-w-[75%]">
                <div className="shrink-0 flex pt-1">
                  <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg animate-slow-pulse">
                    <Hexagon size={14} className="text-amber-300" />
                  </div>
                </div>
                <div className="flex items-center px-4">
                  <div className="flex gap-1.5 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-6" />
        </div>

        <div className="p-4 bg-gradient-to-t from-ink-900 via-ink-900 to-transparent">
          <form
            onSubmit={handleSend}
            className="group relative flex w-full flex-col rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl focus-within:border-white/20 focus-within:bg-white/10 transition-all duration-300 ease-out p-3 animate-fade-up-delay"
          >
            {error && (
              <div className="px-4 pb-2 text-xs text-rose-300">
                {error}
              </div>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              className="max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-4 py-3 text-sm md:text-base text-white placeholder:text-white/30 focus:outline-none scrollbar-hide"
              placeholder={isAuthed ? "Message Eon..." : "Sign in to start..."}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
              }}
              onKeyDown={handleKeyDown}
              disabled={!isAuthed || isLoading}
            />
            <div className="absolute right-3 bottom-3">
              <button
                type="submit"
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                  input.trim() && isAuthed && !isLoading
                    ? "bg-white text-ink-900 hover:bg-slate-200 hover:scale-105 shadow-lg"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
                disabled={!isAuthed || isLoading || !input.trim()}
              >
                <Send size={16} className={input.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
              </button>
            </div>
          </form>
          <div className="mt-3 text-center">
            <p className="text-[11px] text-white/30 tracking-wide">
              Replies are generated in real-time. Eon can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
