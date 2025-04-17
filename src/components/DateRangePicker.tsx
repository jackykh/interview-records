import { format } from "date-fns";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">開始日期：</label>
        <input
          type="date"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
          min={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) =>
            onStartDateChange(e.target.value ? new Date(e.target.value) : null)
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">結束日期：</label>
        <input
          type="date"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
          min={
            startDate
              ? format(startDate, "yyyy-MM-dd")
              : format(new Date(), "yyyy-MM-dd")
          }
          onChange={(e) =>
            onEndDateChange(e.target.value ? new Date(e.target.value) : null)
          }
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
