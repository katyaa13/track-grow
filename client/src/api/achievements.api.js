import api from "./axios.js";

export const getAchievements = () => api.get("/achievements");
