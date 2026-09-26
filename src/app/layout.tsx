import type {Metadata} from "next";
import {Geist_Mono, Poppins} from "next/font/google";
import "./globals.scss";
import {AuthProvider} from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    description: "Plataforma para interactuar y explorar el mercado de valoración de jugadores"
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="es" className={`${poppins.variable} ${geistMono.variable}`}>
        <head>
            <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
            <title>Medio Campo</title>
        </head>
        <body>
        <AuthProvider>
            <AppShell>{children}</AppShell>
        </AuthProvider>
        </body>
        </html>
    );
}
