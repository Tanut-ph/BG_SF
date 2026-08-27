import { Suspense } from "react";
import JoinForm from "./JoinForm";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-mist">
          กำลังโหลด…
        </main>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
