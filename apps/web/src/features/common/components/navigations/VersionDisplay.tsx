"use client";

import { JsonApiServerRequest } from "@/jsonApi/JsonApiServerRequest";
import { getCookie } from "cookies-next";
import { useEffect, useState } from "react";
import packageInfo from "../../../../../package.json";

export const getAppVersion = () => {
  return packageInfo.version;
};

export default function VersionDisplay() {
  const [apiVersion, setApiVersion] = useState("Loading...");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchApiVersion = async () => {
      try {
        const token = await getCookie("token");
        const baseUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;

        const response = await JsonApiServerRequest({
          detail: "GET",
          link: `${baseUrl}version`,
          token: token?.toString(),
          language: "it",
        });

        if (!response.ok) {
          throw new Error(`Error fetching API version: ${response.status}`);
        }

        setApiVersion(response.data.version);
      } catch (error) {
        console.error("Failed to fetch API version:", error);
        setApiVersion("Error");
      }
    };

    if (apiUrl) {
      fetchApiVersion();
    } else {
      setApiVersion("API URL not configured");
    }
  }, [apiUrl]);

  return (
    <div className="text-muted-foreground flex w-full flex-col text-xs">
      <div className="flex w-full flex-row justify-between">
        <div className="flex w-1/2">Asset2Go Version</div>
        <div className="flex w-1/2">{getAppVersion()}</div>
      </div>
      <div className="flex w-full flex-row justify-between">
        <div className="flex w-1/2">API Version</div>
        <div className="flex w-1/2">{apiVersion}</div>
      </div>
    </div>
  );
}
