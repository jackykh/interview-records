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

const ResignationCalculator: React.FC = () => {
  const holidays = useHolidayStore((state) => state.holidays);
  const [config, setConfig] = useState<ResignationConfig>({
    isInProbation: false,
    probationMonths: 3,
    startDate: new Date(),
    companyNoticePeriodType: "days",
    companyNoticePeriodValue: null,
  });
  const [selectedDate, setSelectedDate] = useState<Value>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);

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

  // 處理日期選擇
  const handleDateSelect = (date: Value) => {
    setSelectedDate(date);

    const details = calculateResignationDetails(date as Date);
    setResult(details);
  };

  // 自定義日期格式化
  const formatDate = (date: Date): string => {
    return format(date, "yyyy年MM月dd日");
  };

  // 判斷日期是否為假期
  const tileClassName = ({ date }: { date: Date }): string => {
    if (isWeekend(date)) return "bg-gray-50";
    if (holidays.some((h) => isSameDay(new Date(h.date), date)))
      return "bg-red-50 text-red-600";
    return "";
  };

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
              onChange={handleDateSelect}
              value={selectedDate}
              minDate={new Date()}
              tileClassName={tileClassName}
              locale="zh-HK"
            />
          </div>
        </div>

        {/* 右側：計算結果 */}
        <div className="bg-white p-4 rounded-lg shadow">
          {result ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">計算結果</h3>
              <div className="space-y-2">
                <p className="flex justify-between">
                  <span className="text-gray-600">遞信日期：</span>
                  <span className="font-medium">
                    {formatDate(result.resignDate)}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">通知期類型：</span>
                  <span className="font-medium">{result.noticeType}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">最後工作日：</span>
                  <span className="font-medium">
                    {formatDate(result.lastWorkDay)}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">需要工作：</span>
                  <span className="font-medium">
                    {result.workingDays} 個工作天
                  </span>
                </p>
              </div>

              {/* 修改詳細日期列表的展示 */}
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-3">詳細日期列表</h4>
                <div className="max-h-96 overflow-y-auto">
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
                            {format(day.date, "EEEE", {
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
          ) : (
            <div className="text-center text-gray-500 py-8">
              請在日曆中選擇計劃遞信的日期
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResignationCalculator;
