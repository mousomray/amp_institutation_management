"use client";

import React, { useEffect } from "react";
import Header from "@/components/genaral/Header/Header";
import Link from "next/link";
import { redirect } from "next/navigation"


export default function page() {

  useEffect(() => {
    redirect("/institution")
  },[])
  return (
    <>
      <Header />
      <section className="relative w-full h-screen overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src="/assets/hero.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute top-0 left-0 w-full h-full bg-black/40"></div>

        
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Welcome to AMP Institution Management
          </h1>
          <p className="text-white/90 text-lg md:text-2xl mb-8 max-w-2xl">
            Manage students, staff, and courses efficiently with our modern platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/institution/login">
              <button className="bg-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-primaryHover transition">
                Get Started
              </button>
            </Link>
            
              <button className="bg-white text-primary px-6 py-3 rounded-md font-semibold hover:bg-gray-100 transition">
                Learn More
              </button>
            
          </div>
        </div>
      </section>
    </>
  );
}
