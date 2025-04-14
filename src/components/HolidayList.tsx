import React from "react";
import { useHolidayStore } from "../store";
import { format, addDays, isWithinInterval } from "date-fns";

export const HolidayList: React.FC = () => {
  const holidays = useHolidayStore((state) => state.holidays);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const today = React.useMemo(() => new Date(), []);
  const thirtyDaysLater = addDays(today, 30);

  // 篩選未來30天內的假期
  const upcomingHolidays = React.useMemo(() => {
    return holidays
      .filter((holiday) => {
        const holidayDate = new Date(holiday.date);
        return isWithinInterval(holidayDate, {
          start: today,
          end: thirtyDaysLater,
        });
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, today, thirtyDaysLater]);

  if (upcomingHolidays.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">未來30天的假期</h3>
        <p className="text-gray-500 text-sm">未來30天內沒有公眾假期</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          未來30天的公眾假期 ({upcomingHolidays.length}個)
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
        >
          <span>{isExpanded ? "收起" : "展開"}</span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {!isExpanded ? (
        // 收起狀態：顯示簡要信息
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left cursor-pointer"
        >
          <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
            <p className="text-sm text-gray-600">
              最近的假期：
              {upcomingHolidays.slice(0, 2).map((holiday, index) => {
                const holidayDate = new Date(holiday.date);
                const daysUntil = Math.ceil(
                  (holidayDate.getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <span key={holiday.date.toString()}>
                    {index > 0 && "、"}
                    {holiday.name}
                    <span className="text-blue-600">
                      (
                      {daysUntil === 0
                        ? "今天"
                        : daysUntil === 1
                        ? "明天"
                        : `${daysUntil}天後`}
                      )
                    </span>
                  </span>
                );
              })}
              {upcomingHolidays.length > 2 && (
                <span className="text-gray-500">
                  {` 等${upcomingHolidays.length}個假期...`}
                </span>
              )}
            </p>
          </div>
        </button>
      ) : (
        // 展開狀態：顯示詳細列表
        <div className="space-y-2 transition-all duration-300">
          {upcomingHolidays.map((holiday) => {
            const holidayDate = new Date(holiday.date);
            const daysUntil = Math.ceil(
              (holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={holiday.date.toString()}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                    <span className="text-sm font-medium">
                      {format(holidayDate, "d")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {holiday.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(holidayDate, "yyyy年MM月dd日")}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-full ${
                    daysUntil === 0
                      ? "bg-green-100 text-green-800"
                      : daysUntil === 1
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {daysUntil === 0
                    ? "今天"
                    : daysUntil === 1
                    ? "明天"
                    : `${daysUntil}天後`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HolidayList;
