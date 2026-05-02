import axios from "axios";

export const API_URL = "http://192.168.1.6:5000"; // CHANGE THIS

export const api = axios.create({
  baseURL: API_URL,
});
