import { View, Text, Button } from "@tarojs/components";
import type { EventRecord } from "../types/events";

interface CheckinHeatmapProps {
  records: EventRecord[];
  currentMonth: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  actualTheme: 'light' | 'dark';
}

// 获取某月的天数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 获取某月第一天是星期几 (0=周日, 1=周一...)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

// 格式化月份显示
function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${year}年${parseInt(month)}月`;
}

// 获取上一个月
function getPrevMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

// 获取下一个月
function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function buildCalendarRows(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return Array.from({ length: calendarDays.length / 7 }, (_, index) =>
    calendarDays.slice(index * 7, index * 7 + 7)
  );
}

export default function CheckinHeatmap({
  records,
  currentMonth,
  onMonthChange,
  actualTheme,
}: CheckinHeatmapProps) {
  const [year, month] = currentMonth.split('-').map(Number);
  const calendarRows = buildCalendarRows(year, month);

  // 获取当月所有打卡日期
  const checkinDates = new Set(
    records
      .map((r) => r.startDate || r.date)
      .filter((d): d is string => !!d && d.startsWith(currentMonth))
  );

  // 星期标题
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const isDark = actualTheme === 'dark';
  const cellStyle = {
    width: '13.4%',
    marginRight: '1%',
    marginBottom: '8rpx',
  } as const;
  const lastCellStyle = {
    width: '13.4%',
    marginRight: 0,
    marginBottom: '8rpx',
  } as const;

  return (
    <View
      className={
        isDark
          ? "relative z-[1] p-[24rpx] rounded-[18rpx] bg-[#12151b] border-[2rpx] border-[#4b5563] shadow-[0_16rpx_32rpx_#00000038]"
          : "relative z-[1] p-[24rpx] rounded-[18rpx] bg-[#fdf7ee] border-[3rpx] border-[#8a5a2b] shadow-[0_18rpx_36rpx_#7a4d2422]"
      }
    >
      {/* 月份切换 */}
      <View className="flex flex-row items-center justify-between mb-[24rpx]">
        <View className="w-[96rpx] flex items-center justify-start">
          <Button
            className={
              isDark
                ? "mr-0 w-[80rpx] h-[64rpx] leading-[64rpx] text-[32rpx] bg-[#1b2028] border-[2rpx] border-[#4b5563] rounded-[12rpx] text-[#fff8ec] px-0"
                : "mr-0 w-[80rpx] h-[64rpx] leading-[64rpx] text-[32rpx] bg-[#fff8ec] border-[3rpx] border-[#8a5a2b] rounded-[12rpx] text-[#4a2a12] shadow-[0_8rpx_16rpx_#7a4d2418] px-0"
            }
            onClick={() => onMonthChange(getPrevMonth(currentMonth))}
          >
            ‹
          </Button>
        </View>
        <View className="flex-1 flex items-center justify-center px-[8rpx]">
          <Text
            className={
              isDark
                ? "text-[32rpx] font-semibold text-[#fff8ec] text-center"
                : "text-[32rpx] font-semibold text-[#4a2a12] text-center"
            }
          >
            {formatMonthLabel(currentMonth)}
          </Text>
        </View>
        <View className="w-[96rpx] flex items-center justify-end">
          <Button
            className={
              isDark
                ? "mr-0 w-[80rpx] h-[64rpx] leading-[64rpx] text-[32rpx] bg-[#1b2028] border-[2rpx] border-[#4b5563] rounded-[12rpx] text-[#fff8ec] px-0"
                : "mr-0 w-[80rpx] h-[64rpx] leading-[64rpx] text-[32rpx] bg-[#fff8ec] border-[3rpx] border-[#8a5a2b] rounded-[12rpx] text-[#4a2a12] shadow-[0_8rpx_16rpx_#7a4d2418] px-0"
            }
            onClick={() => onMonthChange(getNextMonth(currentMonth))}
          >
            ›
          </Button>
        </View>
      </View>

      {/* 星期标题 */}
      <View className="flex flex-row flex-wrap mb-[8rpx]">
        {weekDays.map((day, index) => (
          <View
            key={day}
            className="h-[40rpx] flex items-center justify-center"
            style={index === weekDays.length - 1 ? lastCellStyle : cellStyle}
          >
            <Text
              className={
                isDark
                  ? "text-[24rpx] text-[#9ca3af]"
                  : "text-[24rpx] font-medium text-[#6a4120]"
              }
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 日历格子 */}
      <View className="flex flex-col">
        {calendarRows.map((week, rowIndex) => (
          <View key={`week-${rowIndex}`} className="flex flex-row flex-wrap">
            {week.map((day, dayIndex) => {
              const containerStyle = dayIndex === week.length - 1 ? lastCellStyle : cellStyle;

              if (day === null) {
                return (
                  <View
                    key={`empty-${rowIndex}-${dayIndex}`}
                    className="h-[84rpx]"
                    style={containerStyle}
                  />
                );
              }

              const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
              const isCheckedIn = checkinDates.has(dateStr);

              return (
                <View
                  key={`${rowIndex}-${day}`}
                  className="h-[84rpx]"
                  style={containerStyle}
                >
                  <View
                    className={`w-full h-full rounded-[10rpx] flex items-center justify-center border-[2rpx] ${
                      isCheckedIn
                        ? isDark
                          ? "bg-[#f59e0b] border-[#f59e0b]"
                          : "bg-[#d9730d] border-[#8a4a00] shadow-[0_6rpx_14rpx_#d9730d2e]"
                        : isDark
                        ? "bg-[#1b2028] border-[#4b5563]"
                        : "bg-[#f6e7d2] border-[#a56c3b]"
                    }`}
                  >
                    <Text
                      className={`text-[24rpx] ${
                        isCheckedIn
                          ? isDark
                            ? "text-[#1b1205] font-semibold"
                            : "text-[#fffdf8] font-semibold"
                          : isDark
                          ? "text-[#d1d5db]"
                          : "text-[#5c3417] font-medium"
                      }`}
                    >
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* 图例 */}
      <View className="flex flex-row flex-wrap items-center justify-center mt-[24rpx] gap-[32rpx]">
        <View className="flex items-center gap-[8rpx]">
          <View
            className={
              isDark
                ? "w-[24rpx] h-[24rpx] rounded-[4rpx] bg-[#f59e0b]"
                : "w-[24rpx] h-[24rpx] rounded-[4rpx] bg-[#d9730d] border-[2rpx] border-[#8a4a00]"
            }
          />
          <Text
            className={
              isDark ? "text-[24rpx] text-[#c7ccd5]" : "text-[24rpx] font-medium text-[#5c3417]"
            }
          >
            已打卡
          </Text>
        </View>
        <View className="flex items-center gap-[8rpx]">
          <View
            className={
              isDark
                ? "w-[24rpx] h-[24rpx] rounded-[4rpx] bg-[#1b2028] border-[2rpx] border-[#4b5563]"
                : "w-[24rpx] h-[24rpx] rounded-[4rpx] bg-[#f6e7d2] border-[2rpx] border-[#a56c3b]"
            }
          />
          <Text
            className={
              isDark ? "text-[24rpx] text-[#c7ccd5]" : "text-[24rpx] font-medium text-[#5c3417]"
            }
          >
            未打卡
          </Text>
        </View>
      </View>
    </View>
  );
}
