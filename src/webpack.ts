import type { WebpackCompiler, RuleSetUseItem } from "./type";

const webpackContext = {
  folder: "",
  fileId: "",
};

export default function webpackPlugin(folder: string) {
  return class Plugin {
    async apply(compiler: WebpackCompiler) {
      const mod = await import("node:path");
      const transform = mod.resolve(
        process.cwd(),
        "node_modules",
        "@web-localstorage-plus/pinia",
        "dist",
        "transform"
      );
      webpackContext.folder = folder;
      const useNone: RuleSetUseItem[] = [];
      const useLoader: RuleSetUseItem[] = [
        {
          loader: transform,
        },
      ];
      compiler.options.module.rules.unshift({
        enforce: "pre",
        use: (data: { resource: string | null; resourceQuery: string }) => {
          webpackContext.fileId = "";
          if (data.resource == null) return useNone;
          let fileId = data.resource + (data.resourceQuery || "");
          if (mod.isAbsolute(fileId)) {
            fileId = mod.normalize(fileId);
          }
          if (fileId.startsWith(folder)) {
            webpackContext.fileId = fileId;
            return useLoader;
          }
          return useNone;
        },
      });
    }
  };
}

export async function getFileId(id: string) {
  if (webpackContext.folder) {
      return webpackContext.fileId;
  }
  return id;
}
