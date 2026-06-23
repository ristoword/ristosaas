import { Suspense } from "react";
import { SignupPage } from "@/components/signup/signup-page";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense>
      <SignupPage />
    </Suspense>
  );
}
