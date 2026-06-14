-- Initial Database Tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Study spots table
-- Need to seed data for all locations in NUS
-- All NUS faculties: Faculty of Arts & Social Science, School of Business, School of Computing, School of Lifelong Education, Faculty of Dentistry, College of Design & Engineering, 
-- Faculty of Law, Yong Loo Lin School of Medicine, Yong Siew Toh Conservatory of Music, Saw Swee Hock School of Public Health, Faculty of Science & Others (University)
CREATE TABLE IF NOT EXISTS study_spots (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    building        VARCHAR(255),
    faculty         TEXT[] CHECK (faculty <@ ARRAY['Arts & Social Sciences', 'Business', 'Computing', 'Lifelong Education', 'Dentistry', 
                    'Design & Engineering', 'Law', 'Medicine', 'Music', 'Public Health', 'Science', 'University']::TEXT[]),
    spot_type       VARCHAR(50) CHECK (spot_type IN ('library', 'study_room', 'outdoor', 'lounge', 'lab')),
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    capacity        INT,
    has_power       BOOLEAN DEFAULT FALSE,
    has_aircon      BOOLEAN DEFAULT TRUE,
    image_url       VARCHAR(500),
    description     TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Feedback table (Data source for algorithm)
CREATE TABLE IF NOT EXISTS feedback (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    spot_id         INT REFERENCES study_spots(id) ON DELETE CASCADE,
    noise_level     INT NOT NULL CHECK (noise_level BETWEEN 1 AND 5),
    crowd_level     INT NOT NULL CHECK (crowd_level BETWEEN 1 AND 5),
    comment         TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Spot schedules table
-- Implemented to show opening/closing hours and adjust according based on date.
-- Most spot schedules should be fixed but NUS libraries fluctuate and have exceptions
CREATE TABLE IF NOT EXISTS spot_schedules (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spot_id         INT REFERENCES study_spots(id) ON DELETE CASCADE,
    day_of_week     VARCHAR(20) NOT NULL CHECK (day_of_week IN ('weekday', 'saturday', 'sunday')),
    opening_time    TIME,
    closing_time    TIME,
    is_24hr         BOOLEAN DEFAULT FALSE,
    is_closed       BOOLEAN DEFAULT FALSE,
    UNIQUE(spot_id, day_of_week)
);

-- Date-specific overrides table (for holidays, special events, exam periods)
-- Takes priority over spot_schedules for specified dates
-- E.g. spot_id=2 (Central Library L6 Reading Area), date=2026-02-16, opening_time=09:00, closing_time=14:00, reason='CNY Eve'
CREATE TABLE IF NOT EXISTS spot_schedule_overrides (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spot_id         INT REFERENCES study_spots(id) ON DELETE CASCADE,
    start_date      DATE,
    end_date        DATE CHECK (end_date >= start_date),
    opening_time    TIME,
    closing_time    TIME,
    is_24hr         BOOLEAN DEFAULT FALSE,
    is_closed       BOOLEAN DEFAULT FALSE,
    reason          VARCHAR(500)
);

-- Spot scores table
-- Pre-computed scores updated by algorithm (so don't have to recalculate for every api call currently)
-- Data Updates: Every 15 minutes or when user sends new feedback for a spot (change to real-time when socket.io implemented)
CREATE TABLE IF NOT EXISTS spot_scores (
    spot_id             INT PRIMARY KEY REFERENCES study_spots(id) ON DELETE CASCADE,
    avg_noise           DECIMAL(5, 2) DEFAULT 0,
    avg_crowd           DECIMAL(5, 2) DEFAULT 0,
    quietness_score     DECIMAL(5, 2) DEFAULT 0,
    report_count        INT DEFAULT 0,
    recent_report_count INT DEFAULT 0,
    last_updated        TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens table (JWT)
-- Active refresh tokens for user sessions, with access token being 15 min and not stored while refresh tokens are 7 days and revoked on logout
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes

-- for feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_spot_created
    ON feedback(spot_id, created_at DESC);

-- for time period data filtering (time portion of created_at)
CREATE INDEX IF NOT EXISTS idx_feedback_time_of_day
    ON feedback ((created_at::time));

-- for spam prevention (in feedbackService)
CREATE INDEX IF NOT EXISTS idx_feedback_user_spot
    ON feedback(user_id, spot_id, created_at DESC);

-- for looking up tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
    ON refresh_tokens(token);

-- for finding all tokens by user (auth/logout)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
    ON refresh_tokens(user_id);