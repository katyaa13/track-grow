import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, register as apiRegister } from "../api/auth.api.js";
import { getMe } from "../api/users.api.js";
import useStore from "../store/useStore.js";

export function useAuth() {
  const { user, token, setUser, setToken, logout: storeLogout } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    getMe()
      .then((res) => setUser(res.data.data))
      .catch((err) => {
        if (err?.response?.status === 401) storeLogout();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(
    async ({ name, email, password }) => {
      const res = await apiRegister({ username: name, email, password });
      setToken(res.data.data.token);
      setUser(res.data.data.user);
      navigate("/");
    },
    [setToken, setUser, navigate],
  );

  const login = useCallback(
    async ({ email, password }) => {
      const res = await apiLogin({ email, password });
      setToken(res.data.data.token);
      setUser(res.data.data.user);
      navigate("/");
    },
    [setToken, setUser, navigate],
  );

  const logout = useCallback(() => {
    storeLogout();
    navigate("/welcome");
  }, [storeLogout, navigate]);

  return { user, token, register, login, logout };
}
