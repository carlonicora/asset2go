import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

//https://nextjs.org/docs/app/api-reference/functions/generate-metadata

export async function generateSpecificMetadata(params: {
  title?: string;
  description?: string;
  url?: string;
}): Promise<Metadata> {
  const t = await getTranslations();

  const url = (await headers()).get("x-full-url") ?? process.env.NEXT_PUBLIC_ADDRESS;

  const title: string = params.title ? `${params.title} | ${t(`generic.title`)}` : t(`generic.title`);
  const description = params.description ? params.description : t(`generic.description`);

  const response: Metadata = {
    title: title,
    description: description,
    keywords: [],
    publisher: "Asset2Go",
    openGraph: {
      type: "website",
      title: title,
      description: description,
      url: url,
      siteName: "Asset2Go",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_ADDRESS ?? ""),
    alternates: {
      canonical: url,
      languages: {
        it: "/it",
      },
    },
  };

  return response;
}
