import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";

type SitemapItem = {
  loc: string;
  lastmod: string;
};

const toIso = (date: Date) => date.toISOString();

const xmlEscape = (value: string) =>
  value.replaceAll("&", "&").replaceAll("<", "<").replaceAll(">", ">");

const buildUrl = (path: string) => new URL(path, SITE.website).toString();

const buildUrlEntry = ({ loc, lastmod }: SitemapItem) => `
  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;

export const GET: APIRoute = async () => {
  const nowIso = toIso(new Date());

  const posts = await getCollection("blog", ({ data }) => !data.draft);

  const postEntries: SitemapItem[] = posts.map(({ id, filePath, data }) => ({
    loc: buildUrl(getPath(id, filePath)),
    lastmod: toIso(new Date(data.modDatetime ?? data.pubDatetime)),
  }));

  const staticEntries: SitemapItem[] = [
    { loc: buildUrl("/"), lastmod: nowIso },
    { loc: buildUrl("/posts"), lastmod: nowIso },
    { loc: buildUrl("/en/posts"), lastmod: nowIso },
    { loc: buildUrl("/chat"), lastmod: nowIso },
    { loc: buildUrl("/en/chat"), lastmod: nowIso },
  ];

  const allEntries = [...staticEntries, ...postEntries];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${allEntries
    .map(buildUrlEntry)
    .join("")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
