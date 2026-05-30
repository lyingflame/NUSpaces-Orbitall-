import { useEffect, useMemo, useState } from "react";
import {
  AirVent,
  CheckCircle,
  LogIn,
  LogOut,
  MapPin,
  RefreshCcw,
  Search,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import { apiRequest } from "../services/api";

const NOISE_FILTERS = [
  "All",
  "Very Quiet",
  "Quiet",
  "Moderate",
  "Noisy",
  "Very Noisy",
];

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

export default function ExplorePage({ user, onLoginClick, onLogout }) {
  const [spaces, setSpaces] = useState([]);
  const [search, setSearch] = useState("");
  const [noiseFilter, setNoiseFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
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
    try {
      setRefreshing(true);
      setError("");

      await apiRequest("/api/spots/refresh", {
        method: "POST",
      });

      const data = await apiRequest("/api/spots");
      setSpaces(toArray(data));
    } catch (err) {
      setError(err.message || "Unable to refresh study space data.");
    } finally {
      setRefreshing(false);
    }
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

  const filteredSpaces = spaces.filter((space) => {
    const query = search.toLowerCase();

    const matchesSearch =
      (space.name || "").toLowerCase().includes(query) ||
      (space.building || "").toLowerCase().includes(query) ||
      displayFaculty(space.faculty).toLowerCase().includes(query);

    const noise = getNoiseStatus(space).toLowerCase();
    const matchesNoise =
      noiseFilter === "All" || noise === noiseFilter.toLowerCase();

    const type = space.spot_type || space.type || "";
    const matchesType = typeFilter === "All" || type === typeFilter;

    return matchesSearch && matchesNoise && matchesType;
  });

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
      await handleRefreshData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="np-page">
      <nav className="np-navbar">
        <div className="np-brand">
          <div className="np-brand-icon">
            <MapPin size={22} />
          </div>

          <div>
            <h1>NUSpaces</h1>
            <p>Find quiet study spaces in real time</p>
          </div>
        </div>

        <div className="np-nav-actions">
          {user ? (
            <>
              <span className="np-user-pill">
                {user.username || user.email}
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
        <section className="np-header-strip">
          <div>
            <h2>Explore Study Spaces</h2>
            <p>
              Search and filter NUS study spaces by quietness, crowd level, and
              space type.
            </p>
          </div>

          <button className="np-refresh-btn" onClick={handleRefreshData}>
            <RefreshCcw size={15} />
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </section>

        <section className="np-search-panel">
          <div className="np-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by study space, building, or faculty..."
            />
          </div>

          <div className="np-filter-row">
            {NOISE_FILTERS.map((noise) => (
              <button
                key={noise}
                className={noiseFilter === noise ? "np-chip active" : "np-chip"}
                onClick={() => setNoiseFilter(noise)}
              >
                {noise}
              </button>
            ))}

            <select
              className="np-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All Types" : type}
                </option>
              ))}
            </select>
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
                <p>{filteredSpaces.length} spaces found</p>
              </div>
            </div>

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
                      {space.spot_type || "Study space"}
                    </span>
                  </div>

                  <div className="np-card-submeta">
                    <span>
                      <MapPin size={14} />
                      {displayFaculty(space.faculty)}
                    </span>
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
                  </div>

                  <div className="np-card-actions">
                    <button className="np-card-primary">View Details</button>
                    <button
                      className="np-card-secondary"
                      onClick={() => handleQuickFeedback(space)}
                    >
                      Report Status
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}