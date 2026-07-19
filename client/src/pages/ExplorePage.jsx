import { useEffect, useMemo, useState } from "react";
import {
  AirVent,
  CheckCircle,
  Clock,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  RefreshCcw,
  Search,
  Users,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { apiRequest } from "../services/api";

function toArray(data) {
  if (Array.isArray(data)) return data;
  return data?.spots || data?.data || [];
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

function getCrowdNumber(space) {
  if (space.avg_crowd !== undefined && space.avg_crowd !== null) {
    return normalisedScoreToFivePoint(space.avg_crowd);
  }

  if (space.crowdLevel) {
    const crowd = String(space.crowdLevel).toLowerCase();

    if (crowd.includes("low")) return 1;
    if (crowd.includes("medium")) return 3;
    if (crowd.includes("high") || crowd.includes("crowded")) return 5;
  }

  return null;
}

function getCrowdStatus(space) {
  if (
    space.report_count !== undefined &&
    Number(space.report_count) === 0 &&
    Number(space.avg_crowd) === 0
  ) {
    return "No reports yet";
  }

  const crowdLevel = getCrowdNumber(space);

  if (crowdLevel !== null) {
    return `${crowdLevel.toFixed(1)} / 5`;
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

function getYesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Not available";
}

function getReportText(space) {
  if (space.report_count === undefined || space.report_count === null) {
    return "No report data";
  }

  return `${space.report_count} reports`;
}

function getDistanceText(space) {
  const distance =
    space.distance_km ??
    space.distanceKm ??
    space.distance ??
    space.distance_m ??
    null;

  if (distance === null || distance === undefined) return null;

  const value = Number(distance);

  if (Number.isNaN(value)) return String(distance);

  if (value > 50) {
    return `${Math.round(value)} m away`;
  }

  return `${value.toFixed(2)} km away`;
}

export default function ExplorePage({ user, onLoginClick, onLogout }) {
  const isAdmin = user?.role === "admin";

  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Admin-only edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    building: "",
    faculty: "",
    spotType: "library",
    latitude: "",
    longitude: "",
    capacity: "",
    hasPower: false,
    hasAircon: false,
    description: "",
  });

  const [search, setSearch] = useState("");
  const [noiseFilter, setNoiseFilter] = useState("All");
  const [crowdFilter, setCrowdFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [facultyFilter, setFacultyFilter] = useState("All");
  const [openFilter, setOpenFilter] = useState("All");
  const [radiusFilter, setRadiusFilter] = useState("All");
  const [powerOnly, setPowerOnly] = useState(false);
  const [airconOnly, setAirconOnly] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Custom toast notifications for success/error feedback
  const [toast, setToast] = useState(null);

  // Custom feedback modal state
  const [feedbackSpace, setFeedbackSpace] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    noiseLevel: "3",
    crowdLevel: "3",
    comment: "",
  });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  function showToast(message, type = "success") {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function loadSpaces(location = userLocation, radius = radiusFilter) {
    try {
      setLoading(true);
      setError("");

      let endpoint = "/api/spots";

      if (location) {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
        });

        if (radius !== "All") {
          params.set("radius", radius);
        }

        endpoint = `/api/spots?${params.toString()}`;
      }

      const data = await apiRequest(endpoint);
      setSpaces(toArray(data));
    } catch (err) {
      setError(err.message || "Unable to load study spaces.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshData() {
    if (!isAdmin) {
      setError("Only admins can refresh study space data.");
      return;
    }

    try {
      setRefreshing(true);
      setError("");

      await apiRequest("/api/spots/refresh", {
        method: "POST",
      });

      await loadSpaces();
    } catch (err) {
      setError(err.message || "Unable to refresh study space data.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleUseMyLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(location);
        setLocationLoading(false);

        await loadSpaces(location, radiusFilter);
      },
      () => {
        setLocationLoading(false);
        setLocationError("Unable to access your location.");
      }
    );
  }

  async function handleClearLocation() {
    setUserLocation(null);
    setLocationError("");
    setRadiusFilter("All");
    await loadSpaces(null, "All");
  }

  async function handleRadiusChange(value) {
    setRadiusFilter(value);

    if (userLocation) {
      await loadSpaces(userLocation, value);
    }
  }

  function handleQuickFeedback(space) {
    if (!user) {
      onLoginClick();
      return;
    }

    setFeedbackSpace(space);
    setFeedbackError("");
    setFeedbackForm({
      noiseLevel: "3",
      crowdLevel: "3",
      comment: "",
    });
  }

  function closeFeedbackModal() {
    setFeedbackSpace(null);
    setFeedbackError("");
    setFeedbackSaving(false);
  }

  async function handleSubmitFeedback(e) {
    e.preventDefault();

    if (!feedbackSpace) return;

    try {
      setFeedbackSaving(true);
      setFeedbackError("");

      await apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          spotId: feedbackSpace.id,
          noiseLevel: Number(feedbackForm.noiseLevel),
          crowdLevel: Number(feedbackForm.crowdLevel),
          comment: feedbackForm.comment.trim(),
        }),
      });

      closeFeedbackModal();
      showToast("Status report submitted successfully.");
      await loadSpaces();
    } catch (err) {
      setFeedbackError(
        err.message || "Unable to submit your status report."
      );
      setFeedbackSaving(false);
    }
  }

  function handleEditSpace(space) {
    if (!isAdmin) {
      setError("Only admins can edit study spaces.");
      return;
    }

    setEditError("");
    setSelectedSpace(space);
    setIsEditing(true);

    setEditForm({
      name: space.name || "",
      building: space.building || "",
      faculty: Array.isArray(space.faculty)
        ? space.faculty.join(", ")
        : space.faculty || "",
      spotType: space.spot_type || space.spotType || space.type || "library",
      latitude:
        space.latitude !== undefined && space.latitude !== null
          ? String(space.latitude)
          : "",
      longitude:
        space.longitude !== undefined && space.longitude !== null
          ? String(space.longitude)
          : "",
      capacity:
        space.capacity !== undefined && space.capacity !== null
          ? String(space.capacity)
          : "",
      hasPower: space.has_power ?? space.hasPower ?? false,
      hasAircon: space.has_aircon ?? space.hasAircon ?? false,
      description: space.description || "",
    });
  }

  function handleCloseSpaceModal() {
    setSelectedSpace(null);
    setIsEditing(false);
    setEditError("");
  }

  function handleEditInputChange(e) {
    const { name, value, type, checked } = e.target;

    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSaveSpace(e) {
    e.preventDefault();

    if (!isAdmin) {
      setEditError("Only admins can edit study spaces.");
      return;
    }

    if (!selectedSpace?.id) {
      setEditError("Unable to identify this study space.");
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("Study space name is required.");
      return;
    }

    try {
      setEditSaving(true);
      setEditError("");

      const payload = {
        name: editForm.name.trim(),
        building: editForm.building.trim(),
        faculty: editForm.faculty
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        spotType: editForm.spotType,
        hasPower: editForm.hasPower,
        hasAircon: editForm.hasAircon,
        description: editForm.description.trim(),
      };

      if (editForm.latitude !== "") {
        payload.latitude = Number(editForm.latitude);
      }

      if (editForm.longitude !== "") {
        payload.longitude = Number(editForm.longitude);
      }

      if (editForm.capacity !== "") {
        payload.capacity = Number(editForm.capacity);
      }

      await apiRequest(`/api/admin/spots/${selectedSpace.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await loadSpaces();

      setSelectedSpace(null);
      setIsEditing(false);
      showToast("Study space updated successfully.");
    } catch (err) {
      setEditError(err.message || "Unable to update study space.");
    } finally {
      setEditSaving(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setNoiseFilter("All");
    setCrowdFilter("All");
    setTypeFilter("All");
    setFacultyFilter("All");
    setOpenFilter("All");
    setRadiusFilter("All");
    setPowerOnly(false);
    setAirconOnly(false);
    setUserLocation(null);
    setLocationError("");
    loadSpaces(null, "All");
  }

  useEffect(() => {
    loadSpaces(null, "All");
  }, []);

  const availableTypes = useMemo(() => {
    const types = spaces
      .map((space) => space.spot_type || space.type)
      .filter(Boolean);

    return ["All", ...new Set(types)];
  }, [spaces]);

  const availableFaculties = useMemo(() => {
    const faculties = spaces
      .flatMap((space) =>
        Array.isArray(space.faculty) ? space.faculty : [space.faculty]
      )
      .filter(Boolean);

    return ["All", ...new Set(faculties)];
  }, [spaces]);

  const filteredSpaces = spaces.filter((space) => {
    const query = search.toLowerCase();

    const name = space.name || "";
    const building = space.building || "";
    const faculty = displayFaculty(space.faculty);
    const type = space.spot_type || space.type || "";
    const noise = getNoiseStatus(space);
    const crowdNumber = getCrowdNumber(space);

    const matchesSearch =
      name.toLowerCase().includes(query) ||
      building.toLowerCase().includes(query) ||
      faculty.toLowerCase().includes(query) ||
      type.toLowerCase().includes(query);

    const matchesNoise =
      noiseFilter === "All" ||
      noise.toLowerCase() === noiseFilter.toLowerCase();

    let matchesCrowd = true;

    if (crowdFilter === "Low") {
      matchesCrowd = crowdNumber !== null && crowdNumber <= 2;
    } else if (crowdFilter === "Medium") {
      matchesCrowd = crowdNumber !== null && crowdNumber > 2 && crowdNumber <= 4;
    } else if (crowdFilter === "High") {
      matchesCrowd = crowdNumber !== null && crowdNumber > 4;
    } else if (crowdFilter === "No reports") {
      matchesCrowd = crowdNumber === null;
    }

    const matchesType = typeFilter === "All" || type === typeFilter;

    const matchesFaculty =
      facultyFilter === "All" ||
      (Array.isArray(space.faculty)
        ? space.faculty.includes(facultyFilter)
        : space.faculty === facultyFilter);

    const matchesOpen =
      openFilter === "All" ||
      (openFilter === "Open" && space.is_open === true) ||
      (openFilter === "Closed" && space.is_open === false) ||
      (openFilter === "Unknown" &&
        space.is_open !== true &&
        space.is_open !== false);

    const matchesPower = !powerOnly || space.has_power === true;
    const matchesAircon = !airconOnly || space.has_aircon === true;

    return (
      matchesSearch &&
      matchesNoise &&
      matchesCrowd &&
      matchesType &&
      matchesFaculty &&
      matchesOpen &&
      matchesPower &&
      matchesAircon
    );
  });

  return (
    <div className="np-page">
      <nav className="np-navbar">
        <div className="np-brand">
          <div className="np-logo-mark">
            <span>NP</span>
          </div>

          <div className="np-logo-copy">
            <h1>NUSpaces</h1>
            <p>Find quiet study spaces in real time</p>
          </div>
        </div>

        <div className="np-nav-actions">
          {user ? (
            <>
              <span className="np-user-pill">
                {user.username || user.email}
                {isAdmin ? " · Admin" : ""}
              </span>

              <button className="np-outline-btn" onClick={onLogout}>
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <button className="np-login-btn" onClick={onLoginClick}>
              <LogIn size={15} />
              Login
            </button>
          )}
        </div>
      </nav>

      <main className="np-main">
        <section className="np-hero">
          <div>
            <h2>Explore Study Spaces</h2>
            <p>
              Search and filter NUS study spaces by venue, noise level, crowd
              index, faculty, opening status, location, and amenities.
            </p>
          </div>

          {isAdmin && (
            <div className="np-hero-actions">
              <button
                className="np-refresh-btn"
                onClick={handleRefreshData}
                disabled={refreshing}
              >
                <RefreshCcw size={15} />
                {refreshing ? "Refreshing..." : "Refresh data"}
              </button>
            </div>
          )}
        </section>

        <section className="np-search-panel">
          <div className="np-search-row">
            <div className="np-search-box">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by venue, building, faculty, or type..."
              />
            </div>

            <button className="np-reset-btn" onClick={resetFilters}>
              Reset filters
            </button>
          </div>

          <div className="np-filter-grid">
            <label>
              Noise Level
              <select
                value={noiseFilter}
                onChange={(e) => setNoiseFilter(e.target.value)}
              >
                <option>All</option>
                <option>Very Quiet</option>
                <option>Quiet</option>
                <option>Moderate</option>
                <option>Noisy</option>
                <option>Very Noisy</option>
                <option>No reports yet</option>
              </select>
            </label>

            <label>
              Crowd Index
              <select
                value={crowdFilter}
                onChange={(e) => setCrowdFilter(e.target.value)}
              >
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>No reports</option>
              </select>
            </label>

            <label>
              Venue Type
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "All" ? "All Types" : type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Faculty
              <select
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
              >
                {availableFaculties.map((faculty) => (
                  <option key={faculty} value={faculty}>
                    {faculty === "All" ? "All Faculties" : faculty}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Opening Status
              <select
                value={openFilter}
                onChange={(e) => setOpenFilter(e.target.value)}
              >
                <option>All</option>
                <option>Open</option>
                <option>Closed</option>
                <option>Unknown</option>
              </select>
            </label>

            <label>
              Distance Radius
              <select
                value={radiusFilter}
                onChange={(e) => handleRadiusChange(e.target.value)}
                disabled={!userLocation}
              >
                <option>All</option>
                <option value="0.5">Within 0.5 km</option>
                <option value="1">Within 1 km</option>
                <option value="1.5">Within 1.5 km</option>
                <option value="2">Within 2 km</option>
                <option value="3">Within 3 km</option>
              </select>
            </label>

            <label>
              Amenities
              <select
                value={
                  powerOnly && airconOnly
                    ? "Power + Aircon"
                    : powerOnly
                    ? "Power"
                    : airconOnly
                    ? "Aircon"
                    : "All"
                }
                onChange={(e) => {
                  const value = e.target.value;

                  setPowerOnly(value === "Power" || value === "Power + Aircon");
                  setAirconOnly(value === "Aircon" || value === "Power + Aircon");
                }}
              >
                <option>All</option>
                <option>Power</option>
                <option>Aircon</option>
                <option>Power + Aircon</option>
              </select>
            </label>
          </div>

          <div className="np-filter-bottom-row">
            <button
              className={userLocation ? "np-toggle active" : "np-toggle"}
              onClick={userLocation ? handleClearLocation : handleUseMyLocation}
              disabled={locationLoading}
            >
              <LocateFixed size={13} />
              {locationLoading
                ? "Getting location..."
                : userLocation
                ? "Location enabled"
                : "Use my location"}
            </button>

            <span className="np-filter-count">
              Showing {filteredSpaces.length} / {spaces.length} spaces
            </span>

            {loading && (
              <span className="np-filter-loading">Loading spaces...</span>
            )}
          </div>

          {locationError && (
            <div className="np-state-card np-error-card">
              <p>{locationError}</p>
            </div>
          )}
        </section>

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
              <h3>Recommended Study Spaces</h3>
              <p>
                {filteredSpaces.length} spaces found
                {userLocation ? " · sorted by distance" : ""}
              </p>
            </div>

            {filteredSpaces.length === 0 ? (
              <div className="np-empty-card">
                <h3>No spaces found</h3>
                <p>Try changing your search or removing some filters.</p>
              </div>
            ) : (
              <section className="np-card-grid">
                {filteredSpaces.map((space) => (
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
                        <Volume2 size={14} />
                        {getNoiseStatus(space)}
                      </span>

                      <span>
                        <Users size={14} />
                        Crowd {getCrowdStatus(space)}
                      </span>

                      <span>
                        <CheckCircle size={14} />
                        {space.spot_type || space.type || "Study space"}
                      </span>
                    </div>

                    <div className="np-card-submeta">
                      <span>
                        <MapPin size={14} />
                        {displayFaculty(space.faculty)}
                      </span>

                      {getDistanceText(space) && (
                        <span>
                          <LocateFixed size={14} />
                          {getDistanceText(space)}
                        </span>
                      )}
                    </div>

                    {(space.has_power || space.has_aircon) && (
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
                      </div>
                    )}

                    <div className="np-card-actions">
                      <button
                        className="np-card-primary"
                        onClick={() => {
                          setSelectedSpace(space);
                          setIsEditing(false);
                          setEditError("");
                        }}
                      >
                        View Details
                      </button>

                      <button
                        className="np-card-secondary"
                        onClick={() => handleQuickFeedback(space)}
                      >
                        {user ? "Report Status" : "Login to Report"}
                      </button>

                      {isAdmin && (
                        <button
                          className="np-card-admin"
                          onClick={() => handleEditSpace(space)}
                        >
                          Edit Space
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {selectedSpace && (
        <div className="np-modal-backdrop">
          <div className="np-details-modal">
            <div className="np-details-header">
              <div>
                <span className={`np-status ${getStatusClass(selectedSpace)}`}>
                  {getOpenStatus(selectedSpace)}
                </span>

                <h2>{selectedSpace.name}</h2>

                <p>
                  {selectedSpace.building || "Unknown building"} ·{" "}
                  {displayFaculty(selectedSpace.faculty)}
                </p>
              </div>

              <button
                className="np-modal-close"
                onClick={handleCloseSpaceModal}
              >
                <X size={22} />
              </button>
            </div>

            {isAdmin && !isEditing && (
              <div className="np-details-admin-actions">
                <button
                  className="np-card-admin"
                  onClick={() => handleEditSpace(selectedSpace)}
                >
                  Edit Space
                </button>
              </div>
            )}

            {isEditing ? (
              <form className="np-edit-form" onSubmit={handleSaveSpace}>
                <div className="np-detail-grid">
                  <label className="np-detail-item">
                    <span>Study Space Name</span>
                    <input
                      name="name"
                      value={editForm.name}
                      onChange={handleEditInputChange}
                      required
                    />
                  </label>

                  <label className="np-detail-item">
                    <span>Building</span>
                    <input
                      name="building"
                      value={editForm.building}
                      onChange={handleEditInputChange}
                    />
                  </label>

                  <label className="np-detail-item">
                    <span>Faculty</span>
                    <input
                      name="faculty"
                      value={editForm.faculty}
                      onChange={handleEditInputChange}
                      placeholder="Computing, Engineering"
                    />
                  </label>

                  <label className="np-detail-item">
                    <span>Venue Type</span>
                    <select
                      name="spotType"
                      value={editForm.spotType}
                      onChange={handleEditInputChange}
                    >
                      <option value="library">Library</option>
                      <option value="study_room">Study Room</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="lounge">Lounge</option>
                      <option value="lab">Lab</option>
                    </select>
                  </label>

                  <label className="np-detail-item">
                    <span>Latitude</span>
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      value={editForm.latitude}
                      onChange={handleEditInputChange}
                    />
                  </label>

                  <label className="np-detail-item">
                    <span>Longitude</span>
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      value={editForm.longitude}
                      onChange={handleEditInputChange}
                    />
                  </label>

                  <label className="np-detail-item">
                    <span>Capacity</span>
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      value={editForm.capacity}
                      onChange={handleEditInputChange}
                    />
                  </label>
                </div>

                <div className="np-edit-checkbox-row">
                  <label>
                    <input
                      name="hasPower"
                      type="checkbox"
                      checked={editForm.hasPower}
                      onChange={handleEditInputChange}
                    />
                    Power sockets available
                  </label>

                  <label>
                    <input
                      name="hasAircon"
                      type="checkbox"
                      checked={editForm.hasAircon}
                      onChange={handleEditInputChange}
                    />
                    Air-conditioning available
                  </label>
                </div>

                <label className="np-edit-description">
                  <span>Description</span>
                  <textarea
                    name="description"
                    rows="4"
                    value={editForm.description}
                    onChange={handleEditInputChange}
                    maxLength={1000}
                  />
                </label>

                {editError && <p className="simpleError">{editError}</p>}

                <div className="np-card-actions">
                  <button
                    className="np-card-primary"
                    type="submit"
                    disabled={editSaving}
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    className="np-card-secondary"
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditError("");
                    }}
                    disabled={editSaving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
            <div className="np-detail-grid">
              <div className="np-detail-item">
                <span>Venue Type</span>
                <strong>
                  {selectedSpace.spot_type ||
                    selectedSpace.type ||
                    "Study space"}
                </strong>
              </div>

              <div className="np-detail-item">
                <span>Noise Level</span>
                <strong>{getNoiseStatus(selectedSpace)}</strong>
              </div>

              <div className="np-detail-item">
                <span>Crowd Index</span>
                <strong>{getCrowdStatus(selectedSpace)}</strong>
              </div>

              <div className="np-detail-item">
                <span>Reports</span>
                <strong>{getReportText(selectedSpace)}</strong>
              </div>

              <div className="np-detail-item">
                <span>Power Sockets</span>
                <strong>{getYesNo(selectedSpace.has_power)}</strong>
              </div>

              <div className="np-detail-item">
                <span>Aircon</span>
                <strong>{getYesNo(selectedSpace.has_aircon)}</strong>
              </div>

              {getDistanceText(selectedSpace) && (
                <div className="np-detail-item">
                  <span>Distance</span>
                  <strong>{getDistanceText(selectedSpace)}</strong>
                </div>
              )}
            </div>

            <section className="np-details-section">
              <h3>
                <MapPin size={16} /> Location
              </h3>

              <p>
                <strong>Building:</strong>{" "}
                {selectedSpace.building || "Not available"}
              </p>

              <p>
                <strong>Faculty:</strong>{" "}
                {displayFaculty(selectedSpace.faculty)}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {selectedSpace.address ||
                  selectedSpace.location ||
                  "No address provided"}
              </p>

              {getDistanceText(selectedSpace) && (
                <p>
                  <strong>Distance:</strong> {getDistanceText(selectedSpace)}
                </p>
              )}
            </section>

            <section className="np-details-section">
              <h3>
                <Clock size={16} /> Opening Information
              </h3>

              <p>
                <strong>Status:</strong> {getOpenStatus(selectedSpace)}
              </p>

              <p>
                <strong>Opening hours:</strong>{" "}
                {selectedSpace.opening_hours ||
                  selectedSpace.hours ||
                  "Opening hours not available"}
              </p>
            </section>

            <section className="np-details-section">
              <h3>
                <Zap size={16} /> Amenities
              </h3>

              <p>
                <strong>Power sockets:</strong>{" "}
                {getYesNo(selectedSpace.has_power)}
              </p>

              <p>
                <strong>Aircon:</strong> {getYesNo(selectedSpace.has_aircon)}
              </p>

              <p>
                <strong>Additional notes:</strong>{" "}
                {selectedSpace.description ||
                  selectedSpace.notes ||
                  "No additional notes yet."}
              </p>
            </section>

            <section className="np-details-section">
              <h3>
                <Users size={16} /> Community Feedback
              </h3>

              <p>
                <strong>Noise:</strong> {getNoiseStatus(selectedSpace)}
              </p>

              <p>
                <strong>Crowd:</strong> {getCrowdStatus(selectedSpace)}
              </p>

              <p>
                <strong>Report count:</strong> {getReportText(selectedSpace)}
              </p>

              <button
                className="np-card-secondary"
                onClick={() => handleQuickFeedback(selectedSpace)}
              >
                {user ? "Report Status" : "Login to Report"}
              </button>
            </section>
              </>
            )}
          </div>
        </div>
      )}

      {feedbackSpace && (
        <div className="np-modal-backdrop">
          <div className="np-feedback-modal">
            <div className="np-feedback-header">
              <div>
                <span className="np-feedback-badge">Community Report</span>
                <h2>Report Study Space Status</h2>
                <p>{feedbackSpace.name}</p>
              </div>

              <button
                className="np-modal-close"
                onClick={closeFeedbackModal}
                aria-label="Close feedback form"
              >
                <X size={22} />
              </button>
            </div>

            <form className="np-feedback-form" onSubmit={handleSubmitFeedback}>
              <div className="np-feedback-field">
                <label htmlFor="feedback-noise">Noise Level</label>
                <p>How noisy is this space right now?</p>
                <select
                  id="feedback-noise"
                  value={feedbackForm.noiseLevel}
                  onChange={(e) =>
                    setFeedbackForm((current) => ({
                      ...current,
                      noiseLevel: e.target.value,
                    }))
                  }
                >
                  <option value="1">1 — Very Quiet</option>
                  <option value="2">2 — Quiet</option>
                  <option value="3">3 — Moderate</option>
                  <option value="4">4 — Noisy</option>
                  <option value="5">5 — Very Noisy</option>
                </select>
              </div>

              <div className="np-feedback-field">
                <label htmlFor="feedback-crowd">Crowd Level</label>
                <p>How crowded is this space right now?</p>
                <select
                  id="feedback-crowd"
                  value={feedbackForm.crowdLevel}
                  onChange={(e) =>
                    setFeedbackForm((current) => ({
                      ...current,
                      crowdLevel: e.target.value,
                    }))
                  }
                >
                  <option value="1">1 — Almost Empty</option>
                  <option value="2">2 — Light Crowd</option>
                  <option value="3">3 — Moderate</option>
                  <option value="4">4 — Busy</option>
                  <option value="5">5 — Very Crowded</option>
                </select>
              </div>

              <div className="np-feedback-field">
                <label htmlFor="feedback-comment">Optional Comment</label>
                <p>Add any useful context for other students.</p>
                <textarea
                  id="feedback-comment"
                  rows="4"
                  maxLength="500"
                  placeholder="e.g. Quiet near the back, but most tables are occupied."
                  value={feedbackForm.comment}
                  onChange={(e) =>
                    setFeedbackForm((current) => ({
                      ...current,
                      comment: e.target.value,
                    }))
                  }
                />
              </div>

              {feedbackError && (
                <p className="simpleError">{feedbackError}</p>
              )}

              <div className="np-feedback-actions">
                <button
                  type="button"
                  className="np-feedback-cancel"
                  onClick={closeFeedbackModal}
                  disabled={feedbackSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="np-feedback-submit"
                  disabled={feedbackSaving}
                >
                  {feedbackSaving ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`np-toast ${toast.type}`}>
          <div className="np-toast-icon">
            {toast.type === "success" ? "✓" : "!"}
          </div>

          <div className="np-toast-content">
            <strong>
              {toast.type === "success" ? "Success" : "Something went wrong"}
            </strong>
            <span>{toast.message}</span>
          </div>

          <button
            className="np-toast-close"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}