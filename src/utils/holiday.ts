export type THolidayData = {
  vcalendar: TVCalendar[];
};

export type TVCalendar = {
  vevent: TVEvent[];
};

export type TVEvent = {
  dtstart: string[]; // YYYYMMDD 格式的字串陣列
  dtend?: string[];
  summary: string; // 假期名稱
};

// 定義緩存數據的類型
export type CachedHolidays = {
  data: Array<{
    date: string; // 存儲時轉為字符串
    name: string;
  }>;
  timestamp: number;
};

export const holidayDataConvert = (data: THolidayData) => {
  return data.vcalendar[0].vevent.map((event: TVEvent) => ({
    date: new Date(
      event.dtstart[0].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
    ),
    name: event.summary,
  }));
};
