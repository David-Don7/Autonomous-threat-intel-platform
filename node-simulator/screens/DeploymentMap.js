import React, { useRef, useState, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { assignDestination } from "../services/api";
import config from "../services/config";

/**
 * DeploymentMap — Tap on the map to pick coordinates, then assign
 * the destination to a unit on the backend.  Uses Leaflet inside a
 * WebView so it works in Expo Go without native map SDKs.
 */
export default function DeploymentMap({ units, onLog }) {
  const webRef = useRef(null);
  const [selected, setSelected] = useState(null); // { lat, lon }
  const [unitId, setUnitId] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);

  // pick a default unit from the list
  useEffect(() => {
    if (!unitId && units.length > 0) {
      setUnitId(units[0].unit_id);
    }
  }, [units]);

  // inject current units into the webview map
  useEffect(() => {
    if (webRef.current && units.length > 0) {
      webRef.current.postMessage(JSON.stringify({ type: "units", units }));
    }
  }, [units]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "tap") {
        setSelected({ lat: data.lat, lon: data.lon });
        setMsg(`TARGET: ${data.lat.toFixed(5)}, ${data.lon.toFixed(5)}`);
      }
    } catch {}
  };

  const handleAssign = async () => {
    if (!selected || !unitId) return;
    setSending(true);
    try {
      await assignDestination(unitId, selected.lat, selected.lon);
      setMsg(`✓ ${unitId} → ${selected.lat.toFixed(4)}, ${selected.lon.toFixed(4)}`);
      onLog?.(`DEST_ASSIGN ${unitId} → ${selected.lat.toFixed(4)},${selected.lon.toFixed(4)}`);
      setSelected(null);
    } catch (e) {
      setMsg(`✗ ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body{margin:0;padding:0;height:100%;background:#0a0d06;}
  #map{width:100%;height:100%;}
  .leaflet-control-zoom a{background:#151f0e!important;color:#5fa84f!important;border-color:#243118!important;}
  .leaflet-popup-content-wrapper{background:#151f0e!important;color:#c8d4bc!important;border:1px solid #3a5a2b!important;border-radius:4px!important;}
  .leaflet-popup-tip{background:#151f0e!important;}
  .dest-pulse{width:20px;height:20px;border-radius:50%;border:3px solid #42a5f5;background:rgba(66,165,245,0.3);animation:dp 1.5s ease-in-out infinite;}
  @keyframes dp{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.4);opacity:0.5;}}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:true}).setView([37.7749,-122.4194],12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
  maxZoom:19,attribution:'CartoDB'
}).addTo(map);

var markers = {};
var destMarker = null;

map.on('click', function(e) {
  var lat = e.latlng.lat, lon = e.latlng.lng;
  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.marker([lat, lon], {
    icon: L.divIcon({className:'',html:'<div class="dest-pulse"></div>',iconSize:[20,20],iconAnchor:[10,10]})
  }).addTo(map).bindPopup('TARGET: '+lat.toFixed(5)+', '+lon.toFixed(5)).openPopup();
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap',lat:lat,lon:lon}));
});

document.addEventListener('message', handleMsg);
window.addEventListener('message', handleMsg);
function handleMsg(e) {
  try {
    var data = JSON.parse(e.data);
    if (data.type === 'units') {
      data.units.forEach(function(u) {
        var color = u.risk_score > 0.7 ? '#ef5350' : u.risk_score > 0.4 ? '#ffa726' : '#4caf50';
        var sz = u.risk_score > 0.7 ? 14 : 10;
        var icon = L.divIcon({
          className:'',
          html:'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+color+';border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 6px '+color+';"></div>',
          iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]
        });
        if (markers[u.unit_id]) {
          markers[u.unit_id].setLatLng([u.position.lat, u.position.lon]).setIcon(icon);
        } else {
          markers[u.unit_id] = L.marker([u.position.lat, u.position.lon],{icon:icon})
            .addTo(map)
            .bindPopup('<b>'+u.unit_id+'</b><br>'+u.status);
        }
      });
    }
  } catch(ex) {}
}
</script>
</body>
</html>`;

  return (
    <View style={st.root}>
      {/* Unit selector */}
      {units.length > 0 && (
        <View style={st.unitBar}>
          <Text style={st.unitBarLabel}>▸ SELECT UNIT</Text>
          <View style={st.chipRow}>
            {units.map((u) => (
              <TouchableOpacity
                key={u.unit_id}
                style={[st.chip, unitId === u.unit_id && st.chipActive]}
                onPress={() => setUnitId(u.unit_id)}
              >
                <View
                  style={[
                    st.chipDot,
                    { backgroundColor: u.status === "active" ? "#4caf50" : "#666" },
                  ]}
                />
                <Text
                  style={[
                    st.chipText,
                    unitId === u.unit_id && st.chipTextActive,
                  ]}
                >
                  {u.unit_id}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Map */}
      <View style={st.mapWrap}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          onMessage={handleMessage}
          style={st.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={st.loading}>
              <Text style={st.loadingText}>LOADING MAP...</Text>
            </View>
          )}
        />
        <View style={st.mapLabel}>
          <Text style={st.mapLabelText}>
            TAP MAP TO SET DESTINATION
          </Text>
        </View>
      </View>

      {/* Status bar + assign button */}
      <View style={st.bottomBar}>
        {msg && <Text style={st.statusMsg}>{msg}</Text>}
        <TouchableOpacity
          style={[
            st.assignBtn,
            (!selected || !unitId || sending) && st.assignBtnDisabled,
          ]}
          onPress={handleAssign}
          disabled={!selected || !unitId || sending}
        >
          <Text style={st.assignBtnText}>
            {sending ? "SENDING..." : "ASSIGN DESTINATION"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#060804" },
  unitBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2612",
  },
  unitBarLabel: {
    color: "#6b7a5e",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#243118",
    backgroundColor: "#111a0b",
  },
  chipActive: {
    borderColor: "#5fa84f",
    backgroundColor: "rgba(93,168,79,0.08)",
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    color: "#c8d4bc",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  chipTextActive: {
    color: "#7dcc6d",
  },
  mapWrap: {
    flex: 1,
    margin: 10,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#243118",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0a0d06",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0d06",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#6b7a5e",
    fontSize: 12,
    letterSpacing: 2,
  },
  mapLabel: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(6,8,4,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#243118",
  },
  mapLabelText: {
    color: "#6b7a5e",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  bottomBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1a2612",
    gap: 8,
  },
  statusMsg: {
    color: "#c8d4bc",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlign: "center",
  },
  assignBtn: {
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#42a5f5",
    backgroundColor: "rgba(66,165,245,0.08)",
    alignItems: "center",
  },
  assignBtnDisabled: {
    opacity: 0.3,
  },
  assignBtnText: {
    color: "#42a5f5",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
});
