export type ToolNavItem = {
  href: string;
  label: {
    en: string;
    zh: string;
  };
};

export type ToolNavSection = {
  title: {
    en: string;
    zh: string;
  };
  items: ToolNavItem[];
};

export const TOOL_NAV_SECTIONS: ToolNavSection[] = [
  {
    title: {
      en: "Fun",
      zh: "趣味小工具",
    },
    items: [
      {
        href: "/tools#mbti-match",
        label: {
          en: "MBTI Match Test",
          zh: "MBTI 匹配测试",
        },
      },
      {
        href: "/tools#emoji-dna",
        label: {
          en: "Emoji DNA",
          zh: "Emoji DNA",
        },
      },
      {
        href: "/tools#nickname-gen",
        label: {
          en: "Nickname Generator",
          zh: "网名生成器",
        },
      },
      {
        href: "/tools#astro-roast",
        label: {
          en: "Astro Roast",
          zh: "星座嘴替",
        },
      },
      {
        href: "/tools#poem-generator",
        label: {
          en: "Chinese Hidden Poem",
          zh: "藏头 / 藏尾诗",
        },
      },
      {
        href: "/tools#pixel-avatar",
        label: {
          en: "Pixel Avatar",
          zh: "像素头像",
        },
      },
      {
        href: "/tools#image-to-svg",
        label: {
          en: "Image to SVG",
          zh: "图片转 SVG",
        },
      },
      {
        href: "/tools#abstract-meme-text",
        label: {
          en: "Abstract Meme Text Generator",
          zh: "抽象梗文生成器",
        },
      },
    ],
  },
  {
    title: {
      en: "Quick Links",
      zh: "快速入口",
    },
    items: [
      {
        href: "/tools/doc-converter",
        label: {
          en: "Document Converter",
          zh: "文档格式转换",
        },
      },
      {
        href: "/tools#pixelpunk-image-host",
        label: {
          en: "Image Hosting / Upload",
          zh: "图床 / 图片上传",
        },
      },
      {
        href: "/tools#address-generator",
        label: {
          en: "Address Generator",
          zh: "地址生成器",
        },
      },
    ],
  },
  {
    title: {
      en: "Productivity",
      zh: "效率工具",
    },
    items: [
      {
        href: "/tools#timestamp-converter",
        label: {
          en: "Timestamp Converter",
          zh: "时间戳转换器",
        },
      },
      {
        href: "/tools#text-processor",
        label: {
          en: "Batch Text Processor",
          zh: "批量文本处理器",
        },
      },
      {
        href: "/tools#json-toolbox",
        label: {
          en: "JSON / YAML / TOML Toolbox",
          zh: "JSON / YAML / TOML 工具箱",
        },
      },
      {
        href: "/tools#url-toolbox",
        label: {
          en: "URL Toolbox",
          zh: "URL 工具箱",
        },
      },
      {
        href: "/tools#regex-tester",
        label: {
          en: "Regex Tester",
          zh: "正则测试器",
        },
      },
      {
        href: "/tools#text-redactor",
        label: {
          en: "Sensitive Data Redactor",
          zh: "敏感信息脱敏器",
        },
      },
      {
        href: "/tools#language-detector",
        label: {
          en: "Language Detector",
          zh: "语言检测器",
        },
      },
      {
        href: "/tools#text-translator",
        label: {
          en: "Multilingual Translator",
          zh: "多语言翻译",
        },
      },
      {
        href: "/tools#tone-rewriter",
        label: {
          en: "Tone Rewriter",
          zh: "语气重写器",
        },
      },
      {
        href: "/tools#long-text-summarizer",
        label: {
          en: "Long Text Summarizer",
          zh: "长文本摘要器",
        },
      },
      {
        href: "/tools#prompt-optimizer",
        label: {
          en: "Prompt Optimizer",
          zh: "Prompt 优化器",
        },
      },
      {
        href: "/tools#headline-rewriter",
        label: {
          en: "Headline Rewriter",
          zh: "标题改写器",
        },
      },
      {
        href: "/tools#bio-generator",
        label: {
          en: "Bio / Signature Generator",
          zh: "Bio / 签名生成器",
        },
      },
      {
        href: "/tools#social-post-compressor",
        label: {
          en: "Social Post Compressor",
          zh: "社媒压缩器",
        },
      },
      {
        href: "/tools#random-string",
        label: {
          en: "Random String Generator",
          zh: "随机字符串生成器",
        },
      },
    ],
  },
  {
    title: {
      en: "Experimental",
      zh: "实验工具",
    },
    items: [
      {
        href: "/tools#clash-yaml",
        label: {
          en: "Clash YAML subscription convert",
          zh: "Clash YAML 订阅转换",
        },
      },
      {
        href: "/tools#ctf-desensitizer",
        label: {
          en: "CTF Desensitizer",
          zh: "CTF 脱敏替换器",
        },
      },
      {
        href: "/tools#temp-mail",
        label: {
          en: "Temporary Mailbox",
          zh: "临时邮箱",
        },
      },
      {
        href: "/tools#vps-residual-value",
        label: {
          en: "VPS residual cycle value",
          zh: "VPS 剩余周期价值",
        },
      },
    ],
  },
];