import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import config from "../services/config";

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [wsUrl, setWsUrl] = useState(config.wsUrl);
  const [testResult, setTestResult] = useState("");
  const [dirty, setDirty] = useState(false);

  // Sync local state when config changes externally
  useEffect(() => {
    const unsub = config.onChange(({ apiUrl: a, wsUrl: w }) => {
      setApiUrl(a);
      setWsUrl(w);
    });
    return unsub;
  }, []);

  const saveConfig = () => {
    config.setUrls(apiUrl, wsUrl);
    setDirty(false);
  };

  const handleApiChange = (v) => { setApiUrl(v); setDirty(true); };
  const handleWsChange = (v) => { setWsUrl(v); setDirty(true); };

  const testConnection = async () => {
    if (dirty) saveConfig();
    setTestResult("Testing...");
    try {
      const res = await fetch(`${apiUrl}/health`);
      const data = await res.json();
      setTestResult(`\u2713 Connected \u2014 ${data.unit_count ?? 0} units online`);
    } catch (e) {
      setTestResult(`\u2717 Failed: ${e.message}`);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.inner}>
      <Text style={s.sectionLabel}>{"\u25B8"} SERVER CONFIGURATION</Text>

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>API ENDPOINT</Text>
        <TextInput
          style={s.input}
          value={apiUrl}
          onChangeText={handleApiChange}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#3d4a34"
        />
      </View>

      <View style={s.fieldWrap}>
        <Text style={s.fieldLabel}>WEBSOCKET ENDPOINT</Text>
        <TextInput
          style={s.input}
          value={wsUrl}
          onChangeText={handleWsChange}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#3d4a34"
        />
      </View>

      {dirty && (
        <TouchableOpacity style={s.saveBtn} onPress={saveConfig} activeOpacity={0.6}>
          <Text style={s.saveBtnText}>SAVE CONFIGURATION</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.testBtn} onPress={testConnection} activeOpacity={0.6}>
        <Text style={s.testBtnText}>TEST CONNECTION</Text>
      </TouchableOpacity>

      {testResult !== "" && (
        <View style={[
          s.resultBox,
          testResult.startsWith("\u2713") ? s.resultOk
            : testResult === "Testing..." ? s.resultInfo
            : s.resultErr
        ]}>
          <Text style={s.resultText}>{testResult}</Text>
        </View>
      )}

      <View style={s.infoBox}>
        <Text style={s.infoTitle}>NETWORK NOTES</Text>
        <Text style={s.infoText}>
          {"\u2022"} For physical devices, replace localhost with your PC's IP address{"\n"}
          {"\u2022"} Run <Text style={s.code}>ipconfig</Text> (Windows) to find your IPv4{"\n"}
          {"\u2022"} Backend must be started with <Text style={s.code}>--host 0.0.0.0</Text>{"\n"}
          {"\u2022"} Ensure PC firewall allows the backend port
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#060804" },
  inner: { padding: 16, paddingBottom: 32 },
  sectionLabel: {
    color: "#6b7a5e",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2612",
  },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    color: "#6b7a5e",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0d1208",
    borderWidth: 1,
    borderColor: "#243118",
    borderRadius: 4,
    padding: 12,
    color: "#c8d4bc",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  testBtn: {
    borderWidth: 1.5,
    borderColor: "#5fa84f",
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(95,168,79,0.08)",
    marginBottom: 16,
  },
  testBtnText: {
    color: "#5fa84f",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  saveBtn: {
    borderWidth: 1.5,
    borderColor: "#2196f3",
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(33,150,243,0.08)",
    marginBottom: 12,
  },
  saveBtnText: {
    color: "#2196f3",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  resultBox: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  resultOk: { backgroundColor: "rgba(76,175,80,0.08)", borderColor: "rgba(76,175,80,0.25)" },
  resultErr: { backgroundColor: "rgba(239,83,80,0.08)", borderColor: "rgba(239,83,80,0.25)" },
  resultInfo: { backgroundColor: "rgba(66,165,245,0.08)", borderColor: "rgba(66,165,245,0.25)" },
  resultText: {
    color: "#c8d4bc",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  infoBox: {
    backgroundColor: "#111a0b",
    borderWidth: 1,
    borderColor: "#1a2612",
    borderRadius: 6,
    padding: 14,
  },
  infoTitle: {
    color: "#6b7a5e",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  infoText: {
    color: "#7a8b6f",
    fontSize: 12,
    lineHeight: 20,
  },
  code: {
    color: "#a8c99a",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
