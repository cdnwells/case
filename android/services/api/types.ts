import { SendMessageRequest, SendMessageResponse, CommandResultResponse } from "@/types/chat";

export interface IChatService {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
  pollCommandResult(executionId: string): Promise<CommandResultResponse>;
}

export const API_BASE_URL = "https://cdnwell.store";
