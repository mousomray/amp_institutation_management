"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stack, Collapse } from "@mui/material";

import AddHomeIcon from "@mui/icons-material/AddHome";
import AddBoxIcon from "@mui/icons-material/AddBox";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ViewListIcon from "@mui/icons-material/ViewList";

/* ---------- MENU CONFIG ---------- */

const sidebarItems = [
  {
    id: "1",
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: <AddHomeIcon />,
  },
  {
    id: "2",
    label: "Institution",
    icon: <AccountBalanceIcon />,
    children: [
      {
        id: "2-1",
        label: "Add Institution",
        path: "/admin/dashboard/institution/add-institution",
        icon: <NoteAltIcon />,
      },
      {
        id: "2-2",
        label: "Institution List",
        path: "/admin/dashboard/institution",
        icon: <ViewListIcon />,
      },
    ],
  },
];

const settingsItem = {
  label: "Settings",
  path: "/admin/settings",
  icon: <SettingsIcon />,
};

/* ---------- COMPONENT ---------- */

export default function AdminSideBar() {
  const pathname = usePathname();

  /* Auto-open parent if child route is active */
  const [openMenu, setOpenMenu] = useState<string | null>(() => {
    const activeParent = sidebarItems.find((item) =>
      item.children?.some((child) => pathname.startsWith(child.path))
    );
    return activeParent?.id || null;
  });

  /* Check if parent should be active */
  const isParentActive = (item: any) =>
    item.children?.some((child : any) => pathname.startsWith(child.path));

  return (
    <Stack
      justifyContent="space-between"
      sx={{
        height: "100%",
        width: "100%",
        backgroundColor: "#fff",
        padding: 2,
      }}
    >
      {/* ---------- TOP ---------- */}
      <Stack gap={1}>
        {sidebarItems.map((item) =>
          item.children ? (
            <React.Fragment key={item.id}>
              {/* Parent Menu */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                onClick={() =>
                  setOpenMenu(openMenu === item.id ? null : item.id)
                }
                sx={{
                  cursor: "pointer",
                  padding: 1,
                  borderRadius: 1,
                  backgroundColor:
                    isParentActive(item) || openMenu === item.id
                      ? "#2563EB"
                      : "transparent",
                  color:
                    isParentActive(item) || openMenu === item.id
                      ? "#fff"
                      : "#000",
                  "&:hover": {
                    backgroundColor: "#2563EB",
                    color: "#fff",
                  },
                }}
              >
                <Stack direction="row" gap={1} alignItems="center">
                  {item.icon}
                  <span>{item.label}</span>
                </Stack>

                {openMenu === item.id ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </Stack>

              {/* Children */}
              <Collapse in={openMenu === item.id || isParentActive(item)}>
                <Stack pl={4} gap={0.5}>
                  {item.children.map((child) => (
                    <Link key={child.id} href={child.path}>
                      <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        sx={{
                          padding: 1,
                          borderRadius: 1,
                          cursor: "pointer",
                          backgroundColor:
                            pathname === child.path
                              ? "#1E40AF"
                              : "transparent",
                          color:
                            pathname === child.path ? "#fff" : "#000",
                          "&:hover": {
                            backgroundColor: "#1E40AF",
                            color: "#fff",
                          },
                        }}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </Stack>
                    </Link>
                  ))}
                </Stack>
              </Collapse>
            </React.Fragment>
          ) : (
            /* Single Menu */
            <Link key={item.id} href={item.path}>
              <Stack
                direction="row"
                gap={1}
                alignItems="center"
                sx={{
                  padding: 1,
                  borderRadius: 1,
                  cursor: "pointer",
                  backgroundColor:
                    pathname === item.path
                      ? "#2563EB"
                      : "transparent",
                  color:
                    pathname === item.path ? "#fff" : "#000",
                  "&:hover": {
                    backgroundColor: "#1E40AF",
                    color: "#fff",
                  },
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Stack>
            </Link>
          )
        )}
      </Stack>

      {/* ---------- BOTTOM SETTINGS ---------- */}
      <Link href={settingsItem.path}>
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          sx={{
            padding: 1,
            borderRadius: 1,
            cursor: "pointer",
            backgroundColor:
              pathname === settingsItem.path
                ? "#2563EB"
                : "transparent",
            color:
              pathname === settingsItem.path ? "#fff" : "#000",
            "&:hover": {
              backgroundColor: "#1E40AF",
              color: "#fff",
            },
          }}
        >
          {settingsItem.icon}
          <span>{settingsItem.label}</span>
        </Stack>
      </Link>
    </Stack>
  );
}
