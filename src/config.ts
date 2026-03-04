export const SITE = {
  website: "https://410666.xyz/", // replace this with your deployed domain
  author: "VibeWatcher",
  profile: "https://410666.xyz/",
  desc: "观者终端：Grok + GPT 镜像站，提供免登录 AI 对话与后续工具站服务，部署于 Cloudflare 边缘网络。",
  title: "观者终端 | Grok + GPT 镜像站与 AI 工具站",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/satnaing/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
