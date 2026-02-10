import { SendMessageRequest, SendMessageResponse, CommandResultResponse } from "@/types/chat";
import { Platform } from "react-native";

export interface IChatService {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
  pollCommandResult(executionId: string): Promise<CommandResultResponse>;
}

export const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.0.21:5000"
    : "http://localhost:5000";
