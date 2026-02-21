import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HiveDetail from "./pages/HiveDetail";
import InspectHive from "./pages/InspectHive";
import InspectionReport from "./pages/InspectionReport";
import NewHive from "./pages/NewHive";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/hive/:id" element={<HiveDetail />} />
          <Route path="/inspect/:hiveId" element={<InspectHive />} />
          <Route path="/inspection/:id" element={<InspectionReport />} />
          <Route path="/new-hive" element={<NewHive />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
