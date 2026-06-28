import { useEffect, useMemo, useState } from "react";
import {
  AirVent,
  CheckCircle,
  Clock,
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

export default function ExplorePage({ user, onLoginClick, onLogout }) {
  const isAdmin = user?.role === "admin";

  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);

  const [search, setSearch] = useState("");
  const [noiseFilter, setNoiseFilter] = useState("All");
  const [crowdFilter, setCrowdFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [facultyFilter, setFacultyFilter] = useState("All");
  const [openFilter, setOpenFilter] = useState("All");
  const [powerOnly, setPowerOnly] = useState(false);
  const [airconOnly, setAirconOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadSpaces() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/api/spots");
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

  async function handleQuickFeedback(space) {
    if (!user) {
      onLoginClick();
      return;
    }

    const noiseLevel = prompt("Noise level from 1 quiet to 5 noisy:");
    const crowdLevel = prompt("Crowd level from 1 empty to 5 crowded:");
    const comment = prompt("Optional comment:");

    if (!noiseLevel || !crowdLevel) return;

    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          spotId: space.id,
          noiseLevel: Number(noiseLevel),
          crowdLevel: Number(crowdLevel),
          comment: comment || "",
        }),
      });

      alert("Feedback submitted successfully.");
      await loadSpaces();
    } catch (err) {
      alert(err.message);
    }
  }

  function resetFilters() {
    setSearch("");
    setNoiseFilter("All");
    setCrowdFilter("All");
    setTypeFilter("All");
    setFacultyFilter("All");
    setOpenFilter("All");
    setPowerOnly(false);
    setAirconOnly(false);
  }

  useEffect(() => {
    loadSpaces();
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
              index, faculty, opening status, power sockets, and aircon.
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
              className={powerOnly ? "np-toggle active" : "np-toggle"}
              onClick={() => setPowerOnly((prev) => !prev)}
            >
              <Zap size={13} />
              Power sockets
            </button>

            <button
              className={airconOnly ? "np-toggle active" : "np-toggle"}
              onClick={() => setAirconOnly((prev) => !prev)}
            >
              <AirVent size={13} />
              Aircon
            </button>

            <span className="np-filter-count">
              Showing {filteredSpaces.length} / {spaces.length} spaces
            </span>

            {loading && (
              <span className="np-filter-loading">Loading spaces...</span>
            )}
          </div>
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
              <p>{filteredSpaces.length} spaces found</p>
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
                    </div>

                    <div className="np-amenities">
                      {space.has_power ? (
                        <span>
                          <Zap size={12} />
                          Power
                        </span>
                      ) : (
                        <span className="muted">No power info</span>
                      )}

                      {space.has_aircon ? (
                        <span>
                          <AirVent size={12} />
                          Aircon
                        </span>
                      ) : (
                        <span className="muted">No aircon info</span>
                      )}
                    </div>

                    <div className="np-card-actions">
                      <button
                        className="np-card-primary"
                        onClick={() => setSelectedSpace(space)}
                      >
                        View Details
                      </button>

                      <button
                        className="np-card-secondary"
                        onClick={() => handleQuickFeedback(space)}
                      >
                        {user ? "Report Status" : "Login to Report"}
                      </button>
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
                onClick={() => setSelectedSpace(null)}
              >
                <X size={22} />
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
}