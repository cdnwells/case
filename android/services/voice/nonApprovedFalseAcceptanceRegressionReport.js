"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  FALSE_ACCEPTANCE_LIMIT_PER_100,
  measureNonApprovedVoiceFalseAcceptances,
} = require("./voiceGate");
const {
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID,
  loadNonApprovedVoiceEvaluationFixture,
} = require("./nonApprovedVoiceEvaluationFixture");

const NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_CHECK_NAME =
  "voice-gate-non-approved-false-acceptance";
const DEFAULT_NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FIXTURE_ID =
  QUIET_ROOM_NON_APPROVED_VOICE_EVALUATION_FIXTURE_ID;
const NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_PASS_EXIT_CODE = 0;
const NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE = 1;
const DEFAULT_FALSE_ACCEPTANCE_REPORT_DETAIL_LIMIT = 10;
const FIXTURE_PATH_ENV_VAR = "CASE_VOICE_FALSE_ACCEPTANCE_FIXTURE_PATH";
const FIXTURE_ID_ENV_VAR = "CASE_VOICE_FALSE_ACCEPTANCE_FIXTURE_ID";
const FALSE_ACCEPTANCE_LIMIT_ENV_VAR =
  "CASE_VOICE_FALSE_ACCEPTANCE_LIMIT_PER_100";

function createNonApprovedFalseAcceptanceRegressionReport(options = {}) {
  const evaluationFixture = resolveEvaluationFixture(options);
  const falseAcceptanceLimitPer100 = normalizeFalseAcceptanceLimitPer100(
    options.falseAcceptanceLimitPer100,
  );
  const measurement = measureNonApprovedVoiceFalseAcceptances({
    evaluationFixture,
    falseAcceptanceLimitPer100,
    config: options.config,
  });
  const passed = measurement.passedFalseAcceptance;

  return Object.freeze({
    checkName: NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_CHECK_NAME,
    status: passed ? "passed" : "failed",
    passed,
    exitCode: passed
      ? NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_PASS_EXIT_CODE
      : NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE,
    fixtureId: getEvaluationFixtureId(evaluationFixture, options),
    testEnvironment: copyRecord(evaluationFixture.testEnvironment),
    falseAccepted: measurement.falseAccepted,
    falseAcceptanceCount: measurement.falseAcceptanceCount,
    falseAcceptanceRatePer100: measurement.falseAcceptanceRatePer100,
    falseAcceptanceLimitPer100: measurement.falseAcceptanceLimitPer100,
    allowedFalseAcceptances: measurement.allowedFalseAcceptances,
    nonApprovedTotal: measurement.nonApprovedTotal,
    falseAcceptances: measurement.falseAcceptances.map((falseAcceptance) => ({
      ...falseAcceptance,
    })),
  });
}

function runNonApprovedFalseAcceptanceRegressionReport(options = {}) {
  const env = options.env || process.env;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const report = createNonApprovedFalseAcceptanceRegressionReport({
    fixture: options.fixture,
    fixturePath: options.fixturePath || env[FIXTURE_PATH_ENV_VAR],
    fixtureId: options.fixtureId || env[FIXTURE_ID_ENV_VAR],
    falseAcceptanceLimitPer100:
      options.falseAcceptanceLimitPer100 ??
      env[FALSE_ACCEPTANCE_LIMIT_ENV_VAR],
    config: options.config,
  });
  const output = formatNonApprovedFalseAcceptanceRegressionReport(report, {
    detailLimit: options.detailLimit,
  });
  const stream = report.passed ? stdout : stderr;

  stream.write(`${output}\n`);

  return {
    report,
    exitCode: report.exitCode,
  };
}

function formatNonApprovedFalseAcceptanceRegressionReport(
  report,
  options = {},
) {
  const detailLimit = normalizeDetailLimit(options.detailLimit);
  const lines = [
    `[${report.passed ? "PASS" : "FAIL"}] ${report.checkName}`,
    `fixture: ${report.fixtureId}`,
    `environment: ${formatTestEnvironment(report.testEnvironment)}`,
    `false accepts: ${report.falseAccepted}/${report.nonApprovedTotal} (${formatRate(
      report.falseAcceptanceRatePer100,
    )}% per 100; limit ${formatRate(
      report.falseAcceptanceLimitPer100,
    )}% per 100; allowed ${report.allowedFalseAcceptances})`,
    `exit code: ${report.exitCode}`,
  ];

  if (!report.passed && report.falseAcceptances.length > 0) {
    lines.push("false acceptances:");
    for (const falseAcceptance of report.falseAcceptances.slice(
      0,
      detailLimit,
    )) {
      const matchedProfile =
        formatMatchedApprovedVoiceProfile(falseAcceptance);
      lines.push(
        `- ${falseAcceptance.utteranceId} speaker=${falseAcceptance.speakerId} matched=${falseAcceptance.matchedVoiceId} profile=${matchedProfile} confidence=${formatRate(
          falseAcceptance.confidence,
        )} reason=${falseAcceptance.reason}`,
      );
    }
    if (report.falseAcceptances.length > detailLimit) {
      lines.push(
        `- ... ${report.falseAcceptances.length - detailLimit} more false acceptances omitted`,
      );
    }
  }

  return lines.join("\n");
}

function formatMatchedApprovedVoiceProfile(falseAcceptance) {
  const label =
    falseAcceptance.matchedApprovedVoiceLabel ||
    (falseAcceptance.matchedApprovedVoiceProfileMetadata &&
      falseAcceptance.matchedApprovedVoiceProfileMetadata.label) ||
    falseAcceptance.matchedApprovedVoiceProfileId ||
    falseAcceptance.matchedVoiceId ||
    "none";
  const profileId =
    falseAcceptance.matchedApprovedVoiceProfileId ||
    (falseAcceptance.matchedApprovedVoiceProfileMetadata &&
      falseAcceptance.matchedApprovedVoiceProfileMetadata.profileId);

  return profileId && profileId !== label ? `${label} (${profileId})` : label;
}

function resolveEvaluationFixture(options) {
  if (options.fixture) return options.fixture;
  if (options.fixturePath) return loadEvaluationFixtureFromPath(options.fixturePath);

  return loadNonApprovedVoiceEvaluationFixture(
    options.fixtureId ||
      DEFAULT_NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FIXTURE_ID,
  );
}

function loadEvaluationFixtureFromPath(fixturePath) {
  const resolvedFixturePath = path.resolve(String(fixturePath));
  const fixtureJson = fs.readFileSync(resolvedFixturePath, "utf8");

  return JSON.parse(fixtureJson);
}

function getEvaluationFixtureId(evaluationFixture, options) {
  if (evaluationFixture && evaluationFixture.id) {
    return String(evaluationFixture.id);
  }
  if (options.fixturePath) {
    return path.resolve(String(options.fixturePath));
  }
  return (
    options.fixtureId ||
    DEFAULT_NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FIXTURE_ID
  );
}

function normalizeFalseAcceptanceLimitPer100(value) {
  const normalizedLimit = Number(value);

  return Number.isFinite(normalizedLimit) && normalizedLimit >= 0
    ? normalizedLimit
    : FALSE_ACCEPTANCE_LIMIT_PER_100;
}

function normalizeDetailLimit(value) {
  const normalizedLimit = Number(value);

  return Number.isInteger(normalizedLimit) && normalizedLimit >= 0
    ? normalizedLimit
    : DEFAULT_FALSE_ACCEPTANCE_REPORT_DETAIL_LIMIT;
}

function copyRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
}

function formatTestEnvironment(testEnvironment) {
  const entries = Object.entries(testEnvironment || {});
  if (entries.length === 0) return "unspecified";

  return entries.map(([key, value]) => `${key}=${value}`).join(", ");
}

function formatRate(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00";
}

if (require.main === module) {
  try {
    const result = runNonApprovedFalseAcceptanceRegressionReport();
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(
      `[FAIL] ${NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_CHECK_NAME}\n${String(
        error instanceof Error ? error.message : error,
      )}\n`,
    );
    process.exitCode = NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE;
  }
}

module.exports = {
  NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_CHECK_NAME,
  DEFAULT_NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FIXTURE_ID,
  NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_PASS_EXIT_CODE,
  NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE,
  FIXTURE_PATH_ENV_VAR,
  FIXTURE_ID_ENV_VAR,
  FALSE_ACCEPTANCE_LIMIT_ENV_VAR,
  createNonApprovedFalseAcceptanceRegressionReport,
  formatNonApprovedFalseAcceptanceRegressionReport,
  runNonApprovedFalseAcceptanceRegressionReport,
};
