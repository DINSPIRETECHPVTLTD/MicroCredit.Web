import { Button } from "@/components/ui/button";
import { reportService } from "@/services/report.service";

export default function Reports() {
  return (
    <div>
        <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Reports</h1>
        </div>
        <div>
            <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Member Wise Collection Sheet</h2>
                    <Button className="mt-4" onClick={() => reportService.getMemeberWiseCollectionReport()}>
                        Download Report
                    </Button>
                </div>
            </div>
        </div>
    </div>
  )
}