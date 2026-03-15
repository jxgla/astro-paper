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
    ],
  },
  {
    title: {
      en: "Productivity",
      zh: "效率工具",
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
        href: "/tools#address-generator",
        label: {
          en: "Address Generator",
          zh: "地址生成器",
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