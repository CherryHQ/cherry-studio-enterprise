import api, { updateApiBasePath, updateApiToken } from '@renderer/config/api'
import store from '@renderer/store'
import { updateAssistant } from '@renderer/store/assistants'
import { setDefaultModel, setTopicNamingModel, setTranslateModel, updateProvider } from '@renderer/store/llm'
import { setMCPServers } from '@renderer/store/mcp'
import { MCPServer, Model, Provider } from '@renderer/types'
import { getDefaultGroupName } from '@renderer/utils'
import { isEmpty, isEqual } from 'lodash'

export async function syncConfig({ syncMcpServers = false }: { syncMcpServers?: boolean } = {}) {
  const { accessToken, serverUrl } = store.getState().auth

  if (!accessToken || !serverUrl) {
    return
  }

  accessToken && updateApiToken(accessToken)
  serverUrl && updateApiBasePath(serverUrl)

  const dispatch = store.dispatch
  const provider = store.getState().llm.providers.find((p) => p.id === 'cherry-enterprise') as Provider
  const assistants = store.getState().assistants.assistants
  const { defaultModel, topicNamingModel, translateModel } = store.getState().llm

  const { data: configurations } = await api.configurationGetConfigurations()
  const {
    models: serverModels,
    defaultAssistantModel: serverDefaultAssistantModel,
    defaultTopicNamingModel: serverDefaultTopicNamingModel,
    defaultTranslationModel: serverDefaultTranslationModel,
    mcpServers
  } = configurations

  if (!configurations.apiKey) {
    throw new Error('请联系管理员配置 API 密钥')
  }

  if (isEmpty(serverModels)) {
    throw new Error('服务端未配置模型')
  }

  const _serverModels = serverModels.map(
    (model) =>
      ({
        id: model.id,
        provider: provider.id,
        name: model.name,
        group: getDefaultGroupName(model.id || model.name),
        owned_by: model.owned_by
      }) as Model
  )

  if (!isEqual(provider.models, _serverModels)) {
    dispatch(updateProvider({ ...provider, models: _serverModels }))
  }

  const serverDefaultModel = serverModels[0]
  const defaultAssistantModel = serverDefaultAssistantModel || serverDefaultModel
  const defaultTopicNamingModel = serverDefaultTopicNamingModel || serverDefaultModel
  const defaultTranslationModel = serverDefaultTranslationModel || serverDefaultModel

  if (!isEqual(defaultModel, defaultAssistantModel)) {
    dispatch(setDefaultModel({ model: { ...defaultAssistantModel, provider: provider.id } as Model }))
  }

  if (!isEqual(topicNamingModel, defaultTopicNamingModel)) {
    dispatch(setTopicNamingModel({ model: { ...defaultTopicNamingModel, provider: provider.id } as Model }))
  }

  if (!isEqual(translateModel, defaultTranslationModel)) {
    dispatch(setTranslateModel({ model: { ...defaultTranslationModel, provider: provider.id } as Model }))
  }

  for (const assistant of assistants) {
    const assistantModel = assistant.model
    if (assistantModel && !serverModels.find((m) => m.id === assistantModel.id)) {
      dispatch(updateAssistant({ ...assistant, model: undefined }))
    }
  }

  if (syncMcpServers) {
    if (!isEmpty(mcpServers)) {
      dispatch(setMCPServers(mcpServers as MCPServer[]))
    }
  }
}

export async function syncMcpServers() {
  const dispatch = store.dispatch

  const { data: configurations } = await api.configurationGetConfigurations()
  const { mcpServers } = configurations

  if (!isEmpty(mcpServers)) {
    dispatch(setMCPServers(mcpServers as MCPServer[]))
  }
}
