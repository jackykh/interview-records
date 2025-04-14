import Dexie, { Table } from "dexie";
import { Interview } from "../types";

export class InterviewDB extends Dexie {
  interviews!: Table<Interview>;

  constructor() {
    super("InterviewDB");
    this.version(1).stores({
      interviews: "++id, company, position, date, round, status",
    });
  }
}

export const db = new InterviewDB();
