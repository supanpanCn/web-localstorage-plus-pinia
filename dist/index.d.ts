import { StateTree, Pinia } from 'pinia';
import { Plugin } from 'vite';
import { Compiler } from 'webpack';

interface PersistedStateOptions {
    paths?: Array<string>;
    key?: string;
}
declare module "pinia" {
    interface DefineStoreOptionsBase<S extends StateTree, Store> {
        persist?: boolean | PersistedStateOptions;
    }
    interface PiniaCustomProperties {
        $hydrate: (payload: {
            state: StateTree;
            persist: boolean | PersistedStateOptions;
        }) => void;
        $discard: (id: string) => void;
    }
}

declare function vitePlugin(folder: string): Plugin;

declare function webpackPlugin(folder: string): {
    new (): {
        apply(compiler: Compiler): Promise<void>;
    };
};

declare function acceptHMRUpdateWithHydration(initialUseStore: any, hot: any): (newModule: any) => void;

declare function export_default(pinia: Pinia): void;
declare function getPlugin(framwork: 'vite'): typeof vitePlugin;
declare function getPlugin(framwork: 'webpack', folder: string): ReturnType<typeof webpackPlugin>;

export { acceptHMRUpdateWithHydration, export_default as default, getPlugin };
