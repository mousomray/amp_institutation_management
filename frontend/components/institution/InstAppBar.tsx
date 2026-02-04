"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MenuIcon from "@mui/icons-material/Menu";
import { drawerToggleSlice } from "../../lib/store/features/drawerToggle";
import { useAppSelector, useAppDispatch } from "../../lib/store/hooks";
import { useRouter } from 'next/navigation'
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";




export default function InstAppBar() {



  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
   const [token, setToken] = useState<string | null>(null);

useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  



  const pathname = usePathname();
  const drawerState = useAppSelector((state) => state.drawer.data);

    const dispatch = useAppDispatch();
    const router = useRouter()
    const handleOpen = () => {
      dispatch(drawerToggleSlice.actions.drawerToggleFu({ data: true }));
    };
  const isAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/institution");

  const items = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
  ];
  const handleLogout = async() => {
   try {
      const res = await axiosInstance.post("/institution/logout",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      toast.success(res.data.message)
      router.push("/institution/login")
      localStorage.removeItem("institution-token")
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || 'Something went wrong'
        toast.error(message)
      } else {
        toast.error('Unexpected error occurred')
      }
    }
   

  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background  backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          {/* Left side: Menu + Logo */}
          <div className="flex items-center gap-4">
            {/* Menu Icon */}
            {
                !drawerState ? <button
              onClick={handleOpen}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 transition"
            >
              <MenuIcon className="text-primary" sx={{ fontSize: 36 }} />
            </button> : null
            }

            {/* Logo */}
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

          {/* Desktop Nav Items */}
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

          {isAdminPage && (
  <div className="flex">
    <button
      onClick={handleLogout}
      className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md font-medium"
    >
      Logout
    </button>
  </div>
)}

          {/* Desktop Sign In */}
          {!isAdminPage && (
            <div className="hidden md:flex">
              <Link href="/doctor/sign-in">
                <button className="bg-primary text-white hover:bg-primaryHover px-4 py-2 rounded-md font-medium">
                  Sign In
                </button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
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

      {/* Mobile Menu */}
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
      <ToastContainer/>
    </header>
  );
}
