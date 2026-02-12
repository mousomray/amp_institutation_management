"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const pathname = usePathname();

  
  const isAdminPage = pathname.startsWith("/admin");

  const items = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <header className="fixed w-full top-0 left-0 z-50 bg-white/10 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-24">

          
          <div className="flex items-center">
            <Link href={isAdminPage ? "/admin" : "/"}>
              <Image
                src="/assets/amplogo.png"
                alt="Logo"
                width={80}
                height={80}
                className="object-contain rounded-full"
              />
            </Link>
          </div>

          
          {!isAdminPage && (
            <nav className="hidden md:flex space-x-6">
              {items.map((item, idx) => (
                <Link key={idx} href={item.href}>
                  <span className="text-textPrimary hover:text-primary font-medium cursor-pointer">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          
          {!isAdminPage && (
            <div className="hidden md:flex">
              <Link href="/institution/login">
                <button className="bg-primary text-white hover:bg-primaryHover px-4 py-2 rounded-md font-medium">
                  Login
                </button>
              </Link>
            </div>
          )}

          
          {!isAdminPage && (
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuVisible(!mobileMenuVisible)}
                className="text-textPrimary"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuVisible ? (
                    <path strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      
      {!isAdminPage && mobileMenuVisible && (
        <div className="md:hidden bg-white shadow-md">
          <nav className="flex flex-col px-4 py-3 space-y-2">
            {items.map((item, idx) => (
              <Link key={idx} href={item.href}>
                <span
                  className="block py-2 text-textPrimary hover:text-primary"
                  onClick={() => setMobileMenuVisible(false)}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            <Link href="/doctor/sign-in">
              <button className="w-full bg-primary text-white py-2 rounded-md">
                Sign In
              </button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
