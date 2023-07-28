import MagicString from "magic-string";
import { getFileId } from './webpack'

function extractApi(code: string) {
  const importRegex = /\bimport([^\2]*?)(from)/g;
  const imps = [];
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    if (importPath) {
      imps.push(importPath.trim());
    }
  }
  function _replaceBracket(str: string) {
    ["{", "}"].forEach((v) => {
      str = str.replace(v, "");
    });
    return str;
  }
  let api: string = "";
  const flag = "defineStore";
  let stopIndex = -1;
  for (let i = 0; i < imps.length; i++) {
    const v = imps[i];
    if (v.indexOf(flag) > -1) {
      const frags = v.split(",");
      let item = frags.find((f) => f.includes(flag))!;
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

function extractRegisterApi(code: string, api: string) {
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
        `[@web-localstorage-plus/pinia]:请采用\n"\n  const xxx = ${api}(...);\n  export default xxx;\n"\n的形式导出存储库`
      );
      break;
    }
    if (str.endsWith("=") && str.startsWith("export")) {
      str = str.replace("export", "");
      str = str.replace("=", "");
      const m = str.match(/var|const|let/g);
      str = str.replace(m?.[0] || "", "");
      str = str.trim();
      register = str;
      break;
    }

    if (str.endsWith("=") && str.match(/^var|let|const/)) {
      str = str.replace("=", "");
      const m = str.match(/var|const|let/g);
      str = str.replace(m?.[0] || "", "");
      str = str.trim();
      register = str;
      break;
    }

    i--;
  }

  return register;
}



export default async function transform(code: string, id: string) {
  id = await getFileId(id)
  if(id){
    let { apiName, stopIndex } = extractApi(code);
    if (apiName) {
      const api = extractRegisterApi(code.slice(stopIndex), apiName);
      if (api) {
        const s = new MagicString(code);
        s.prepend(
          `import { acceptHMRUpdateWithHydration } from '@web-localstorage-plus/pinia';\n`
        );
        s.append(`if (import.meta.hot)\n`);
        s.append(
          `  import.meta.hot.accept(acceptHMRUpdateWithHydration(${api}, import.meta.hot));\n`
        );
        return {
          code: s.toString(),
          map: s.generateMap({ source: id, includeContent: true }),
        };
      }
    }
  }
  return code
}
