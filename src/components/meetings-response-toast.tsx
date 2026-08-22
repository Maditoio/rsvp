"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function MeetingsResponseToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const responded = searchParams.get("responded");
    if (responded === "accept") {
      toast.success("Connection accepted. A meeting has been created — you can reschedule it in Meetings.");
    } else if (responded === "decline") {
      toast.success("Connection request declined.");
    } else {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("responded");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, searchParams, toast]);

  return null;
}
