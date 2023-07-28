import type { Pinia } from "./type";
import { runAsPiniaPlugin } from "./pinia";
import { useStorage } from "web-localstorage-plus";
import vitePlugin from "./vite";
import webpackPlugin from "./webpack";

export { acceptHMRUpdateWithHydration } from './pinia'

export default function (pinia: Pinia) {
  if (pinia) {
    runAsPiniaPlugin(pinia, useStorage());
  }
}

export function getPlugin(framwork:'vite'):typeof vitePlugin;
export function getPlugin(framwork:'webpack',folder:string):ReturnType<typeof webpackPlugin>;
export function getPlugin(framwork:'webpack'|'vite',folder?:string):typeof vitePlugin | ReturnType<typeof webpackPlugin>|undefined{
  if(framwork === 'vite'){
    return vitePlugin
  }else if(framwork === 'webpack' && folder){
    return webpackPlugin(folder)
  }
}


