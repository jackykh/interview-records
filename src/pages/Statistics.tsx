import React from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "../db";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
// import { Interview } from "../types";

// 圖表可以使用 recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#00C49F", "#FF8042", "#FFBB28"];

export const Statistics: React.FC = () => {
  const { data: interviews } = useQuery({
    queryKey: ["interviews", "all"],
    queryFn: () => db.interviews.toArray(),
  });

  // 計算總體統計
  const overallStats = React.useMemo(() => {
    if (!interviews) return null;

    const total = interviews.length;
    const statusCount = interviews.reduce(
      (acc, interview) => {
        acc[interview.status]++;
        return acc;
      },
      { passed: 0, failed: 0, pending: 0 }
    );

    const pieData = [
      { name: "已錄取", value: statusCount.passed },
      { name: "未通過", value: statusCount.failed },
      { name: "進行中", value: statusCount.pending },
    ];

    return {
      total,
      statusCount,
      pieData,
      passRate: total ? ((statusCount.passed / total) * 100).toFixed(1) : 0,
    };
  }, [interviews]);

  // 計算最近6個月的面試數據
  const monthlyStats = React.useMemo(() => {
    if (!interviews) return [];

    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthInterviews = interviews.filter((interview) => {
        const interviewDate = new Date(interview.date);
        return interviewDate >= start && interviewDate <= end;
      });

      return {
        month: format(date, "yyyy-MM"),
        total: monthInterviews.length,
        passed: monthInterviews.filter((i) => i.status === "passed").length,
        failed: monthInterviews.filter((i) => i.status === "failed").length,
        pending: monthInterviews.filter((i) => i.status === "pending").length,
      };
    }).reverse();

    return months;
  }, [interviews]);

  if (!interviews) {
    return <div>載入中...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">面試數據統計</h1>

      {/* 總體統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">總面試次數</h3>
          <p className="text-3xl font-bold text-blue-600">
            {overallStats?.total || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">進行中</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {overallStats?.statusCount.pending || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">已錄取</h3>
          <p className="text-3xl font-bold text-green-600">
            {overallStats?.statusCount.passed || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">未通過</h3>
          <p className="text-3xl font-bold text-red-600">
            {overallStats?.statusCount.failed || 0}
          </p>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 狀態分布餅圖 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">面試狀態分布</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={overallStats?.pieData}
              cx={200}
              cy={150}
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label
            >
              {overallStats?.pieData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        {/* 月度趨勢圖 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">月度面試趨勢</h3>
          <BarChart width={400} height={300} data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="passed" name="已錄取" fill="#00C49F" />
            <Bar dataKey="failed" name="未通過" fill="#FF8042" />
            <Bar dataKey="pending" name="進行中" fill="#FFBB28" />
          </BarChart>
        </div>
      </div>
    </div>
  );
};
