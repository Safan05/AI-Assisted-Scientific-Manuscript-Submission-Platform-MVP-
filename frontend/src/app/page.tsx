// src/app/page.tsx — root redirect
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
