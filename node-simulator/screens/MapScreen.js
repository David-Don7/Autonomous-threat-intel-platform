import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function MapScreen({ units }) {
  const primary = units[0] || null;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapbox View</Text>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>Mapbox integration will render here.</Text>
        {primary && (
          <Text style={styles.mapText}>
            Tracking {primary.unit_id} @ {primary.lat.toFixed(4)}, {primary.lon.toFixed(4)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: "#e2e8f0",
    marginBottom: 6,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  mapText: {
    color: "#cbd5f5",
  },
});
