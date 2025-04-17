import React, { useState } from "react";
import Calendar from "react-calendar";
import { useHolidayStore } from "../store";
import {
  format,
  addMonths,
  isWeekend,
  differenceInDays,
  addDays,
  subDays,
  isSameDay,
  eachDayOfInterval,
  startOfDay,
} from "date-fns";
import "react-calendar/dist/Calendar.css";
import { Value } from "react-calendar/src/shared/types.js";
import { zhHK } from "date-fns/locale";

interface ResignationConfig {
  isInProbation: boolean;
  probationMonths: number;
  startDate: Date;
  companyNoticePeriodType: "days" | "months";
  companyNoticePeriodValue: number | null;
}

interface CalculationResult {
  resignDate: Date;
  lastWorkDay: Date;
  workingDays: number;
  noticeType: string;
  workingDaysList: Array<{
    date: Date;
    isHoliday?: boolean;
    holidayName?: string;
    type: "workday" | "weekend" | "holiday";
  }>;
}

interface BestResignationDate {
  date: Date;
  score: number;
  lastWorkDay: Date;
  workingDays: number;
  lastTwoDaysHoliday: boolean;
  holidayInfo?: {
    lastDay?: string;
    secondLastDay?: string;
  };
  reason: string;
}

type RightPanelView = "details" | "bestDates";

const ResignationCalculator: React.FC = () => {
  const holidays = useHolidayStore((state) => state.holidays);
  const [config, setConfig] = useState<ResignationConfig>({
    isInProbation: false,
    probationMonths: 3,
    startDate: new Date(),
    companyNoticePeriodType: "months",
    companyNoticePeriodValue: null,
  });
  const [selectedDate, setSelectedDate] = useState<Value>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [bestDates, setBestDates] = useState<BestResignationDate[]>([]);
  const [rightPanelView, setRightPanelView] =
    useState<RightPanelView>("details");

  // 計算最後工作日和通知類型
  const calculateResignationDetails = (resignDate: Date): CalculationResult => {
    const employmentDuration = differenceInDays(resignDate, config.startDate);
    const isInFirstMonth = employmentDuration <= 30;
    let lastWorkDay: Date;
    let noticeType: string;

    if (config.isInProbation) {
      if (isInFirstMonth) {
        lastWorkDay = resignDate;
        noticeType = "試用期首月：即日離職";
      } else if (!config.companyNoticePeriodValue) {
        lastWorkDay = addDays(resignDate, 7);
        noticeType = "試用期後：7天通知期";
      } else {
        if (config.companyNoticePeriodType === "days") {
          lastWorkDay = addDays(resignDate, config.companyNoticePeriodValue);
          noticeType = `試用期後：公司規定${config.companyNoticePeriodValue}天通知期`;
        } else {
          // 按月計算
          lastWorkDay = addDays(
            addMonths(resignDate, config.companyNoticePeriodValue),
            -1
          );
          noticeType = `試用期後：公司規定${config.companyNoticePeriodValue}個月通知期`;
        }
      }
    } else {
      if (config.companyNoticePeriodValue) {
        if (config.companyNoticePeriodType === "days") {
          lastWorkDay = addDays(resignDate, config.companyNoticePeriodValue);
          noticeType = `公司規定${config.companyNoticePeriodValue}天通知期`;
        } else {
          // 按月計算
          lastWorkDay = addDays(
            addMonths(resignDate, config.companyNoticePeriodValue),
            -1
          );
          noticeType = `公司規定${config.companyNoticePeriodValue}個月通知期`;
        }
      } else {
        // 默認一個月通知期
        lastWorkDay = addDays(addMonths(resignDate, 1), -1);
        noticeType = "一個月通知期";
      }
    }

    const { count: workingDays, daysList: workingDaysList } =
      calculateWorkingDays(resignDate, lastWorkDay);

    return {
      resignDate,
      lastWorkDay,
      workingDays,
      noticeType,
      workingDaysList,
    };
  };

  // 獲取假期名稱
  const getHolidayName = (date: Date) => {
    const holiday = holidays.find((h) => isSameDay(new Date(h.date), date));
    return holiday?.name;
  };

  // 修改計算工作日數的函數
  const calculateWorkingDays = (
    startDate: Date,
    endDate: Date
  ): {
    count: number;
    daysList: CalculationResult["workingDaysList"];
  } => {
    let count = 0;
    const daysList = [] as CalculationResult["workingDaysList"];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const isWeekendDay = isWeekend(currentDate);
      const holidayName = getHolidayName(currentDate);

      if (!isWeekendDay && !holidayName) {
        // 工作日
        count++;
        daysList.push({
          date: new Date(currentDate),
          type: "workday",
        });
      } else if (isWeekendDay) {
        // 週末
        daysList.push({
          date: new Date(currentDate),
          isHoliday: true,
          holidayName: "週末",
          type: "weekend",
        });
      } else {
        // 公眾假期
        daysList.push({
          date: new Date(currentDate),
          isHoliday: true,
          holidayName,
          type: "holiday",
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    return { count, daysList };
  };

  // 判斷是否為工作日（用於最佳辭職日計算）
  const isWorkingDay = (date: Date): boolean => {
    const isWeekendDay = isWeekend(date);
    const isHolidayDay = holidays.some((holiday) =>
      isSameDay(new Date(holiday.date), date)
    );
    return !isWeekendDay && !isHolidayDay;
  };

  // 檢查日期是否為假期，並返回假期類型
  const checkHolidayType = (
    date: Date
  ): { isHoliday: boolean; type?: string } => {
    if (isWeekend(date)) {
      return { isHoliday: true, type: "週末" };
    }
    const holiday = holidays.find((h) => isSameDay(new Date(h.date), date));
    if (holiday) {
      return { isHoliday: true, type: holiday.name };
    }
    return { isHoliday: false };
  };

  // 檢查最後兩天假期狀況
  const checkLastTwoDaysHoliday = (lastWorkDay: Date) => {
    const lastlastDay = subDays(lastWorkDay, 1);
    const lastDayHoliday = checkHolidayType(lastWorkDay);
    const lastlastDayHoliday = checkHolidayType(lastlastDay);

    return {
      isBothHoliday: lastDayHoliday.isHoliday && lastlastDayHoliday.isHoliday,
      info: {
        lastDay: lastDayHoliday.isHoliday ? lastDayHoliday.type : "",
        secondLastDay: lastlastDayHoliday.isHoliday
          ? lastlastDayHoliday.type
          : "",
      },
    };
  };

  // 修改評分計算函數
  const calculateDateScore = (
    workingDays: number,
    lastWorkDay: Date
  ): number => {
    // 工作日數量評分（基礎分數）
    // 每少一個工作日得1000分，使其成為絕對主導因素
    const workingDayScore = (20 - workingDays) * 1000;

    // 檢查最後兩天假期情況
    const { isBothHoliday } = checkLastTwoDaysHoliday(lastWorkDay);

    // 如果最後兩天都是假期，加200分；如果只有最後一天是假期，加50分
    const { isHoliday } = checkHolidayType(lastWorkDay);
    const holidayScore = isBothHoliday ? 200 : isHoliday ? 50 : 0;

    return workingDayScore + holidayScore;
  };

  // 修改尋找最佳辭職日期的函數
  const findBestResignationDates = () => {
    const today = startOfDay(new Date());
    const sixMonthsLater = addMonths(today, 6);
    const dates: BestResignationDate[] = [];

    eachDayOfInterval({ start: today, end: sixMonthsLater })
      .filter(isWorkingDay)
      .forEach((date) => {
        const result = calculateResignationDetails(date);
        const lastTwoDays = checkLastTwoDaysHoliday(result.lastWorkDay);

        const reason = [];
        if (result.workingDays < 20) {
          reason.push(`只需工作 ${result.workingDays} 天`);
        }
        if (lastTwoDays.isBothHoliday) {
          reason.push(`最後兩天都是假期`);
        } else if (checkHolidayType(result.lastWorkDay).isHoliday) {
          reason.push(`最後工作日是假期`);
        }

        dates.push({
          date,
          lastWorkDay: result.lastWorkDay,
          workingDays: result.workingDays,
          lastTwoDaysHoliday: lastTwoDays.isBothHoliday,
          holidayInfo: lastTwoDays.info,
          score: calculateDateScore(result.workingDays, result.lastWorkDay),
          reason: reason.join("，"),
        });
      });

    return dates.sort((a, b) => b.score - a.score).slice(0, 10);
  };

  // 修改分數說明函數
  //   const getScoreExplanation = (
  //     workingDays: number,
  //     lastTwoDaysHoliday: boolean,
  //     lastDayIsHoliday: boolean
  //   ): string => {
  //     const workingDayScore = (20 - workingDays) * 1000;
  //     const holidayScore = lastTwoDaysHoliday ? 200 : lastDayIsHoliday ? 50 : 0;
  //     const totalScore = workingDayScore + holidayScore;

  //     let explanation = `總分 ${totalScore} (工作日 ${workingDayScore}`;
  //     if (lastTwoDaysHoliday) {
  //       explanation += " + 最後兩天假期 200";
  //     } else if (lastDayIsHoliday) {
  //       explanation += " + 最後日假期 50";
  //     }
  //     explanation += ")";
  //     return explanation;
  //   };

  // Calendar 組件的 tileClassName 屬性
  const tileClassName = ({ date }: { date: Date }): string => {
    if (isWeekend(date)) return "bg-gray-100";
    if (holidays.some((h) => isSameDay(new Date(h.date), date))) {
      return "bg-red-50 text-red-600";
    }
    return "";
  };

  // 修改日期選擇處理函數
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const details = calculateResignationDetails(date);

    setResult(details);
  };

  // 修改渲染計算結果的部分
  const renderCalculationResult = () => {
    if (!result) return null;

    // 檢查最後工作日的假期狀況
    const lastTwoDays = checkLastTwoDaysHoliday(result.lastWorkDay);
    const lastDayHoliday = checkHolidayType(result.lastWorkDay);

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">計算結果</h3>
        <div className="space-y-3">
          {/* 基本信息 */}
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-gray-600">提交辭職信日期：</span>
              <span className="font-medium">
                {format(selectedDate! as Date, "yyyy年MM月dd日")}(
                {format(selectedDate! as Date, "EEEE", {
                  locale: zhHK,
                })}
                )
              </span>
            </div>
            {!isWorkingDay(selectedDate! as Date) && (
              <div>
                <span className="text-sm text-gray-500">{`*你選擇的是${
                  isWeekend(selectedDate! as Date) ? "週末" : "公眾假期"
                }，建議選擇工作日遞信`}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">通知類型：</span>
              <span className="font-medium">{result.noticeType}</span>
            </div>
            <div>
              <span className="text-gray-600">最後工作日：</span>
              <span className="font-medium">
                {format(result.lastWorkDay, "yyyy年MM月dd日")}(
                {format(result.lastWorkDay, "EEEE", {
                  locale: zhHK,
                })}
                )
              </span>
              {/* 新增：顯示假期信息 */}
              {lastTwoDays.isBothHoliday ? (
                <div className="mt-1 inline-flex items-center ml-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  <span className="mr-1">✨</span>
                  最後兩天連續假期：
                  {lastTwoDays.info.lastDay} + {lastTwoDays.info.secondLastDay}
                </div>
              ) : lastDayHoliday.isHoliday ? (
                <div className="mt-1 inline-flex items-center ml-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  <span className="mr-1">🌟</span>
                  最後工作日是{lastDayHoliday.type}
                </div>
              ) : null}
            </div>
            <div className="flex items-center">
              <span className="text-gray-600">需要工作：</span>
              <span className="font-medium text-lg ml-1">
                {result.workingDays} 天
              </span>
              {result.workingDays < 20 && (
                <span className="text-green-600 text-sm ml-2">
                  (比標準少 {20 - result.workingDays} 天)
                </span>
              )}
            </div>
          </div>

          {/* 工作日列表 */}
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">工作日期列表：</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {result.workingDaysList.map((day) => {
                const isHoliday = checkHolidayType(day.date);
                return (
                  <div
                    key={day.date.toISOString()}
                    className={`p-2 rounded ${
                      isHoliday.isHoliday
                        ? "bg-red-50 text-red-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    <span className="mr-2">{format(day.date, "MM/dd")}</span>
                    <span>
                      {format(day.date, "EEEE", {
                        locale: zhHK,
                      })}
                    </span>
                    {isHoliday.isHoliday && (
                      <span className="ml-2 text-sm">({isHoliday.type})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染右側面板內容
  const renderRightPanel = () => {
    switch (rightPanelView) {
      case "bestDates":
        return renderBestDates();

      case "details":
      default:
        return renderCalculationResult();
    }
  };

  // 修改最佳日期的展示
  const renderBestDates = () => (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">半年內最佳辭職日期</h3>
          <p className="text-sm text-gray-500 mt-1">
            評分方式：少一個工作日 = 1000分，最後兩天連續假期 =
            200分，最後一天假期 = 50分
          </p>
        </div>
        <button
          onClick={() => setRightPanelView("details")}
          className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          返回日期詳情
        </button>
      </div>
      <div className="space-y-3">
        {bestDates.map((date, index) => (
          <div
            key={date.date.toISOString()}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-semibold">
                  #{index + 1}
                </span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-lg">
                        {format(date.date, "yyyy年MM月dd日")}(
                        {format(date.date, "EEEE", {
                          locale: zhHK,
                        })}
                        )
                      </p>
                    </div>
                    <div className="mt-1">
                      <span className="text-lg font-bold text-blue-600">
                        需工作 {date.workingDays} 天
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        (
                        {20 - date.workingDays > 0
                          ? `比標準少 ${20 - date.workingDays} 天`
                          : "標準工作天數"}
                        )
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      最後工作日：{format(date.lastWorkDay, "yyyy年MM月dd日")}
                      {date.lastTwoDaysHoliday && (
                        <span className="text-green-600 ml-2">
                          (連續假期：{date.holidayInfo?.lastDay} +{" "}
                          {date.holidayInfo?.secondLastDay})
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* 工作日標籤 */}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                        工作日分數：{(20 - date.workingDays) * 1000}
                      </span>
                      {/* 假期標籤 */}
                      {date.lastTwoDaysHoliday ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                          連續假期加分：200
                        </span>
                      ) : (
                        date.holidayInfo?.lastDay && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            最後日假期加分：50
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDate(date.date);
                      const details = calculateResignationDetails(date.date);
                      setResult(details);
                      setRightPanelView("details");
                    }}
                    className="ml-4 text-blue-500 hover:text-blue-600 text-sm cursor-pointer"
                  >
                    查看詳情
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">辭職日期計算器</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左側：配置和日曆 */}
        <div className="space-y-6">
          {/* 配置選項 */}
          <div className="bg-white p-4 rounded-lg shadow space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.isInProbation}
                  onChange={(e) =>
                    setConfig({ ...config, isInProbation: e.target.checked })
                  }
                  className="rounded text-blue-600"
                />
                <span>試用期內</span>
              </label>
            </div>

            {config.isInProbation && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  試用期長度（月）
                </label>
                <input
                  type="number"
                  min={1}
                  value={config.probationMonths}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      probationMonths: parseInt(e.target.value),
                    })
                  }
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm"
                />
              </div>
            )}

            {config.isInProbation && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  入職日期
                </label>
                <input
                  type="date"
                  value={format(config.startDate, "yyyy-MM-dd")}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      startDate: new Date(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                公司規定通知期
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    value={config.companyNoticePeriodType}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        companyNoticePeriodType: e.target.value as
                          | "days"
                          | "months",
                      })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm"
                  >
                    <option value="days">按天數</option>
                    <option value="months">按月份</option>
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={config.companyNoticePeriodValue || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        companyNoticePeriodValue: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder="留空表示按《僱傭條例》計算"
                    className="block w-full rounded-md border-gray-300 shadow-sm"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {config.companyNoticePeriodType === "days" ? "天" : "月"}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                留空表示按《僱傭條例》計算（非試用期為一個月通知期）
              </p>
            </div>
          </div>

          {/* 日曆 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <Calendar
              onChange={(date) => {
                if (date) {
                  handleDateSelect(date as Date);
                }
              }}
              value={selectedDate}
              minDate={new Date()}
              tileClassName={tileClassName}
              locale="zh-HK"
            />
            <div className="mt-3 text-sm text-gray-500">
              <p>• 紅色日期：週末或公眾假期</p>
              <p>• 建議選擇工作日遞信</p>
            </div>
          </div>

          {/* 添加最佳日期按鈕 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <button
              onClick={() => {
                const best = findBestResignationDates();
                setBestDates(best);
                setRightPanelView("bestDates");
              }}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors cursor-pointer"
            >
              查看半年內最佳辭職日期
            </button>
          </div>
        </div>

        {/* 右側：動態面板 */}
        <div className="space-y-6">{renderRightPanel()}</div>
      </div>
    </div>
  );
};

// 添加自定義 CSS 樣式
const calendarStyles = `
  .react-calendar__tile:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .react-calendar__tile--now {
    background: #e6f3ff !important;
  }
  
  .react-calendar__tile--active {
    background: #006edc !important;
    color: white !important;
  }
`;

// 將樣式添加到文檔中
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = calendarStyles;
  document.head.appendChild(style);
}

export default ResignationCalculator;
