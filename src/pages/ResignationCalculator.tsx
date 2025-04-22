import React, { useState } from "react";
import Calendar from "react-calendar";
import { useHolidayStore } from "../store";
import {
  format,
  addMonths,
  isWeekend,
  addDays,
  subDays,
  isSameDay,
  eachDayOfInterval,
  startOfDay,
  isBefore,
  differenceInCalendarDays,
  endOfMonth,
  getDate,
} from "date-fns";
import "react-calendar/dist/Calendar.css";
import { Value } from "react-calendar/src/shared/types.js";
import { zhHK } from "date-fns/locale";
import WorkingDaySettingsPanel from "../components/WorkingDaySettingsPanel";
import DateRangePicker from "../components/DateRangePicker";

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
}

type RightPanelView = "details" | "bestDates";

interface WorkingDaySettings {
  workingDays: number[]; // 0-6 代表週日到週六
}

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
  const [bestDates, setBestDates] = useState<BestResignationDate[]>([]);
  const [rightPanelView, setRightPanelView] =
    useState<RightPanelView>("details");

  // 添加日期範圍選擇的 state
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // 添加工作日設置相關 state
  const [workingDaySettings, setWorkingDaySettings] =
    useState<WorkingDaySettings>({
      workingDays: [1, 2, 3, 4, 5], // 預設週一到週五
    });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function getNextMonthsPrevDay(date: Date, month: number) {
    // 如果是當月最後一天，返回下個月最後一天
    if (isSameDay(date, endOfMonth(date))) {
      return endOfMonth(addMonths(date, month));
    }

    const nextMonthSameDay = addMonths(date, month);

    // 檢查加一個月後的月份有無同一日
    if (getDate(nextMonthSameDay) !== getDate(date)) {
      // 下個月無同一日，返回下個月最後一天
      return endOfMonth(addMonths(date, month));
    } else {
      // 返回下個月同一日的前一天
      return subDays(nextMonthSameDay, 1);
    }
  }

  // 計算最後工作日和通知類型
  const calculateResignationDetails = (resignDate: Date): CalculationResult => {
    const employmentDuration = differenceInCalendarDays(
      resignDate,
      config.startDate
    );
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
          lastWorkDay = getNextMonthsPrevDay(
            resignDate,
            config.companyNoticePeriodValue
          );
          noticeType = `公司規定${config.companyNoticePeriodValue}個月通知期`;
        }
      } else {
        // 默認一個月通知期
        lastWorkDay = getNextMonthsPrevDay(resignDate, 1);
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

  // 檢查日期是否為假期，並返回假期類型
  const checkHolidayType = (
    date: Date
  ): { isHoliday: boolean; type?: string } => {
    if (isWorkingDay(date)) {
      return { isHoliday: false };
    }

    const isWeekendDay = isWeekend(date);
    const holidayName = getHolidayName(date);

    if (holidayName) {
      // 公眾假期
      return { isHoliday: true, type: holidayName };
    } else if (isWeekendDay) {
      // 週末
      return { isHoliday: true, type: "週末" };
    } else {
      return { isHoliday: true, type: "自定義週休" };
    }
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
      const holidaysType = checkHolidayType(currentDate);

      if (!holidaysType.isHoliday) {
        // 工作日
        count++;
        daysList.push({
          date: new Date(currentDate),
          type: "workday",
        });
      } else if (holidaysType.type === "週末") {
        // 週末
        daysList.push({
          date: new Date(currentDate),
          isHoliday: true,
          holidayName: "週末",
          type: "weekend",
        });
      } else if (holidaysType.type === "自定義週休") {
        daysList.push({
          date: new Date(currentDate),
          isHoliday: true,
          holidayName: "自定義週休",
          type: "holiday",
        });
      } else {
        // 公眾假期
        daysList.push({
          date: new Date(currentDate),
          isHoliday: true,
          holidayName: holidaysType.type,
          type: "holiday",
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    return { count, daysList };
  };

  // 修改工作日判斷函數
  const isWorkingDay = (date: Date) => {
    if (!date) return;
    const day = date.getDay();
    // 檢查是否是工作日
    const isWorkDay = workingDaySettings.workingDays.includes(day);
    // 檢查是否是公眾假期
    const isHoliday = holidays.some((holiday) =>
      isSameDay(new Date(holiday.date), date)
    );
    return isWorkDay && !isHoliday;
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
    const startDate = customStartDate || today;
    const endDate = customEndDate || addMonths(today, 6);
    const dates: BestResignationDate[] = [];

    eachDayOfInterval({ start: startDate, end: endDate })
      .filter(isWorkingDay)
      .forEach((date) => {
        const result = calculateResignationDetails(date);
        const lastTwoDays = checkLastTwoDaysHoliday(result.lastWorkDay);

        dates.push({
          date,
          lastWorkDay: result.lastWorkDay,
          workingDays: result.workingDays,
          lastTwoDaysHoliday: lastTwoDays.isBothHoliday,
          holidayInfo: lastTwoDays.info,
          score: calculateDateScore(result.workingDays, result.lastWorkDay),
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
  };

  // 修改渲染計算結果的部分
  const renderCalculationResult = () => {
    if (!selectedDate) return;
    const result = calculateResignationDetails(selectedDate as Date);

    // 檢查最後工作日的假期狀況
    const lastTwoDays = checkLastTwoDaysHoliday(result.lastWorkDay);
    const lastDayHoliday = checkHolidayType(result.lastWorkDay);

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        {/* 添加設置按鈕 */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">計算結果</h3>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            工作日設置
          </button>
        </div>

        {/* 顯示當前工作日設置 */}
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">
            目前的工作日為：
            {workingDaySettings.workingDays
              .map((day) => ["日", "一", "二", "三", "四", "五", "六"][day])
              .map((day) => `週${day}`)
              .join("、")}
          </p>
        </div>

        <div className="space-y-3">
          {/* 基本信息 */}
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-gray-600">提交辭職信日期：</span>
              <span className="font-medium">
                {format(selectedDate as Date, "yyyy年MM月dd日")}(
                {format(selectedDate as Date, "EEEE", {
                  locale: zhHK,
                })}
                )
              </span>
            </div>
            {result.workingDaysList[0].isHoliday && (
              <div>
                <span className="text-sm text-gray-500">{`*你選擇的是${result.workingDaysList[0].holidayName}，建議選擇工作日遞信`}</span>
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
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">最佳辭職日期</h3>
          <p className="text-sm text-gray-500 mt-1">
            評分方式：少一個工作日 = 1000分，最後兩天連續假期 =
            200分，最後一天假期 = 50分
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomRange(!showCustomRange)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center cursor-pointer"
          >
            <svg
              className={`w-4 h-4 mr-1 transform transition-transform ${
                showCustomRange ? "rotate-180" : ""
              }`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
            {showCustomRange ? "收起" : "指定時間範圍"}
          </button>
          <button
            onClick={() => setRightPanelView("details")}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            返回日期詳情
          </button>
        </div>
      </div>

      {/* 日期範圍選擇器 */}
      {showCustomRange && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <DateRangePicker
            startDate={customStartDate}
            endDate={customEndDate}
            onStartDateChange={(date) => {
              setCustomStartDate(date);
              if (date && customEndDate && isBefore(customEndDate, date)) {
                setCustomEndDate(null);
              }
            }}
            onEndDateChange={setCustomEndDate}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setCustomStartDate(null);
                setCustomEndDate(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-800 mr-2"
            >
              重置
            </button>
            <button
              onClick={() => setBestDates(findBestResignationDates())}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              disabled={!!(customStartDate && !customEndDate)}
            >
              搜尋
            </button>
          </div>
        </div>
      )}

      {/* 日期範圍提示 */}
      <div className="text-sm text-gray-600 mb-4">
        搜尋範圍：
        {customStartDate
          ? format(customStartDate, "yyyy年MM月dd日")
          : "今天"}{" "}
        至{customEndDate ? format(customEndDate, "yyyy年MM月dd日") : "六個月後"}
      </div>

      {/* 現有的最佳日期列表保持不變 */}
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
                    onChange={(e) => {
                      let targetValue = e.target.value
                        ? parseInt(e.target.value)
                        : 0;
                      const maxValue =
                        config.companyNoticePeriodType === "months" ? 6 : 180;

                      if (targetValue > maxValue) {
                        targetValue = maxValue;
                      }
                      setConfig({
                        ...config,
                        companyNoticePeriodValue: targetValue,
                      });
                    }}
                    placeholder="留空表示按《僱傭條例》計算"
                    className="block w-full rounded-md border-gray-300 shadow-sm"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {config.companyNoticePeriodType === "days" ? "天" : "月"}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                留空表示按《僱傭條例》計算（非試用期為一個月通知期，最大值為
                {config.companyNoticePeriodType === "months"
                  ? "六個月"
                  : "180日"}
                ）
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
              查看最佳辭職日期
            </button>
          </div>
        </div>

        {/* 右側：動態面板 */}
        <div className="space-y-6">{renderRightPanel()}</div>
      </div>

      {/* 添加設置面板 */}
      {isSettingsOpen && (
        <WorkingDaySettingsPanel
          settings={workingDaySettings}
          onSettingsChange={setWorkingDaySettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default ResignationCalculator;
