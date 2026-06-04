export type VoteOption = {
  id: string;
  label: string;
  order: number;
  roomId: string;
};

export type Room = {
  id: string;
  title: string;
  question: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  options: VoteOption[];
};

export type AggregateResult = {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
};
