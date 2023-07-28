"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  acceptHMRUpdateWithHydration: () => acceptHMRUpdateWithHydration,
  default: () => src_default,
  getPlugin: () => getPlugin
});
module.exports = __toCommonJS(src_exports);

// src/pinia.ts
var _ = __toESM(require("lodash"));
var { pick, isObject, union, set, mergeWith, cloneDeep } = _;
var spaceToStoreId = /* @__PURE__ */ new Map([]);
var NAMESPACE = "pinia";
var overwriteFlag = "WAITING_OVERWRITE_";
var deleteFlag = "WAITING_DELETE";
var helpers = {
  createObjByPaths(paths, state) {
    let result = {};
    const missing = [];
    function _getValueType(path) {
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
      if (origin[keys[0]] !== void 0) {
        set(result, paths[i], `${overwriteFlag}${_getValueType(paths[i])}`);
        continue;
      }
      missing.push(paths[i]);
    }
    missing.length && console.warn(
      `[@web-localstorage-plus/pinia]:\u627E\u4E0D\u5230paths\u4E2D\u7684\u914D\u7F6E\u9879\uFF1A${missing.join(
        "\u3001"
      )}`
    );
    return result;
  },
  createPathsByObj(obj, parentKey = "") {
    let keys = [];
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
  isSameType(a, b) {
    if (a.startsWith(overwriteFlag)) {
      const type = a.replace(overwriteFlag, "");
      return type === Object.prototype.toString.call(b);
    }
    return Object.prototype.toString.call(a) !== Object.prototype.toString.call(b);
  },
  deleteRedundant(obj) {
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
  mergeDeep(obj1, obj2, callback) {
    return mergeWith(obj1, obj2, (objValue, srcValue) => {
      if (isObject(objValue) && isObject(srcValue)) {
        return helpers.mergeDeep(objValue, srcValue, callback);
      }
      if (objValue === void 0) {
        return deleteFlag;
      }
      if (typeof callback === "function") {
        return callback(objValue, srcValue);
      }
    });
  },
  normalizePaths(paths) {
    return union(
      paths.filter((v) => v).map((v) => String(v)).sort((a, b) => a.split(".").length - b.split(".").length)
    );
  }
};
function updateStore(paths, store, ctx, key, state) {
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
function activateState(payload) {
  const { key, ctx, piniaCtx, paths, state } = payload;
  if (spaceToStoreId.has(key)) {
    const store = ctx.getItem(key, NAMESPACE);
    if (store) {
      const latest = updateStore(paths, store, ctx, key, state);
      piniaCtx.$patch(latest);
      return;
    }
    persistState(payload);
  }
}
function initSpaceForPinia(ctx) {
  const hasSpace = ctx.getItem(NAMESPACE);
  if (hasSpace)
    return;
  ctx.setItem(NAMESPACE, {});
}
function persistState(payload) {
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
function initialize(userConfig, store) {
  const response = {
    key: store.id,
    paths: []
  };
  if (userConfig === true) {
    response.paths = helpers.normalizePaths(
      helpers.createPathsByObj(cloneDeep(store.state || {}))
    );
  } else {
    const config = userConfig;
    response.paths = helpers.normalizePaths(
      (() => {
        const paths = config.paths || response.paths;
        if (paths == null ? void 0 : paths.length) {
          return paths;
        }
        return Object.keys(store.state);
      })()
    );
    response.key = config.key || response.key;
  }
  if (!spaceToStoreId.has(response.key)) {
    spaceToStoreId.set(response.key, store.id);
  }
  return response;
}
function handleHydrate(payload) {
  const { state, persist, id, ctx } = payload;
  const { paths, key } = initialize(persist, {
    id,
    state
  });
  persistState({
    key,
    paths,
    state,
    ctx
  });
  return {
    paths,
    state
  };
}
function internalPiniaPlugin(ctx) {
  return function(piniaCtx) {
    const {
      store,
      options: { persist = true }
    } = piniaCtx;
    const { $id: id, $state: state } = store;
    if (id && id.startsWith("__hot:")) {
      window.postMessage(
        JSON.stringify({
          state,
          persist
        })
      );
      return;
    }
    if (!persist)
      return;
    const { paths, key } = initialize(persist, {
      id,
      state
    });
    const params = {
      key,
      paths,
      ctx,
      piniaCtx: store,
      state
    };
    store.$hydrate = (payload) => {
      const response = handleHydrate(__spreadProps(__spreadValues({}, payload), {
        ctx
      }));
      params.state = response.state;
      params.paths = response.paths;
    };
    store.$discard = (id2) => {
      ctx.removeItem(id2, NAMESPACE);
    };
    activateState(params);
    store.$subscribe(
      (_mutation, state2) => {
        persistState(__spreadProps(__spreadValues({}, params), {
          state: state2
        }));
      },
      {
        detached: true
      }
    );
  };
}
function runAsPiniaPlugin(pinia, ctx) {
  initSpaceForPinia(ctx);
  pinia.use(internalPiniaPlugin(ctx));
}
function isUseStore(fn) {
  return typeof fn === "function" && typeof fn.$id === "string";
}
function acceptHMRUpdateWithHydration(initialUseStore, hot) {
  return (newModule) => {
    var _a, _b;
    const pinia = hot.data.pinia || initialUseStore._pinia;
    if (!pinia)
      return;
    hot.data.pinia = pinia;
    for (const exportName in newModule) {
      const useStore = newModule[exportName];
      if (isUseStore(useStore)) {
        const id = useStore.$id;
        if (pinia._s.has(useStore.$id)) {
          const ctx = pinia._s.get(id);
          if (!ctx)
            return;
          window.onmessage = (msg) => {
            var _a2;
            (_a2 = ctx.$hydrate) == null ? void 0 : _a2.call(ctx, __spreadProps(__spreadValues({}, JSON.parse(msg.data)), {
              id
            }));
          };
          useStore(pinia, ctx);
        } else {
          if (id !== initialUseStore.$id && initialUseStore) {
            console.warn(
              `[@web-localstorage-plus/pinia]:\u68C0\u6D4B\u5230\u5B58\u50A8\u5E93\u7684id\u4ECE"${initialUseStore.$id}"\u53D8\u6210"${id}"\u4E86`
            );
            (_b = (_a = initialUseStore(pinia, pinia._s.get(initialUseStore.$id))).$discard) == null ? void 0 : _b.call(_a, initialUseStore.$id);
            useStore(pinia, pinia._s.get(id));
          }
        }
      }
    }
  };
}

// src/index.ts
var import_web_localstorage_plus = require("web-localstorage-plus");

// src/transform.ts
var import_magic_string = __toESM(require("magic-string"));

// src/webpack.ts
var webpackContext = {
  folder: "",
  fileId: ""
};
function webpackPlugin(folder) {
  return class Plugin {
    apply(compiler) {
      return __async(this, null, function* () {
        const mod = yield import("path");
        const transform2 = mod.resolve(
          process.cwd(),
          "node_modules",
          "@web-localstorage-plus/pinia",
          "dist",
          "transform"
        );
        webpackContext.folder = folder;
        const useNone = [];
        const useLoader = [
          {
            loader: transform2
          }
        ];
        compiler.options.module.rules.unshift({
          enforce: "pre",
          use: (data) => {
            webpackContext.fileId = "";
            if (data.resource == null)
              return useNone;
            let fileId = data.resource + (data.resourceQuery || "");
            if (mod.isAbsolute(fileId)) {
              fileId = mod.normalize(fileId);
            }
            if (fileId.startsWith(folder)) {
              webpackContext.fileId = fileId;
              return useLoader;
            }
            return useNone;
          }
        });
      });
    }
  };
}
function getFileId(id) {
  return __async(this, null, function* () {
    if (webpackContext.folder) {
      return webpackContext.fileId;
    }
    return id;
  });
}

// src/transform.ts
function extractApi(code) {
  const importRegex = /\bimport([^\2]*?)(from)/g;
  const imps = [];
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    if (importPath) {
      imps.push(importPath.trim());
    }
  }
  function _replaceBracket(str) {
    ["{", "}"].forEach((v) => {
      str = str.replace(v, "");
    });
    return str;
  }
  let api = "";
  const flag = "defineStore";
  let stopIndex = -1;
  for (let i = 0; i < imps.length; i++) {
    const v = imps[i];
    if (v.indexOf(flag) > -1) {
      const frags = v.split(",");
      let item = frags.find((f) => f.includes(flag));
      if (item.indexOf("as") > -1) {
        item = item.trim();
        let right = item.split("as")[1];
        right = right.trim();
        right = _replaceBracket(right);
        api = right.trim();
        break;
      }
      item = _replaceBracket(item);
      api = item.trim();
      stopIndex = code.indexOf(v) + v.length;
      break;
    }
  }
  return { apiName: api, stopIndex };
}
function extractRegisterApi(code, api) {
  const left = code.split(api)[0].trim();
  let i = left.length;
  let str = "";
  let register = "";
  while (i !== 0) {
    if (left[i] && left[i].trim()) {
      str = left[i] + str;
    }
    if (str === "exportdefault") {
      console.warn(
        `[@web-localstorage-plus/pinia]:\u8BF7\u91C7\u7528
"
  const xxx = ${api}(...);
  export default xxx;
"
\u7684\u5F62\u5F0F\u5BFC\u51FA\u5B58\u50A8\u5E93`
      );
      break;
    }
    if (str.endsWith("=") && str.startsWith("export")) {
      str = str.replace("export", "");
      str = str.replace("=", "");
      const m = str.match(/var|const|let/g);
      str = str.replace((m == null ? void 0 : m[0]) || "", "");
      str = str.trim();
      register = str;
      break;
    }
    if (str.endsWith("=") && str.match(/^var|let|const/)) {
      str = str.replace("=", "");
      const m = str.match(/var|const|let/g);
      str = str.replace((m == null ? void 0 : m[0]) || "", "");
      str = str.trim();
      register = str;
      break;
    }
    i--;
  }
  return register;
}
function transform(code, id) {
  return __async(this, null, function* () {
    id = yield getFileId(id);
    if (id) {
      let { apiName, stopIndex } = extractApi(code);
      if (apiName) {
        const api = extractRegisterApi(code.slice(stopIndex), apiName);
        if (api) {
          const s = new import_magic_string.default(code);
          s.prepend(
            `import { acceptHMRUpdateWithHydration } from '@web-localstorage-plus/pinia';
`
          );
          s.append(`if (import.meta.hot)
`);
          s.append(
            `  import.meta.hot.accept(acceptHMRUpdateWithHydration(${api}, import.meta.hot));
`
          );
          return {
            code: s.toString(),
            map: s.generateMap({ source: id, includeContent: true })
          };
        }
      }
    }
    return code;
  });
}

// src/vite.ts
function vitePlugin(folder) {
  return {
    name: "vite:web-localstorage-plus-pinia-hmr",
    transform(code, id) {
      if (folder && id.startsWith(folder)) {
        return transform(code, id);
      }
      return code;
    }
  };
}

// src/index.ts
function src_default(pinia) {
  if (pinia) {
    runAsPiniaPlugin(pinia, (0, import_web_localstorage_plus.useStorage)());
  }
}
function getPlugin(framwork, folder) {
  if (framwork === "vite") {
    return vitePlugin;
  } else if (framwork === "webpack" && folder) {
    return webpackPlugin(folder);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  acceptHMRUpdateWithHydration,
  getPlugin
});
