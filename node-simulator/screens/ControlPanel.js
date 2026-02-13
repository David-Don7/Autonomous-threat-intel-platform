import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { registerUnit, updateTelemetry } from "../services/api";

const PRESETS = { lat: 37.7749, lon: -122.4194 };

export default function ControlPanel({ onLog }) {
  const [unitId, setUnitId] = useState("alpha-1");
  const [lat, setLat] = useState(String(PRESETS.lat));
  const [lon, setLon] = useState(String(PRESETS.lon));
  const [speed, setSpeed] = useState("5.0");
  const [heading, setHeading] = useState("90");
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("Ready for deployment");
  const [msgType, setMsgType] = useState("info");

  const flash = (text, type = "info") => { setMsg(text); setMsgType(type); };

  const handleRegister = async () => {
    try {
      const res = await registerUnit({
        unit_id: unitId,
        label: `Unit ${unitId}`,
        position: { lat: Number(lat), lon: Number(lon) },
        speed_mps: Number(speed),
        direction_deg: Number(heading),
      });
      flash(
        `\u2713 ${res.unit_id} registered @ ${res.lat.toFixed(4)}, ${res.lon.toFixed(4)}`,
        "success"
      );
      onLog?.(`REGISTER ${res.unit_id}`);
    } catch (e) {
      flash(`\u2717 ${e.message}`, "error");
      onLog?.(`REGISTER_FAIL ${e.message}`);
    }
  };

  const pushTelemetry = async (overrides = {}) => {
    if (!unitId) { flash("Set a Unit ID first", "error"); return; }
    const payload = {
      unit_id: unitId,
      position: { lat: Number(lat), lon: Number(lon) },
      speed_mps: Number(speed),
      direction_deg: Number(heading),
      status,
      ...overrides,
    };
    try {
      await updateTelemetry(payload);
      const st = overrides.status || status;
      flash(`\u2713 Telemetry sent (${st.toUpperCase()})`, "success");
      setStatus(st);
      onLog?.(`TELEMETRY ${unitId} \u2192 ${st}`);
    } catch (e) {
      flash(`\u2717 ${e.message}`, "error");
      onLog?.(`TELEMETRY_FAIL ${e.message}`);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
      {/* Status banner */}
      <View style={[s.banner, msgType === "success" ? s.bannerOk : msgType === "error" ? s.bannerErr : s.bannerInfo]}>
        <Text style={s.bannerText}>{msg}</Text>
      </View>

      {/* Input fields */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>{"\u25B8"} UNIT CONFIGURATION</Text>
        <Field label="CALLSIGN" value={unitId} onChange={setUnitId} />
        <View style={s.row}>
          <Field label="LATITUDE" value={lat} onChange={setLat} numeric half />
          <Field label="LONGITUDE" value={lon} onChange={setLon} numeric half />
        </View>
        <View style={s.row}>
          <Field label="SPEED (m/s)" value={speed} onChange={setSpeed} numeric half />
          <Field label="HEADING (\u00B0)" value={heading} onChange={setHeading} numeric half />
        </View>
      </View>

      {/* Action buttons */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>{"\u25B8"} COMMANDS</Text>
        <View style={s.btnRow}>
          <Btn label="REGISTER" color="#4caf50" onPress={handleRegister} />
          <Btn label="DEPLOY" color="#2196f3" onPress={() => pushTelemetry({ status: "active" })} />
          <Btn label="HALT" color="#ef5350" onPress={() => pushTelemetry({ status: "idle", speed_mps: 0 })} />
        </View>
        <View style={s.btnRow}>
          <Btn label="PAUSE" color="#ffa726" onPress={() => pushTelemetry({ status: "paused", speed_mps: 0 })} />
          <Btn label="PUSH UPDATE" color="#5fa84f" onPress={() => pushTelemetry({})} />
        </View>
      </View>
    </ScrollView>
  );
}

function Field({ label, value, onChange, numeric, half }) {
  return (
    <View style={[s.fieldWrap, half && { flex: 1 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "numeric" : "default"}
        autoCapitalize="none"
        placeholderTextColor="#3d4a34"
      />
    </View>
  );
}

function Btn({ label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[s.btn, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={[s.btnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#060804" },
  inner: { padding: 16, paddingBottom: 32 },
  banner: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerOk: { backgroundColor: "rgba(76,175,80,0.08)", borderColor: "rgba(76,175,80,0.25)" },
  bannerErr: { backgroundColor: "rgba(239,83,80,0.08)", borderColor: "rgba(239,83,80,0.25)" },
  bannerInfo: { backgroundColor: "rgba(95,168,79,0.05)", borderColor: "rgba(95,168,79,0.15)" },
  bannerText: {
    color: "#c8d4bc",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    color: "#6b7a5e",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2612",
  },
  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    color: "#6b7a5e",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0d1208",
    borderWidth: 1,
    borderColor: "#243118",
    borderRadius: 4,
    padding: 10,
    color: "#c8d4bc",
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
  },
  btnText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
