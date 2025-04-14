export interface Interview {
  id?: number;
  company: string;
  position: string;
  date: Date;
  notes?: string;
  round?: number;
  status: "pending" | "passed" | "failed";
}

export interface Holiday {
  date: Date;
  name: string;
}
