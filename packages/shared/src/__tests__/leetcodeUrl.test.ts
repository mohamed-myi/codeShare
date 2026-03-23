import { describe, expect, it } from "vitest";
import { normalizeLeetCodeUrl } from "../leetcodeUrl.js";

describe("normalizeLeetCodeUrl", () => {
  const expected = {
    slug: "two-sum",
    canonicalUrl: "https://leetcode.com/problems/two-sum/",
  };

  describe("accepted formats", () => {
    it.each([
      ["https://leetcode.com/problems/two-sum/", "canonical with trailing slash"],
      ["https://leetcode.com/problems/two-sum", "no trailing slash"],
      ["http://leetcode.com/problems/two-sum/", "http upgraded"],
      ["leetcode.com/problems/two-sum/", "bare domain"],
      ["www.leetcode.com/problems/two-sum/", "www without protocol"],
      ["https://www.leetcode.com/problems/two-sum/", "www with https"],
      ["http://www.leetcode.com/problems/two-sum/", "www with http"],
      ["https://leetcode.com/problems/two-sum/description/", "extra /description"],
      ["https://leetcode.com/problems/two-sum/solutions/", "extra /solutions"],
      ["https://leetcode.com/problems/two-sum/submissions/", "extra /submissions"],
      ["https://leetcode.com/problems/two-sum/editorial/", "extra /editorial"],
      ["https://leetcode.com/problems/two-sum/?envType=daily-question", "query params"],
      ["https://leetcode.com/problems/two-sum/#description", "fragment"],
      ["  https://leetcode.com/problems/two-sum/  ", "whitespace trimmed"],
    ])("normalizes %s (%s)", (input) => {
      expect(normalizeLeetCodeUrl(input)).toEqual(expected);
    });

    it("handles slugs with numbers", () => {
      const result = normalizeLeetCodeUrl("https://leetcode.com/problems/3sum/");
      expect(result).toEqual({
        slug: "3sum",
        canonicalUrl: "https://leetcode.com/problems/3sum/",
      });
    });

    it("handles long hyphenated slugs", () => {
      const result = normalizeLeetCodeUrl(
        "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
      );
      expect(result).toEqual({
        slug: "longest-substring-without-repeating-characters",
        canonicalUrl:
          "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
      });
    });
  });

  describe("rejected formats", () => {
    it.each([
      ["", "empty string"],
      ["   ", "whitespace only"],
      ["https://example.com/problems/two-sum/", "non-LeetCode domain"],
      ["https://leetcode.com/contest/weekly-123/", "contest page"],
      ["https://leetcode.com/explore/", "explore page"],
      ["https://leetcode.com/discuss/", "discuss page"],
      ["https://leetcode.com/", "root page"],
      ["https://cn.leetcode.com/problems/two-sum/", "non-www subdomain"],
      ["not a url at all", "random text"],
    ])("returns null for %s (%s)", (input) => {
      expect(normalizeLeetCodeUrl(input)).toBeNull();
    });
  });
});
