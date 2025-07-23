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
import { API_BASE_URL } from "./config";
import { userStore } from "./store/userStore";

const checkPendingVerification = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check-pending`, {
      method: "GET",
      credentials: "include",
    });
    return response.status === 200;
  } catch {
    return false;
  }
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
  beforeLoad: async () => {
    const { isLoading } = userStore.getState();

    if (isLoading) {
      await new Promise((resolve) => {
        const unsubscribe = userStore.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const currentUser = userStore.getState().user;
    if (currentUser) {
      throw redirect({
        to:
          currentUser.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    }

    if (await checkPendingVerification()) {
      throw redirect({ to: "/verify" });
    }
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: Register,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      invitation: search.invitation as string | undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    // If there's an invitation token, allow access regardless of auth status
    if (search.invitation) {
      return;
    }

    const { isLoading } = userStore.getState();

    if (isLoading) {
      await new Promise((resolve) => {
        const unsubscribe = userStore.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const currentUser = userStore.getState().user;
    if (currentUser) {
      throw redirect({
        to:
          currentUser.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    }

    if (await checkPendingVerification()) {
      throw redirect({ to: "/verify" });
    }
  },
});

const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify",
  component: OTPVerify,
  beforeLoad: async () => {
    const { isLoading } = userStore.getState();

    if (isLoading) {
      await new Promise((resolve) => {
        const unsubscribe = userStore.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const currentUser = userStore.getState().user;
    if (currentUser) {
      throw redirect({
        to:
          currentUser.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    }

    if (!(await checkPendingVerification())) {
      throw redirect({ to: "/login" });
    }
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: UserDashboard,
  beforeLoad: async () => {
    const { isLoading } = userStore.getState();

    if (isLoading) {
      await new Promise((resolve) => {
        const unsubscribe = userStore.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const currentUser = userStore.getState().user;
    if (!currentUser) {
      throw redirect({ to: "/login" });
    }
    if (currentUser.role === "superAdmin") {
      throw redirect({ to: "/adminDashboard" });
    }
  },
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/adminDashboard",
  component: AdminDashboard,
  beforeLoad: async () => {
    const { isLoading } = userStore.getState();

    if (isLoading) {
      await new Promise((resolve) => {
        const unsubscribe = userStore.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const currentUser = userStore.getState().user;
    if (!currentUser) {
      throw redirect({ to: "/login" });
    }
    if (currentUser.role !== "superAdmin") {
      throw redirect({ to: "/dashboard" });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const { isLoading } = userStore.getState();

    if (isLoading) {
      await new Promise((resolve) => {
        const unsubscribe = userStore.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(void 0);
          }
        });
      });
    }

    const currentUser = userStore.getState().user;
    if (currentUser) {
      throw redirect({
        to:
          currentUser.role === "superAdmin" ? "/adminDashboard" : "/dashboard",
      });
    } else if (await checkPendingVerification()) {
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
