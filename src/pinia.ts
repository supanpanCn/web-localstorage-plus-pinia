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

const { pick, isObject, union, set, mergeWith, cloneDeep } = _;

const spaceToStoreId = new Map<string, string>([]);
const NAMESPACE = "pinia";
const overwriteFlag = "WAITING_OVERWRITE_";
const deleteFlag = "WAITING_DELETE";

const helpers = {
  createObjByPaths(paths: string[], state: AnyObj) {
    let result: AnyObj = {};
    const missing: string[] = [];
    function _getValueType(path: string) {
      const arr = path.split(".");
      let dy = cloneDeep(state);
      arr.forEach((v) => {
        dy = dy[v];
      });

      const type = Object.prototype.toString.call(dy);
      return type;
    }
    for (let i = 0; i < paths.length; i++) {
      const origin = pick(state, paths[i]);
      const keys = paths[i].split(".");
      if (origin[keys[0]] !== undefined) {
        set(result, paths[i], `${overwriteFlag}${_getValueType(paths[i])}`);
        continue;
      }
      missing.push(paths[i]);
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
  isSameType(a: string, b: string) {
    if (a.startsWith(overwriteFlag)) {
      const type = a.replace(overwriteFlag, "");
      return type === Object.prototype.toString.call(b);
    }
    return (
      Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)
    );
  },
  deleteRedundant(obj: AnyObj) {
    for (const key in obj) {
      if (obj[key] === deleteFlag) {
        delete obj[key];
        continue;
      }
      if (typeof obj[key] === "object") {
        helpers.deleteRedundant(obj[key]);
      }
    }
  },
  mergeDeep(
    obj1: AnyObj,
    obj2: AnyObj,
    callback: (a: any, b: any) => void
  ): AnyObj {
    return mergeWith(obj1, obj2, (objValue: any, srcValue: any) => {
      if (isObject(objValue) && isObject(srcValue)) {
        return helpers.mergeDeep(objValue, srcValue, callback);
      }
      if (objValue === undefined) {
        return deleteFlag;
      }
      if (typeof callback === "function") {
        return callback(objValue, srcValue);
      }
    });
  },
  normalizePaths(paths: string[]) {
    return union(
      paths
        .filter((v) => v)
        .map((v) => String(v))
        .sort((a, b) => a.split(".").length - b.split(".").length)
    );
  },
  deleteKey(id:string,ctx:This){
    if(ctx.getItem(id,NAMESPACE)){
      ctx.removeItem(id,NAMESPACE)
    }
  },
  updateKey(ctx:This){
    const space = ctx.getItem(NAMESPACE)
    if(space){
      const keys = Object.keys(space)
      keys.forEach(v=>{
        if(!spaceToStoreId.has(v)){
          helpers.deleteKey(v,ctx)
        }
      })
    }
  }
};

function updateStore(
  paths: string[],
  store: AnyObj,
  ctx: This,
  key: string,
  state: StateTree
) {
  let processingObj = helpers.createObjByPaths(paths, state);
  processingObj = helpers.mergeDeep(
    processingObj,
    store,
    (objValue, srcValue) => {
      if (!helpers.isSameType(objValue, srcValue)) {
        return objValue;
      }
    }
  );
  helpers.deleteRedundant(processingObj);
  processingObj = helpers.mergeDeep(
    processingObj,
    state,
    (objValue, srcValue) => {
      if (typeof objValue === "string" && objValue.startsWith(overwriteFlag)) {
        return srcValue;
      }
      return objValue;
    }
  );
  helpers.deleteRedundant(processingObj);
  ctx.setItem(key, processingObj, NAMESPACE);
  return processingObj;
}

function activateState(payload: Params) {
  const { key, ctx, piniaCtx, paths, state } = payload;
  if (spaceToStoreId.has(key)) {
    const store = ctx.getItem(key, NAMESPACE);
    if (store) {
      const latest = updateStore(paths, store, ctx, key, state);
      helpers.updateKey(ctx)
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

function handleHydrate(payload: AnyObj){
  const { state, persist, id, ctx ,oldKey} = payload;
  const { paths, key } = initialize(persist, {
    id,
    state,
  });
  if(persist){
    if(oldKey !== key){
      helpers.deleteKey(oldKey,ctx)
    }
    persistState({
      key,
      paths,
      state,
      ctx
    })
  }else{
    helpers.deleteKey(id,ctx)
  }
  
  return {
    paths,
    state,
    key
  }
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
          state,
          persist,
        })
      );
      return;
    }

    if (!persist){
      helpers.deleteKey(id,ctx)
      return
    };

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
        oldKey:params.key
      })
      params.state = response.state;
      params.paths = response.paths;
      params.key = response.key;
    };

    store.$discard = (id:string) => {
      ctx.removeItem(id,NAMESPACE)
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
        if(pinia._s.has(useStore.$id)){
          const ctx: StoreGeneric = pinia._s.get(id)!;
          if (!ctx) return;
          window.onmessage = (msg) => {
            ctx.$hydrate?.({
              ...JSON.parse(msg.data),
              id,
            });
          };
          useStore(pinia, ctx);
        }else{
          if (id !== initialUseStore.$id && initialUseStore) {
            console.warn(
              `[@web-localstorage-plus/pinia]:检测到存储库的id从"${initialUseStore.$id}"变成"${id}"了`
            );
            initialUseStore(pinia, pinia._s.get(initialUseStore.$id)!).$discard?.(initialUseStore.$id);
            useStore(pinia, pinia._s.get(id)!);
          }
        }
      }
    }
  };
}
