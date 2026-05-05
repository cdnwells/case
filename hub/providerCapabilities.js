import { CHAT_PROVIDERS } from './providerMenu.js'

export const OPENAI_IMAGE_CAPABLE_MODEL_PATTERNS = Object.freeze([
  /^gpt-5(?:\.\d+)?(?:-(?:mini|nano|pro))?(?:-\d{4}-\d{2}-\d{2})?$/,
  /^gpt-4o(?:-mini)?(?:-\d{4}-\d{2}-\d{2})?$/,
  /^gpt-4\.1(?:-(?:mini|nano))?(?:-\d{4}-\d{2}-\d{2})?$/,
  /^gpt-4\.5-preview(?:-\d{4}-\d{2}-\d{2})?$/,
  /^o3(?:-\d{4}-\d{2}-\d{2})?$/,
])

export const IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE =
  'Image understanding requires a multimodal provider/model'

export const CHAT_PROVIDER_CAPABILITY_METADATA = Object.freeze({
  codex: Object.freeze({
    provider: 'codex',
    modelConfigKey: 'codexModel',
    modelEnvVar: 'CODEX_MODEL',
    imageUnderstandingTransport: 'codex-cli-image-file',
  }),
  claude: Object.freeze({
    provider: 'claude',
    modelConfigKey: null,
    modelEnvVar: null,
    imageUnderstandingTransport: null,
  }),
  gpt: Object.freeze({
    provider: 'gpt',
    modelConfigKey: 'openaiModel',
    modelEnvVar: 'OPENAI_MODEL',
    imageUnderstandingTransport: 'openai-chat-completions-image_url',
  }),
  ollama: Object.freeze({
    provider: 'ollama',
    modelConfigKey: 'ollamaModel',
    modelEnvVar: 'OLLAMA_MODEL',
    imageUnderstandingTransport: null,
  }),
})

function normalizeModelName(model) {
  return typeof model === 'string' ? model.trim() : ''
}

function selectedModelForProvider(config, provider) {
  if (provider === 'codex') {
    return normalizeModelName(config.codexModel)
  }

  if (provider === 'gpt') {
    return normalizeModelName(config.openaiModel)
  }

  if (provider === 'ollama') {
    return normalizeModelName(config.ollamaModel)
  }

  return ''
}

function unsupportedImageReasonForProvider(provider) {
  return `${IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE}; selected provider "${provider}" does not support image input in Case v1`
}

function unsupportedOpenAiImageModelReason(model) {
  return `${IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE}; selected provider "gpt" with OPENAI_MODEL "${model || '(unset)'}" does not support image input in Case v1`
}

export function supportsOpenAiImageUnderstandingModel(model) {
  const normalizedModel = normalizeModelName(model).toLowerCase()
  return OPENAI_IMAGE_CAPABLE_MODEL_PATTERNS.some(pattern => pattern.test(normalizedModel))
}

export function getProviderModelCapabilityMetadata(provider, model = '') {
  const metadata = CHAT_PROVIDER_CAPABILITY_METADATA[provider]
  const normalizedModel = normalizeModelName(model)

  if (!metadata) {
    return {
      provider,
      model: normalizedModel,
      modelConfigKey: null,
      modelEnvVar: null,
      supportsImageUnderstanding: false,
      imageUnderstandingTransport: null,
      imageUnderstandingUnsupportedReason: `${IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE}; unsupported chat provider "${provider}" does not support image input in Case v1`,
    }
  }

  const supportsImageUnderstanding =
    provider === 'codex' ||
    (provider === 'gpt' && supportsOpenAiImageUnderstandingModel(normalizedModel))

  return {
    provider,
    model: normalizedModel,
    modelConfigKey: metadata.modelConfigKey,
    modelEnvVar: metadata.modelEnvVar,
    supportsImageUnderstanding,
    imageUnderstandingTransport: supportsImageUnderstanding
      ? metadata.imageUnderstandingTransport
      : null,
    imageUnderstandingUnsupportedReason: supportsImageUnderstanding
      ? null
      : provider === 'gpt'
        ? unsupportedOpenAiImageModelReason(normalizedModel)
        : unsupportedImageReasonForProvider(provider),
  }
}

export function getSelectedChatProviderCapabilities(config, provider = config.chatProvider) {
  return getProviderModelCapabilityMetadata(
    provider,
    selectedModelForProvider(config, provider),
  )
}

export function listChatProviderCapabilityMetadata() {
  return CHAT_PROVIDERS.map(provider => ({
    ...CHAT_PROVIDER_CAPABILITY_METADATA[provider],
  }))
}
