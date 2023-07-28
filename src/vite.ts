import type { Plugin } from "./type";
import transfrom from './transform'

export default function vitePlugin(folder: string): Plugin {
  return {
    name: "vite:web-localstorage-plus-pinia-hmr",
    transform(code, id) {
      if (folder && id.startsWith(folder)) {
        return transfrom(code,id)
      }
      return code;
    },
  };
}
