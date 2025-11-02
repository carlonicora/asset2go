import { parseChangelog } from "@/lib/changelog-parser";
import PageContainer from "@/features/common/components/containers/PageContainer";
import { ChangelogTimeline } from "./ChangelogTimeline";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog - Asset2Go",
  description: "See what's new in Asset2Go",
};

export default async function ChangelogPage() {
  const versions = await parseChangelog();

  return (
    <PageContainer testId="page-changelog-container">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Changelog</h1>
          <p className="text-muted-foreground">
            All notable changes to Asset2Go are documented here.
          </p>
        </div>

        <ChangelogTimeline versions={versions} />
      </div>
    </PageContainer>
  );
}
