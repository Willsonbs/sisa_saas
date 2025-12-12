import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ProfessionalDashboard from "./pages/professional/Dashboard";
import RoomsPage from "./pages/professional/Rooms";
import CreditsPage from "./pages/professional/Credits";
import AdminDashboard from "./pages/admin/Dashboard";
import RoomsManagement from "./pages/admin/RoomsManagement";
import CancellationRules from "./pages/admin/CancellationRules";
import Professionals from "./pages/admin/Professionals";
import EditRoom from "./pages/admin/EditRoom";
import Reports from "./pages/admin/Reports";
import BookRoom from "./pages/professional/BookRoom";
import Bookings from "./pages/professional/Bookings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      
      {/* Professional Routes */}
      <Route path="/dashboard" component={ProfessionalDashboard} />
      <Route path="/rooms" component={RoomsPage} />
      <Route path="/credits" component={CreditsPage} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/rooms" component={RoomsManagement} />
      <Route path="/admin/cancellation-rules" component={CancellationRules} />
      <Route path="/admin/professionals" component={Professionals} />
      <Route path="/admin/rooms/:id/edit" component={EditRoom} />
      <Route path="/admin/reports" component={Reports} />
      
      {/* Booking Routes */}
      <Route path="/rooms/:id/book" component={BookRoom} />
      <Route path="/bookings" component={Bookings} />
      
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
