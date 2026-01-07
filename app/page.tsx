import { redirect } from "next/navigation";

export default function Home() {
  const marketingUrl =
    process.env.MARKETING_URL ||
    process.env.NEXT_PUBLIC_MARKETING_URL ||
    "http://localhost:4000";

  //redirect(marketingUrl);
}
