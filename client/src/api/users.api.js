import api from "./axios.js";

export const getMe = () => api.get("/users/me");
export const updateMe = (data) => api.put("/users/me", data);
