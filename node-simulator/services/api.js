const BASE_URL = "http://localhost:8000/api";

async function request(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
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
