import api from "./axios.js";

export const getHabits = (date) => api.get("/habits", { params: { date } });
export const createHabit = (data) => api.post("/habits", data);
export const updateHabit = (id, data) => api.put(`/habits/${id}`, data);
export const deleteHabit = (id) => api.delete(`/habits/${id}`);
export const updateProgress = (id, data) => api.patch(`/habits/${id}/progress`, data);
export const startTimer = (id, data) => api.post(`/habits/${id}/timer/start`, data);
export const deleteProgress = (id, date) => api.delete(`/habits/${id}/progress`, { params: { date } });

export const completeHabit = (habitId, value = null, date = null, today = null) =>
  api.post(`/habits/${habitId}/complete`, { value, date, today });

export const uncompleteHabit = (habitId, date = null, value = null, today = null) => {
  const params = {};
  if (date) params.date = date;
  if (value !== null) params.value = value;
  if (today) params.today = today;
  return api.delete(`/habits/${habitId}/complete`, Object.keys(params).length ? { params } : {});
};
