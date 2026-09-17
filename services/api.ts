import axios from "axios";

export const API_URL = "https://abc1.antiguasbakeandcuisine.com"; // CHANGE THIS
//export const API_URL = "http://192.168.1.7:5000";

export const api = axios.create({
  baseURL: API_URL,
});
