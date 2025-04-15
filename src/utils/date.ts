import {
  differenceInBusinessDays,
  isWeekend,
  differenceInDays,
  differenceInHours,
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

// 格式化日期為 YYYY-MM-DDThh:mm 格式，用於 input[type="datetime-local"] 的 min 屬性
export const formatDateForInput = (date: Date): string => {
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

export const calculateWorkingDays = (
  startDate: Date,
  endDate: Date = new Date()
): number => {
  const holidays = useHolidayStore.getState().holidays;

  // 如果開始日期在結束日期之後，返回0
  if (startDate > endDate) return 0;

  // 如果是同一天，返回0
  if (startDate.toDateString() === endDate.toDateString()) return 0;

  // 將開始日期調整為下一個工作日的開始（如果當天還沒結束）
  const startOfNextDay = new Date(startDate);
  startOfNextDay.setDate(startDate.getDate() + 1);
  startOfNextDay.setHours(0, 0, 0, 0);

  // 計算工作日（不包括周末）
  let workingDays = differenceInBusinessDays(endDate, startOfNextDay);

  // 減去假期天數（不包括已經是周末的假期）
  const holidaysInRange = holidays.filter((holiday) => {
    const holidayDate = new Date(holiday.date);
    return (
      holidayDate >= startOfNextDay &&
      holidayDate <= endDate &&
      !isWeekend(holidayDate)
    );
  });

  workingDays -= holidaysInRange.length;

  // 如果超過30天，返回30
  return Math.min(workingDays, 30);
};

// 修改：計算距離開始的時間
export const calculateDaysUntilStart = (
  startDate: Date,
  currentDate: Date = new Date()
): { days: number | null; hours: number | null } => {
  // 如果開始日期已經過去，返回 null
  if (startDate <= currentDate) {
    return { days: null, hours: null };
  }

  // 計算天數差
  const days = differenceInDays(startDate, currentDate);

  // 如果不足一天，計算小時差
  if (days === 0) {
    const hours = differenceInHours(startDate, currentDate);
    return { days: 0, hours };
  }

  return { days, hours: null };
};

export const formatWorkingDays = (days: number, startDate: Date): string => {
  const timeUntilStart = calculateDaysUntilStart(startDate);

  if (timeUntilStart.days !== null) {
    // 面試還未開始
    if (timeUntilStart.hours !== null) {
      // 不足一天，顯示小時
      return `還有${timeUntilStart.hours}小時開始`;
    }
    return `還有${timeUntilStart.days}天開始`;
  } else {
    // 面試已經開始或結束
    return `已過${days >= 30 ? "30+" : days}個工作日`;
  }
};
