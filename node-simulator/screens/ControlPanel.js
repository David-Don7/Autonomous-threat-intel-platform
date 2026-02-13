import React, { useState } from "react";
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { registerUnit, updateTelemetry } from "../services/api";

const DEFAULT_COORDS = { lat: 37.7749, lon: -122.4194 };

export default function ControlPanel({ onLog }) {
  const [unitId, setUnitId] = useState("alpha-1");
  const [latitude, setLatitude] = useState(String(DEFAULT_COORDS.lat));
  const [longitude, setLongitude] = useState(String(DEFAULT_COORDS.lon));
  const [speed, setSpeed] = useState("1.0");
  const [direction, setDirection] = useState("90");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Ready to register");

  const handleRegister = async () => {
    try {
      const payload = {
        unit_id: unitId,
        label: `Unit ${unitId}`,
        position: { lat: Number(latitude), lon: Number(longitude) },
        speed_mps: Number(speed),
        direction_deg: Number(direction),
      };
      const response = await registerUnit(payload);
      setMessage(`Registered ${response.unit_id} at ${response.lat.toFixed(4)}, ${response.lon.toFixed(4)}`);
      onLog?.(`REGISTER ${response.unit_id}`);
    } catch (error) {
      setMessage(`Register failed: ${error.message}`);
      onLog?.(`REGISTER ERROR ${error.message}`);
    }
  };

  const handleTelemetry = async (override = {}) => {
    if (!unitId) {
      setMessage("Set a valid unit ID first");
      return;
    }
    const payload = {
      unit_id: unitId,
      position: {
        lat: Number(latitude),
        lon: Number(longitude),
      },
      speed_mps: Number(speed),
      direction_deg: Number(direction),
      status,
      ...override,
    };
    try {
      await updateTelemetry(payload);
      setMessage(`Telemetry pushed (${payload.status})`);
      onLog?.(`TELEMETRY ${unitId} status=${payload.status}`);
    } catch (error) {
      setMessage(`Telemetry failed: ${error.message}`);
      onLog?.(`TELEMETRY ERROR ${error.message}`);
    }
  };

  const handleStart = () => {
    setStatus("active");
    handleTelemetry({ status: "active" });
  };

  const handleStop = () => {
    setStatus("idle");
    handleTelemetry({ status: "idle", speed_mps: 0 });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.sectionTitle}>Control Panel</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Unit ID</Text>
        <TextInput style={styles.input} value={unitId} onChangeText={setUnitId} autoCapitalize="none" />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Latitude</Text>
        <TextInput style={styles.input} value={latitude} onChangeText={setLatitude} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Longitude</Text>
        <TextInput style={styles.input} value={longitude} onChangeText={setLongitude} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Speed (m/s)</Text>
        <TextInput style={styles.input} value={speed} onChangeText={setSpeed} keyboardType="numeric" />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Direction (deg)</Text>
        <TextInput style={styles.input} value={direction} onChangeText={setDirection} keyboardType="numeric" />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Register" onPress={handleRegister} color="#22c55e" />
        <Button title="Start" onPress={handleStart} color="#2563eb" />
        <Button title="Stop" onPress={handleStop} color="#ef4444" />
      </View>
      <View style={styles.row}>
        <Text style={styles.statusLabel}>{message}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0b1220",
    marginHorizontal: 16,
    borderRadius: 16,
  },
  inner: {
    padding: 16,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    color: "#94a3b8",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1d2738",
    borderRadius: 8,
    padding: 8,
    color: "#f8fafc",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statusLabel: {
    color: "#cbd5f5",
    fontSize: 12,
  },
});
