import NutritionistScheduleList from "@/components/AMS/nutritionist-schedules/NutritionistScheduleList";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";

export default function Page() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <PageHeader title="Nutritionist Schedules" />

          {/* Component */}
          <NutritionistScheduleList />
        </div>
      </div>
    </DashboardLayout>
  )
}