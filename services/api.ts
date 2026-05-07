import axios from "axios";

//export const API_URL = "https://abc-pos-api-production.up.railway.app"; // CHANGE THIS
export const API_URL = "http://192.168.1.2:5000";

export const api = axios.create({
  baseURL: API_URL,
});
