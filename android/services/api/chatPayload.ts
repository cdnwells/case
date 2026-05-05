import { createNetworkSafeJsonBody } from "../../constants/audioBuffer";
import type { SendMessageRequest } from "../../types/chat";

export function createChatMessagePayload(request: SendMessageRequest): string {
  return createNetworkSafeJsonBody(request);
}
