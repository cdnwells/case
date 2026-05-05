import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, ChatState, SendMessageRequest } from "@/types/chat";
import { chatService } from "@/services/api";
import { getSendMessageErrorMessage } from "@/services/api/chatErrors";

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

          if (result.status === "queued" || result.status === "executing") {
            const executionStatus: Message["executionStatus"] = result.status;
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((msg) =>
                msg.id === originalMessageId
                  ? { ...msg, executionStatus }
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
    async (
      content: string,
      options: Pick<SendMessageRequest, "attachments" | "conversationId"> = {},
    ) => {
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
          ...(options.conversationId
            ? { conversationId: options.conversationId }
            : {}),
          ...(options.attachments?.length
            ? { attachments: options.attachments }
            : {}),
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
      } catch (error) {
        const errorMessage = getSendMessageErrorMessage(error);
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, status: "error" as const, errorMessage }
              : msg,
          ),
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [startPolling],
  );

  const addLocalMessage = useCallback(
    (content: string, role: "user" | "assistant" = "assistant") => {
      const message: Message = {
        id: `local_${Date.now()}`,
        content,
        role,
        timestamp: new Date(),
        status: "sent",
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    },
    [],
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
    addLocalMessage,
    clearMessages,
  };
}
