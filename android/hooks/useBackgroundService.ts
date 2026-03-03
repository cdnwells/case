import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import BackgroundService from "react-native-background-actions";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const backgroundTask = async (taskData?: { delay?: number }) => {
  const delay = taskData?.delay ?? 10000;
  while (BackgroundService.isRunning()) {
    await sleep(delay);
  }
};

const options = {
  taskName: "CASE",
  taskTitle: "CASE 어시스턴트",
  taskDesc: "음성 명령을 대기 중입니다.",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#000000",
  parameters: {
    delay: 10000,
  },
};

export function useBackgroundService() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android" || startedRef.current) return;
    startedRef.current = true;

    const start = async () => {
      try {
        if (!BackgroundService.isRunning()) {
          await BackgroundService.start(backgroundTask, options);
        }
      } catch {
        // retry once after a short delay
        setTimeout(async () => {
          try {
            if (!BackgroundService.isRunning()) {
              await BackgroundService.start(backgroundTask, options);
            }
          } catch {
            // ignore
          }
        }, 3000);
      }
    };

    start();

    return () => {
      BackgroundService.stop();
      startedRef.current = false;
    };
  }, []);
}
