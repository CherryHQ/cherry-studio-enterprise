import { Workflow as IWorkflow, WorkflowTypeEnum } from '@cherrystudio/api-sdk'
import { RootState } from '@renderer/store'
import { Chatflow, Workflow } from '@renderer/types/flow'
import { useSelector } from 'react-redux'

export function useWorkflows() {
  const workflows: IWorkflow[] = useSelector((state: RootState) => state.flow.flows).filter(
    (flow) => flow.type === WorkflowTypeEnum.WORKFLOW
  )

  return { workflows: workflows as Workflow[] }
}

export function useChatflows() {
  const chatflows: IWorkflow[] = useSelector((state: RootState) => state.flow.flows).filter(
    (flow) => flow.type === WorkflowTypeEnum.CHATFLOW
  )

  return { chatflows: chatflows as Chatflow[] }
}
