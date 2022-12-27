// component-enhance-hook
import type { PluginOption } from "vite";

type HookBindPluginOptions = {
  prefix?: string;
  bindKey?: string;
  eventKey?: string;
};
export const viteHookBind = (options?: HookBindPluginOptions): PluginOption => {
  const { prefix, bindKey, eventKey } = Object.assign(
    {
      prefix: "v-ehb",
      bindKey: "bindProps",
      eventKey: "bindEvents",
    },
    options
  );

  return {
    name: "vite-plugin-vue-component-enhance-hook-bind",
    enforce: "pre",
    transform: (code, id) => {
      const last = id.substring(id.length - 4);

      if (last === ".vue") {
        // 处理之前先判断一下
        if (code.indexOf(prefix) === -1) {
          return code;
        }
        // 获取 template 开头
        const templateStrStart = code.indexOf("<template>");
        // 获取 template 结尾
        const templateStrEnd = code.lastIndexOf("</template>");

        let templateStr = code.substring(templateStrStart, templateStrEnd + 11);

        let startIndex;
        // 循环转换 template 中的hook绑定指令
        while ((startIndex = templateStr.indexOf(prefix)) > -1) {
          const endIndex = templateStr.indexOf(`"`, startIndex + 7);
          const str = templateStr.substring(startIndex, endIndex + 1);
          const obj = str.split(`"`)[1];

          const newStr = templateStr.replace(
            str,
            `v-bind="${obj}.${bindKey}" v-on="${obj}.${eventKey}"`
          );

          templateStr = newStr;
        }

        // 拼接并返回
        return (
          code.substring(0, templateStrStart) +
          templateStr +
          code.substring(templateStrEnd + 11)
        );
      }

      return code;
    },
  };
};
