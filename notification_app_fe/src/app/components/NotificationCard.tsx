"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import BarChartIcon from "@mui/icons-material/BarChart";
import CelebrationIcon from "@mui/icons-material/Celebration";
import NotificationsIcon from "@mui/icons-material/Notifications";
import VisibilityIcon from "@mui/icons-material/Visibility";
import StarIcon from "@mui/icons-material/Star";
import { Notification, markViewed } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";


const TYPE_META: Record<
  string,
  { color: "primary" | "secondary" | "success" | "warning"; icon: React.ReactNode; label: string }
> = {
  Placement: {
    color: "primary",
    icon: <WorkIcon sx={{ fontSize: 16 }} />,
    label: "Placement",
  },
  Result: {
    color: "warning",
    icon: <BarChartIcon sx={{ fontSize: 16 }} />,
    label: "Result",
  },
  Event: {
    color: "success",
    icon: <CelebrationIcon sx={{ fontSize: 16 }} />,
    label: "Event",
  },
};


interface NotificationCardProps {
  notification: Notification;
  isViewed: boolean;
  showScore?: boolean;
  onMarkViewed?: (id: string) => void;
}


export default function NotificationCard({
  notification,
  isViewed,
  showScore = false,
  onMarkViewed,
}: NotificationCardProps) {
  const meta = TYPE_META[notification.Type] ?? {
    color: "default" as const,
    icon: <NotificationsIcon sx={{ fontSize: 16 }} />,
    label: notification.Type,
  };

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(notification.Timestamp), { addSuffix: true });
    } catch {
      return notification.Timestamp;
    }
  })();

  const handleMarkViewed = () => {
    markViewed(notification.ID);
    onMarkViewed?.(notification.ID);
  };

  return (
    <Card
      sx={{
        mb: 1.5,
        transition: "all 0.2s ease",
        borderLeft: isViewed ? undefined : `3px solid`,
        borderLeftColor: isViewed ? undefined : `${meta.color}.main`,
        opacity: isViewed ? 0.72 : 1,
        bgcolor: isViewed ? "background.paper" : "rgba(30,41,59,0.9)",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: 4,
          opacity: 1,
        },
      }}
    >
      <CardContent sx={{ py: "12px !important", px: 2 }}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {/* Type chip */}
          <Chip
            icon={meta.icon as React.ReactElement}
            label={meta.label}
            color={meta.color}
            size="small"
            variant={isViewed ? "outlined" : "filled"}
            sx={{ fontWeight: 700, fontSize: "0.7rem" }}
          />

          {/* Unread dot */}
          {!isViewed && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "primary.main",
                flexShrink: 0,
              }}
            />
          )}

          {/* Message */}
          <Typography
            variant="body2"
            sx={{
              flexGrow: 1,
              fontWeight: isViewed ? 400 : 600,
              color: isViewed ? "text.secondary" : "text.primary",
            }}
          >
            {notification.Message}
          </Typography>

          {/* Priority score badge */}
          {showScore && notification.score !== undefined && (
            <Tooltip title="Priority score">
              <Chip
                icon={<StarIcon sx={{ fontSize: 13 }} />}
                label={notification.score.toFixed(1)}
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ fontSize: "0.65rem" }}
              />
            </Tooltip>
          )}

          {/* Timestamp */}
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {timeAgo}
          </Typography>

          {/* Mark viewed button */}
          {!isViewed && (
            <Tooltip title="Mark as read">
              <IconButton size="small" onClick={handleMarkViewed} sx={{ color: "text.secondary" }}>
                <VisibilityIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
