import { buildSchedule, DEFAULT_PROCESS_PARAMS } from "./src/app/schedule/utils.ts";

const schedule = buildSchedule({
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  dailyTarget: 100,
  defaultShiftStart: "08:00",
  defaultShiftEnd: "17:00",
  defaultFurnaceStart: "07:00",
  overtimeMinutes: 0,
  holidayWorkEnabled: false,
  initialMaleRemaining: 500,
  initialFemaleRemaining: 1300,
  initialRingRemaining: 1300,
  overrides: {},
  actuals: {},
  moldChangesByDate: {},
  processParams: DEFAULT_PROCESS_PARAMS,
  cellName: "ETM Hücresi",
  etm1InitialCutting: 10,
  etm2InitialCutting: 10,
  etm1InitialDrill: 10,
  etm2InitialDrill: 10,
  initialWip: 2000,
});

for (const day of schedule) {
  if (day.etmDrillStopsMinutes > 0) {
    console.log(
      `Date: ${day.key}, Start Drill: E1=${day.etm1DrillStart}, E2=${day.etm2DrillStart}, Stops: ${day.etmDrillStopsMinutes}`
    );
  }
}
