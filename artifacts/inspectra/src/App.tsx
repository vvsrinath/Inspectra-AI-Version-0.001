import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ProductChrome } from "@/components/ProductChrome";
import HomePage from "@/pages/HomePage";
import AnalyzePage from "@/pages/AnalyzePage";
import ComparePage from "@/pages/ComparePage";
import CspPage from "@/pages/CspPage";
import DashboardPage from "@/pages/DashboardPage";
import ResultPage from "@/pages/ResultPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <ProductChrome>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/analyze" component={AnalyzePage} />
          <Route path="/compare" component={ComparePage} />
          <Route path="/csp" component={CspPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/results/:id" component={ResultPage} />
          <Route path="/login" component={LoginPage} />
          <Route component={NotFound} />
        </Switch>
      </ProductChrome>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
