"use client";

import { Link } from "@/i18n/routing";
import packageInfo from "../../../../../../../package.json";

export const getAppVersion = () => {
  return packageInfo.version;
};

export default function VersionDisplay() {
  return (
    <Link
      href="/changelog"
      className="text-muted-foreground hover:text-foreground flex w-full flex-col text-xs transition-colors"
    >
      <div className="flex w-full flex-row justify-between">
        <div className="flex w-full">Asset2Go Version</div>
        <div className="flex">{getAppVersion()}</div>
      </div>
    </Link>
  );
}
