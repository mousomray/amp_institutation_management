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
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Password } from "primereact/password";

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
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [institutionData, setInstitutionData] = useState<Institution | null>(null);

  // Password reset form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const getInstitutionData = async () => {
    if (!token) return;

    try {
      const res = await axiosInstance.get("/institution/get-institution", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (res.data) {
        console.log("**", res.data.data);
        setInstitutionData(res.data.data || null);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
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
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  /* ============================= */
  /*  Reset Password Handler       */
  /* ============================= */

  const handleResetPassword = async () => {
    // Validation
    if (!passwordData.currentPassword.trim()) {
      toast.error("Please enter your current password");
      return;
    }

    if (!passwordData.newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    try {
      setPasswordLoading(true);

      const res = await axiosInstance.put(
        "/institution/reset-password",
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(res.data.message || "Password updated successfully!");

      // Reset form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setResetPasswordVisible(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to update password");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setPasswordLoading(false);
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

  const isAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/institution");

  const items = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
  ];

  /* ============================= */
  /*  Password Dialog Header       */
  /* ============================= */

  const passwordDialogHeader = (
    <div className="text-center pb-4 border-b">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
        <i className="pi pi-lock text-3xl text-white"></i>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
      <p className="text-gray-500 mt-2">Update your account password</p>
    </div>
  );

  return (
    <>
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
                    <span className="text-xs text-gray-500">Institution Admin</span>
                  </div>
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                    <Link href="/institution/dashboard/profile">
                      <div
                        onClick={() => setProfileOpen(false)}
                        className="px-5 py-3 hover:bg-gray-100 cursor-pointer transition flex items-center gap-3"
                      >
                        <i className="pi pi-user text-blue-600"></i>
                        <span>Profile</span>
                      </div>
                    </Link>

                    <div
                      onClick={() => {
                        setProfileOpen(false);
                        setResetPasswordVisible(true);
                      }}
                      className="px-5 py-3 hover:bg-gray-100 cursor-pointer transition flex items-center gap-3"
                    >
                      <i className="pi pi-lock text-blue-600"></i>
                      <span>Reset Password</span>
                    </div>

                    <div className="border-t border-gray-200" />

                    <div
                      onClick={handleLogout}
                      className="px-5 py-3 text-red-600 hover:bg-red-50 cursor-pointer transition flex items-center gap-3"
                    >
                      <i className="pi pi-sign-out"></i>
                      <span>Logout</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            {!isAdminPage && (
              <div className="md:hidden">
                <button onClick={() => setMobileMenuVisible(!mobileMenuVisible)}>☰</button>
              </div>
            )}
          </div>
        </div>

      </header>

      {/* Reset Password Dialog */}
      <Dialog
        header={passwordDialogHeader}
        visible={resetPasswordVisible}
        style={{ width: "90vw", maxWidth: "500px" }}
        onHide={() => {
          if (!passwordLoading) {
            setResetPasswordVisible(false);
            setPasswordData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          }
        }}
        modal
        draggable={false}
      >
        <div className="px-6 py-4 space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i className="pi pi-lock text-blue-600"></i>
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon bg-blue-50">
                <i className="pi pi-key text-blue-600"></i>
              </span>
              <InputText
                type={showCurrentPassword ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                placeholder="Enter current password"
                className="w-full"
                disabled={passwordLoading}
              />
              <span
                className="p-inputgroup-addon cursor-pointer hover:bg-gray-100"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <i className={`pi ${showCurrentPassword ? "pi-eye-slash" : "pi-eye"}`}></i>
              </span>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i className="pi pi-lock text-green-600"></i>
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon bg-green-50">
                <i className="pi pi-shield text-green-600"></i>
              </span>
              <InputText
                type={showNewPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                placeholder="Enter new password (min 6 characters)"
                className="w-full"
                disabled={passwordLoading}
              />
              <span
                className="p-inputgroup-addon cursor-pointer hover:bg-gray-100"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                <i className={`pi ${showNewPassword ? "pi-eye-slash" : "pi-eye"}`}></i>
              </span>
            </div>
            <small className="text-gray-500 flex items-center gap-1">
              <i className="pi pi-info-circle"></i>
              Password must be at least 6 characters long
            </small>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i className="pi pi-check-circle text-green-600"></i>
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon bg-green-50">
                <i className="pi pi-verified text-green-600"></i>
              </span>
              <InputText
                type={showConfirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                placeholder="Re-enter new password"
                className="w-full"
                disabled={passwordLoading}
              />
              <span
                className="p-inputgroup-addon cursor-pointer hover:bg-gray-100"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`pi ${showConfirmPassword ? "pi-eye-slash" : "pi-eye"}`}></i>
              </span>
            </div>
            {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
              <small className="text-red-500 flex items-center gap-1">
                <i className="pi pi-times-circle"></i>
                Passwords do not match
              </small>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={() => {
                setResetPasswordVisible(false);
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
              outlined
              severity="secondary"
              className="flex-1 order-2 sm:order-1"
              disabled={passwordLoading}
            />
            <Button
              label={passwordLoading ? "Updating..." : "Update Password"}
              icon={passwordLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleResetPassword}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-lg hover:shadow-xl transition-shadow order-1 sm:order-2"
              loading={passwordLoading}
              disabled={passwordLoading}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}