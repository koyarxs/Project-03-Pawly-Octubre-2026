import type { Metadata } from "next";
import { Workspace } from "@/components/auth/workspace";
import "@/components/auth/auth.css";
export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};
export default function WorkspacePage() {
  return <Workspace />;
}
