import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

export default function MapScreen({ units = [] }) {
  if (units.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyIcon}>{"\u2B21"}</Text>
        <Text style={s.emptyTitle}>NO FIELD ASSETS</Text>
        <Text style={s.emptyText}>Register and deploy units from the CONTROL tab</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.inner}>
      <Text style={s.title}>{"\u25B8"} TACTICAL OVERVIEW</Text>
      {units.map((u) => {
        const riskPct = Math.round(u.risk_score * 100);
        return (
          <View key={u.unit_id} style={[s.unitCard, riskBorder(u.risk_score)]}>
            <View style={s.cardHeader}>
              <Text style={s.callsign}>{"\u2B21"} {u.unit_id}</Text>
              <View style={[s.statusBadge, statusStyle(u.status)]}>
                <Text style={s.statusText}>{u.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={s.dataGrid}>
              <DataCell label="LAT" value={u.lat.toFixed(5)} />
              <DataCell label="LON" value={u.lon.toFixed(5)} />
              <DataCell label="SPEED" value={`${u.speed_mps.toFixed(1)} m/s`} />
              <DataCell label="HDG" value={`${u.direction_deg.toFixed(0)}\u00B0`} />
              <DataCell label="ANOMALY" value={u.anomaly_score.toFixed(3)} warn={u.anomaly_score > 0.5} />
              <DataCell label="RISK" value={`${riskPct}%`} warn={u.risk_score > 0.55} critical={u.risk_score > 0.75} />
            </View>
            <View style={s.riskBarTrack}>
              <View style={[s.riskBarFill, { width: `${riskPct}%`, backgroundColor: riskColor(u.risk_score) }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function DataCell({ label, value, warn, critical }) {
  const valColor = critical ? "#ff1744" : warn ? "#ffa726" : "#c8d4bc";
  return (
    <View style={s.dataCell}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={[s.dataValue, { color: valColor }]}>{value}</Text>
    </View>
  );
}

function riskColor(score) {
  if (score >= 0.75) return "#ff1744";
  if (score >= 0.55) return "#ff6d00";
  if (score >= 0.3) return "#ffd600";
  return "#4caf50";
}

function riskBorder(score) {
  return { borderLeftWidth: 3, borderLeftColor: riskColor(score) };
}

function statusStyle(status) {
  switch (status) {
    case "active":
      return { backgroundColor: "rgba(76,175,80,0.15)", borderColor: "rgba(76,175,80,0.3)" };
    case "paused":
      return { backgroundColor: "rgba(255,167,38,0.15)", borderColor: "rgba(255,167,38,0.3)" };
    default:
      return { backgroundColor: "rgba(158,158,158,0.1)", borderColor: "rgba(158,158,158,0.2)" };
  }
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#060804" },
  inner: { padding: 16, paddingBottom: 32 },
  title: {
    color: "#6b7a5e",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2612",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 40, color: "#243118", marginBottom: 12 },
  emptyTitle: { color: "#6b7a5e", fontSize: 14, fontWeight: "700", letterSpacing: 2, marginBottom: 6 },
  emptyText: { color: "#3d4a34", fontSize: 12, textAlign: "center" },
  unitCard: {
    backgroundColor: "#111a0b",
    borderWidth: 1,
    borderColor: "#1a2612",
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  callsign: {
    color: "#a8c99a",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#c8d4bc",
  },
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  dataCell: {
    width: "31%",
    backgroundColor: "#0a0d06",
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  dataLabel: {
    color: "#4a5c3e",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 2,
  },
  dataValue: {
    color: "#c8d4bc",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  riskBarTrack: {
    height: 4,
    backgroundColor: "#0a0d06",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 10,
  },
  riskBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});
