import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import ControlPanel from "./screens/ControlPanel";
import MapScreen from "./screens/MapScreen";
import DeploymentMap from "./screens/DeploymentMap";
import SettingsScreen from "./screens/SettingsScreen";
import BackendSocket from "./services/socket";

const TABS = [
  { key: "control", label: "CONTROL" },
  { key: "tactical", label: "TACTICAL" },
  { key: "deploy", label: "DEPLOY" },
  { key: "config", label: "CONFIG" },
];

const socket = new BackendSocket();

export default function App() {
  const [tab, setTab] = useState("control");
  const [units, setUnits] = useState([]);
  const [log, setLog] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    socket.connect();
    const unsubscribe = socket.onMessage((payload) => {
      if (!isMounted.current) return;
      if (payload.type === "disconnected") { setWsConnected(false); return; }
      setWsConnected(true);
      if (payload.units) setUnits(payload.units);
      setLatestUpdate(payload.timestamp ?? new Date().toISOString());
      setLog((prev) => [
        `[${now()}] ${payload.type ?? "STATE_UPDATE"} \u2014 ${(payload.units?.length ?? 0)} units`,
        ...prev.slice(0, 19),
      ]);
    });
    return () => {
      isMounted.current = false;
      unsubscribe();
      socket.disconnect();
    };
  }, []);

  const addLog = useCallback((msg) => {
    setLog((prev) => [`[${now()}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060804" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerBrand}>
            <Text style={s.headerIcon}>{"\u2B21"}</Text>
            <View>
              <Text style={s.headerTitle}>NODE SIMULATOR</Text>
              <Text style={s.headerSub}>FIELD ASSET CONTROLLER</Text>
            </View>
          </View>
          <View style={[s.connBadge, wsConnected ? s.connOnline : s.connOffline]}>
            <View style={[s.connDot, wsConnected ? s.dotOn : s.dotOff]} />
            <Text style={[s.connText, { color: wsConnected ? "#81c784" : "#ef5350" }]}>
              {wsConnected ? "LINKED" : "NO LINK"}
            </Text>
          </View>
        </View>
        <View style={s.headerStats}>
          <Text style={s.statText}>ASSETS: {units.length}</Text>
          <Text style={s.statText}>
            LAST SYNC: {latestUpdate ? latestUpdate.slice(11, 19) : "\u2014"}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={s.content}>
        {tab === "control" && <ControlPanel onLog={addLog} />}
        {tab === "tactical" && <MapScreen units={units} />}
        {tab === "deploy" && <DeploymentMap units={units} onLog={addLog} />}
        {tab === "config" && <SettingsScreen />}
      </View>

      {/* Event log */}
      <View style={s.logSection}>
        <Text style={s.logTitle}>{"\u25B8"} EVENT LOG</Text>
        <ScrollView style={s.logScroll} contentContainerStyle={s.logInner}>
          {log.length === 0 ? (
            <Text style={s.logEmpty}>Awaiting events...</Text>
          ) : (
            log.map((entry, i) => (
              <Text key={`${i}-${entry.slice(0, 20)}`} style={s.logEntry}>
                {entry}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function now() {
  return new Date().toISOString().slice(11, 19);
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060804",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2612",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
    color: "#5fa84f",
  },
  headerTitle: {
    color: "#e2ecd8",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
  },
  headerSub: {
    color: "#6b7a5e",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "500",
  },
  connBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
  },
  connOnline: {
    backgroundColor: "rgba(76,175,80,0.1)",
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.3)",
  },
  connOffline: {
    backgroundColor: "rgba(239,83,80,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOn: { backgroundColor: "#4caf50" },
  dotOff: { backgroundColor: "#666" },
  connText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerStats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
  },
  statText: {
    color: "#6b7a5e",
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a2612",
    backgroundColor: "#0a0d06",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#5fa84f",
    backgroundColor: "rgba(95,168,79,0.05)",
  },
  tabText: {
    color: "#6b7a5e",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  tabTextActive: {
    color: "#a8c99a",
  },
  content: {
    flex: 1,
  },
  logSection: {
    borderTopWidth: 1,
    borderTopColor: "#1a2612",
    backgroundColor: "#0a0d06",
    maxHeight: 130,
  },
  logTitle: {
    color: "#6b7a5e",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logScroll: {
    flex: 1,
  },
  logInner: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  logEmpty: {
    color: "#3d4a34",
    fontSize: 11,
    fontStyle: "italic",
  },
  logEntry: {
    color: "#7a8b6f",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 3,
    lineHeight: 16,
  },
});
