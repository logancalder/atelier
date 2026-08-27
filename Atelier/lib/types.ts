export type StudentStatus = "active" | "paused" | "archived";
export type SessionStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "upcoming" | "missing" | "received";
export type PaymentKind = "session" | "package" | "other";
export type SessionPlace = "online" | "in_person" | "hybrid";

export type Settings = {
  tutorName: string;
  zelleHandle: string;
  zelleName: string;
};

export type Student = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  parentName: string;
  email: string;
  phone: string;
  zelleName: string;
  hourlyRateCents: number;
  defaultDurationMin: number;
  status: StudentStatus;
  color: string;
  profileNotes: string;
  createdAt: string;
};

export type RecurringSeries = {
  id: string;
  studentId: string;
  weekday: number;
  time: string;
  durationMin: number;
  startDate: string;
  endDate: string | null;
  place: SessionPlace;
  locationNote: string;
  createdAt: string;
};

export type Session = {
  id: string;
  studentId: string;
  seriesId: string | null;
  startsAt: string;
  durationMin: number;
  rateCents: number;
  status: SessionStatus;
  place: SessionPlace;
  locationNote: string;
  lessonFocus: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  studentId: string;
  sessionId: string | null;
  kind: PaymentKind;
  amountCents: number;
  dueDate: string;
  status: PaymentStatus;
  receivedAt: string | null;
  memo: string;
  plaidTransactionId?: string | null;
  createdAt: string;
};

export type Note = {
  id: string;
  studentId: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Studio = {
  settings: Settings;
  students: Student[];
  series: RecurringSeries[];
  sessions: Session[];
  payments: Payment[];
  notes: Note[];
};

export type CodingSubmission = {
  accepted: boolean;
  at: string;
  source?: string;
};

export type CodingProblem = {
  key: string;
  title: string;
  url: string;
  notes: string;
  seconds: number;
  submissions: CodingSubmission[];
  submissionCountOverride?: number | null;
  holeInOne: boolean;
  neededHints: boolean;
  dontUnderstand: boolean;
  tags?: string[];
  difficulty?: string | null;
  leetcodeSlug?: string | null;
  linkSource?: string | null;
  titleSource?: string | null;
  sortAt: string;
  updatedAt: string;
};

export type CodingNotebook = {
  problems: CodingProblem[];
  updatedAt: string | null;
};

export const STUDENT_COLORS = [
  "#9a6b4f",
  "#6b7f5a",
  "#5b6e8c",
  "#8c6b7a",
  "#b0893a",
  "#6a7c74",
] as const;
