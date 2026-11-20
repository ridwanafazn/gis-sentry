import type { Metadata } from "next";
import AboutHeader from "@/components/AboutHeader";
import TechMarquee from "@/components/TechMarquee";
import "./about.css";

export const metadata: Metadata = {
  title: "Tentang GIS Sentry",
  description: "Penjelasan produk, API, dan istilah yang dipakai GIS Sentry.",
};

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="about-page">
      <AboutHeader />
      <main className="about-main">{children}</main>
      <TechMarquee />
    </div>
  );
}
