import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function expectIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(`${message}: expected source to include ${expected}`);
  }
}

function expectBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`${message}: expected ${first} before ${second}`);
  }
}

const hooksDirectory = dirname(fileURLToPath(import.meta.url));
const runtimeHookSource = readFileSync(
  resolve(hooksDirectory, "useApprovedVoiceProfileRuntime.ts"),
  "utf8",
);
const appSource = readFileSync(
  resolve(hooksDirectory, "../app/index.tsx"),
  "utf8",
);
const storageSource = readFileSync(
  resolve(hooksDirectory, "../services/voice/approvedVoiceProfileStorage.ts"),
  "utf8",
);

expectIncludes(
  runtimeHookSource,
  "loadApprovedEnrolledVoiceProfilesForRecognition(resolvedStorage)",
  "approved voice runtime loads enrolled profiles from durable storage",
);
expectIncludes(
  runtimeHookSource,
  "configureApprovedVoiceGateRuntime({ approvedVoices });",
  "approved voice runtime publishes loaded profiles to the voice gate runtime",
);
expectIncludes(
  runtimeHookSource,
  "configureApprovedVoiceGateRuntime({ approvedVoices: [] });",
  "approved voice runtime clears stale profiles after load failures",
);
expectIncludes(
  appSource,
  'import { useApprovedVoiceProfileRuntime } from "@/hooks/useApprovedVoiceProfileRuntime";',
  "app imports the approved voice runtime loader",
);
expectBefore(
  appSource,
  "useApprovedVoiceProfileRuntime({",
  "<ChatScreen",
  "app starts approved voice profile loading before rendering chat",
);
expectIncludes(
  appSource,
  "approvedVoiceProfileRuntimeStatus={approvedVoiceProfileRuntime.status}",
  "app passes approved voice runtime status into chat",
);
expectIncludes(
  appSource,
  "approvedVoiceCount={approvedVoiceProfileRuntime.approvedVoiceCount}",
  "app passes loaded approved voice count into chat",
);
expectIncludes(
  storageSource,
  "Paths.document",
  "approved voice profile storage persists under the Expo document directory",
);
expectIncludes(
  storageSource,
  "approved-voice-profiles",
  "approved voice profile storage keeps profiles in a dedicated directory",
);
expectIncludes(
  storageSource,
  "file.write(value);",
  "approved voice profile storage writes serialized profile stores",
);
