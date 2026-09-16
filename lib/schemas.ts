import { z } from "zod";
import { POST_CATEGORIES } from "@/lib/constants";

/* ========== 友链 ========== */

export const friendSchema = z.object({
  name: z.string().min(1, "name 不能为空"),
  url: z.string().url("url 必须是合法 URL"),
  description: z.string(),
  avatar: z.string(),
  github: z.string(),
});

export const friendsSchema = z.array(friendSchema);

/* ========== 文章 Frontmatter ========== */

export const postFrontmatterSchema = z.object({
  title: z.string().min(1).optional(),
  pubDate: z.string().or(z.date()).optional(),
  updatedDate: z.string().or(z.date()).optional(),
  description: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  category: z.enum(POST_CATEGORIES).optional(),
  tocDepth: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /**
   * 系列名（如「数学分析」）。同一系列的文章共享这个值。
   *
   * 与 tag 的区别：tag 是宽泛的主题词，series 表达**有序的、有阅读顺序的**一组文章。
   * 系列页 `/series/<名>/` 会按 seriesOrder 排序，而标签页只能按发布时间倒序。
   */
  series: z.string().min(1).optional(),
  /**
   * 系列内的序号，决定 `/series/<名>/` 的排列顺序与「上一章/下一章」。
   *
   * 用数字而非字符串，避免 `ch10` 排在 `ch2` 前面的字符串序陷阱。
   * 建议用 10、20、30 这样的间隔，方便以后在两章之间插入。
   */
  seriesOrder: z.number().finite().optional(),
});
