# @web-localstorage-plus/pinia

为[web-localstorage-plus](https://github.com/supanpanCn/web-localstorage-plus)增加pinia持久化存储能力

## 安装

```js
yarn add web-localstorage-plus
yarn add @web-localstorage-plus/pinia
```

## 基本使用

1.使用web-localstorage-plus初始化仓库

```ts
import createStorage from 'web-localstorage-plus';
createStorage({
    rootName: 'spp-storage',
});
```

2.为pinia设置持久化

```ts
import pinia from '@/store';
import setPiniaPersist from '@web-localstorage-plus/pinia';
setPiniaPersist(pinia);
```

## 设置热更新

在vite配置文件下导入并作为plugin使用

```ts
import { getPlugin } from '@web-localstorage-plus/pinia';
const piniaHmrPlugin = getPlugin('vite');
export default defineConfig({
    ...,
    plugins:[piniaHmrPlugin(resolve(__dirname, 'src/store'))]
})
```

在webpack的配置文件下导入并作为plugin使用

```ts
const { getPlugin } = require("@web-localstorage-plus/pinia")
const PiniaPlugin = getPlugin('webpack',resolve(__dirname, 'src/store'))
module.exports = {
    ...,
    plugins:[new PiniaPlugin()]
}
```