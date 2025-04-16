import React, { useState } from "react";
import Calendar from "react-calendar";
import { useHolidayStore } from "../store";
import {
  format,
  addMonths,
  isWeekend,
  differenceInDays,
  addDays,
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
  lastDayIsHoliday: boolean;
  holidayType?: string;
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

  // 修改評分計算函數
  const calculateDateScore = (
    workingDays: number,
    lastWorkDay: Date
  ): number => {
    let score = 0;

    // 工作日數量評分（基礎分數）
    // 每少一個工作日得1000分，使其成為絕對主導因素
    const workingDayScore = (20 - workingDays) * 1000;

    // 最後工作日是假期只加少量分數（50分）
    const { isHoliday } = checkHolidayType(lastWorkDay);
    const holidayScore = isHoliday ? 50 : 0;

    score = workingDayScore + holidayScore;

    return score;
  };

  // 修改尋找最佳辭職日期的函數
  const findBestResignationDates = () => {
    const today = startOfDay(new Date());
    const sixMonthsLater = addMonths(today, 6);
    const dates: BestResignationDate[] = [];

    eachDayOfInterval({ start: today, end: sixMonthsLater })
      .filter(isWorkingDay) // 只在工作日中尋找
      .forEach((date) => {
        const result = calculateResignationDetails(date);
        const { isHoliday, type } = checkHolidayType(result.lastWorkDay);

        const reason = [];
        if (result.workingDays < 20) {
          reason.push(`只需工作 ${result.workingDays} 天`);
        }
        if (isHoliday) {
          reason.push(`最後工作日是${type}`);
        }

        dates.push({
          date,
          lastWorkDay: result.lastWorkDay,
          workingDays: result.workingDays,
          lastDayIsHoliday: isHoliday,
          holidayType: type,
          score: calculateDateScore(result.workingDays, result.lastWorkDay),
          reason: reason.join("，"),
        });
      });

    return dates.sort((a, b) => b.score - a.score).slice(0, 10);
  };

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

    // 如果選擇的是非工作日，添加提示信息
    if (!isWorkingDay(date)) {
      details.noticeType = `注意：你選擇的是${
        isWeekend(date) ? "週末" : "公眾假期"
      }，建議選擇工作日遞信`;
    }
  };

  // 渲染右側面板內容
  const renderRightPanel = () => {
    switch (rightPanelView) {
      case "bestDates":
        return renderBestDates();

      case "details":
      default:
        return result ? (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">計算結果</h3>
              </div>

              <div className="space-y-2">
                <p className="flex justify-between">
                  <span className="text-gray-600">遞信日期：</span>
                  <span className="font-medium">
                    {format(result.resignDate, "yyyy年MM月dd日")}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">通知期類型：</span>
                  <span className="font-medium">{result.noticeType}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">最後工作日：</span>
                  <span className="font-medium">
                    {format(result.lastWorkDay, "yyyy年MM月dd日")}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">需要工作：</span>
                  <span className="font-medium">
                    {result.workingDays} 個工作天
                  </span>
                </p>
              </div>

              {/* 詳細日期列表 */}
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-3">詳細日期列表</h4>
                <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                  <div className="space-y-1">
                    {result.workingDaysList.map((day) => (
                      <div
                        key={day.date.toISOString()}
                        className={`p-2 rounded-md flex justify-between items-center ${
                          day.type === "workday"
                            ? "bg-green-50 text-green-700"
                            : day.type === "weekend"
                            ? "bg-gray-50 text-gray-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <div>
                          <span className="font-medium">
                            {format(day.date, "yyyy年MM月dd日")}
                          </span>
                          <span className="ml-2 text-sm">
                            {format(day.date, "(eee)", {
                              locale: zhHK,
                            })}
                          </span>
                        </div>
                        <span className="text-sm">
                          {day.type === "workday" ? "工作日" : day.holidayName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <div className="text-sm text-blue-600 space-y-1">
                  <p>* 綠色背景：工作日</p>
                  <p>* 灰色背景：週末</p>
                  <p>* 紅色背景：公眾假期</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-center text-gray-500 py-8">
              請在日曆中選擇計劃遞信的日期
            </div>
          </div>
        );
    }
  };

  // 修改最佳日期的展示
  const renderBestDates = () => (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">半年內最佳辭職日期</h3>
          <p className="text-sm text-gray-500 mt-1">
            評分方式：少一個工作日 = 1000分，最後工作日為假期 = 50分（加分項）
          </p>
        </div>
        <button
          onClick={() => setRightPanelView("details")}
          className="text-sm text-gray-500 hover:text-gray-700"
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
                      {date.lastDayIsHoliday && (
                        <span className="text-green-600 ml-2">
                          ({date.holidayType})
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* 工作日標籤 */}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                        工作日分數：{(20 - date.workingDays) * 1000}
                      </span>
                      {/* 最後工作日標籤 */}
                      {date.lastDayIsHoliday && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          最後工作日假期加分：50
                        </span>
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
                    className="ml-4 text-blue-500 hover:text-blue-600 text-sm"
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                入職日期
              </label>
              <input
                type="date"
                value={format(config.startDate, "yyyy-MM-dd")}
                onChange={(e) =>
                  setConfig({ ...config, startDate: new Date(e.target.value) })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>

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
              <p>• 灰色日期：週末</p>
              <p>• 紅色日期：公眾假期</p>
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
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
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
