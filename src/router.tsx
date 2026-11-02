import { PortalShell } from "./components/portal/portal-shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NucleoCentral from "./pages/NucleoCentral";
import Aplicaciones from "./pages/Aplicaciones";
import Nucleos from "./pages/Nucleos";
import Agentes from "./pages/Agentes";
import Conocimiento from "./pages/Conocimiento";
import Flujos from "./pages/Flujos";
import MatrizIA from "./pages/MatrizIA";
import Tareas from "./pages/Tareas";
import Integraciones from "./pages/Integraciones";
import Cuentas from "./pages/Cuentas";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

export const routers = [
  {
    path: "/login",
    name: "login",
    element: <Login />,
  },
  {
    path: "/",
    element: <PortalShell />,
    children: [
      { index: true, name: "home", element: <Dashboard /> },
      { path: "nucleo", name: "nucleo", element: <NucleoCentral /> },
      { path: "aplicaciones", name: "aplicaciones", element: <Aplicaciones /> },
      { path: "nucleos", name: "nucleos", element: <Nucleos /> },
      { path: "agentes", name: "agentes", element: <Agentes /> },
      { path: "conocimiento", name: "conocimiento", element: <Conocimiento /> },
      { path: "flujos", name: "flujos", element: <Flujos /> },
      { path: "chat", name: "chat", element: <MatrizIA /> },
      { path: "tareas", name: "tareas", element: <Tareas /> },
      { path: "integraciones", name: "integraciones", element: <Integraciones /> },
      { path: "cuentas", name: "cuentas", element: <Cuentas /> },
      { path: "configuracion", name: "configuracion", element: <Configuracion /> },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
