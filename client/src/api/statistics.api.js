import api from "./axios.js";

export const getStatistics = (habitId = null) =>
  api.get("/statistics", { params: { habitId } });

export const getCalendar = (habitId = null, month = null) =>
  api.get("/statistics/calendar", { params: { habitId, month } });
