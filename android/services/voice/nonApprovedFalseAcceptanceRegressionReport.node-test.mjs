import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE,
  NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_PASS_EXIT_CODE,
  createNonApprovedFalseAcceptanceRegressionReport,
  formatNonApprovedFalseAcceptanceRegressionReport,
  runNonApprovedFalseAcceptanceRegressionReport,
} = require("./nonApprovedFalseAcceptanceRegressionReport.js");

function createRegressionFixture(falseAcceptCount = 6) {
  const approvedVoiceId = "case-owner";
  const totalUtterances = 100;

  return {
    id: `fixture-with-${falseAcceptCount}-false-accepts`,
    description:
      "Local non-approved speaker fixture used to verify false-acceptance regression failure behavior.",
    testEnvironment: {
      roomType: "quiet_indoor_room",
      speakingVolume: "normal",
      captureMode: "local_embedding_fixture",
    },
    approvedReferenceVoices: [
      {
        id: approvedVoiceId,
        approved: true,
        enrolled: true,
        embeddings: [[1, 0]],
      },
    ],
    utterances: Array.from({ length: totalUtterances }, (_, utteranceIndex) => {
      const utteranceId = `regression-non-approved-${utteranceIndex + 1}`;
      const shouldFalseAccept = utteranceIndex < falseAcceptCount;

      return {
        utteranceId,
        speakerId: `non-approved-regression-speaker-${utteranceIndex + 1}`,
        approved: false,
        expectedVoiceGateDecision: "reject",
        frames: [
          {
            utteranceId,
            timestampMs: 0,
            embedding: shouldFalseAccept ? [1, 0] : [0, 1],
          },
        ],
      };
    }),
  };
}

function createWritableCapture() {
  let output = "";

  return {
    stream: {
      write(chunk) {
        output += String(chunk);
      },
    },
    read() {
      return output;
    },
  };
}

test("default non-approved false-acceptance regression report passes at the 5% limit", () => {
  const report = createNonApprovedFalseAcceptanceRegressionReport();
  const formattedReport = formatNonApprovedFalseAcceptanceRegressionReport(
    report,
  );

  assert.equal(report.nonApprovedTotal, 100);
  assert.equal(report.falseAcceptanceLimitPer100, 5);
  assert.equal(report.allowedFalseAcceptances, 5);
  assert.ok(
    report.falseAccepted <= report.allowedFalseAcceptances,
    `evaluation reported ${report.falseAccepted}/100 false accepts; expected no more than 5/100`,
  );
  assert.equal(report.passed, true);
  assert.equal(
    report.exitCode,
    NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_PASS_EXIT_CODE,
  );
  assert.match(formattedReport, /^\[PASS\]/);
});

test("false-acceptance regression report marks more than 5 of 100 false accepts as a nonzero failure", () => {
  const report = createNonApprovedFalseAcceptanceRegressionReport({
    fixture: createRegressionFixture(6),
  });
  const formattedReport = formatNonApprovedFalseAcceptanceRegressionReport(
    report,
    { detailLimit: 2 },
  );

  assert.equal(report.nonApprovedTotal, 100);
  assert.equal(report.allowedFalseAcceptances, 5);
  assert.equal(report.falseAccepted, 6);
  assert.equal(report.falseAcceptanceRatePer100, 6);
  assert.equal(report.passed, false);
  assert.equal(
    report.exitCode,
    NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE,
  );
  assert.match(formattedReport, /^\[FAIL\]/);
  assert.match(formattedReport, /regression-non-approved-1/);
  assert.match(formattedReport, /\.\.\. 4 more false acceptances omitted/);
});

test("false-acceptance regression runner returns nonzero status when a local fixture exceeds 5%", () => {
  const stdout = createWritableCapture();
  const stderr = createWritableCapture();
  const result = runNonApprovedFalseAcceptanceRegressionReport({
    fixture: createRegressionFixture(6),
    falseAcceptanceLimitPer100: 5,
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(
    result.exitCode,
    NON_APPROVED_FALSE_ACCEPTANCE_REGRESSION_FAIL_EXIT_CODE,
  );
  assert.equal(stdout.read(), "");
  assert.match(stderr.read(), /^\[FAIL\]/);
  assert.match(stderr.read(), /false accepts: 6\/100/);
});
