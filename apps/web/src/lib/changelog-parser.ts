import fs from "fs";
import path from "path";

export interface ChangelogEntry {
  message: string;
  commitHash?: string;
  commitUrl?: string;
}

export interface ChangelogVersion {
  version: string;
  date: string;
  compareUrl?: string;
  categories: {
    features?: ChangelogEntry[];
    bugFixes?: ChangelogEntry[];
    chores?: ChangelogEntry[];
    documentation?: ChangelogEntry[];
    refactoring?: ChangelogEntry[];
    performance?: ChangelogEntry[];
  };
}

/**
 * Parse CHANGELOG.md following conventional-changelog format
 * Supports emoji categories: 🚀 Features, 🐛 Bug Fixes, ♻️ Chores, etc.
 */
export async function parseChangelog(): Promise<ChangelogVersion[]> {
  try {
    const changelogPath = path.join(process.cwd(), "../../CHANGELOG.md");

    if (!fs.existsSync(changelogPath)) {
      console.error("[Changelog Parser] CHANGELOG.md not found at:", changelogPath);
      console.error("[Changelog Parser] process.cwd():", process.cwd());
      return [];
    }

    const content = fs.readFileSync(changelogPath, "utf-8");

    const versions: ChangelogVersion[] = [];
    const lines = content.split("\n");

    let currentVersion: ChangelogVersion | null = null;
    let currentCategory: keyof ChangelogVersion["categories"] | null = null;

    for (const line of lines) {
      // Parse version header: ## [1.8.6](https://github.com/...) (2025-11-02)
      const versionMatch = line.match(/^## \[(.+?)\]\((.+?)\) \((.+?)\)/);
      if (versionMatch) {
        if (currentVersion) {
          versions.push(currentVersion);
        }
        currentVersion = {
          version: versionMatch[1],
          date: versionMatch[3],
          compareUrl: versionMatch[2],
          categories: {},
        };
        currentCategory = null;
        continue;
      }

      // Parse category: ### 🚀 Features
      const categoryMatch = line.match(/^### (.+?) (.+)/);
      if (categoryMatch && currentVersion) {
        const categoryName = categoryMatch[2].trim();
        currentCategory = mapCategoryNameToKey(categoryName);
        if (currentCategory && !currentVersion.categories[currentCategory]) {
          currentVersion.categories[currentCategory] = [];
        }
        continue;
      }

      // Parse commit entry: * description ([hash](url))
      const commitMatch = line.match(/^\* (.+) \(\[([a-f0-9]+)\]\((.+?)\)\)/);
      if (commitMatch && currentVersion && currentCategory) {
        currentVersion.categories[currentCategory]?.push({
          message: commitMatch[1],
          commitHash: commitMatch[2],
          commitUrl: commitMatch[3],
        });
      }
    }

    // Push last version
    if (currentVersion) {
      versions.push(currentVersion);
    }

    return versions;
  } catch (error) {
    console.error("[Changelog Parser] Error parsing CHANGELOG.md:", error);
    return [];
  }
}

/**
 * Map category names from CHANGELOG.md to internal keys
 */
function mapCategoryNameToKey(
  name: string
): keyof ChangelogVersion["categories"] | null {
  const categoryMap: Record<string, keyof ChangelogVersion["categories"]> = {
    Features: "features",
    "Bug Fixes": "bugFixes",
    Chores: "chores",
    Documentation: "documentation",
    "Code Refactoring": "refactoring",
    "Performance Improvements": "performance",
  };

  return categoryMap[name] || null;
}
