import { InterviewForm } from "../components/interviewForm";
import { InterviewList } from "../components/interviewList";
import HolidayList from "../components/HolidayList";
import { useIsFetching } from "@tanstack/react-query";

const InterviewRecord = () => {
  const isFetchingHoliday = useIsFetching({ queryKey: ["holidays"] });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
        {isFetchingHoliday && (
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  無法獲取香港公眾假期數據，工作天數計算將不包括公眾假期
                </p>
              </div>
            </div>
          </div>
        )}
        <h1 className="text-3xl font-bold mb-8">等 Offer...</h1>

        {/* 添加假期列表 */}
        <div className="mb-8">
          <HolidayList />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">新增記錄</h2>
            <InterviewForm />
            <div className="mt-2 flex justify-center">
              <span className="text-sm text-gray-500">
                意見反饋：
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="mailto:topiary.bugs.5j@icloud.com"
                >
                  topiary.bugs.5j@icloud.com
                </a>
              </span>
            </div>
          </div>
          <div>
            <InterviewList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRecord;
