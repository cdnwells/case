import { useEffect, useMemo, useState } from "react";

import { createApprovedVoiceProfileFileStorage } from "@/services/voice/approvedVoiceProfileStorage";
import {
  loadApprovedEnrolledVoiceProfilesForRecognition,
  type ApprovedVoiceProfilePersistenceReadAdapter,
} from "@/services/voice/approvedVoiceProfiles";
import { configureApprovedVoiceGateRuntime } from "./useApprovedVoiceGate";

export type ApprovedVoiceProfileRuntimeStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

interface UseApprovedVoiceProfileRuntimeOptions {
  enabled?: boolean;
  storage?: ApprovedVoiceProfilePersistenceReadAdapter;
}

export interface ApprovedVoiceProfileRuntimeState {
  status: ApprovedVoiceProfileRuntimeStatus;
  approvedVoiceCount: number;
  error: Error | null;
}

const IDLE_RUNTIME_STATE: ApprovedVoiceProfileRuntimeState = {
  status: "idle",
  approvedVoiceCount: 0,
  error: null,
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useApprovedVoiceProfileRuntime({
  enabled = true,
  storage,
}: UseApprovedVoiceProfileRuntimeOptions = {}): ApprovedVoiceProfileRuntimeState {
  const defaultStorage = useMemo(
    () => createApprovedVoiceProfileFileStorage(),
    [],
  );
  const resolvedStorage = storage ?? defaultStorage;
  const [state, setState] =
    useState<ApprovedVoiceProfileRuntimeState>(IDLE_RUNTIME_STATE);

  useEffect(() => {
    if (!enabled) {
      setState(IDLE_RUNTIME_STATE);
      return undefined;
    }

    let cancelled = false;
    setState({
      status: "loading",
      approvedVoiceCount: 0,
      error: null,
    });

    loadApprovedEnrolledVoiceProfilesForRecognition(resolvedStorage)
      .then((approvedVoices) => {
        if (cancelled) return;

        configureApprovedVoiceGateRuntime({ approvedVoices });
        setState({
          status: "ready",
          approvedVoiceCount: approvedVoices.length,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const runtimeError = toError(error);
        configureApprovedVoiceGateRuntime({ approvedVoices: [] });
        console.error("Failed to load approved voice profiles", runtimeError);
        setState({
          status: "error",
          approvedVoiceCount: 0,
          error: runtimeError,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, resolvedStorage]);

  return state;
}
