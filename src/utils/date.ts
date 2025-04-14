import {
  differenceInBusinessDays,
  isWeekend,
  differenceInDays,
  subDays,
  format,
  addDays,
} from "date-fns";
import { useHolidayStore } from "../store";

// 新增：獲取最早可選擇的日期
export const getEarliestSelectableDate = (): Date => {
  const holidays = useHolidayStore.getState().holidays;

  if (!holidays || holidays.length === 0) {
    // 如果沒有假期數據，返回當前日期前365天
    return subDays(new Date(), 365);
  }

  // 找到最早的假期日期
  const earliestHoliday = holidays.reduce((earliest, holiday) => {
    const holidayDate = new Date(holiday.date);
    return holidayDate < earliest ? holidayDate : earliest;
  }, new Date(holidays[0].date));

  // 返回最早假期後30天的日期
  return addDays(earliestHoliday, 30);
};

// 格式化日期為 YYYY-MM-DD 格式，用於 input[type="date"] 的 min 屬性
export const formatDateForInput = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

export const calculateWorkingDays = (
  startDate: Date,
  endDate: Date = new Date()
): number => {
  const holidays = useHolidayStore.getState().holidays;

  // 如果開始日期在結束日期之後，返回0
  if (startDate > endDate) return 0;

  // 計算工作日（不包括周末）
  let workingDays = differenceInBusinessDays(endDate, startDate);

  // 減去假期天數（不包括已經是周末的假期）
  const holidaysInRange = holidays.filter((holiday) => {
    const holidayDate = new Date(holiday.date);
    return (
      holidayDate >= startDate &&
      holidayDate <= endDate &&
      !isWeekend(holidayDate)
    );
  });

  workingDays -= holidaysInRange.length;

  // 如果超過30天，返回30
  return Math.min(workingDays, 30);
};

// 新增：計算距離開始還有多少天
export const calculateDaysUntilStart = (
  startDate: Date,
  currentDate: Date = new Date()
): number | null => {
  // 如果開始日期已經過去，返回 null
  if (startDate <= currentDate) return null;

  // 計算剩餘天數（包括周末和假期）
  return differenceInDays(startDate, currentDate);
};

export const formatWorkingDays = (days: number, startDate: Date): string => {
  const daysUntilStart = calculateDaysUntilStart(startDate);

  if (daysUntilStart !== null) {
    // 面試還未開始
    return `還有${daysUntilStart}天開始`;
  } else {
    // 面試已經開始或結束
    return `已過去${days >= 30 ? "30+" : days}個工作日`;
  }
};
