"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AvailabilityModal } from "./AvailabilityModal";

interface AvailabilityButtonProps {
  atelier: string | null;
  allowedAteliers: string[];
}

export function AvailabilityButton({
  atelier,
  allowedAteliers,
}: AvailabilityButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="border border-slate-300"
      >
        <Search className="h-4 w-4" />
        Voir la disponibilité
      </Button>

      <AvailabilityModal
        isOpen={open}
        onClose={() => setOpen(false)}
        atelier={atelier}
        allowedAteliers={allowedAteliers}
      />
    </>
  );
}
