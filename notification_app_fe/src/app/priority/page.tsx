"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchNotifications, getTopN, getViewedIds, Notification } from "@/lib/api";
import NotificationCard from "../components/NotificationCard";

const N_OPTIONS = [5, 10, 15, 20, 25];


export default function PriorityInboxPage() {
  const [topNotifications, setTopNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [n, setN] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchNotifications();
      const top = await getTopN(all, n);
      setTopNotifications(top);
      setViewedIds(getViewedIds());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [n]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkViewed = (id: string) => {
    setViewedIds((prev) => new Set(Array.from(prev).concat(id)));
  };

  const unreadCount = topNotifications.filter((n) => !viewedIds.has(n.ID)).length;

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
          <Box display="flex" alignItems="center" gap={1}>
            <StarIcon sx={{ color: "secondary.main", fontSize: 28 }} />
            <Typography variant="h4">Priority Inbox</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Top {n} notifications ranked by type priority + recency
            {!loading && ` · ${unreadCount} unread`}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={load}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* N selector */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 2,
          border: "1px solid rgba(148,163,184,0.12)",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          Show top
        </Typography>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          >
            {N_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          notifications
        </Typography>

        <Box flexGrow={1} />

        {/* Scoring legend */}
        <Box display="flex" gap={2} flexWrap="wrap">
          {[
            { label: "Placement", color: "#60a5fa", weight: 3 },
            { label: "Result", color: "#fb923c", weight: 2 },
            { label: "Event", color: "#4ade80", weight: 1 },
          ].map(({ label, color, weight }) => (
            <Box key={label} display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
              <Typography variant="caption" color="text.secondary">
                {label} (w={weight})
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ mb: 2, borderColor: "rgba(148,163,184,0.12)" }} />

      {/* Scoring explanation */}
      <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
        <strong>Scoring formula:</strong> score = type_weight × 1000 + recency_score (0–1).
        Placement always outranks Result, which always outranks Event. Recency breaks ties within
        the same type.
      </Alert>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Skeleton */}
      {loading && (
        <Stack spacing={1.5}>
          {[...Array(n)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={60} />
          ))}
        </Stack>
      )}

      {/* Notification list */}
      {!loading && !error && (
        <>
          {topNotifications.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={8}>
              No notifications found.
            </Typography>
          ) : (
            topNotifications.map((notif, index) => (
              <Box key={notif.ID} display="flex" alignItems="flex-start" gap={1.5}>
                {/* Rank badge */}
                <Box
                  sx={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: index < 3 ? "secondary.main" : "background.paper",
                    border: "1px solid",
                    borderColor: index < 3 ? "secondary.main" : "rgba(148,163,184,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 1.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: index < 3 ? "white" : "text.secondary" }}
                  >
                    {index + 1}
                  </Typography>
                </Box>

                <Box flexGrow={1}>
                  <NotificationCard
                    notification={notif}
                    isViewed={viewedIds.has(notif.ID)}
                    showScore
                    onMarkViewed={handleMarkViewed}
                  />
                </Box>
              </Box>
            ))
          )}
        </>
      )}
    </Box>
  );
}
