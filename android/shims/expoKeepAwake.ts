export type KeepAwakeEvent = {
  state: KeepAwakeEventState;
};

export enum KeepAwakeEventState {
  RELEASE = "release",
}

export type KeepAwakeListener = (event: KeepAwakeEvent) => void;

export type KeepAwakeOptions = {
  suppressDeactivateWarnings?: boolean;
  listener?: KeepAwakeListener;
};

export const ExpoKeepAwakeTag = "ExpoKeepAwakeDefaultTag";

export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export function useKeepAwake(): void {}

export function activateKeepAwake(
  tag: string = ExpoKeepAwakeTag,
): Promise<void> {
  return activateKeepAwakeAsync(tag);
}

export async function activateKeepAwakeAsync(
  _tag: string = ExpoKeepAwakeTag,
): Promise<void> {}

export async function deactivateKeepAwake(
  _tag: string = ExpoKeepAwakeTag,
): Promise<void> {}

export function addListener(
  tagOrListener: string | KeepAwakeListener,
  listener?: KeepAwakeListener,
): { remove: () => void } {
  const keepAwakeListener =
    typeof tagOrListener === "function" ? tagOrListener : listener;

  keepAwakeListener?.({ state: KeepAwakeEventState.RELEASE });

  return {
    remove() {},
  };
}
