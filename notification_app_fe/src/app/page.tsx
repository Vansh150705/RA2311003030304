"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import {
  fetchNotifications,
  getViewedIds,
  markAllViewed,
  Notification,
  NotificationType,
} from "@/lib/api";
import NotificationCard from "./components/NotificationCard";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const TYPE_OPTIONS: (NotificationType | "")[] = ["", "Placement", "Result", "Event"];


export default function AllNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Filters & pagination
  const [typeFilter, setTypeFilter] = useState<NotificationType | "">("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchNotifications({
        notification_type: typeFilter || undefined,
      });
      setNotifications(all);
      setTotalPages(Math.max(1, Math.ceil(all.length / pageSize)));
      setViewedIds(getViewedIds());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when filter or page size changes
  useEffect(() => {
    setPage(1);
  }, [typeFilter, pageSize]);


  const pagedNotifications = notifications.slice((page - 1) * pageSize, page * pageSize);
  const unreadCount = notifications.filter((n) => !viewedIds.has(n.ID)).length;


  const handleMarkAllRead = () => {
    markAllViewed(notifications);
    setViewedIds(getViewedIds());
  };

  const handleMarkViewed = (id: string) => {
    setViewedIds((prev) => new Set(Array.from(prev).concat(id)));
  };


  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        alignItems={{ xs: "flex-start", sm: "center" }}
        flexDirection={{ xs: "column", sm: "row" }}
        gap={2}
        mb={3}
      >
        <Box flexGrow={1}>
          <Typography variant="h4" gutterBottom>
            All Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? "Loading…" : `${notifications.length} total · ${unreadCount} unread`}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<DoneAllIcon />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || loading}
          >
            Mark all read
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Box
        display="flex"
        gap={2}
        mb={3}
        flexWrap="wrap"
        alignItems="center"
      >
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Notification Type</InputLabel>
          <Select
            value={typeFilter}
            label="Notification Type"
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | "")}
          >
            <MenuItem value="">All Types</MenuItem>
            {(["Placement", "Result", "Event"] as NotificationType[]).map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Per page</InputLabel>
          <Select
            value={pageSize}
            label="Per page"
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ mb: 2, borderColor: "rgba(148,163,184,0.12)" }} />

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Skeleton loader */}
      {loading && (
        <Stack spacing={1.5}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={60} />
          ))}
        </Stack>
      )}

      {/* Notification list */}
      {!loading && !error && (
        <>
          {pagedNotifications.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={8}>
              No notifications found.
            </Typography>
          ) : (
            pagedNotifications.map((notif) => (
              <NotificationCard
                key={notif.ID}
                notification={notif}
                isViewed={viewedIds.has(notif.ID)}
                onMarkViewed={handleMarkViewed}
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
