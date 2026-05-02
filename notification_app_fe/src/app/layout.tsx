"use client";

import React from "react";
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { usePathname } from "next/navigation";



const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#60a5fa" },      // blue-400
    secondary: { main: "#f472b6" },    // pink-400
    background: { default: "#0f172a", paper: "#1e293b" },
    text: { primary: "#f1f5f9", secondary: "#94a3b8" },
  },
  typography: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.5px" },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(148,163,184,0.12)",
        },
      },
    },
  },
});


function Navbar() {
  const pathname = usePathname();
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <NotificationsActiveIcon sx={{ color: "primary.main" }} />
        <Typography variant="h6" sx={{ flexGrow: 1, color: "text.primary" }}>
          Campus Notifications
        </Typography>
        <Button
          component={Link}
          href="/"
          variant={pathname === "/" ? "contained" : "text"}
          color="primary"
          startIcon={<NotificationsActiveIcon />}
          size="small"
        >
          All
        </Button>
        <Button
          component={Link}
          href="/priority"
          variant={pathname === "/priority" ? "contained" : "text"}
          color="secondary"
          startIcon={<StarIcon />}
          size="small"
        >
          Priority Inbox
        </Button>
      </Toolbar>
    </AppBar>
  );
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Campus Notifications</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <Navbar />
            <Container maxWidth="lg" sx={{ py: 4 }}>
              {children}
            </Container>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
