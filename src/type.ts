import type { Store, StateTree } from "pinia";
import { useStorage } from "web-localstorage-plus";
export type {
  PiniaPlugin,
  StateTree,
  SubscriptionCallbackMutation,
  Pinia,
  StoreDefinition,
  StoreGeneric,
  PiniaPluginContext,
} from "pinia";
export type { Plugin } from "vite";
export type { Compiler as WebpackCompiler,RuleSetUseItem } from 'webpack'

export type This = Pick<
  ReturnType<typeof useStorage>,
  "getItem" | "setItem" | "removeItem"
>;

export interface Params {
  ctx: This;
  piniaCtx: Store;
  key: string;
  paths: string[];
  state: StateTree;
}

export interface AnyObj {
  [o: string]: any;
}

export interface PersistedStateOptions {
  paths?: Array<string>;
  key?: string;
}

declare module "pinia" {
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    persist?: boolean | PersistedStateOptions;
  }
  export interface PiniaCustomProperties {
    $hydrate: (payload: {
      state: StateTree;
      persist: boolean | PersistedStateOptions;
    }) => void;
    $discard: (id: string) => void;
  }
}
