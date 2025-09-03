import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  comparisonRange?: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  onComparisonRangeChange?: (range: DateRange | undefined) => void
  enableComparison?: boolean
  onComparisonToggle?: (enabled: boolean) => void
  className?: string
}

// Preset date ranges
const presetRanges = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: today, to: tomorrow }
    }
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return { from: yesterday, to: today }
    }
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)
      return { from: weekAgo, to: today }
    }
  },
  {
    label: "Last 14 days",
    getValue: () => {
      const today = new Date()
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(today.getDate() - 14)
      return { from: twoWeeksAgo, to: today }
    }
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)
      return { from: thirtyDaysAgo, to: today }
    }
  },
  {
    label: "This month",
    getValue: () => {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: firstDay, to: lastDay }
    }
  },
  {
    label: "Last month",
    getValue: () => {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: firstDay, to: lastDay }
    }
  },
  {
    label: "This quarter",
    getValue: () => {
      const today = new Date()
      const quarter = Math.floor((today.getMonth() + 3) / 3)
      const firstMonth = (quarter - 1) * 3
      const firstDay = new Date(today.getFullYear(), firstMonth, 1)
      const lastDay = new Date(today.getFullYear(), firstMonth + 3, 0)
      return { from: firstDay, to: lastDay }
    }
  },
  {
    label: "Last quarter",
    getValue: () => {
      const today = new Date()
      const quarter = Math.floor((today.getMonth() + 3) / 3)
      const firstMonth = (quarter - 2) * 3
      const year = firstMonth < 0 ? today.getFullYear() - 1 : today.getFullYear()
      const adjustedMonth = firstMonth < 0 ? firstMonth + 12 : firstMonth
      const firstDay = new Date(year, adjustedMonth, 1)
      const lastDay = new Date(year, adjustedMonth + 3, 0)
      return { from: firstDay, to: lastDay }
    }
  },
  {
    label: "This year",
    getValue: () => {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), 0, 1)
      const lastDay = new Date(today.getFullYear(), 11, 31)
      return { from: firstDay, to: lastDay }
    }
  },
  {
    label: "Last year",
    getValue: () => {
      const today = new Date()
      const firstDay = new Date(today.getFullYear() - 1, 0, 1)
      const lastDay = new Date(today.getFullYear() - 1, 11, 31)
      return { from: firstDay, to: lastDay }
    }
  }
]

export function DateRangePicker({
  dateRange,
  comparisonRange,
  onDateRangeChange,
  onComparisonRangeChange,
  enableComparison = false,
  onComparisonToggle,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"main" | "comparison">("main")
  const [tempMainRange, setTempMainRange] = React.useState<DateRange | undefined>(dateRange)
  const [tempComparisonRange, setTempComparisonRange] = React.useState<DateRange | undefined>(comparisonRange)

  React.useEffect(() => {
    setTempMainRange(dateRange)
  }, [dateRange])

  React.useEffect(() => {
    setTempComparisonRange(comparisonRange)
  }, [comparisonRange])

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue()
    if (activeTab === "main") {
      setTempMainRange(range)
    } else {
      setTempComparisonRange(range)
    }
  }

  const handleApply = () => {
    onDateRangeChange(tempMainRange)
    if (onComparisonRangeChange && enableComparison) {
      onComparisonRangeChange(tempComparisonRange)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempMainRange(dateRange)
    setTempComparisonRange(comparisonRange)
    setIsOpen(false)
  }

  const handleClear = () => {
    if (activeTab === "main") {
      setTempMainRange(undefined)
    } else {
      setTempComparisonRange(undefined)
    }
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return "Select date range"
    if (range.to) {
      return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`
    }
    return format(range.from, "MMM d, yyyy")
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1">{formatDateRange(dateRange)}</span>
            {enableComparison && comparisonRange && (
              <>
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">
                  vs {formatDateRange(comparisonRange)}
                </span>
              </>
            )}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {/* Preset buttons */}
            <div className="border-r p-3 space-y-1">
              <div className="text-sm font-semibold mb-2">Quick Select</div>
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar and controls */}
            <div className="p-3">
              {/* Comparison toggle */}
              {onComparisonToggle && (
                <div className="flex items-center space-x-2 mb-3">
                  <Switch
                    checked={enableComparison}
                    onCheckedChange={onComparisonToggle}
                  />
                  <Label className="text-sm">Compare periods</Label>
                </div>
              )}

              {/* Tab switcher for comparison mode */}
              {enableComparison && (
                <div className="flex space-x-1 mb-3">
                  <Button
                    variant={activeTab === "main" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("main")}
                    className="flex-1 text-xs"
                  >
                    Primary Range
                  </Button>
                  <Button
                    variant={activeTab === "comparison" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("comparison")}
                    className="flex-1 text-xs"
                  >
                    Comparison Range
                  </Button>
                </div>
              )}

              {/* Date range display */}
              <div className="mb-3 p-2 bg-muted rounded text-sm">
                {activeTab === "main" ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Primary:</div>
                    <div className="font-medium">{formatDateRange(tempMainRange)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Comparison:</div>
                    <div className="font-medium">{formatDateRange(tempComparisonRange)}</div>
                  </div>
                )}
              </div>

              {/* Calendar */}
              <Calendar
                mode="range"
                selected={activeTab === "main" ? tempMainRange : tempComparisonRange}
                onSelect={(range) => {
                  if (activeTab === "main") {
                    setTempMainRange(range)
                  } else {
                    setTempComparisonRange(range)
                  }
                }}
                numberOfMonths={2}
                className="rounded-md border"
              />

              {/* Action buttons */}
              <div className="flex justify-between mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                >
                  Clear
                </Button>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}