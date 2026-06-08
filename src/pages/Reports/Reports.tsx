import { Button } from "@/components/ui/button";
import { reportService } from "@/services/report.service";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Reports() {
  return (
    <div>
        <PageHeader title="Reports" />
        <div>
            <div className="rounded-lg border bg-card p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold">Member Wise Collection Sheet</h2>
                    <Button onClick={() => reportService.getMemeberWiseCollectionReport()}>
                        Download Report
                    </Button>
                </div>
            </div>
        </div>
    </div>
  )
}