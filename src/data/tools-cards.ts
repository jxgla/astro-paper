export type ToolsCardLocale = "en" | "zh";

export type ToolsCardDefinition = {
  cardId: "headline-rewriter" | "bio-generator" | "abstract-meme-text" | "social-post-compressor";
  toolId: "headline-rewriter" | "bio-generator" | "meme-text" | "social-compressor";
  badge: string;
  locale: {
    en: {
      title: string;
      description: string;
      inputLabel: string;
      inputPlaceholder: string;
      modeLabel: string;
      modeOptions: Array<{ value: string; label: string }>;
      primaryLabel: string;
      rerollLabel: string;
      copyLabel: string;
      clearLabel: string;
      status: string;
      outputLabel: string;
      outputPlaceholder: string;
      alternativesLabel: string;
    };
    zh: {
      title: string;
      description: string;
      inputLabel: string;
      inputPlaceholder: string;
      modeLabel: string;
      modeOptions: Array<{ value: string; label: string }>;
      primaryLabel: string;
      rerollLabel: string;
      copyLabel: string;
      clearLabel: string;
      status: string;
      outputLabel: string;
      outputPlaceholder: string;
      alternativesLabel: string;
    };
  };
};

export const FUN_AI_TOOL_CARDS: ToolsCardDefinition[] = [
  {
    cardId: "headline-rewriter",
    toolId: "headline-rewriter",
    badge: "AI",
    locale: {
      en: {
        title: "Headline Rewriter",
        description: "Generate stronger blog, social, or SEO-friendly titles from a rough headline or topic.",
        inputLabel: "Topic or draft headline",
        inputPlaceholder: "Paste a topic, a post summary, or a rough title",
        modeLabel: "Goal",
        modeOptions: [
          { value: "blog", label: "Blog title" },
          { value: "social", label: "Social title" },
          { value: "seo", label: "SEO-friendly" },
        ],
        primaryLabel: "Rewrite",
        rerollLabel: "Another version",
        copyLabel: "Copy",
        clearLabel: "Clear",
        status: "Helpful when your original title is clear but not punchy enough.",
        outputLabel: "Selected headline",
        outputPlaceholder: "Headline result will appear here",
        alternativesLabel: "Alternatives",
      },
      zh: {
        title: "标题改写器",
        description: "把草稿标题或主题改成更适合博客、社媒或 SEO 的标题版本。",
        inputLabel: "主题或原标题",
        inputPlaceholder: "输入主题、文章摘要，或一个普通标题",
        modeLabel: "目标",
        modeOptions: [
          { value: "blog", label: "博客标题" },
          { value: "social", label: "社媒标题" },
          { value: "seo", label: "SEO 友好" },
        ],
        primaryLabel: "改写",
        rerollLabel: "换一版",
        copyLabel: "复制",
        clearLabel: "清空",
        status: "适合标题意思对了，但还不够抓眼的时候。",
        outputLabel: "已选标题",
        outputPlaceholder: "结果会显示在这里",
        alternativesLabel: "候选版本",
      },
    },
  },
  {
    cardId: "bio-generator",
    toolId: "bio-generator",
    badge: "AI",
    locale: {
      en: {
        title: "Bio / Signature Generator",
        description: "Create short bios for GitHub, social profiles, or personal-site intros from a rough self-description.",
        inputLabel: "About you",
        inputPlaceholder: "Describe your role, vibe, interests, or what you want people to know",
        modeLabel: "Format",
        modeOptions: [
          { value: "github", label: "GitHub bio" },
          { value: "social", label: "Social bio" },
          { value: "site", label: "Personal site intro" },
        ],
        primaryLabel: "Generate",
        rerollLabel: "Another version",
        copyLabel: "Copy",
        clearLabel: "Clear",
        status: "Useful when you need something short, clean, and easy to paste.",
        outputLabel: "Generated bio",
        outputPlaceholder: "Generated bio will appear here",
        alternativesLabel: "Alternatives",
      },
      zh: {
        title: "Bio / 签名生成器",
        description: "根据你的身份、风格和兴趣，快速生成 GitHub bio、社媒简介或个人网站介绍。",
        inputLabel: "关于你",
        inputPlaceholder: "描述你的角色、气质、兴趣或想让别人记住你的点",
        modeLabel: "输出格式",
        modeOptions: [
          { value: "github", label: "GitHub bio" },
          { value: "social", label: "社媒简介" },
          { value: "site", label: "个人站介绍" },
        ],
        primaryLabel: "生成",
        rerollLabel: "换一版",
        copyLabel: "复制",
        clearLabel: "清空",
        status: "适合需要一段短、干净、可直接粘贴的自我介绍时使用。",
        outputLabel: "生成结果",
        outputPlaceholder: "生成结果会显示在这里",
        alternativesLabel: "候选版本",
      },
    },
  },
  {
    cardId: "abstract-meme-text",
    toolId: "meme-text",
    badge: "AI",
    locale: {
      en: {
        title: "Abstract Meme Text Generator",
        description: "Generate weird, lightweight, shareable meme lines from a topic, mood, or internet situation.",
        inputLabel: "Topic or vibe",
        inputPlaceholder: "Describe the vibe, person, or situation you want meme text for",
        modeLabel: "Flavor",
        modeOptions: [
          { value: "absurd", label: "Absurd" },
          { value: "dry", label: "Dry" },
          { value: "dramatic", label: "Dramatic" },
        ],
        primaryLabel: "Generate",
        rerollLabel: "Another version",
        copyLabel: "Copy",
        clearLabel: "Clear",
        status: "Best for short shareable text instead of full jokes or essays.",
        outputLabel: "Generated text",
        outputPlaceholder: "Generated meme text will appear here",
        alternativesLabel: "Alternatives",
      },
      zh: {
        title: "抽象梗文生成器",
        description: "根据人物、主题或情绪，生成轻量、抽象、适合转发的短梗文本。",
        inputLabel: "主题或 vibe",
        inputPlaceholder: "描述你想做梗的对象、场景或情绪",
        modeLabel: "风格",
        modeOptions: [
          { value: "absurd", label: "抽象离谱" },
          { value: "dry", label: "冷面干巴" },
          { value: "dramatic", label: "戏剧化" },
        ],
        primaryLabel: "生成",
        rerollLabel: "换一版",
        copyLabel: "复制",
        clearLabel: "清空",
        status: "更适合短句梗文，不适合长笑话或完整段子。",
        outputLabel: "生成结果",
        outputPlaceholder: "结果会显示在这里",
        alternativesLabel: "候选版本",
      },
    },
  },
  {
    cardId: "social-post-compressor",
    toolId: "social-compressor",
    badge: "AI",
    locale: {
      en: {
        title: "Social Post Compressor",
        description: "Compress long text into a one-line, three-line, or tweet-length shareable version.",
        inputLabel: "Source text",
        inputPlaceholder: "Paste the full post, thread, or note you want to compress",
        modeLabel: "Target format",
        modeOptions: [
          { value: "oneline", label: "One line" },
          { value: "threeline", label: "Three lines" },
          { value: "tweet", label: "Tweet length" },
        ],
        primaryLabel: "Compress",
        rerollLabel: "Another version",
        copyLabel: "Copy",
        clearLabel: "Clear",
        status: "Good when you already wrote too much and need something post-ready.",
        outputLabel: "Compressed version",
        outputPlaceholder: "Compressed result will appear here",
        alternativesLabel: "Alternatives",
      },
      zh: {
        title: "社媒压缩器",
        description: "把长文压成一句版、三句版或 tweet 长度，方便快速发社媒或同步动态。",
        inputLabel: "原文",
        inputPlaceholder: "粘贴完整长文、线程或笔记",
        modeLabel: "目标格式",
        modeOptions: [
          { value: "oneline", label: "一句版" },
          { value: "threeline", label: "三句版" },
          { value: "tweet", label: "Tweet 长度" },
        ],
        primaryLabel: "压缩",
        rerollLabel: "换一版",
        copyLabel: "复制",
        clearLabel: "清空",
        status: "适合你已经写太长，想快速压成可发版本的时候。",
        outputLabel: "压缩结果",
        outputPlaceholder: "压缩结果会显示在这里",
        alternativesLabel: "候选版本",
      },
    },
  },
];
