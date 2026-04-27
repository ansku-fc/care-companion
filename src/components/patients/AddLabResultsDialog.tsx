import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Props {
  patientId: string;
  /** Kept for backwards compatibility — no longer used since saving lives on the new page. */
  onSaved?: () => void;
  children?: React.ReactNode;
}

/**
 * Entry point to the redesigned lab ingestion flow.
 * Navigates to the dedicated /patients/:id/labs/new page.
 */
export function AddLabResultsDialog({ patientId, children }: Props) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-1.5">
      <Link to={`/patients/${patientId}/labs/new`}>
        {children ?? (
          <>
            <Plus className="h-4 w-4" /> Add Lab Results
          </>
        )}
      </Link>
    </Button>
  );
}
