import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CHAT_PROVIDER_CAPABILITY_METADATA,
  getProviderModelCapabilityMetadata,
  getSelectedChatProviderCapabilities,
  IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE,
  listChatProviderCapabilityMetadata,
  supportsOpenAiImageUnderstandingModel,
} from './providerCapabilities.js'
import { CHAT_PROVIDERS } from './providerMenu.js'

test('provider capability metadata covers every selectable chat provider', () => {
  assert.deepEqual(
    Object.keys(CHAT_PROVIDER_CAPABILITY_METADATA).sort(),
    [...CHAT_PROVIDERS].sort(),
  )

  assert.deepEqual(
    listChatProviderCapabilityMetadata().map(metadata => metadata.provider),
    CHAT_PROVIDERS,
  )
})

test('selected GPT model metadata identifies image-understanding combinations', () => {
  for (const model of [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-5',
    'gpt-5.2',
    'gpt-5.2-pro',
    'gpt-5.4-mini',
    'gpt-5.5',
    'o3',
  ]) {
    const capabilities = getSelectedChatProviderCapabilities({
      chatProvider: 'gpt',
      openaiModel: model,
    })

    assert.equal(capabilities.provider, 'gpt')
    assert.equal(capabilities.model, model)
    assert.equal(capabilities.modelConfigKey, 'openaiModel')
    assert.equal(capabilities.modelEnvVar, 'OPENAI_MODEL')
    assert.equal(capabilities.supportsImageUnderstanding, true)
    assert.equal(capabilities.imageUnderstandingTransport, 'openai-chat-completions-image_url')
    assert.equal(capabilities.imageUnderstandingUnsupportedReason, null)
    assert.equal(supportsOpenAiImageUnderstandingModel(model), true)
  }
})

test('selected Codex provider metadata identifies CLI image-file support', () => {
  for (const model of ['', 'gpt-5.2']) {
    const capabilities = getSelectedChatProviderCapabilities({
      chatProvider: 'codex',
      codexModel: model,
    })

    assert.equal(capabilities.provider, 'codex')
    assert.equal(capabilities.model, model)
    assert.equal(capabilities.modelConfigKey, 'codexModel')
    assert.equal(capabilities.modelEnvVar, 'CODEX_MODEL')
    assert.equal(capabilities.supportsImageUnderstanding, true)
    assert.equal(capabilities.imageUnderstandingTransport, 'codex-cli-image-file')
    assert.equal(capabilities.imageUnderstandingUnsupportedReason, null)
  }
})

test('selected GPT model metadata rejects text-only OpenAI model combinations', () => {
  for (const model of ['gpt-4', 'gpt-3.5-turbo', '', 'text-davinci-003']) {
    const capabilities = getSelectedChatProviderCapabilities({
      chatProvider: 'gpt',
      openaiModel: model,
    })

    assert.equal(capabilities.provider, 'gpt')
    assert.equal(capabilities.model, model)
    assert.equal(capabilities.supportsImageUnderstanding, false)
    assert.equal(capabilities.imageUnderstandingTransport, null)
    assert.equal(
      capabilities.imageUnderstandingUnsupportedReason.startsWith(`${IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE};`),
      true,
    )
    assert.match(capabilities.imageUnderstandingUnsupportedReason, /selected provider "gpt"/)
    assert.match(capabilities.imageUnderstandingUnsupportedReason, /OPENAI_MODEL/)
    assert.match(capabilities.imageUnderstandingUnsupportedReason, /does not support image input in Case v1/)
  }
})

test('selected non-image provider model metadata is image-unsupported for Case v1', () => {
  const cases = [
    {
      provider: 'claude',
      config: {
        chatProvider: 'claude',
      },
      expectedModel: '',
      expectedConfigKey: null,
      expectedEnvVar: null,
    },
    {
      provider: 'ollama',
      config: {
        chatProvider: 'ollama',
        ollamaModel: 'llava:latest',
      },
      expectedModel: 'llava:latest',
      expectedConfigKey: 'ollamaModel',
      expectedEnvVar: 'OLLAMA_MODEL',
    },
  ]

  for (const testCase of cases) {
    const capabilities = getSelectedChatProviderCapabilities(testCase.config)

    assert.equal(capabilities.provider, testCase.provider)
    assert.equal(capabilities.model, testCase.expectedModel)
    assert.equal(capabilities.modelConfigKey, testCase.expectedConfigKey)
    assert.equal(capabilities.modelEnvVar, testCase.expectedEnvVar)
    assert.equal(capabilities.supportsImageUnderstanding, false)
    assert.equal(capabilities.imageUnderstandingTransport, null)
    assert.equal(
      capabilities.imageUnderstandingUnsupportedReason.startsWith(`${IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE};`),
      true,
    )
    assert.match(capabilities.imageUnderstandingUnsupportedReason, new RegExp(`selected provider "${testCase.provider}"`))
    assert.match(capabilities.imageUnderstandingUnsupportedReason, /does not support image input in Case v1/)
  }
})

test('direct provider-model capability lookup reports unsupported provider combinations', () => {
  assert.deepEqual(getProviderModelCapabilityMetadata('unknown', 'vision-model'), {
    provider: 'unknown',
    model: 'vision-model',
    modelConfigKey: null,
    modelEnvVar: null,
    supportsImageUnderstanding: false,
    imageUnderstandingTransport: null,
    imageUnderstandingUnsupportedReason: `${IMAGE_UNDERSTANDING_REQUIRES_MULTIMODAL_PROVIDER_MODEL_MESSAGE}; unsupported chat provider "unknown" does not support image input in Case v1`,
  })
})
