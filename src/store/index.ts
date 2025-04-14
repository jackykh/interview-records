import { create } from "zustand";
import { Holiday } from "../types";

interface HolidayStore {
  holidays: Holiday[];
  setHolidays: (holidays: Holiday[]) => void;
}

export const useHolidayStore = create<HolidayStore>((set) => ({
  holidays: [],
  setHolidays: (holidays) => set({ holidays }),
}));
