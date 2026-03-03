import type { CollectionEntry } from "astro:content";
import { SITE } from "@/config";

const postFilter = ({ data, id }: CollectionEntry<"blog">) => {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;

  // 屏蔽原主题的示例文章
  const isNotRelease = !id.startsWith("_releases/");

  return !data.draft && (import.meta.env.DEV || isPublishTimePassed) && isNotRelease;
};

export default postFilter;
