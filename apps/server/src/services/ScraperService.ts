import { problemRepository } from "@codeshare/db";
import type { Problem } from "@codeshare/shared";

const LEETCODE_URL_PATTERN = /^https:\/\/leetcode\.com\/problems\/([\w-]+)\/?$/;

export const scraperService = {
  /**
   * Validates a LeetCode URL, checks for existing record, then scrapes
   * and persists the problem if new. Returns the problem record.
   */
  async importFromUrl(url: string): Promise<Problem> {
    const match = url.match(LEETCODE_URL_PATTERN);
    if (!match) {
      throw new Error("URL must match https://leetcode.com/problems/<slug>/");
    }

    const slug = match[1];

    const existing =
      (await problemRepository.findBySourceUrl(url)) ??
      (await problemRepository.findBySlug(slug));
    if (existing) return existing;

    // TODO: Scrape with cheerio, extract description/constraints/test cases/signature,
    // transform to canonical format, persist via repositories
    throw new Error("Scraping not yet implemented");
  },
};
