const { withAndroidManifest } = require("@expo/config-plugins");

const PRODUCTION_APP_NAME = "케이스";
const PHONE_MAX_SHORTEST_SIDE_DP = 599;

const APP_VARIANTS = {
  development: {
    name: `${PRODUCTION_APP_NAME}.dev`,
    androidPackageSuffix: ".dev",
    iosBundleIdentifierSuffix: ".dev",
    schemeSuffix: "-dev",
  },
  preview: {
    name: `${PRODUCTION_APP_NAME} Preview`,
    androidPackageSuffix: ".preview",
    iosBundleIdentifierSuffix: ".preview",
    schemeSuffix: "-preview",
  },
  production: {
    name: PRODUCTION_APP_NAME,
    androidPackageSuffix: "",
    iosBundleIdentifierSuffix: "",
    schemeSuffix: "",
  },
};

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function resolveAppVariant() {
  const variant = process.env.APP_VARIANT || process.env.EAS_BUILD_PROFILE;

  if (!variant) {
    return "development";
  }

  if (Object.prototype.hasOwnProperty.call(APP_VARIANTS, variant)) {
    return variant;
  }

  throw new Error(
    `Unknown app variant "${variant}". Expected one of: ${Object.keys(APP_VARIANTS).join(", ")}`,
  );
}

function configureExpoDevClientPlugin(
  plugins,
  shouldIncludeDevClientPlugin,
) {
  return (plugins || []).reduce((configuredPlugins, plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    if (pluginName !== "expo-dev-client") {
      configuredPlugins.push(plugin);
      return configuredPlugins;
    }

    if (!shouldIncludeDevClientPlugin) {
      return configuredPlugins;
    }

    const hasPluginOptions =
      Array.isArray(plugin) &&
      typeof plugin[1] === "object" &&
      plugin[1] !== null;
    const pluginOptions = hasPluginOptions ? plugin[1] : {};

    configuredPlugins.push([
      "expo-dev-client",
      {
        ...pluginOptions,
        addGeneratedScheme: false,
      },
    ]);
    return configuredPlugins;
  }, []);
}

function createPhoneOnlyAndroidManifestPlugin(allowedScheme) {
  return function withPhoneOnlyAndroidManifest(config) {
    return withAndroidManifest(config, (pluginConfig) => {
      const manifest = pluginConfig.modResults.manifest;

      manifest["supports-screens"] = [
        {
          $: {
            "android:smallScreens": "true",
            "android:normalScreens": "true",
            "android:largeScreens": "false",
            "android:xlargeScreens": "false",
            "android:anyDensity": "true",
          },
        },
      ];

      const application = manifest.application?.[0];
      const activities = application?.activity || [];

      for (const activity of activities) {
        if (activity.$?.["android:name"] === ".MainActivity") {
          activity.$ = {
            ...activity.$,
            "android:resizeableActivity": "false",
          };

          activity["intent-filter"] = (activity["intent-filter"] || []).map(
            (intentFilter) => {
              const isViewIntent = (intentFilter.action || []).some(
                (action) =>
                  action.$?.["android:name"] === "android.intent.action.VIEW",
              );

              if (!isViewIntent || !intentFilter.data) {
                return intentFilter;
              }

              return {
                ...intentFilter,
                data: intentFilter.data.filter(
                  (data) => data.$?.["android:scheme"] === allowedScheme,
                ),
              };
            },
          );
        }
      }

      return pluginConfig;
    });
  };
}

module.exports = ({ config }) => {
  const appVariant = resolveAppVariant();
  const variantConfig = APP_VARIANTS[appVariant];
  const isDevelopmentVariant = appVariant === "development";
  const isProductionVariant = appVariant === "production";
  const scheme = `${config.scheme}${variantConfig.schemeSuffix}`;
  const caseHubBootstrapToken = normalizeOptionalString(
    process.env.CASE_HUB_BOOTSTRAP_TOKEN ||
      process.env.EXPO_PUBLIC_CASE_HUB_TOKEN ||
      process.env.CASE_HUB_TOKEN,
  );
  const appEnv =
    normalizeOptionalString(
      process.env.EXPO_PUBLIC_APP_ENV ||
        process.env.APP_ENV,
    ) || (isDevelopmentVariant ? "development" : "production");

  return {
    ...config,
    name: variantConfig.name,
    platforms: ["android"],
    orientation: "portrait",
    scheme,
    plugins: [
      ...configureExpoDevClientPlugin(
        config.plugins,
        !isProductionVariant,
      ),
      "expo-audio",
      createPhoneOnlyAndroidManifestPlugin(scheme),
    ],
    ios: {
      ...config.ios,
      supportsTablet: false,
      bundleIdentifier: `${config.ios.bundleIdentifier}${variantConfig.iosBundleIdentifierSuffix}`,
    },
    android: {
      ...config.android,
      package: `${config.android.package}${variantConfig.androidPackageSuffix}`,
    },
    extra: {
      ...config.extra,
      appVariant,
      appEnv,
      ...(caseHubBootstrapToken ? { caseHubBootstrapToken } : {}),
      devModeDebuggingEnabled: isDevelopmentVariant,
      smartphoneOnly: {
        platform: "android",
        maxShortestSideDp: PHONE_MAX_SHORTEST_SIDE_DP,
      },
    },
  };
};
