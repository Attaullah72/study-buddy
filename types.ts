export enum AppState {
  INITIAL,
  GENERATING_GUIDE,
  STUDYING,
  GENERATING_KEY_POINTS,
  GENERATING_SUMMARY,
  ASKING_QUESTION,
  EVALUATING_ANSWER,
  SHOWING_FEEDBACK,
  QUIZ_COMPLETE,
  SHOWING_HISTORY,
  ERROR,
}

export interface EvaluationFeedback {
  evaluation: 'Correct' | 'Incorrect' | 'Partially Correct' | string;
  explanation: string;
}

export interface Source {
  uri: string;
  title: string;
}

export interface HistoryItem {
  topic: string;
  guide: string;
  sources: Source[];
}