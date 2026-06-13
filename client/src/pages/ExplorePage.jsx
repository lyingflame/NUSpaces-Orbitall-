import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AirVent,
  CheckCircle,
  Crosshair,
  Filter,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Users,
  Volume2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { io } from "socket.io-client";
import { apiRequest } from "../services/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const NOISE_FILTERS = [
  "All",
  "Very Quiet",
  "Quiet",
  "Moderate",
  "Noisy",
  "Very Noisy",
];

const NOISE_API_VALUE = {
  "Very Quiet": "very_quiet",
  Quiet: "quiet",
  Moderate: "moderate",
  Noisy: "noisy",
  "Very Noisy": "very_noisy",
};

const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Least crowded", value: "crowd" },
  { label: "Quietest", value: "noise" },
  { label: "Nearest", value: "distance" },
];

const SOCKET_EVENTS_TO_REFRESH = [
  "score-updated",
  "scores-refreshed",
];

const DEFAULT_FILTERS = {
  search: "",
  building: "All",
  faculty: "All",
  spotType: "All",
  noise: "All",
  sortBy: "default",
  hasPower: false,
  hasAircon: false,
  lat: "",
  lng: "",
  radius: "",
};

const DETAIL_EXCLUDE_KEYS = new Set([
  "id",
  "name",
  "building",
  "faculty",
  "spot_type",
  "type",
  "is_open",
  "status",
  "noise_status",
  "quietness_score",
  "avg_crowd",
  "crowdLevel",
  "noiseLevel",
  "has_power",
  "has_aircon",
  "distance",
  "distance_km",
  "distanceKm",
  "distance_in_km",
]);

function toArray(data) {
  if (Array.isArray(data)) return data;
  return data?.spots || data?.data || data?.results || [];
}

function normaliseFilterItem(item) {
  if (!item) return "";
  if (typeof item === "string") return item;

  return (
    item.name ||
    item.value ||
    item.label ||
    item.building ||
    item.faculty ||
    item.spot_type ||
    item.spotType ||
    item.type ||
    ""
  );
}

function extractFilterList(data, possibleKeys) {
  const source = data?.filters || data || {};

  for (const key of possibleKeys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value.map(normaliseFilterItem).filter(Boolean);
    }
  }

  return [];
}

function uniqueList(list) {
  return [...new Set(list.filter(Boolean))].sort();
}

function withAll(list) {
  return ["All", ...uniqueList(list)];
}

function displayFaculty(faculty) {
  if (Array.isArray(faculty)) return faculty.join(", ");
  return faculty || "University";
}

function scoreToNoiseStatus(score) {
  const value = Number(score);

  if (Number.isNaN(value)) return "No reports yet";

  if (value <= 12.5) return "Very Quiet";
  if (value <= 37.5) return "Quiet";
  if (value <= 62.5) return "Moderate";
  if (value <= 87.5) return "Noisy";
  return "Very Noisy";
}

function getNoiseStatus(space) {
  if (space.noise_status) return space.noise_status;

  if (space.quietness_score !== undefined && space.quietness_score !== null) {
    return scoreToNoiseStatus(space.quietness_score);
  }

  return space.noiseLevel || "No reports yet";
}

function normalisedScoreToFivePoint(score) {
  const value = Number(score);

  if (Number.isNaN(value)) return null;

  const fivePointValue = value / 25 + 1;
  return Math.min(5, Math.max(1, fivePointValue));
}

function getCrowdStatus(space) {
  if (
    space.report_count !== undefined &&
    Number(space.report_count) === 0 &&
    Number(space.avg_crowd) === 0
  ) {
    return "No reports yet";
  }

  if (space.avg_crowd !== undefined && space.avg_crowd !== null) {
    const crowdLevel = normalisedScoreToFivePoint(space.avg_crowd);

    if (crowdLevel !== null) {
      return `${crowdLevel.toFixed(1)} / 5`;
    }
  }

  return space.crowdLevel || "No reports yet";
}

function getOpenStatus(space) {
  if (space.is_open === true) return "Open now";
  if (space.is_open === false) return "Closed";
  return space.status || "Status unknown";
}

function getStatusClass(space) {
  if (space.is_open === true) return "open";
  if (space.is_open === false) return "closed";
  return "unknown";
}

function getDistance(space) {
  const distance =
    space.distance_km ??
    space.distanceKm ??
    space.distance ??
    space.distance_in_km;

  if (distance === undefined || distance === null) return null;

  const value = Number(distance);

  if (Number.isNaN(value)) return null;

  return value;
}

function formatDetailLabel(key) {
  return key
    .replaceAll("_", " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDetailValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not listed";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not listed";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getExtraDetails(space) {
  return Object.entries(space || {}).filter(([key, value]) => {
    return (
      !DETAIL_EXCLUDE_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== ""
    );
  });
}

function buildSpotQuery(filters) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.building !== "All") {
    params.set("building", filters.building);
  }

  if (filters.faculty !== "All") {
    params.set("faculty", filters.faculty);
  }

  if (filters.spotType !== "All") {
    params.set("spotType", filters.spotType);
  }

  if (filters.noise !== "All") {
    params.set("noise", NOISE_API_VALUE[filters.noise] || filters.noise);
  }

  if (filters.sortBy !== "default") {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.hasPower) {
    params.set("hasPower", "true");
  }

  if (filters.hasAircon) {
    params.set("hasAircon", "true");
  }

  if (filters.lat && filters.lng) {
    params.set("lat", filters.lat);
    params.set("lng", filters.lng);

    if (filters.radius) {
      params.set("radius", filters.radius);
    }
  }

  const queryString = params.toString();
  return queryString ? `/api/spots?${queryString}` : "/api/spots";
}

export default function ExplorePage({ user, onLoginClick, onLogout }) {
  const [spaces, setSpaces] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState({
    buildings: [],
    faculties: [],
    spotTypes: [],
  });
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");

  const loadSpaces = useCallback(
    async function loadSpaces(showLoader = true) {
      try {
        if (showLoader) setLoading(true);
        setError("");

        const endpoint = buildSpotQuery(filters);
        const data = await apiRequest(endpoint);

        setSpaces(toArray(data));
      } catch (err) {
        setError(err.message || "Unable to load study spaces.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [filters]
  );

  async function loadFilterOptions() {
    try {
      setFilterLoading(true);

      const data = await apiRequest("/api/spots/filter");

      setFilterOptions({
        buildings: extractFilterList(data, ["buildings", "building"]),
        faculties: extractFilterList(data, ["faculties", "faculty"]),
        spotTypes: extractFilterList(data, [
          "spotTypes",
          "spot_types",
          "types",
          "spotType",
        ]),
      });
    } catch (err) {
      console.warn("Unable to load filter options:", err.message);
    } finally {
      setFilterLoading(false);
    }
  }

  async function handleRefreshData() {
    try {
      setRefreshing(true);
      setError("");

      await apiRequest("/api/spots/refresh", {
        method: "POST",
      });

      await loadSpaces(false);
    } catch (err) {
      setError(err.message || "Unable to refresh study space data.");
    } finally {
      setRefreshing(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleNearMe() {
    if (!navigator.geolocation) {
      alert("Your browser does not support location access.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFilters((current) => ({
          ...current,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          radius: current.radius || "0.5",
          sortBy: "distance",
        }));

        setLocating(false);
      },
      () => {
        alert("Unable to get your location. Please allow location access.");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function clearLocationFilter() {
    setFilters((current) => ({
      ...current,
      lat: "",
      lng: "",
      radius: "",
      sortBy: current.sortBy === "distance" ? "default" : current.sortBy,
    }));
  }

  async function handleViewDetails(space) {
    setSelectedSpace(space);
    setDetailsLoading(true);

    try {
      const data = await apiRequest(`/api/spots/${space.id}`);
      const detailedSpace = data.spot || data.data || data;

      setSelectedSpace({
        ...space,
        ...detailedSpace,
      });
    } catch (err) {
      console.warn("Unable to load full spot details:", err.message);
      setSelectedSpace(space);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetailsModal() {
    setSelectedSpace(null);
    setDetailsLoading(false);
  }

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSpaces(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [loadSpaces]);

  useEffect(() => {
    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketStatus("connected");
    });

    socket.on("disconnect", () => {
      setSocketStatus("offline");
    });

    socket.on("connect_error", () => {
      setSocketStatus("offline");
    });

    SOCKET_EVENTS_TO_REFRESH.forEach((eventName) => {
      socket.on(eventName, () => {
        loadSpaces(false);
      });
    });

    return () => {
      SOCKET_EVENTS_TO_REFRESH.forEach((eventName) => {
        socket.off(eventName);
      });

      socket.disconnect();
    };
  }, [loadSpaces]);

  const fallbackOptions = useMemo(() => {
    return {
      buildings: uniqueList(spaces.map((space) => space.building)),
      faculties: uniqueList(spaces.map((space) => displayFaculty(space.faculty))),
      spotTypes: uniqueList(spaces.map((space) => space.spot_type || space.type)),
    };
  }, [spaces]);

  const buildingOptions = withAll(
    filterOptions.buildings.length
      ? filterOptions.buildings
      : fallbackOptions.buildings
  );

  const facultyOptions = withAll(
    filterOptions.faculties.length
      ? filterOptions.faculties
      : fallbackOptions.faculties
  );

  const spotTypeOptions = withAll(
    filterOptions.spotTypes.length
      ? filterOptions.spotTypes
      : fallbackOptions.spotTypes
  );

  const visibleSpaces = useMemo(() => {
    const query = filters.search.toLowerCase().trim();

    if (!query) return spaces;

    return spaces.filter((space) => {
      return (
        (space.name || "").toLowerCase().includes(query) ||
        (space.building || "").toLowerCase().includes(query) ||
        displayFaculty(space.faculty).toLowerCase().includes(query)
      );
    });
  }, [spaces, filters.search]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.search.trim()) count += 1;
    if (filters.building !== "All") count += 1;
    if (filters.faculty !== "All") count += 1;
    if (filters.spotType !== "All") count += 1;
    if (filters.noise !== "All") count += 1;
    if (filters.sortBy !== "default") count += 1;
    if (filters.hasPower) count += 1;
    if (filters.hasAircon) count += 1;
    if (filters.lat && filters.lng) count += 1;

    return count;
  }, [filters]);

  async function handleQuickFeedback(space) {
    if (!user) {
      alert("Please log in before submitting feedback.");
      onLoginClick();
      return;
    }

    const noiseLevel = prompt("Noise level from 1 quiet to 5 noisy:");
    const crowdLevel = prompt("Crowd level from 1 empty to 5 crowded:");
    const comment = prompt("Optional comment:");

    if (!noiseLevel || !crowdLevel) return;

    const noiseNumber = Number(noiseLevel);
    const crowdNumber = Number(crowdLevel);

    if (
      Number.isNaN(noiseNumber) ||
      Number.isNaN(crowdNumber) ||
      noiseNumber < 1 ||
      noiseNumber > 5 ||
      crowdNumber < 1 ||
      crowdNumber > 5
    ) {
      alert("Noise and crowd levels must be numbers between 1 and 5.");
      return;
    }

    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          spotId: space.id,
          noiseLevel: noiseNumber,
          crowdLevel: crowdNumber,
          comment: comment || "",
        }),
      });

      alert("Feedback submitted successfully.");
      await handleRefreshData();
    } catch (err) {
      const message = err.message.toLowerCase();

      if (
        message.includes("not authenticated") ||
        message.includes("unauthorized") ||
        message.includes("invalid token") ||
        message.includes("expired")
      ) {
        alert("Your login session expired. Please log in again.");
        onLoginClick();
        return;
      }

      alert(err.message);
    }
  }

  return (
    <div className="np-page">
      <nav className="np-navbar">
        <div className="np-brand">
          <div className="np-logo-mark">
            <span>NS</span>
          </div>

          <div className="np-logo-copy">
            <h1>NUSpaces</h1>
            <p>Quiet study spaces, live campus updates</p>
          </div>
        </div>

        <div className="np-nav-actions">
          <span
            className={
              socketStatus === "connected"
                ? "np-live-pill live"
                : "np-live-pill offline"
            }
          >
            <Wifi size={13} />
            {socketStatus === "connected" ? "Live updates on" : "Offline mode"}
          </span>

          {user ? (
            <>
              <span className="np-user-pill">
                {user.username || user.email}
              </span>
              <button className="np-outline-btn" onClick={onLogout}>
                <LogOut size={14} />
                Logout
              </button>
            </>
          ) : (
            <button className="np-login-btn" onClick={onLoginClick}>
              <LogIn size={14} />
              Login
            </button>
          )}
        </div>
      </nav>

      <main className="np-main">
        <section className="np-hero">
          <div>
            <span className="np-eyebrow">
              <SlidersHorizontal size={13} />
              Smart campus search
            </span>

            <h2>Find the right study space faster.</h2>

            <p>
              Filter by building, faculty, amenities, crowd level, quietness, or
              nearby locations using live backend data.
            </p>
          </div>

          <div className="np-hero-actions">
            <button
              className="np-secondary-action"
              onClick={handleNearMe}
              disabled={locating}
            >
              <Crosshair size={15} />
              {locating ? "Finding..." : "Near me"}
            </button>

            <button
              className="np-refresh-btn"
              onClick={handleRefreshData}
              disabled={refreshing}
            >
              <RefreshCcw size={15} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="np-search-panel">
          <div className="np-search-row">
            <div className="np-search-box">
              <Search size={16} />
              <input
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search by study space, building, or faculty..."
              />
            </div>

            <button className="np-reset-btn" onClick={resetFilters}>
              <X size={14} />
              Reset
            </button>
          </div>

          <div className="np-filter-grid">
            <label>
              Building
              <select
                value={filters.building}
                onChange={(e) => updateFilter("building", e.target.value)}
              >
                {buildingOptions.map((building) => (
                  <option key={building} value={building}>
                    {building === "All" ? "All Buildings" : building}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Faculty
              <select
                value={filters.faculty}
                onChange={(e) => updateFilter("faculty", e.target.value)}
              >
                {facultyOptions.map((faculty) => (
                  <option key={faculty} value={faculty}>
                    {faculty === "All" ? "All Faculties" : faculty}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Spot Type
              <select
                value={filters.spotType}
                onChange={(e) => updateFilter("spotType", e.target.value)}
              >
                {spotTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === "All" ? "All Types" : type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Noise
              <select
                value={filters.noise}
                onChange={(e) => updateFilter("noise", e.target.value)}
              >
                {NOISE_FILTERS.map((noise) => (
                  <option key={noise} value={noise}>
                    {noise === "All" ? "All Noise Levels" : noise}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sort By
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter("sortBy", e.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Radius
              <select
                value={filters.radius}
                onChange={(e) => updateFilter("radius", e.target.value)}
                disabled={!filters.lat || !filters.lng}
              >
                <option value="">Any distance</option>
                <option value="0.1">Within 100m</option>
                <option value="0.25">Within 250m</option>
                <option value="0.5">Within 500m</option>
                <option value="1">Within 1km</option>
              </select>
            </label>
          </div>

          <div className="np-filter-bottom-row">
            <button
              className={filters.hasPower ? "np-toggle active" : "np-toggle"}
              onClick={() => updateFilter("hasPower", !filters.hasPower)}
            >
              <Zap size={13} />
              Has power
            </button>

            <button
              className={filters.hasAircon ? "np-toggle active" : "np-toggle"}
              onClick={() => updateFilter("hasAircon", !filters.hasAircon)}
            >
              <AirVent size={13} />
              Has aircon
            </button>

            {filters.lat && filters.lng && (
              <button className="np-location-pill" onClick={clearLocationFilter}>
                <Navigation size={13} />
                Location filter on
                <X size={12} />
              </button>
            )}

            <span className="np-filter-count">
              <Filter size={13} />
              {activeFilterCount} active filter
              {activeFilterCount === 1 ? "" : "s"}
            </span>

            {filterLoading && (
              <span className="np-filter-loading">Loading filters...</span>
            )}
          </div>
        </section>

        {loading && <div className="np-state-card">Loading study spaces...</div>}

        {error && (
          <div className="np-state-card np-error-card">
            <h3>Could not load backend data</h3>
            <p>{error}</p>
            <p>Make sure your backend is running on http://localhost:5000.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="np-results-header">
              <div>
                <h3>Recommended Study Spaces</h3>
                <p>{visibleSpaces.length} spaces found</p>
              </div>
            </div>

            {visibleSpaces.length === 0 ? (
              <div className="np-empty-card">
                <h3>No spaces found</h3>
                <p>Try removing some filters or increasing the search radius.</p>
              </div>
            ) : (
              <section className="np-card-grid">
                {visibleSpaces.map((space) => {
                  const distance = getDistance(space);

                  return (
                    <article className="np-study-card compact" key={space.id}>
                      <div className="np-card-top">
                        <div className="np-card-title-block">
                          <h4>{space.name}</h4>
                          <p>{space.building}</p>
                        </div>

                        <span className={`np-status ${getStatusClass(space)}`}>
                          {getOpenStatus(space)}
                        </span>
                      </div>

                      <div className="np-card-meta">
                        <span>
                          <Volume2 size={13} />
                          {getNoiseStatus(space)}
                        </span>

                        <span>
                          <Users size={13} />
                          Crowd {getCrowdStatus(space)}
                        </span>

                        <span>
                          <CheckCircle size={13} />
                          {space.spot_type || space.type || "Study space"}
                        </span>
                      </div>

                      <div className="np-card-submeta">
                        <span>
                          <MapPin size={13} />
                          {displayFaculty(space.faculty)}
                        </span>

                        {distance !== null && (
                          <span>
                            <Navigation size={13} />
                            {distance.toFixed(2)} km away
                          </span>
                        )}
                      </div>

                      <div className="np-amenities">
                        {space.has_power && (
                          <span>
                            <Zap size={12} />
                            Power
                          </span>
                        )}

                        {space.has_aircon && (
                          <span>
                            <AirVent size={12} />
                            Aircon
                          </span>
                        )}

                        {!space.has_power && !space.has_aircon && (
                          <span className="muted">No amenities listed</span>
                        )}
                      </div>

                      <div className="np-card-actions">
                        <button
                          className="np-card-primary"
                          onClick={() => handleViewDetails(space)}
                        >
                          View Details
                        </button>

                        <button
                          className="np-card-secondary"
                          onClick={() => handleQuickFeedback(space)}
                        >
                          Report Status
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}

        {selectedSpace && (
          <div className="np-modal-backdrop" onClick={closeDetailsModal}>
            <div
              className="np-details-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="np-details-header">
                <div>
                  <span className={`np-status ${getStatusClass(selectedSpace)}`}>
                    {getOpenStatus(selectedSpace)}
                  </span>

                  <h2>{selectedSpace.name}</h2>

                  <p>
                    {selectedSpace.building || "Building not listed"} ·{" "}
                    {displayFaculty(selectedSpace.faculty)}
                  </p>
                </div>

                <button className="np-modal-close" onClick={closeDetailsModal}>
                  ×
                </button>
              </div>

              {detailsLoading && (
                <div className="np-details-loading">
                  Loading full venue details...
                </div>
              )}

              <div className="np-detail-grid">
                <div className="np-detail-item">
                  <span>Study Space Type</span>
                  <strong>
                    {selectedSpace.spot_type ||
                      selectedSpace.type ||
                      "Not listed"}
                  </strong>
                </div>

                <div className="np-detail-item">
                  <span>Quietness</span>
                  <strong>{getNoiseStatus(selectedSpace)}</strong>
                </div>

                <div className="np-detail-item">
                  <span>Crowd Level</span>
                  <strong>{getCrowdStatus(selectedSpace)}</strong>
                </div>

                <div className="np-detail-item">
                  <span>Power Plugs</span>
                  <strong>
                    {selectedSpace.has_power ? "Available" : "Not listed"}
                  </strong>
                </div>

                <div className="np-detail-item">
                  <span>Aircon</span>
                  <strong>
                    {selectedSpace.has_aircon ? "Available" : "Not listed"}
                  </strong>
                </div>

                <div className="np-detail-item">
                  <span>Reports</span>
                  <strong>
                    {selectedSpace.report_count !== undefined
                      ? selectedSpace.report_count
                      : "Not listed"}
                  </strong>
                </div>

                {getDistance(selectedSpace) !== null && (
                  <div className="np-detail-item">
                    <span>Distance</span>
                    <strong>{getDistance(selectedSpace).toFixed(2)} km away</strong>
                  </div>
                )}

                {(selectedSpace.floor || selectedSpace.level) && (
                  <div className="np-detail-item">
                    <span>Floor / Level</span>
                    <strong>{selectedSpace.floor || selectedSpace.level}</strong>
                  </div>
                )}

                {(selectedSpace.latitude || selectedSpace.lat) &&
                  (selectedSpace.longitude || selectedSpace.lng) && (
                    <div className="np-detail-item">
                      <span>Coordinates</span>
                      <strong>
                        {selectedSpace.latitude || selectedSpace.lat},{" "}
                        {selectedSpace.longitude || selectedSpace.lng}
                      </strong>
                    </div>
                  )}
              </div>

              {(selectedSpace.description || selectedSpace.notes) && (
                <div className="np-details-section">
                  <h3>Description</h3>
                  <p>{selectedSpace.description || selectedSpace.notes}</p>
                </div>
              )}

              {(selectedSpace.opening_hours ||
                selectedSpace.hours ||
                selectedSpace.schedule) && (
                <div className="np-details-section">
                  <h3>Opening Hours / Schedule</h3>
                  <p>
                    {formatDetailValue(
                      selectedSpace.opening_hours ||
                        selectedSpace.hours ||
                        selectedSpace.schedule
                    )}
                  </p>
                </div>
              )}

              {getExtraDetails(selectedSpace).length > 0 && (
                <div className="np-details-section">
                  <h3>Additional Information</h3>

                  <div className="np-extra-detail-list">
                    {getExtraDetails(selectedSpace).map(([key, value]) => (
                      <div className="np-extra-detail-row" key={key}>
                        <span>{formatDetailLabel(key)}</span>
                        <strong>{formatDetailValue(value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}