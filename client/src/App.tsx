import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { userStore } from "./store/userStore";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function App() {
  const checkAuthStatus = userStore((state) => state.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <>
      <MantineProvider>
        <Notifications />
        <RouterProvider router={router} />
      </MantineProvider>
    </>
  );
}

export default App;
