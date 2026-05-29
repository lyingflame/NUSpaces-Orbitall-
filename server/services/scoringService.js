/* 
  Quietness Score Algorithm

  Formula:  score = Σ(noise × weight) / Σ(weight)
  noise  = noise_level × 20 (normalised from 1-5 to 20-100)
  weight = max(0.1, e^(-0.05 × days_old)) (time-decay for older data)

  Time period filtering:
  Only take into account data that fall within TIME_WINDOW_HOURS to current time of day

  Score ranges: (May change)
  0-30 Very Quiet, 31-50 Quiet, 51-70 Moderate, 71-85 Noisy, 86-100 Very Noisy
*/ 

const Feedback = require('../models/Feedback');
const SpotScore = require('../models/SpotScore');
const StudySpot = require('../models/StudySpot');

const LAMBDA = 0.05;           // time-decay
const MIN_WEIGHT = 0.1;        // for historical data
const TIME_WINDOW_HOURS = 12;   // +- 1 hour time window (may adjust)
const RECENT_HOURS = 6;        

const scoringService = {
  async computeScore(spotId, currentTime) {
    if (!currentTime) {
      currentTime = new Date().toTimeString().slice(0, 5);
    }

    const feedbackList = await Feedback.getBySpotAndTimeWindow(
      spotId, currentTime, TIME_WINDOW_HOURS
    );

    const score = calculateScore(feedbackList);
    await SpotScore.upsert(
      spotId,
      score.quietnessScore || 0,
      score.avgCrowd || 0,
      score.quietnessScore || 0,
      score.reportCount,
      score.recentReportCount
    );
    return score;
  },

  // Recalculate all scores (used by CRON schedule)
  async recalculateAllScores() {
    const currentTime = new Date().toTimeString().slice(0, 5);

    const allFeedback = await Feedback.getAllByTimeWindow(currentTime, TIME_WINDOW_HOURS);

    const bySpot = {}; // group by spot ID
    for (const fb of allFeedback) {
      if (!bySpot[fb.spot_id]) bySpot[fb.spot_id] = [];
      bySpot[fb.spot_id].push(fb);
    }

    const allSpotIds = await StudySpot.getAllIds();
    for (const spotId of allSpotIds) {
      const score = calculateScore(bySpot[spotId] || []);
      await SpotScore.upsert(
        spotId,
        score.quietnessScore || 0,
        score.avgCrowd || 0,
        score.quietnessScore || 0,
        score.reportCount,
        score.recentReportCount
      );
    }
    return { spotsUpdated: allSpotIds.length, time: currentTime };
  },
};

// Score calculation algorithm
function calculateScore(feedbackList) {
  if (!feedbackList || feedbackList.length === 0) {
    return {
      quietnessScore: null,
      avgCrowd: null,
      reportCount: 0,
      recentReportCount: 0,
      status: 'No Data',
    };
  }

  const now = new Date(); // current time
  let weightedNoiseSum = 0;
  let weightedCrowdSum = 0;
  let totalWeight = 0;
  let recentCount = 0;

  for (const fb of feedbackList) {
    const daysSince = (now - new Date(fb.created_at)) / (1000 * 60 * 60 * 24);
    const weight = Math.max(MIN_WEIGHT, Math.exp(-LAMBDA * daysSince));

    // normalise values from level 1-5 to 20-100
    weightedNoiseSum += (fb.noise_level * 20) * weight;
    weightedCrowdSum += (fb.crowd_level * 20) * weight;
    totalWeight += weight;

    if (daysSince * 24 <= RECENT_HOURS) {
      recentCount++;
    }
  }

  const quietnessScore = Math.round((weightedNoiseSum / totalWeight) * 100) / 100;
  const avgCrowd = Math.round((weightedCrowdSum / totalWeight) * 100) / 100;

  return {
    quietnessScore,
    avgCrowd,
    reportCount: feedbackList.length,
    recentReportCount: recentCount,
    status: getStatusLabel(quietnessScore),
  };
}

function getStatusLabel(score) {
  if (score == null) return 'No Data';
  else if (score <= 30) return 'Very Quiet';
  else if (score <= 50) return 'Quiet';
  else if (score <= 70) return 'Moderate';
  else if (score <= 85) return 'Noisy';
  return 'Very Noisy';
}

module.exports = scoringService;
