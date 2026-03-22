import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const HomePage = lazy(async () => {
  const module = await import("./pages/HomePage.tsx");
  return { default: module.HomePage };
});

const JoinPage = lazy(async () => {
  const module = await import("./pages/JoinPage.tsx");
  return { default: module.JoinPage };
});

const RoomSessionPage = lazy(async () => {
  const module = await import("./pages/RoomSessionPage.tsx");
  return { default: module.RoomSessionPage };
});

const ProblemsPage = lazy(async () => {
  const module = await import("./pages/ProblemsPage.tsx");
  return { default: module.ProblemsPage };
});

const SolverPage = lazy(async () => {
  const module = await import("./pages/SolverPage.tsx");
  return { default: module.SolverPage };
});

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomCode" element={<JoinPage />} />
        <Route path="/room/:roomCode/session" element={<RoomSessionPage />}>
          <Route index element={<ProblemsPage />} />
          <Route path="solve" element={<SolverPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
        <Loader2 size={16} className="animate-spin" />
        Loading...
      </div>
    </div>
  );
}
