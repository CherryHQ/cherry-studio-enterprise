import { IUploadFileResponse, IUserInputForm } from '@dify-chat/api'
import FlowEngineProvider from '@renderer/providers/FlowProvider'
import { Assistant } from '@renderer/types'
import { Chunk } from '@renderer/types/chunk'
import { Flow, FlowEngine } from '@renderer/types/flow'
import { Message } from '@renderer/types/newMessage'

import { getAssistantFlowProvider } from './AssistantService'

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
  const provider = getAssistantFlowProvider(assistant.chatflow)
  const flowEngineProvider = new FlowEngineProvider(provider)

  await flowEngineProvider.chatflowCompletion(assistant.chatflow, message, conversationId, inputs, onChunkReceived)
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
  const provider = getAssistantFlowProvider(assistant.workflow)
  const flowEngineProvider = new FlowEngineProvider(provider)

  await flowEngineProvider.workflowCompletion(message, assistant.workflow, inputs, onChunkReceived)
}

export async function check(provider: FlowEngine, workflow: Flow) {
  const flowEngineProvider = new FlowEngineProvider(provider)
  return await flowEngineProvider.check(workflow)
}

export async function getAppParameters(provider: FlowEngine, workflow: Flow): Promise<IUserInputForm[]> {
  const flowEngineProvider = new FlowEngineProvider(provider)
  return await flowEngineProvider.getAppParameters(workflow)
}

export async function uploadFile(
  provider: FlowEngine,
  workflow: Flow,
  file: File,
  userId: string
): Promise<IUploadFileResponse> {
  const flowEngineProvider = new FlowEngineProvider(provider)
  return await flowEngineProvider.uploadFile(workflow, file, userId)
}

// export const workflowCompletion =
//   (topicId: string, provider: FlowEngine, workflow: Flow, inputs: Record<string, string>, assistant: Assistant) =>
//   async (dispatch: AppDispatch, getState: () => RootState) => {
//     let accumulatedContent = ''
//     let lastBlockId: string | null = null
//     let lastBlockType: MessageBlockType | null = null
//     const workflowNodeIdToBlockIdMap = new Map<string, string>()
//     const assistantMessage = createAssistantMessage(assistant.id, topicId)
//     await saveMessageAndBlocksToDB(assistantMessage, [])
//     dispatch(newMessagesActions.addMessage({ topicId, message: assistantMessage }))
//     const handleBlockTransition = (newBlock: MessageBlock, newBlockType: MessageBlockType) => {
//       lastBlockId = newBlock.id
//       lastBlockType = newBlockType
//       if (newBlockType !== MessageBlockType.MAIN_TEXT) {
//         accumulatedContent = ''
//       }
//       console.log(`[Transition] Adding/Updating new ${newBlockType} block ${newBlock.id}.`)
//       dispatch(
//         newMessagesActions.updateMessage({
//           topicId,
//           messageId: assistantMessage.id,
//           updates: { blockInstruction: { id: newBlock.id } }
//         })
//       )
//       dispatch(upsertOneBlock(newBlock))
//       dispatch(
//         newMessagesActions.upsertBlockReference({
//           messageId: assistantMessage.id,
//           blockId: newBlock.id,
//           status: newBlock.status
//         })
//       )

//       const currentState = getState()
//       const updatedMessage = currentState.messages.entities[assistantMessage.id]
//       if (updatedMessage) {
//         saveUpdatesToDB(
//           assistantMessage.id,
//           topicId,
//           { blocks: updatedMessage.blocks, status: updatedMessage.status },
//           [newBlock]
//         )
//       } else {
//         console.error(
//           `[handleBlockTransition] Failed to get updated message ${assistantMessage.id} from state for DB save.`
//         )
//       }
//     }

//     const callbacks: StreamProcessorCallbacks = {
//       onTextChunk: (text) => {
//         accumulatedContent += text
//         if (lastBlockId) {
//           if (lastBlockType === MessageBlockType.MAIN_TEXT) {
//             const blockChanges: Partial<MessageBlock> = {
//               content: accumulatedContent,
//               status: MessageBlockStatus.STREAMING
//             }
//             throttledBlockUpdate(lastBlockId, blockChanges)
//           } else {
//             const newBlock = createMainTextBlock(assistantMessage.id, accumulatedContent, {
//               status: MessageBlockStatus.STREAMING
//             })
//             handleBlockTransition(newBlock, MessageBlockType.MAIN_TEXT)
//           }
//         }
//       },
//       onTextComplete: (finalText) => {
//         if (lastBlockType === MessageBlockType.MAIN_TEXT && lastBlockId) {
//           const changes = {
//             content: finalText,
//             status: MessageBlockStatus.SUCCESS
//           }
//           dispatch(updateOneBlock({ id: lastBlockId, changes }))
//           saveUpdatedBlockToDB(lastBlockId, assistantMessage.id, topicId, getState)
//           console.log(`[onTextComplete] Final text for block ${lastBlockId}:`, finalText)
//         } else {
//           console.warn(
//             `[onTextComplete] Received text.complete but last block was not MAIN_TEXT (was ${lastBlockType}) or lastBlockId is null.`
//           )
//         }
//       },
//       onWorkflowNodeInProgress: (chunk) => {
//         if (chunk.type === ChunkType.WORKFLOW_NODE_STARTED) {
//           const overrides = {
//             status: MessageBlockStatus.PROCESSING,
//             metadata: {
//               id: chunk.metadata.id,
//               title: chunk.metadata.title ?? '',
//               type: chunk.metadata.type ?? ''
//             }
//           }

//           const flowBlock = createFlowBlock(assistantMessage.id, chunk.type, workflow, overrides)

//           handleBlockTransition(flowBlock, MessageBlockType.FLOW)
//           workflowNodeIdToBlockIdMap.set(chunk.metadata.id, flowBlock.id)

//           console.log(`[onWorkflowChunk] Workflow started block ${flowBlock.id} added.`)
//         }
//       },
//       onWorkflowNodeComplete: (chunk) => {
//         if (chunk.type === ChunkType.WORKFLOW_NODE_FINISHED) {
//           const existingBlockId = workflowNodeIdToBlockIdMap.get(chunk.metadata.id)
//           if (!existingBlockId) {
//             console.error(`[onWorkflowChunk] No block found for workflow node ID ${chunk.metadata.id}.`)
//             return
//           }
//           const changes: Partial<FlowMessageBlock> = {
//             status: MessageBlockStatus.SUCCESS,
//             metadata: { id: chunk.metadata.id, title: chunk.metadata.title ?? '', type: chunk.metadata.type ?? '' }
//           }
//           dispatch(updateOneBlock({ id: existingBlockId, changes }))
//           saveUpdatedBlockToDB(existingBlockId, assistantMessage.id, topicId, getState)
//         }
//       }
//     }

//     try {
//       const streamProcessorCallbacks = createStreamProcessor(callbacks)
//       const flowEngineProvider = new FlowEngineProvider(provider)
//       return await flowEngineProvider.workflowCompletion(message, workflow, inputs, streamProcessorCallbacks)
//     } catch (error) {
//       console.error(`[runWorkflowThunk] Error running workflow:`, error)
//       throw error
//     } finally {
//       console.log(`[runWorkflowThunk] Workflow execution completed for message ${assistantMessage.id}`)
//       handleChangeLoadingOfTopic(topicId)
//     }
//   }
