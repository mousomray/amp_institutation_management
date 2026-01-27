"use client";

import React from "react";
import { Box, Drawer, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAppSelector, useAppDispatch } from "../../lib/store/hooks";
import { drawerToggleSlice } from "../../lib/store/features/drawerToggle";
import AdminSideBar from "./AdminSideBar";
import SideBar from "../institution/SideBar";

const drawerWidth = 240;

type DrawerBarProps = {
  type: boolean;
};

export default function DrawerBar({ type }: DrawerBarProps) {
  const drawerState = useAppSelector((state) => state.drawer.data);
  const dispatch = useAppDispatch();
   console.log("type:", type);
  const handleClose = () => {
    dispatch(drawerToggleSlice.actions.drawerToggleFu({ data: false }));
  };

  return (
   <Drawer
  variant="persistent"
  open={drawerState}
  anchor="left"
  sx={{
    width: drawerState ? drawerWidth : 0,
    flexShrink: 0,
    "& .MuiDrawer-paper": {
      width:  drawerState ? drawerWidth : 0,
      boxSizing: "border-box",
      top: 98,
      height: "calc(100vh - 98px)",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#FFFFFF",
      borderRight: "2px solid #E5E7EB",
      borderTop: "2px solid #E5E7EB",
    },
  }}
>
  {/* Header */}
  <Box
    sx={{
      p: 2,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: "#2563EB",
      flexShrink: 0,
    }}
  >
    <div />
    <IconButton onClick={handleClose} sx={{ color: "#2563EB" }}>
      <CloseIcon />
    </IconButton>
  </Box>

  {/* Sidebar */}
  <Box sx={{ flex: 1 }}>
    {type ? <SideBar /> : <AdminSideBar />}
  </Box>
</Drawer>

  );
}
