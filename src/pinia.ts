import type {
  PersistedStateOptions,
  AnyObj,
  This,
  Params,
  PiniaPlugin,
  PiniaPluginContext,
  StateTree,
  SubscriptionCallbackMutation,
  Pinia,
  StoreDefinition,
  StoreGeneric,
} from "./type";
export type { PiniaPlugin, Pinia } from "pinia";

import * as _ from "lodash";

const {
  pick,
  isPlainObject,
  union,
  set,
  cloneDeep,
  isArray,
  concat,
  get,
  uniq
} = _;

const spaceToStoreId = new Map<string, string>([]);
const NAMESPACE = "pinia";

const helpers = {
  createObjByPaths(originPaths: string[], state: AnyObj) {
    let result: AnyObj = {};
    const missing: string[] = [];
    const paths = originPaths.slice();
    for (let i = 0; i < paths.length; i++) {
      const act = paths[i];
      const picked = Object.keys(pick(state, act))

      if (picked.length) {
        const groups = paths.filter((v) => v.startsWith(act));
        if (groups.length === 1) {
          set(result, act, state[act]);
          continue;
        }
        
        groups.forEach((g) => {
          const index = paths.findIndex((p) => p === g);
          if (index > -1) {
            paths.splice(index, 1);
          }
        });
        i--
        const [key] = act.split(".");
        const t = {
          [key]: {},
        };
        groups.shift();
        groups.reverse();
        for (let j = 0; j < groups.length; j++) {
          const v = groups[j];
          const val = get(state, v.split("."));
          set(t, v, val);
        }

        result[key] = t[key];

        continue;
      }
      missing.push(act);
    }
    missing.length &&
      console.warn(
        `[@web-localstorage-plus/pinia]:找不到paths中的配置项：${missing.join(
          "、"
        )}`
      );
    return result;
  },
  createPathsByObj(obj: AnyObj, parentKey = ""): string[] {
    let keys: string[] = [];
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        let newKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          keys.push(...helpers.createPathsByObj(obj[key], newKey));
        } else {
          keys.push(newKey);
        }
      }
    }
    return keys;
  },
  isSameType(a: any, b: any) {
    return (
      Object.prototype.toString.call(a) === Object.prototype.toString.call(b)
    );
  },
  isStringArray(arr:any[]){
    return !arr.find(v=>typeof v !== 'string')
  },
  merge(tar:AnyObj,act:AnyObj){
    for(let key in tar){
      if(act[key]){
        if(this.isSameType(act[key],tar[key])){
          if(isPlainObject(act[key]) && isPlainObject(tar[key])){
            this.merge(tar[key],act[key])
            continue
          }
          if(isArray(tar[key]) && isArray(act[key])){
            let newArr = concat(tar[key],act[key])
            if(this.isStringArray(newArr)){
              newArr = uniq(newArr)
            }
            tar[key] = newArr
            continue
          }
          tar[key] = act[key]
        }
      }
    }
  },
  normalizePaths(paths: string[]) {
    return union(
      paths
        .filter((v) => v)
        .map((v) => String(v))
        .sort((a, b) => a.split(".").length - b.split(".").length)
    );
  },
  deleteKey(id: string, ctx: This) {
    if (ctx.getItem(id, NAMESPACE)) {
      ctx.removeItem(id, NAMESPACE);
    }
  },
  updateKey(ctx: This) {
    const space = ctx.getItem(NAMESPACE);
    if (space) {
      const keys = Object.keys(space);
      keys.forEach((v) => {
        if (!spaceToStoreId.has(v)) {
          helpers.deleteKey(v, ctx);
        }
      });
    }
  },
  setupTimeout(cb: () => void) {
    const timer = setTimeout(() => {
      if (typeof cb === "function") {
        cb();
      }
      clearTimeout(timer);
    }, 200);
  },
};

function updateStore(
  paths: string[],
  store: AnyObj,
  ctx: This,
  key: string,
  state: StateTree
) {
  let processingObj = helpers.createObjByPaths(paths, state);
  helpers.merge(processingObj,store);
  ctx.setItem(key, processingObj, NAMESPACE);
  return processingObj;
}

function activateState(payload: Params) {
  const { key, ctx, piniaCtx, paths, state } = payload;
  if (spaceToStoreId.has(key)) {
    const store = ctx.getItem(key, NAMESPACE);
    if (store) {
      const latest = updateStore(paths, store, ctx, key, state);
      helpers.updateKey(ctx);
      piniaCtx.$patch(latest);
      return;
    }
    persistState(payload);
  }
}

function initSpaceForPinia(ctx: This) {
  const hasSpace = ctx.getItem(NAMESPACE);
  if (hasSpace) return;
  ctx.setItem(NAMESPACE, {});
}

function persistState(payload: Omit<Params, "piniaCtx">) {
  const { key, ctx, paths, state } = payload;
  if (spaceToStoreId.has(key)) {
    for (let i = 0; i < paths.length; i++) {
      const v = paths[i];
      const rest = paths.slice(i + 1);
      const index = rest.findIndex((r) => r.startsWith(v));
      if (index > -1) {
        paths.splice(i + index, 1);
        i--;
      }
    }
    ctx.setItem(key, pick(state, paths), NAMESPACE);
  }
}

function initialize(
  userConfig: PersistedStateOptions | boolean,
  store: {
    id: string;
    state: AnyObj;
  }
) {
  const response: Required<PersistedStateOptions> = {
    key: store.id,
    paths: [],
  };
  if (userConfig === true) {
    response.paths = helpers.normalizePaths(
      helpers.createPathsByObj(cloneDeep(store.state || {}))
    );
  } else {
    const config = userConfig as PersistedStateOptions;
    response.paths = helpers.normalizePaths(
      (() => {
        const paths = config.paths || response.paths;
        if (paths?.length) {
          return paths;
        }
        return Object.keys(store.state);
      })()
    );
    response.key = config.key || response.key;
  }
  if (!spaceToStoreId.has(response.key!)) {
    spaceToStoreId.set(response.key!, store.id);
  }
  return response as Required<PersistedStateOptions>;
}

function handleHydrate(payload: AnyObj) {
  const { state, persist, id, ctx, oldKey } = payload;
  const { paths, key } = initialize(persist, {
    id,
    state,
  });
  if (persist) {
    if (oldKey !== key) {
      helpers.deleteKey(oldKey, ctx);
    }
    persistState({
      key,
      paths,
      state,
      ctx,
    });
  } else {
    helpers.deleteKey(id, ctx);
  }

  return {
    paths,
    state,
    key,
  };
}

function createState(newS: StateTree, id:string,userConfig: PersistedStateOptions | boolean,ctx:This) {
  const useId = id.replace('__hot:','').trim()
  const key = typeof userConfig === 'boolean' ? useId : userConfig.key
  if(spaceToStoreId.has(key!)){
    const store = ctx.getItem(key!,NAMESPACE)
    helpers.merge(store,newS)
    return store
  }
  return newS;
}

function internalPiniaPlugin(ctx: This): PiniaPlugin {
  return function (piniaCtx: PiniaPluginContext) {
    const {
      store,
      options: { persist = true },
    } = piniaCtx;

    const { $id: id, $state: state } = store;

    if (id && id.startsWith("__hot:")) {
      window.postMessage(
        JSON.stringify({
          state: createState(state,id,persist,ctx),
          persist,
        })
      );
      return;
    }

    if (!persist) {
      helpers.deleteKey(id, ctx);
      return;
    }

    const { paths, key } = initialize(persist, {
      id,
      state,
    });

    const params: Params = {
      key,
      paths,
      ctx,
      piniaCtx: store,
      state,
    };

    store.$hydrate = (payload: AnyObj) => {
      const response = handleHydrate({
        ...payload,
        ctx,
        oldKey: params.key,
      });
      params.state = response.state;
      params.paths = response.paths;
      params.key = response.key;
    };

    store.$discard = (id: string) => {
      ctx.removeItem(id, NAMESPACE);
    };

    activateState(params);

    store.$subscribe(
      (
        _mutation: SubscriptionCallbackMutation<StateTree>,
        state: StateTree
      ) => {
        persistState({
          ...params,
          state,
        });
      },
      {
        detached: true,
      }
    );
  };
}

export function runAsPiniaPlugin(pinia: Pinia, ctx: This) {
  initSpaceForPinia(ctx);
  pinia.use(internalPiniaPlugin(ctx));
}

function isUseStore(fn: any): fn is StoreDefinition {
  return typeof fn === "function" && typeof fn.$id === "string";
}

export function acceptHMRUpdateWithHydration(initialUseStore: any, hot: any) {
  return (newModule: any) => {
    const pinia: any = hot.data.pinia || initialUseStore._pinia;

    if (!pinia) return;

    hot.data.pinia = pinia;

    for (const exportName in newModule) {
      const useStore = newModule[exportName];
      if (isUseStore(useStore)) {
        const id = useStore.$id;
        if (pinia._s.has(useStore.$id)) {
          const ctx: StoreGeneric = pinia._s.get(id)!;
          if (!ctx) return;
          window.onmessage = (msg) => {
            ctx.$hydrate?.({
              ...JSON.parse(msg.data),
              id,
            });
          };
          useStore(pinia, ctx);
        } else {
          if (id !== initialUseStore.$id && initialUseStore) {
            console.warn(
              `[@web-localstorage-plus/pinia]:检测到存储库的id从"${initialUseStore.$id}"变成"${id}"了`
            );
            initialUseStore(
              pinia,
              pinia._s.get(initialUseStore.$id)!
            ).$discard?.(initialUseStore.$id);
            useStore(pinia, pinia._s.get(id)!);
          }
        }
      }
    }
  };
}
