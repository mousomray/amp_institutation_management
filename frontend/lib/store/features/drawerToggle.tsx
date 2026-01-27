import { createSlice, } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'


export interface ToggleTodo {
  data: boolean;
}

const initialState: ToggleTodo = {
  data: true,
};

export const drawerToggleSlice = createSlice({
  name: "drawer",
  initialState,
  reducers: {
    drawerToggleFu: (state, action: PayloadAction<ToggleTodo>) => {
      state.data = action.payload.data;
    },
  },
});

// Action creators are generated for each case reducer function
export const { drawerToggleFu } = drawerToggleSlice.actions;

export default drawerToggleSlice.reducer;