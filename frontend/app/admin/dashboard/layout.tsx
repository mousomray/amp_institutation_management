"use client";

import NavBar from "@/components/admin/AdminAppBar";
import AdminAppBar from "@/components/admin/AdminAppBar";
//import DrawerBar from "@/components/admin/AdminDrawer";
import { useAppSelector } from "@/lib/store/hooks";


import dynamic from "next/dynamic";

const DrawerBar = dynamic(() => import("@/components/admin/AdminDrawer"), { ssr: false });
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const drawerState = useAppSelector((state) => state.drawer.data);
    return (
        <div className="flex flex-col ">
            <AdminAppBar />
            <div className=" flex flex-row"> <DrawerBar type={false} />
                <div
                    className={`transition-all  duration-300 mt-24 ${drawerState ? "w-[calc(100vw-240px)] " : "w-full"
                        }`}
                >
                    {children}
                </div>

            </div>
        </div>

    );
}
