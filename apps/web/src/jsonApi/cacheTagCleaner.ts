"use server";

// MIGRATED: Next.js 16 - revalidateTag now requires a profile parameter
import { revalidateTag } from "next/cache";

export default async function cacheTagCleaner(tag?: string): Promise<void> {
  if (!tag) return;
  // Using 'max' profile for background cache invalidation
  revalidateTag(tag, "max");
}
