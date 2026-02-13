import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import ControlPanel from "./screens/ControlPanel";
import MapScreen from "./screens/MapScreen";
import SettingsScreen from "./screens/SettingsScreen";
import BackendSocket from "./services/socket";

const socket = new BackendSocket();

export default function App() {
  const [units, setUnits] = useState([]);
  const [log, setLog] = useState([]);
  const [latestUpdate, setLatestUpdate] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    socket.connect();
    const unsubscribe = socket.onMessage((payload) => {
      if (!isMounted.current) {
        return;
      }
      setUnits(payload.units ?? []);
      setLatestUpdate(payload.timestamp ?? new Date().toISOString());
      setLog((prevLogs) => [
        `RECV ${payload.type ?? "state"} @ ${payload.timestamp ?? new Date().toISOString()}`,
        ...prevLogs.slice(0, 8),
      ]);
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
      socket.disconnect();
    };
  }, []);

  const trackEvent = useCallback((message) => {
    setLog((prev) => [message, ...prev.slice(0, 8)]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Node Simulator</Text>
        <Text style={styles.subtitle}>Live units: {units.length}</Text>
        <Text style={styles.subtitle}>Latest sync: {latestUpdate ?? "waiting"}</Text>
      </View>
      <MapScreen units={units} />
      <ControlPanel onLog={trackEvent} />
      <SettingsScreen />
      <ScrollView style={styles.logArea} contentContainerStyle={styles.logContent}>
        {log.map((event, index) => (
          <Text key={`${event}-${index}`} style={styles.logEntry}>
            {event}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#05070d",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: "#f9fafb",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8892b0",
  },
  logArea: {
    marginTop: 16,
    flex: 1,
  },
  logContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  logEntry: {
    color: "#cbd5f5",
    marginBottom: 6,
    fontSize: 12,
  },
});
