// Sabitler – schedule modülüne ait tüm sabit değerler
export const SHIFT_START = "07:45";
export const SHIFT_END = "17:15";
export const FURNACE_START = "07:45";
export const SHIFT_MINUTES = 570;
export const NORMALIZATION_WARMUP_MINUTES = 120;
export const PRE_PRESS_HEAT_MINUTES = 30;
export const PRESS_CYCLE_MINUTES = 3;
export const NORMALIZATION_PROCESS_MINUTES = 270;
export const MALE_DIE_INTERVAL = 500;
export const FEMALE_DIE_INTERVAL = 1300;
export const MALE_DIE_CHANGE_MINUTES = Math.round(SHIFT_MINUTES / 2);
export const FEMALE_DIE_CHANGE_MINUTES = SHIFT_MINUTES * 2;
export const DEFAULT_DIE_COOLING_MINUTES = 90;
