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
import ImportContactsIcon from '@mui/icons-material/ImportContacts';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook'; // added for Books section
;

const sidebarItems = [
  {
    id: "1",
    label: "Dashboard",
    path: "/institution/dashboard",
    icon: <AddHomeIcon />,
  },
  {
    id: "2",
    label: "Course",
    icon: <ImportContactsIcon />,
    children: [
      {
        id: "2-1",
        label: "Add Course",
        path: "/institution/dashboard/course/add-course",
        icon: <NoteAltIcon />,
      },
      {
        id: "2-2",
        label: "Course List",
        path: "/institution/dashboard/course",
        icon: <ViewListIcon />,
      },
    ],
  },

   {
    id: "3",
    label: "Student",
    icon: <SupervisedUserCircleIcon />,
    children: [
      {
        id: "3-1",
        label: "Add Student",
        path: "/institution/dashboard/student/add-student",
        icon: <NoteAltIcon />,
      },
      {
        id: "3-2",
        label: "Student List",
        path: "/institution/dashboard/student",
        icon: <ViewListIcon />,
      },
    ],
  },

  // New Books section
  {
    id: "4",
    label: "Books",
    icon: <MenuBookIcon />,
    children: [
      {
        id: "4-1",
        label: "Add Book",
        path: "/institution/dashboard/book/add-book",
        icon: <AddBoxIcon />,
      },
      {
        id: "4-2",
        label: "Book List",
        path: "/institution/dashboard/book",
        icon: <ViewListIcon />,
      },
      {
        id: "4-3",
        label: "Book Issue",
        path: "/institution/dashboard/book/book-issue",
        icon: <NoteAltIcon />,
      },
      {
        id: "4-4",
        label: "Issued Books",
        path: "/institution/dashboard/book/issued-books",
        icon: <ViewListIcon />,
      },
      {
         id: "4-5",
        label: "Book Setting",
        path: "/institution/dashboard/book/setting",
        icon: <SettingsIcon/>,
      
      }
    ],
  },
];

const settingsItem = {
  label: "Settings",
  path: "/admin/settings",
  icon: <SettingsIcon />,
};

export default function SideBar() {
  const pathname = usePathname();
 const [openMenu, setOpenMenu] = useState<string | null>(null);

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
        onClick={() =>
          setOpenMenu(openMenu === item.id ? null : item.id)
        }
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

        {openMenu === item.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Stack>

      {/* Children */}
      <Collapse in={openMenu === item.id}>
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
    /* single menu item */
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
