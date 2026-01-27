"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Stack,
  Collapse,
} from "@mui/material";

import AddHomeIcon from "@mui/icons-material/AddHome";
import AddBoxIcon from "@mui/icons-material/AddBox";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ViewListIcon from '@mui/icons-material/ViewList';

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

export default function AdminSideBar() {
  const pathname = usePathname();
  const [openInstitution, setOpenInstitution] = useState(true);

  return (
    <Stack
     justifyContent="space-between"
  sx={{
    height: "100%",   // fill drawer space
    width: "100%",
    backgroundColor: "#fff",
    padding: 2,
  }}
    >
      {/* TOP SECTION */}
      <Stack gap={1}>
        {sidebarItems.map((item) =>
          item.children ? (
            <React.Fragment key={item.id}>
              {/* Parent */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                onClick={() => setOpenInstitution(!openInstitution)}
                sx={{
                  cursor: "pointer",
                  padding: 1,
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "#2563EB", color: "#fff" },
                }}
              >
                <Stack direction="row" gap={1} alignItems="center">
                  {item.icon}
                  <span>{item.label}</span>
                </Stack>
                {openInstitution ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Stack>

              {/* Children */}
              <Collapse in={openInstitution}>
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
                            pathname === child.path ? "#2563EB" : "transparent",
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
                    pathname === item.path ? "#2563EB" : "transparent",
                  color: pathname === item.path ? "#fff" : "#000",
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

      {/* BOTTOM SETTINGS */}
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
              pathname === settingsItem.path ? "#2563EB" : "transparent",
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
