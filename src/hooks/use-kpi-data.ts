"use client";

import { useState, useEffect } from "react";
import type { 
  DateRange, 
  ComprehensiveOverview, 
  GeoResponse, 
  SegmentResponse,
  LeaderboardResponse 
} from "@/lib/kpi-types";

export function useKPIData(dateRange: DateRange) {
  const [overview, setOverview] = useState<ComprehensiveOverview | null>(null);
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [segments, setSegments] = useState<SegmentResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all KPIs in parallel
        const [overviewRes, geoRes, segmentsRes, leaderboardRes] = await Promise.all([
          fetch("/api/kpi/overview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dateRange }),
          }),
          fetch("/api/kpi/geo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dateRange }),
          }),
          fetch("/api/kpi/segments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dateRange }),
          }),
          fetch("/api/kpi/leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dateRange }),
          }),
        ]);

        if (!overviewRes.ok || !geoRes.ok || !segmentsRes.ok || !leaderboardRes.ok) {
          throw new Error("Failed to fetch KPI data");
        }

        const [overviewData, geoData, segmentsData, leaderboardData] = await Promise.all([
          overviewRes.json(),
          geoRes.json(),
          segmentsRes.json(),
          leaderboardRes.json(),
        ]);

        setOverview(overviewData);
        setGeo(geoData);
        setSegments(segmentsData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("KPI fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  return { overview, geo, segments, leaderboard, isLoading, error };
}
