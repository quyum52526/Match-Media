"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { RequestVerificationModal } from "./RequestVerificationModal";
import { ShieldCheckIcon } from "@/components/ui/icons";

export function RequestVerificationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <ShieldCheckIcon width={16} height={16} />
        Request Verification
      </Button>
      <RequestVerificationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
