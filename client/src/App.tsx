import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

function App() {
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
