import React from 'react'
import Header from '@/components/genaral/Header/Header'
import Link from "next/link";

function page() {
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
    <source src="/assets/hero-admin.mp4" type="video/mp4" />
    Your browser does not support the video tag.
  </video>

  <div className="absolute top-0 left-0 w-full h-full bg-black/50"></div>

  <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
      Admin Dashboard for Smart Institutions
    </h1>

    <p className="text-white/90 text-lg md:text-2xl mb-8 max-w-2xl">
      Control students, staff, courses, attendance, and payments from one powerful admin panel.
    </p>

    <div className="flex flex-col sm:flex-row gap-4">
      <Link href="/admin/login">
        <button className="bg-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-primaryHover transition">
          Admin Login
        </button>
      </Link>

      <Link href="/features">
        <button className="bg-white text-primary px-6 py-3 rounded-md font-semibold hover:bg-gray-100 transition">
          View Features
        </button>
      </Link>
    </div>
  </div>
</section>

    </>
  )
}

export default page