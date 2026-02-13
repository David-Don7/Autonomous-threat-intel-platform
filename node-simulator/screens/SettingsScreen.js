import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>Offline simulation controls and additional knobs will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#111827",
  },
  title: {
    color: "#f8fafc",
    fontWeight: "600",
    marginBottom: 4,
  },
  text: {
    color: "#94a3b8",
    fontSize: 12,
  },
});
