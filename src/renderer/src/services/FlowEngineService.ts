import { IUploadFileResponse } from '@dify-chat/api'
import DifyProvider from '@renderer/providers/FlowProvider/DifyFlowEngineProvider'
import { Assistant } from '@renderer/types'
import { Chunk } from '@renderer/types/chunk'
import { Flow } from '@renderer/types/flow'
import { Message } from '@renderer/types/newMessage'

export async function fetchChatflowCompletion({
  assistant,
  message,
  conversationId,
  inputs,
  onChunkReceived
}: {
  assistant: Assistant
  message: Message
  conversationId: string
  inputs: Record<string, string>
  onChunkReceived: (chunk: Chunk) => void
}) {
  if (!assistant.chatflow) {
    return
  }
  const difyProvider = new DifyProvider()

  await difyProvider.chatflowCompletion(assistant.chatflow, message, conversationId, inputs, onChunkReceived)
}

export async function fetchWorkflowCompletion({
  message,
  assistant,
  inputs,
  onChunkReceived
}: {
  message: Message
  assistant: Assistant
  inputs: Record<string, string>
  onChunkReceived: (chunk: Chunk) => void
}) {
  if (!assistant.workflow) {
    return
  }
  const difyProvider = new DifyProvider()

  await difyProvider.workflowCompletion(message, assistant.workflow, inputs, onChunkReceived)
}

// export async function check(provider: FlowEngine, workflow: Flow) {
//   const flowEngineProvider = new FlowEngineProvider(provider)
//   return await flowEngineProvider.check(workflow)
// }

// export async function getAppParameters(provider: FlowEngine, workflow: Flow): Promise<IUserInputForm[]> {
//   const flowEngineProvider = new FlowEngineProvider(provider)
//   return await flowEngineProvider.getAppParameters(workflow)
// }

export async function uploadFile(workflow: Flow, file: File, userId: string): Promise<IUploadFileResponse> {
  const difyProvider = new DifyProvider()

  return await difyProvider.uploadFile(workflow, file, userId)
}
