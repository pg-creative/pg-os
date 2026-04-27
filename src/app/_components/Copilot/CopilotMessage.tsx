"use client";

/**
 * CopilotMessage.tsx — Single message bubble in the copilot conversation.
 * Renders user / assistant text / tool-call / tool-result / error variants.
 */

export type MessageRole = "user" | "assistant";

export interface ToolCallEvent {
  name: string;
  input?: unknown;
  ok?: boolean;
  error?: string;
}

export interface CopilotMsg {
  id: string;
  role: MessageRole;
  /** Streamed text content */
  text: string;
  /** Tool calls made during this turn */
  toolCalls?: ToolCallEvent[];
  /** True while streaming is in progress */
  streaming?: boolean;
  /** Error message if turn failed */
  error?: string;
}

// ── Tool call summary chip ────────────────────────────────────────────────────

function ToolChip({ call }: { call: ToolCallEvent }) {
  const label = call.name.replace(/_/g, " ");
  const state =
    call.ok === true ? "ok" : call.ok === false ? "err" : "pending";
  return (
    <span className={`cp-tool-chip cp-tool-chip-${state}`} aria-label={`Tool: ${label}`}>
      <span className="cp-tool-icon">
        {state === "ok" ? "✓" : state === "err" ? "✕" : "…"}
      </span>
      <span className="cp-tool-name">{label}</span>
    </span>
  );
}

// ── Main message bubble ───────────────────────────────────────────────────────

interface CopilotMessageProps {
  msg: CopilotMsg;
}

export function CopilotMessage({ msg }: CopilotMessageProps) {
  const isUser = msg.role === "user";
  const hasTools = msg.toolCalls && msg.toolCalls.length > 0;

  return (
    <div className={`cp-msg cp-msg-${msg.role}`} data-role={msg.role}>
      {/* Tool calls (assistant only, shown before text) */}
      {!isUser && hasTools && (
        <div className="cp-msg-tools" aria-label="Tool calls">
          {msg.toolCalls!.map((call, i) => (
            <ToolChip key={`${call.name}-${i}`} call={call} />
          ))}
        </div>
      )}

      {/* Message bubble */}
      {(msg.text || msg.streaming || msg.error) && (
        <div className="cp-msg-bubble">
          {msg.error ? (
            <span className="cp-msg-error">{msg.error}</span>
          ) : (
            <>
              <span className="cp-msg-text">
                {msg.text}
                {msg.streaming && !msg.text && (
                  <span className="cp-msg-cursor" aria-hidden="true" />
                )}
              </span>
              {msg.streaming && msg.text && (
                <span className="cp-msg-cursor" aria-hidden="true" />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
