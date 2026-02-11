import { useState, useCallback, useRef, useEffect } from "react";
import { Message, ChatState } from "@/types/chat";
import { chatService } from "@/services/api";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60;
const POLL_INITIAL_DELAY_MS = 2000;

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const pollingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    return () => {
      for (const timer of pollingTimers.current.values()) {
        clearTimeout(timer);
      }
      pollingTimers.current.clear();
    };
  }, []);

  const startPolling = useCallback(
    (executionId: string, originalMessageId: string) => {
      let attempts = 0;

      const poll = async () => {
        attempts++;
        if (attempts > POLL_MAX_ATTEMPTS) {
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === originalMessageId
                ? { ...msg, executionStatus: "failed" as const }
                : msg,
            ),
          }));
          pollingTimers.current.delete(executionId);
          return;
        }

        try {
          const result = await chatService.pollCommandResult(executionId);

          if (result.status === "executing") {
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === originalMessageId
                  ? { ...msg, executionStatus: "executing" as const }
                  : msg,
              ),
            }));
            const timer = setTimeout(poll, POLL_INTERVAL_MS);
            pollingTimers.current.set(executionId, timer);
            return;
          }

          if (result.status === "completed" || result.status === "failed") {
            const isSuccess =
              result.status === "completed" && result.result?.success;

            let resultContent = "";
            if (result.result) {
              if (result.result.stdout) {
                resultContent = result.result.stdout;
              }
              if (result.result.stderr && !result.result.success) {
                resultContent +=
                  (resultContent ? "\n" : "") + result.result.stderr;
              }
            }

            if (resultContent.length > 2000) {
              resultContent =
                resultContent.substring(0, 2000) + "\n... (truncated)";
            }

            setState((prev) => {
              const updatedMessages = prev.messages.map((msg) =>
                msg.id === originalMessageId
                  ? {
                      ...msg,
                      executionStatus: isSuccess
                        ? ("completed" as const)
                        : ("failed" as const),
                    }
                  : msg,
              );

              if (resultContent) {
                const resultMessage: Message = {
                  id: `result_${executionId.substring(0, 8)}_${Date.now()}`,
                  content: resultContent,
                  role: "assistant",
                  timestamp: new Date(),
                  status: "sent",
                };
                updatedMessages.push(resultMessage);
              }

              return { ...prev, messages: updatedMessages };
            });

            pollingTimers.current.delete(executionId);
            return;
          }

          if (result.status === "not_found") {
            if (attempts < 5) {
              const timer = setTimeout(poll, POLL_INTERVAL_MS);
              pollingTimers.current.set(executionId, timer);
              return;
            }
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === originalMessageId
                  ? { ...msg, executionStatus: "failed" as const }
                  : msg,
              ),
            }));
            pollingTimers.current.delete(executionId);
            return;
          }
        } catch {
          if (attempts < POLL_MAX_ATTEMPTS) {
            const timer = setTimeout(poll, POLL_INTERVAL_MS * 2);
            pollingTimers.current.set(executionId, timer);
          } else {
            pollingTimers.current.delete(executionId);
          }
        }
      };

      const timer = setTimeout(poll, POLL_INITIAL_DELAY_MS);
      pollingTimers.current.set(executionId, timer);
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        content: content.trim(),
        role: "user",
        timestamp: new Date(),
        status: "sending",
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      try {
        const response = await chatService.sendMessage({
          content: userMessage.content,
        });
        const assistantMessage = response.message;

        setState((prev) => ({
          ...prev,
          messages: prev.messages
            .map((msg) =>
              msg.id === userMessage.id
                ? { ...msg, status: "sent" as const }
                : msg,
            )
            .concat(assistantMessage),
          isLoading: false,
        }));

        if (assistantMessage.hasCommands && assistantMessage.executionId) {
          startPolling(assistantMessage.executionId, assistantMessage.id);
        }
      } catch {
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, status: "error" as const }
              : msg,
          ),
          isLoading: false,
          error: "Failed to send message",
        }));
      }
    },
    [startPolling],
  );

  const clearMessages = useCallback(() => {
    for (const timer of pollingTimers.current.values()) {
      clearTimeout(timer);
    }
    pollingTimers.current.clear();
    setState({ messages: [], isLoading: false, error: null });
  }, []);

  return {
    ...state,
    sendMessage,
    clearMessages,
  };
}
