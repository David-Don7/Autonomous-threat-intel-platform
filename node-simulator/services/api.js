import config from "./config";

async function request(path, body) {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail ?? "Request failed");
  }
  return payload;
}

export function registerUnit(payload) {
  return request("/register-unit", payload);
}

export function updateTelemetry(payload) {
  return request("/update-telemetry", payload);
}

export function assignDestination(unitId, lat, lon) {
  return request("/assign-destination", {
    unit_id: unitId,
    destination: { lat, lon },
  });
}
