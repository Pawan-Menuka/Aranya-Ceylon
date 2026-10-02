import { StorefrontChrome } from "@/components/StorefrontChrome";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontChrome>{children}</StorefrontChrome>;
}
