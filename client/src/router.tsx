import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import OTPVerify from "./pages/OTPVerify";
import AdminDashboard from "./pages/AdminDashboard";
import { userStore } from "./store/userStore";

const checkPendingVerification = (): boolean => {
  return localStorage.getItem("pendingEmail") !== null;
};

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
  beforeLoad: () => {
    const user = userStore.getState().user;
    if (user) {
      throw redirect({
        to: user.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    }

    if (checkPendingVerification()) {
      throw redirect({ to: "/verify" });
    }
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: Register,
  beforeLoad: () => {
    const user = userStore.getState().user;
    if (user) {
      throw redirect({
        to: user.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    }

    if (checkPendingVerification()) {
      throw redirect({ to: "/verify" });
    }
  },
});

const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify",
  component: OTPVerify,
  beforeLoad: () => {
    const user = userStore.getState().user;
    if (user) {
      throw redirect({
        to: user.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    }

    if (!checkPendingVerification()) {
      throw redirect({ to: "/login" });
    }
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: UserDashboard,
  beforeLoad: () => {
    const user = userStore.getState().user;
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.role === "superAdmin") {
      throw redirect({ to: "/adminDashboard" });
    }
  },
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/adminDashboard",
  component: AdminDashboard,
  beforeLoad: () => {
    const user = userStore.getState().user;
    if (!user) {
      throw redirect({ to: "/login" });
    }
    if (user.role !== "superAdmin") {
      throw redirect({ to: "/dashboard" });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const user = userStore.getState().user;
    if (user) {
      throw redirect({
        to: user.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    } else if (checkPendingVerification()) {
      throw redirect({ to: "/verify" });
    } else {
      throw redirect({ to: "/login" });
    }
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  verifyRoute,
  dashboardRoute,
  adminDashboardRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-600">Page not found</p>
      </div>
    </div>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
