const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (
    response.status === 401 &&
    data?.code === "TOKEN_EXPIRED"
  ) {
    const refreshed = await refreshToken();

    if (refreshed) {
      return apiRequest(endpoint, options);
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        data?.errors?.join(", ") ||
        "API request failed"
    );
  }

  return data;
}

async function refreshToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}