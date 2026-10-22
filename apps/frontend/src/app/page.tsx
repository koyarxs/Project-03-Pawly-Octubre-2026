import type { Metadata } from "next";
import { cache } from "react";
import { PublicWebsite } from "@/components/website/public-website";
import { getPublicWebsite } from "@/lib/website";

const publicSite = cache(async () => {
  try {
    return await getPublicWebsite();
  } catch {
    return null;
  }
});
export async function generateMetadata(): Promise<Metadata> {
  const site = await publicSite();
  const title = site?.content?.clinicName || "Clínica Veterinaria Porvenir";
  const description =
    site?.content?.heroDescription ||
    "Sitio de Clínica Veterinaria Porvenir, en preparación.";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_CL",
      siteName: title,
      url: "/",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Home() {
  const site = await publicSite();
  return <PublicWebsite initial={site?.content ?? null} />;
}
