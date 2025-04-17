import { InterviewForm } from "../components/interviewForm";
import { InterviewList } from "../components/interviewList";
import HolidayList from "../components/HolidayList";

const InterviewRecord = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
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
