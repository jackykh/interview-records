import { InterviewForm } from "../components/interviewForm";
import { InterviewList } from "../components/interviewList";
import HolidayList from "../components/HolidayList";
import { Link } from "react-router-dom";

const InterviewRecord = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold">等 Offer...</h1>
          <Link
            to="/statistics"
            className="flex items-center px-4 text-gray-700 hover:text-gray-900"
          >
            數據統計
          </Link>
        </div>

        {/* 添加假期列表 */}
        <div className="mb-8">
          <HolidayList />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">新增記錄</h2>
            <InterviewForm />
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
