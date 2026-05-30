import { useEffect, useMemo, useState } from "react";
import {
  AirVent,
  CheckCircle,
  Filter,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  RefreshCcw,
  Search,
  Sparkles,
  Users,
  Volume2,
  Zap,
} from "lucide-react";
import { apiRequest } from "../services/api";

function toArray(data) {
  if (Array.isArray(data)) return data;
  return data.spots || data.data || [];
}

function displayFaculty(faculty) {
  if (Array.isArray(faculty)) return faculty.join(", ");
  return faculty || "University";
}

function getNoiseStatus(space) {
  return space.noise_status || space.noiseLevel || "No reports yet";
}

function getCrowdStatus(space) {
  if (space.avg_crowd !== undefined && space.avg_crowd !== null) {
    return `${Number(space.avg_crowd).toFixed(1)} / 5`;
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

function getQuietnessScore(space) {
  if (space.quietness_score === undefined || space.quietness_score === null) {
    return 50;
  }

  return Number(space.quietness_score);
}

export default function ExplorePage({ user, onLoginClick, onLogout }) {
  const [spaces, setSpaces] = useState([]);
  const [search, setSearch] = useState("");
  const [noiseFilter, setNoiseFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
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
      noiseFilter === "All" || noise.includes(noiseFilter.toLowerCase());

    const type = space.spot_type || space.type || "";
    const matchesType = typeFilter === "All" || type === typeFilter;

    return matchesSearch && matchesNoise && matchesType;
  });

  const bestMatch = [...filteredSpaces].sort(
    (a, b) => getQuietnessScore(a) - getQuietnessScore(b)
  )[0];

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
      loadSpaces();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="np-page">
      <nav className="np-navbar">
        <div className="np-brand">
          <div className="np-brand-icon">
            <MapPin size={24} />
          </div>

          <div>
            <h1>NUSpaces</h1>
            <p>Find quiet study spaces in real time</p>
          </div>
        </div>

        <div className="np-nav-actions">
          <a href="#features">Features</a>
          <a href="#spaces">Explore</a>

          {user ? (
            <>
              <span className="np-user-pill">{user.username || user.email}</span>
              <button className="np-outline-btn" onClick={onLogout}>
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <button className="np-login-btn" onClick={onLoginClick}>
              <LogIn size={16} />
              Login
            </button>
          )}
        </div>
      </nav>

      <header className="np-hero">
        <section className="np-hero-left">
          <p className="np-eyebrow">Campus study space finder</p>

          <h2>Find quiet study spaces on campus, in real time.</h2>

          <p>
            Save time by discovering nearby NUS study spots based on noise,
            crowd levels, facilities, and live student feedback.
          </p>

          <div className="np-hero-buttons">
            <a href="#spaces" className="np-primary-link">
              Explore spaces
              <Navigation size={17} />
            </a>

            <button className="np-secondary-btn" onClick={loadSpaces}>
              Refresh data
              <RefreshCcw size={17} />
            </button>
          </div>
        </section>

        <section className="np-hero-right">
          <div className="np-phone-card">
            <div className="np-phone-top">
              <span></span>
              <p>Nearby Spaces</p>
              <Sparkles size={17} />
            </div>

            <div className="np-mini-search">
              <Search size={15} />
              <span>Search study spaces...</span>
            </div>

            {(filteredSpaces.length ? filteredSpaces : spaces)
              .slice(0, 4)
              .map((space) => (
                <div className="np-mini-space" key={space.id}>
                  <div>
                    <h4>{space.name}</h4>
                    <p>
                      {getNoiseStatus(space)} · Crowd {getCrowdStatus(space)}
                    </p>
                  </div>

                  <span className={`np-mini-status ${getStatusClass(space)}`}>
                    {getOpenStatus(space)}
                  </span>
                </div>
              ))}
          </div>
        </section>
      </header>

      <section className="np-features" id="features">
        <div className="np-feature-card">
          <Volume2 size={20} />
          <h3>Real-time status</h3>
          <p>View available spaces and current noise levels.</p>
        </div>

        <div className="np-feature-card">
          <Filter size={20} />
          <h3>Search & filter</h3>
          <p>Filter by noise, building, faculty, and space type.</p>
        </div>

        <div className="np-feature-card">
          <Users size={20} />
          <h3>Crowd indicator</h3>
          <p>Estimate how busy each study space is.</p>
        </div>

        <div className="np-feature-card">
          <MessageCircle size={20} />
          <h3>User feedback</h3>
          <p>Report whether a space is quiet, crowded, or conducive.</p>
        </div>
      </section>

      <main className="np-main" id="spaces">
        <section className="np-search-panel">
          <div className="np-search-box">
            <Search size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by study space, building, or faculty..."
            />
          </div>

          <div className="np-filter-row">
            {["All", "Very Quiet", "Quiet", "Moderate", "Noisy"].map((noise) => (
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
          <section className="np-dashboard">
            <div className="np-results">
              <div className="np-section-title">
                <div>
                  <h2>Recommended Study Spaces</h2>
                  <p>{filteredSpaces.length} spaces found</p>
                </div>

                <button className="np-refresh-btn" onClick={loadSpaces}>
                  <RefreshCcw size={16} />
                  Refresh
                </button>
              </div>

              <div className="np-card-grid">
                {filteredSpaces.map((space) => (
                  <article className="np-study-card" key={space.id}>
                    <div className="np-card-header">
                      <div>
                        <h3>{space.name}</h3>
                        <p>{space.building}</p>
                      </div>

                      <span className={`np-status ${getStatusClass(space)}`}>
                        {getOpenStatus(space)}
                      </span>
                    </div>

                    <p className="np-description">
                      {space.description ||
                        "A campus study space for focused learning."}
                    </p>

                    <div className="np-metrics">
                      <div>
                        <Volume2 size={18} />
                        <span>Noise</span>
                        <strong>{getNoiseStatus(space)}</strong>
                      </div>

                      <div>
                        <Users size={18} />
                        <span>Crowd</span>
                        <strong>{getCrowdStatus(space)}</strong>
                      </div>

                      <div>
                        <MapPin size={18} />
                        <span>Faculty</span>
                        <strong>{displayFaculty(space.faculty)}</strong>
                      </div>

                      <div>
                        <CheckCircle size={18} />
                        <span>Type</span>
                        <strong>{space.spot_type || "Study space"}</strong>
                      </div>
                    </div>

                    <div className="np-amenities">
                      {space.has_power && (
                        <span>
                          <Zap size={14} />
                          Power
                        </span>
                      )}

                      {space.has_aircon && (
                        <span>
                          <AirVent size={14} />
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
              </div>
            </div>

            <aside className="np-sidebar">
              <div className="np-side-card">
                <h3>Best current match</h3>
                <p>Recommended based on quietness score and your filters.</p>

                {bestMatch ? (
                  <div className="np-best-box">
                    <h4>{bestMatch.name}</h4>
                    <p>{bestMatch.building}</p>
                    <span>{getNoiseStatus(bestMatch)}</span>
                  </div>
                ) : (
                  <div className="np-best-box">
                    <h4>No match found</h4>
                    <p>Try changing the filters.</p>
                  </div>
                )}
              </div>

              <div className="np-side-card">
                <h3>Interactive map</h3>
                <p>Map view placeholder showing nearby study spots.</p>

                <div className="np-map-box">
                  <span className="np-pin pin1"></span>
                  <span className="np-pin pin2"></span>
                  <span className="np-pin pin3"></span>
                  <span className="np-pin pin4"></span>
                </div>
              </div>

              <div className="np-side-card">
                <h3>User feedback</h3>
                <p>
                  Help improve live data by reporting if a space is quiet,
                  crowded, or conducive.
                </p>

                {!user && (
                  <button className="np-login-prompt" onClick={onLoginClick}>
                    Login to submit feedback
                  </button>
                )}
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}