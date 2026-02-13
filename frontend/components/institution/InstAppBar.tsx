"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { drawerToggleSlice } from "../../lib/store/features/drawerToggle";
import { useAppSelector, useAppDispatch } from "../../lib/store/hooks";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Avatar } from "primereact/avatar";

/* ============================= */
/*  Type Definition              */
/* ============================= */

interface Institution {
  name?: string;
  institutionImage?: string;
}

export default function InstAppBar() {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [institutionData, setInstitutionData] =
    useState<Institution | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const drawerState = useAppSelector((state) => state.drawer.data);
  const dispatch = useAppDispatch();

  /* ============================= */
  /*  Load Token On Mount          */
  /* ============================= */

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  /* ============================= */
  /*  Fetch Institution Data       */
  /* ============================= */

  useEffect(() => {
    if (token) {
      getInstitutionData();
    }
  }, [token]);

  const getInstitutionData = async () => {
    if (!token) return;

    try {
      const res = await axiosInstance.get(
        "/institution/get-institution",
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      if (res.data) {
        console.log("**", res.data.data)
        setInstitutionData(res.data.data || null);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Something went wrong"
        );
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  /* ============================= */
  /*  Close Dropdown Outside Click */
  /* ============================= */

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  /* ============================= */
  /*  Logout                       */
  /* ============================= */

  const handleLogout = async () => {
    if (!token) return;

    try {
      const res = await axiosInstance.post(
        "/institution/logout",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message);

      localStorage.removeItem("institution-token");
      setToken(null);
      setInstitutionData(null);

      router.push("/institution/login");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Something went wrong"
        );
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  /* ============================= */
  /*  Drawer Toggle                */
  /* ============================= */

  const handleOpen = () => {
    dispatch(
      drawerToggleSlice.actions.drawerToggleFu({
        data: true,
      })
    );
  };

  const isAdminPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/institution");

  const items = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
  ];

  console.log("=>", institutionData)

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-24">

          {/* Left Section */}
          <div className="flex items-center gap-4">
            {!drawerState && (
              <button
                onClick={handleOpen}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 transition"
              >
                <MenuIcon sx={{ fontSize: 36 }} />
              </button>
            )}


            <Image
              src="/assets/amplogo.png"
              alt="Logo"
              width={80}
              height={80}
              className="object-contain rounded-full"
            />

          </div>

          {/* Public Nav */}
          {!isAdminPage && (
            <nav className="hidden md:flex space-x-6">
              {items.map((item, idx) => (
                <Link key={idx} href={item.href}>
                  <span className="hover:text-blue-600 font-medium cursor-pointer">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          {/* Admin Profile */}
          {isAdminPage && (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
              >
                {/* Avatar Wrapper */}
                <div className="relative">
                  {institutionData?.institutionImage ? (
                    <Avatar
                      image={institutionData.institutionImage}
                      shape="circle"
                      size="large"
                      className="border-2 border-blue-500 shadow-sm"
                    />
                  ) : (
                    <Avatar
                      label={
                        institutionData?.name
                          ? institutionData.name.charAt(0).toUpperCase()
                          : "I"
                      }
                      shape="circle"
                      size="large"
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold"
                    />
                  )}

                  {/* Online Status Dot */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </div>

                {/* Institution Name + Role */}
                <div className="hidden sm:flex flex-col text-left max-w-[160px]">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {institutionData?.name || "Institution"}
                  </span>
                  <span className="text-xs text-gray-500">
                    Institution Admin
                  </span>
                </div>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                  <Link href="/institution/dashboard/profile">
                    <div
                      onClick={() => setProfileOpen(false)}
                      className="px-5 py-3 hover:bg-gray-100 cursor-pointer transition"
                    >
                      Profile
                    </div>
                  </Link>

                  <div className="border-t border-gray-200" />

                  <div
                    onClick={handleLogout}
                    className="px-5 py-3 text-red-600 hover:bg-red-50 cursor-pointer transition"
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          {!isAdminPage && (
            <div className="md:hidden">
              <button
                onClick={() =>
                  setMobileMenuVisible(
                    !mobileMenuVisible
                  )
                }
              >
                ☰
              </button>
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
    </header>
  );
}