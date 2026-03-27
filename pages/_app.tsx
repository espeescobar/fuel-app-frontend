import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";

// Importamos tu nuevo y fabuloso menú inferior
import BottomNav from "../components/BottomNav";

import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Escondemos el menú en la página de login (y en la raíz si es que redirige)
  const showBottomNav = router.pathname !== "/login" && router.pathname !== "/";

  return (
    <>
      <Head>
        <title>Fuel App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </Head>
      
      <div className="shell">
        <Component {...pageProps} />
      </div>

      {/* Aquí le decimos: Si NO es login, muestra la barra inferior */}
      {showBottomNav && <BottomNav />}
    </>
  );
}