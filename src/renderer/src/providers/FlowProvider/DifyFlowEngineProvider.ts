import { createDifyApiInstance, DifyApi, IFile, IUploadFileResponse, IUserInputForm } from '@dify-chat/api'
import { getFileTypeByName } from '@renderer/components/Dify/FileUpload'
import { Chunk, ChunkType } from '@renderer/types/chunk'
import { EventEnum, Flow, FlowEngine } from '@renderer/types/flow'
import { FileMessageBlock, ImageMessageBlock, Message } from '@renderer/types/newMessage'
import { addAbortController, removeAbortController } from '@renderer/utils/abortController'
import { findFileBlocks, findImageBlocks, getMainTextContent } from '@renderer/utils/messageUtils/find'
import XStream from '@renderer/utils/xstream'
import { v4 as uuidv4 } from 'uuid'

import BaseFlowEngineProvider from './BaseFlowEngineProvider'

export default class DifyFlowEngineProvider extends BaseFlowEngineProvider {
  constructor(provider: FlowEngine) {
    super(provider)
  }

  private async getFiles(flow: Flow, message: Message): Promise<IFile[]> {
    const fileBlocks = findFileBlocks(message)
    const imageBlocks = findImageBlocks(message)

    const files: IFile[] = []
    if (fileBlocks.length === 0 && imageBlocks.length === 0) {
      return []
    }
    const processBlock = async (block: ImageMessageBlock | FileMessageBlock) => {
      if (!block.file) return
      const fileData = await window.api.file.readAsFile(block.file.path, block.file.origin_name)
      const file = new File([fileData.buffer], fileData.name, { type: fileData.type })
      const response = await this.uploadFile(flow, file, message.topicId)

      files.push({
        type: getFileTypeByName(response.name),
        transfer_method: 'local_file',
        upload_file_id: response.id
      })
    }

    for (const fileBlock of fileBlocks) {
      await processBlock(fileBlock)
    }

    for (const imageBlock of imageBlocks) {
      await processBlock(imageBlock)
    }
    return files
  }

  public async chatflowCompletion(
    flow: Flow,
    message: Message,
    conversationId: string,
    inputs: Record<string, string>,
    onChunk: (chunk: Chunk) => void
  ): Promise<void> {
    const query = getMainTextContent(message)
    const files = await this.getFiles(flow, message)
    try {
      // chatflow使用topicId
      const difyApi = createDifyApiInstance({
        user: message.topicId,
        apiKey: flow.apiKey,
        apiBase: flow.apiHost
      })

      const response = await difyApi.sendMessage({
        inputs: inputs,
        files: files,
        // 如果客户端清空消息并不会清空工作流的上下文
        // 理论上每次新的消息都应该是新的上下文，但topicId并不会因为清空上下文而改变，需要新建话题才行
        user: message.topicId,
        response_mode: 'streaming',
        query: query,
        conversation_id: conversationId
      })
      await this.processStream(difyApi, response, inputs, message.id, onChunk)
    } catch (error) {
      console.error('DifyFlowEngineProvider completion error', error)
    }
  }

  public async check(flow: Flow): Promise<{ valid: boolean; error: Error | null }> {
    try {
      const difyApi = createDifyApiInstance({
        user: uuidv4(),
        apiKey: flow.apiKey,
        apiBase: flow.apiHost
      })

      const response = await difyApi.getAppInfo()

      return { valid: response.name !== undefined, error: null }
    } catch (error) {
      console.error('检查工作流失败', error)
      return { valid: false, error: new Error('检查工作流失败') }
    }
  }

  public async getAppParameters(flow: Flow): Promise<IUserInputForm[]> {
    try {
      const difyApi = createDifyApiInstance({
        user: uuidv4(),
        apiKey: flow.apiKey,
        apiBase: flow.apiHost
      })

      const parameters = await difyApi.getAppParameters()

      return parameters.user_input_form
    } catch (error) {
      console.error('获取工作流参数失败', error)
      throw new Error('获取工作流参数失败')
    }
  }

  public async uploadFile(flow: Flow, file: File, userId: string): Promise<IUploadFileResponse> {
    try {
      const difyApi = createDifyApiInstance({
        user: userId,
        apiKey: flow.apiKey,
        apiBase: flow.apiHost
      })

      const response = await difyApi.uploadFile(file)

      return response
    } catch (error) {
      console.error('上传文件失败', error)
      throw new Error('上传文件失败')
    }
  }

  public async workflowCompletion(
    message: Message,
    flow: Flow,
    inputs: Record<string, string>,
    onChunk: (chunk: Chunk) => void
  ): Promise<void> {
    try {
      // workflow使用message.id
      const difyApi = createDifyApiInstance({
        user: message.id,
        apiKey: flow.apiKey,
        apiBase: flow.apiHost
      })

      const body = {
        response_mode: 'streaming',
        user: message.id,
        inputs: inputs
      }

      const response = await difyApi.baseRequest.baseRequest('/workflows/run', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await this.processStream(difyApi, response, inputs, message.id, onChunk)

      return
    } catch (error) {
      console.error('运行工作流失败', error)
      throw new Error('运行工作流失败')
    }
  }

  private async processStream(
    difyApi: DifyApi,
    response: Response,
    inputs: Record<string, string>,
    messageId: string,
    onChunk: (chunk: Chunk) => void
  ): Promise<void> {
    const readableStream = XStream({
      readableStream: response.body as NonNullable<ReadableStream>
    })
    const reader = readableStream.getReader()
    let text = ''
    let abortRegistered = false
    while (reader) {
      const { value: chunk, done } = await reader.read()
      if (done) {
        console.log('流已结束')
        onChunk({ type: ChunkType.WORKFLOW_FINISHED, inputs: inputs })
        if (abortRegistered && messageId) {
          removeAbortController(messageId, () => {})
        }
        break
      }
      if (!chunk) {
        console.log('chunk 为空')
        continue
      }
      if (chunk.data) {
        try {
          const parsedData = JSON.parse(chunk.data)
          const event = parsedData.event
          switch (event) {
            case EventEnum.WORKFLOW_STARTED: {
              if (parsedData.task_id && !abortRegistered && messageId) {
                const abortFn = async () => {
                  try {
                    await difyApi.stopTask(parsedData.task_id)
                  } catch (e) {
                    throw new Error('Stop task failed')
                  }
                }
                addAbortController(messageId, abortFn)
                abortRegistered = true
              }
              onChunk({
                type: ChunkType.WORKFLOW_STARTED,
                conversationId: parsedData.conversation_id,
                taskId: parsedData.task_id
              })
              break
            }
            case EventEnum.WORKFLOW_NODE_STARTED:
              onChunk({
                type: ChunkType.WORKFLOW_NODE_STARTED,
                metadata: { id: parsedData.data.id, title: parsedData.data.title, type: parsedData.data.node_type }
              })
              break
            case EventEnum.WORKFLOW_TEXT_CHUNK: {
              const textChunk = parsedData.data.text
              text += textChunk
              onChunk({ type: ChunkType.TEXT_DELTA, text: textChunk })
              break
            }
            case EventEnum.MESSAGE: {
              const textChunk = parsedData.answer
              text += textChunk
              onChunk({ type: ChunkType.TEXT_DELTA, text: textChunk })
              break
            }
            case EventEnum.WORKFLOW_NODE_FINISHED:
              onChunk({
                type: ChunkType.WORKFLOW_NODE_FINISHED,
                metadata: { id: parsedData.data.id, title: parsedData.data.title, type: parsedData.data.node_type }
              })
              break
            case EventEnum.WORKFLOW_FINISHED:
              onChunk({
                type: ChunkType.WORKFLOW_FINISHED,
                inputs: inputs
              })
              console.log('工作流完成')
              break
          }
        } catch (e) {
          console.error('处理流数据失败', e)
        }
      } else {
        console.log('chunk 没有 data 属性')
        continue
      }
    }
    onChunk({ type: ChunkType.TEXT_COMPLETE, text: text })
  }
}
