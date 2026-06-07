import { localDateString } from "../hooks/useHabits.js";
import api from "./axios.js";

export const getGarden = () => api.get("/garden", { params: { date: localDateString() } });
export const restorePlant = (plantId) => api.post(`/garden/${plantId}/restore`, { date: localDateString() });