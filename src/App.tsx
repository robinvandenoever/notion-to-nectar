import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "@/pages/Index";
import NewHive from "@/pages/NewHive";
import EditHive from "@/pages/EditHive";
import HiveDetail from "@/pages/HiveDetail";
import InspectHive from "@/pages/InspectHive";
import InspectionReport from "@/pages/InspectionReport";
import NotFound from "@/pages/NotFound";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Index />} />

        {/* Hives */}
        <Route path="/new-hive" element={<NewHive />} />
        <Route path="/edit-hive/:hiveId" element={<EditHive />} />
        <Route path="/hive/:hiveId" element={<HiveDetail />} />

        {/* Inspect flow */}
        <Route path="/inspect/:hiveId" element={<InspectHive />} />

        {/* Report page (what InspectHive navigates to) */}
        <Route path="/inspection-report" element={<InspectionReport />} />

        {/* Optional compatibility route (if you later add persisted inspections) */}
        <Route path="/inspection/:inspectionId" element={<InspectionReport />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;