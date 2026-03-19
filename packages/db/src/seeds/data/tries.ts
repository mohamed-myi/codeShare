import type { ProblemFixture } from "./types.js";

export const triesProblems: ProblemFixture[] = [
  {
    problem: {
      slug: "implement-trie-prefix-tree",
      title: "Implement Trie (Prefix Tree)",
      difficulty: "medium",
      category: "Tries",
      description:
        "A trie (pronounced as \"try\") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. There are various applications of this data structure, such as autocomplete and spellchecker.\n\nImplement the Trie class:\n\n- `Trie()` Initializes the trie object.\n- `void insert(String word)` Inserts the string `word` into the trie.\n- `boolean search(String word)` Returns `true` if the string `word` is in the trie (i.e., was inserted before), and `false` otherwise.\n- `boolean startsWith(String prefix)` Returns `true` if there is a previously inserted string `word` that has the prefix `prefix`, and `false` otherwise.",
      constraints: [
        "1 <= word.length, prefix.length <= 2000",
        "word and prefix consist only of lowercase English letters.",
        "At most 3 * 10^4 calls in total will be made to insert, search, and startsWith.",
      ],
      solution: "Use a tree of nodes where each node has up to 26 children (one per letter) and a boolean flag indicating whether a complete word ends there. Insert traverses/creates nodes. Search traverses and checks the end flag. StartsWith traverses without checking the end flag.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/implement-trie-prefix-tree/",
    },
    testCases: [
      { input: { operations: ["Trie", "insert", "search", "search", "startsWith", "insert", "search"], args: [[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]] }, expectedOutput: [null, null, true, false, true, null, true], isVisible: true, orderIndex: 0 },
      { input: { operations: ["Trie", "insert", "search", "startsWith"], args: [[], ["hello"], ["hello"], ["hel"]] }, expectedOutput: [null, null, true, true], isVisible: true, orderIndex: 1 },
      { input: { operations: ["Trie", "search", "startsWith"], args: [[], ["a"], ["a"]] }, expectedOutput: [null, false, false], isVisible: true, orderIndex: 2 },
      { input: { operations: ["Trie", "insert", "insert", "search", "search"], args: [[], ["ab"], ["abc"], ["abc"], ["ab"]] }, expectedOutput: [null, null, null, true, true], isVisible: false, orderIndex: 3 },
      { input: { operations: ["Trie", "insert", "search", "search", "search"], args: [[], ["a"], ["a"], ["ab"], ["abc"]] }, expectedOutput: [null, null, true, false, false], isVisible: false, orderIndex: 4 },
      { input: { operations: ["Trie", "insert", "insert", "startsWith", "startsWith"], args: [[], ["abc"], ["xyz"], ["ab"], ["xy"]] }, expectedOutput: [null, null, null, true, true], isVisible: false, orderIndex: 5 },
      { input: { operations: ["Trie", "insert", "insert", "search", "startsWith"], args: [[], ["bat"], ["ball"], ["bal"], ["bal"]] }, expectedOutput: [null, null, null, false, true], isVisible: false, orderIndex: 6 },
      { input: { operations: ["Trie", "insert", "search", "startsWith", "insert", "search"], args: [[], ["app"], ["app"], ["ap"], ["ap"], ["ap"]] }, expectedOutput: [null, null, true, true, null, true], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Trie:\n    def __init__(self):\n        pass\n\n    def insert(self, word: str) -> None:\n        pass\n\n    def search(self, word: str) -> bool:\n        pass\n\n    def startsWith(self, prefix: str) -> bool:\n        pass",
      methodName: "Trie",
      parameterNames: [],
    },
    hints: [
      { hintText: "Each node in a trie represents a character. A path from root to a node spells out a prefix. Think about what data each node needs.", orderIndex: 0 },
      { hintText: "Each trie node has a dictionary (or array of 26) mapping characters to child nodes, plus a boolean `isEnd` flag. Insert creates nodes along the path. Search follows the path and checks `isEnd`. StartsWith follows the path without checking `isEnd`.", orderIndex: 1 },
    ],
  },
  {
    problem: {
      slug: "design-add-and-search-words-data-structure",
      title: "Design Add and Search Words Data Structure",
      difficulty: "medium",
      category: "Tries",
      description:
        "Design a data structure that supports adding new words and finding if a string matches any previously added string.\n\nImplement the `WordDictionary` class:\n\n- `WordDictionary()` Initializes the object.\n- `void addWord(word)` Adds `word` to the data structure, it can be matched later.\n- `bool search(word)` Returns `true` if there is any string in the data structure that matches `word` or `false` otherwise. `word` may contain dots `'.'` where dots can be matched with any letter.",
      constraints: [
        "1 <= word.length <= 25",
        "word in addWord consists of lowercase English letters.",
        "word in search consist of '.' or lowercase English letters.",
        "There will be at most 3 dots in word for search queries.",
        "At most 10^4 calls will be made to addWord and search.",
      ],
      solution: "Use a trie for storage. The addWord method is standard trie insertion. For search, traverse the trie character by character. When encountering '.', recursively try all 26 children. Return true if any path matches.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/design-add-and-search-words-data-structure/",
    },
    testCases: [
      { input: { operations: ["WordDictionary", "addWord", "addWord", "addWord", "search", "search", "search", "search"], args: [[], ["bad"], ["dad"], ["mad"], [".ad"], ["b.."], ["b.d"], ["..."]] }, expectedOutput: [null, null, null, null, true, true, true, true], isVisible: true, orderIndex: 0 },
      { input: { operations: ["WordDictionary", "addWord", "search", "search"], args: [[], ["a"], ["a"], ["."]] }, expectedOutput: [null, null, true, true], isVisible: true, orderIndex: 1 },
      { input: { operations: ["WordDictionary", "search"], args: [[], ["a"]] }, expectedOutput: [null, false], isVisible: true, orderIndex: 2 },
      { input: { operations: ["WordDictionary", "addWord", "addWord", "search", "search"], args: [[], ["ab"], ["abc"], ["ab"], ["abc"]] }, expectedOutput: [null, null, null, true, true], isVisible: false, orderIndex: 3 },
      { input: { operations: ["WordDictionary", "addWord", "search", "search"], args: [[], ["hello"], ["hell"], ["hello"]] }, expectedOutput: [null, null, false, true], isVisible: false, orderIndex: 4 },
      { input: { operations: ["WordDictionary", "addWord", "addWord", "search", "search", "search"], args: [[], ["at"], ["and"], [".at"], ["an."], ["a.d."]] }, expectedOutput: [null, null, null, false, true, false], isVisible: false, orderIndex: 5 },
      { input: { operations: ["WordDictionary", "addWord", "addWord", "search", "search"], args: [[], ["bat"], ["bar"], ["ba."], [".a."]] }, expectedOutput: [null, null, null, true, true], isVisible: false, orderIndex: 6 },
      { input: { operations: ["WordDictionary", "addWord", "search", "search", "search"], args: [[], ["ran"], ["ra."], ["r.n"], [".an"]] }, expectedOutput: [null, null, true, true, true], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class WordDictionary:\n    def __init__(self):\n        pass\n\n    def addWord(self, word: str) -> None:\n        pass\n\n    def search(self, word: str) -> bool:\n        pass",
      methodName: "WordDictionary",
      parameterNames: [],
    },
    hints: [
      { hintText: "A trie is well suited for prefix-based lookups. The challenge is handling the '.' wildcard that matches any character.", orderIndex: 0 },
      { hintText: "For addWord, use standard trie insertion. For search, traverse character by character. When you encounter '.', branch into all existing children and return true if any branch succeeds. Use DFS or recursion for the wildcard exploration.", orderIndex: 1 },
    ],
  },
  {
    problem: {
      slug: "word-search-ii",
      title: "Word Search II",
      difficulty: "hard",
      category: "Tries",
      description:
        "Given an `m x n` `board` of characters and a list of strings `words`, return all words on the board.\n\nEach word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.",
      constraints: [
        "m == board.length",
        "n == board[i].length",
        "1 <= m, n <= 12",
        "board[i][j] is a lowercase English letter.",
        "1 <= words.length <= 3 * 10^4",
        "1 <= words[i].length <= 10",
        "words[i] consists of lowercase English letters.",
        "All the strings of words are unique.",
      ],
      solution: "Build a trie from the word list. DFS from every cell on the board, following trie edges. When a complete word is found at a trie node, add it to results. Prune trie branches after finding words to avoid revisiting.",
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/word-search-ii/",
    },
    testCases: [
      { input: { board: [["o", "a", "a", "n"], ["e", "t", "a", "e"], ["i", "h", "k", "r"], ["i", "f", "l", "v"]], words: ["oath", "pea", "eat", "rain"] }, expectedOutput: ["eat", "oath"], isVisible: true, orderIndex: 0 },
      { input: { board: [["a", "b"], ["c", "d"]], words: ["abcb"] }, expectedOutput: [], isVisible: true, orderIndex: 1 },
      { input: { board: [["a"]], words: ["a"] }, expectedOutput: ["a"], isVisible: true, orderIndex: 2 },
      { input: { board: [["a", "b"], ["c", "d"]], words: ["ab", "cb", "ad", "bd", "ac", "ca", "da", "bc", "db", "adcb", "dabc", "abb", "acb"] }, expectedOutput: ["ab", "ac", "bd", "ca", "db"], isVisible: false, orderIndex: 3 },
      { input: { board: [["a", "a"]], words: ["aaa"] }, expectedOutput: [], isVisible: false, orderIndex: 4 },
      { input: { board: [["a", "b", "c"], ["a", "e", "d"], ["a", "f", "g"]], words: ["abcdefg", "gfedcba", "eaabcdgf", "bef", "deabc"] }, expectedOutput: ["abcdefg", "bef", "eaabcdgf", "gfedcba"], isVisible: false, orderIndex: 5 },
      { input: { board: [["a", "b"], ["a", "a"]], words: ["aba", "baa", "bab", "aaab", "aaa", "aaaa", "aaba"] }, expectedOutput: ["aaa", "aaab", "aaba", "aba", "baa"], isVisible: false, orderIndex: 6 },
      { input: { board: [["o", "a", "b", "n"], ["o", "t", "a", "e"], ["a", "h", "k", "r"], ["a", "f", "l", "v"]], words: ["oa", "oaa"] }, expectedOutput: ["oa", "oaa"], isVisible: false, orderIndex: 7 },
    ],
    boilerplate: {
      language: "python",
      template: "class Solution:\n    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n        pass",
      methodName: "findWords",
      parameterNames: ["board", "words"],
    },
    hints: [
      { hintText: "Searching for each word independently with DFS is too slow when there are many words. Think about how to search for all words simultaneously.", orderIndex: 0 },
      { hintText: "Build a trie from all words. Start a DFS from every cell, following the trie edges. If you reach a node that marks the end of a word, add it to results.", orderIndex: 1 },
      { hintText: "Optimize by pruning: remove trie leaf nodes after finding a word to avoid redundant searches. Mark visited cells during DFS and unmark on backtrack. Stop early if the current trie node has no children.", orderIndex: 2 },
    ],
  },
];
