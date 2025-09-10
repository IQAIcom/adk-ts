export const NUM_RUNS = 4;

export const TOOL_TRAJECTORY_SCORE_THRESHOLD = 1.0;

export const RESPONSE_MATCH_SCORE_THRESHOLD = 0.8;

export const SAFETY_SCORE_THRESHOLD = 1.0;

export const RESPONSE_EVALUATION_SCORE_THRESHOLD = 1.0;

export const MISSING_EVAL_DEPENDENCIES_MESSAGE =
	"Please install eval dependencies: pip install pandas tabulate";

export const ALLOWED_CRITERIA = [
	"tool_trajectory_score",
	"response_evaluation_score",
	"response_match_score",
	"safety_v1",
] as const;

export const QUERY_COLUMN = "query";
export const REFERENCE_COLUMN = "reference";
export const EXPECTED_TOOL_USE_COLUMN = "expected_tool_use";
