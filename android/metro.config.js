const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;
const shouldUseSafeKeepAwakeShim =
  process.env.NODE_ENV !== "production" &&
  process.env.CASE_USE_NATIVE_KEEP_AWAKE !== "1";
const safeKeepAwakeShimPath = path.resolve(
  __dirname,
  "shims/expoKeepAwake.ts",
);

if (shouldUseSafeKeepAwakeShim) {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "expo-keep-awake") {
      return {
        type: "sourceFile",
        filePath: safeKeepAwakeShimPath,
      };
    }

    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
