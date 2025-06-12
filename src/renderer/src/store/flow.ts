import { Workflow } from '@cherrystudio/api-sdk'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * 定义 Workflow 功能的整体状态
 */
export interface WorkflowState {
  flows: Workflow[]
}

const initialState: WorkflowState = {
  flows: []
}

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    setFlows: (state, action: PayloadAction<Workflow[]>) => {
      state.flows = action.payload
    },
    addFlow: (state, action: PayloadAction<Workflow>) => {
      state.flows.push(action.payload)
    },
    removeFlow: (state, action: PayloadAction<Workflow>) => {
      state.flows = state.flows.filter((flow) => flow.id !== action.payload.id)
    },
    updateFlow: (state, action: PayloadAction<Workflow>) => {
      const index = state.flows.findIndex((flow) => flow.id === action.payload.id)
      if (index !== -1) {
        state.flows[index] = action.payload
      }
    }
  }
})

export const { setFlows, updateFlow, addFlow, removeFlow } = flowSlice.actions

export default flowSlice.reducer
