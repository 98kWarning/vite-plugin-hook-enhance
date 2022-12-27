# vite-plugin-hook-enhance
增强你在vue3中的hook使用体验

## 使用

#### 安装
` npm i vite-plugin-vue-hook-enhance -D`

#### 引入与使用

在`vite.config.ts`中
```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { viteHookBind } from "vite-plugin-vue-hook-enhance";

export default defineConfig({
  plugins: [vue(), vueJsx(), viteHookBind()],
});
```

## 业务中使用

#### 编写自己的hook
```ts
import { onMounted, reactive, ref, UnwrapRef } from 'vue';

type TApiFun<TData, TParams extends Array<any>> = (...params: TParams) => Promise<TData>;


/* 下拉框组件需要的数据格式，
 ** 参考https://2x.antdv.com/components/select-cn
 ** extra 是附加的数据
 */
export interface SelectOptions<T = any> {
  value: string;
  label: string;
  disabled?: boolean;
  key?: string;
  title?: string;
  extra?: T;
}

export interface IAutoSelectProps<TData, TParams extends any[]> {
  /* 查询远程数据用的接口 */
  apiFun: TApiFun<TData, TParams>;

  /* 在页面挂载时自动调用接口查询 */
  queryInMount?: boolean;

  /* 查询条件 */
  initQueryParams?: TParams;

  /* 将接口返回的数据转换为下拉框需要的数据格式 */
  transformDataFun?: (data: TData) => SelectOptions<TData>[];

  /* select的默认提示文案 */
  placeholder?: string;
}

/* 结果类型*/
/* ref包裹的数据，放到reactive中时，会被自动解包，所以这里的loading等不需要使用Ref包裹 */
export interface IAutoSelectResult<TData, TParams extends any[]> {
  bindProps: UnwrapRef<{
    options: UnwrapRef<SelectOptions<TData>[]>;
    loading: boolean;
    // disabled: boolean;
    placeholder: string;
  }>;
  bindEvents: {};
  loadData: TApiFun<TData, TParams>;
  // loading: Ref<boolean>;
  setOptions: (data: SelectOptions<TData>[]) => void;
}

/*  接管下拉框的渲染逻辑，
 ** 从调用接口时切换loading状态，
 ** 到接口完成展示结果或错误
 **手动调用 loadData 方法可以更新数据
 */
export function useAutoSelect<TData = any, TParams extends any[] = any[]>(prop: IAutoSelectProps<TData, TParams>): IAutoSelectResult<TData, TParams> {
  const { queryInMount = true, placeholder = '请选择', initQueryParams = [], transformDataFun } = prop;

  const options = reactive<SelectOptions<TData>[]>([]);

  const loading = ref(false);

  const placeholderText = ref(placeholder);

  onMounted(() => {
    if (queryInMount) {
      loadData(...(initQueryParams as TParams));
    }
  });

  /* 调用接口请求数据 */
  const loadData: TApiFun<TData, TParams> = (...params) => {
    if (!loading.value) {
      placeholderText.value = '加载中...';
      loading.value = true;
    }
    setOptions([]);
    return prop.apiFun(...params).then(
      (res) => {
        let data;
        //   转换数据
        if (transformDataFun) {
          data = transformDataFun(res);
        } else {
          data = res;
        }
        options.splice(0, options.length, ...data);
        placeholderText.value = placeholder;

        loading.value = false;
        return res;
      },
      (err) => {
        // 未知错误，可能是代码抛出的错误，或是网络错误
        loading.value = false;
        placeholderText.value = err.message;
        options.splice(0, options.length, {
          value: '-1',
          label: err.message,
          disabled: true,
        });
        // 接着抛出错误
        return Promise.reject(err);
      }
    );
  };

  function setOptions(data: SelectOptions[]) {
    options.splice(0, options.length, ...data);
  }

  //   bindProps 需要用reactive包一下，不然会报警告
  return {
    bindProps: reactive({
      options,
      loading,
      placeholder: placeholderText,
    }),
    bindEvents: {},
    loadData,
    setOptions,
  };
}
```

#### 业务代码

```ts
<script setup name="DDemo" lang="ts">
  import { useAutoSelect } from './hook';

  //   模拟调用接口
  function getRemoteData() {
    return new Promise<any[]>((resolve, reject) => {
      setTimeout(() => {
        // 模拟接口调用有概率出错
        if (Math.random() > 0.5) {
          resolve([
            {
              key: 1,
              name: '苹果',
              value: 1,
            },
            {
              key: 2,
              name: '香蕉',
              value: 2,
            },
            {
              key: 3,
              name: '橘子',
              value: 3,
            },
          ]);
        } else {
          reject(new Error('不小心出错了！'));
        }
      }, 3000);
    });
  }
   
   // 将之前用的 options,loading，和调用接口的逻辑都抽离到hook中
  const selectBind = useAutoSelect({
    apiFun: getRemoteData,
  });
</script>

<template>
  <div>
    <a-select v-bind="selectBind.bindProps" v-on="selectBind.bindEvents" />
  </div>
</template>
```

#### 使用快捷指令绑定

```html
<a-select v-ehb="selectBind" />
```

## 自定义属性

```ts
import { viteHookBind } from "vite-plugin-vue-hook-enhance";

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    viteHookBind({
        prefix: "v-ehb",
        bindKey: "bindProps",
        eventKey: "bindEvents",
    })],
});
```

| 属性     | 默认值     | 类型     | 说明                                 |
| -------- | ---------- | -------- | ------------------------------------ |
| prefix   | v-ehb      | `string` | 绑定hook时用到的前缀语法糖           |
| bindKey  | bindProps  | `string` | 指定v-bind所绑定的hook返回的属性集合 |
| eventKey | bindEvents | `string` | 指定v-on所绑定的hook返回的事件集合   |

