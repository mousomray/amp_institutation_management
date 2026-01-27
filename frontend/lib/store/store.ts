import { configureStore } from '@reduxjs/toolkit'
import drawerReducer from "../store/features/drawerToggle"
import tokenReducer from "../store/features/storeToken"

export const makeStore = () => {
 

  const store = configureStore({
    reducer: {
      drawer: drawerReducer,
      token: tokenReducer
    },
  });

 

  return store;
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']