import { useRouter } from "next/router";
import Link from "next/link";

export default function BottomNav() {
  const router = useRouter();

  // Definimos nuestras 3 opciones principales
  const navLinks = [
    {
      name: "Dashboard",
      path: "/dashboard",
    },
    {
      name: "Reportes",
      path: "/reports",
    },
    {
      name: "Mensual",
      path: "/historial-mensual",
    }
  ];

  return (
    <nav className="bottom-nav">
      {navLinks.map((link) => {
        // Verificamos si la ruta actual coincide con el link para ponerlo "activo"
        const isActive = router.pathname === link.path;

        return (
          <Link href={link.path} key={link.name} className={`nav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">{link.icon}</span>
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}