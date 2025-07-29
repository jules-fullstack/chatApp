import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { userStore } from "./store/userStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function App() {
  const checkAuthStatus = userStore((state) => state.checkAuthStatus);
  const queryClient = new QueryClient();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Notifications />
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
