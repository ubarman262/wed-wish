import { api } from "./api";

const TOKEN_KEY = "wedwish_guest_token";
const GUEST_KEY = "wedwish_guest";

export const getGuest = () => {
  const raw = localStorage.getItem(GUEST_KEY);
  return raw ? JSON.parse(raw) : null;
};
export const getGuestToken = () => localStorage.getItem(TOKEN_KEY);
export const hasGuest = () => !!getGuestToken();

export const saveGuest = (token, guest) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
};

export const clearGuest = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GUEST_KEY);
};

export const identifyGuest = async (body) => {
  const { data } = await api.post("/guests/identify", body);
  saveGuest(data.token, data.guest);
  return data.guest;
};
