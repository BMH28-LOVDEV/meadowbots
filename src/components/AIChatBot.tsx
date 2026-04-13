import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-with-data`;

interface AIChatBotProps {
  onBack: () => void;
  userName: string;
  mini?: boolean;
  backLabel?: string;
  externalMessages?: Msg[];
  onExternalMessagesChange?: (msgs: Msg[]) => void;
}

export type { Msg as ChatMessage };

const AIChatBot = ({ onBack, userName, mini, backLabel, externalMessages, onExternalMessagesChange }: AIChatBotProps) => {
  const [internalMessages, setInternalMessages] = useState<Msg[]>([]);
  const messages = externalMessages ?? internalMessages;
  const setMessages = onExternalMessagesChange ?? setInternalMessages;
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (directText?: string) => {
    const text = (directText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to connect to AI");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        const content = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Error: ${e.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (mini) {
    return (
      <div className="flex flex-col h-full">
        {/* Mini messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🤖</div>
              <h2 className="text-sm font-display font-bold text-primary tracking-wider mb-1">
                Hey, {userName}!
              </h2>
              <p className="text-xs text-muted-foreground font-body mb-3">
                Ask me anything about our data!
              </p>
              <div className="flex flex-col gap-1.5">
                {["Best auto team?", "Top 3 scouted teams", "Drive team matches?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-foreground font-body transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-background border border-border rounded-bl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-xs prose-invert max-w-none font-body text-foreground [&_strong]:text-primary [&_code]:bg-secondary [&_code]:px-1 [&_code]:rounded text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="font-body">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-background border border-border rounded-xl rounded-bl-sm px-3 py-2">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Mini input */}
        <div className="border-t border-border p-2">
          <div className="flex gap-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask something..."
              disabled={isLoading}
              className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-base text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={isLoading || !input.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-display tracking-wider"
        >
          {backLabel || "← BACK"}
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-display font-bold text-primary tracking-wider">
            🤖 MEADOWBOT AI
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            Ask me anything about our scouting data
          </p>
        </div>
        <div className="w-16" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-display font-bold text-primary tracking-wider mb-2">
              Hey, {userName}!
            </h2>
            <p className="text-muted-foreground font-body max-w-md mx-auto mb-6">
              I have access to all of our scouting data, team assignments, and match schedules. Ask me anything!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Which team has the best auto?",
                "Compare our top 3 scouted teams",
                "Who is scouting what?",
                "What are our drive team matches?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { send(q); }}
                  className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-foreground font-body transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none font-body text-foreground [&_strong]:text-primary [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary [&_code]:bg-secondary [&_code]:px-1 [&_code]:rounded">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="font-body text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about scouting data..."
            disabled={isLoading}
            className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-base text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-primary text-primary-foreground font-display font-bold tracking-wider rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatBot;
