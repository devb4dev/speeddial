"import axios from \"axios\";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const apiClient = axios.create({
  baseURL: API,
  timeout: 20000,
});

export const getNotifications = (params = {}) =>
  apiClient.get(\"/notifications\", { params }).then((r) => r.data);

export const getCourses = () =>
  apiClient.get(\"/notifications/courses\").then((r) => r.data.courses || []);

export const subscribe = (payload) =>
  apiClient.post(\"/subscribe\", payload).then((r) => r.data);

export const getStats = () => apiClient.get(\"/admin/stats\").then((r) => r.data);
export const getSubscribers = () =>
  apiClient.get(\"/admin/subscribers\").then((r) => r.data);
export const getLogs = () => apiClient.get(\"/admin/logs\").then((r) => r.data);
export const getQueue = () => apiClient.get(\"/admin/queue\").then((r) => r.data);
export const triggerScrape = () =>
  apiClient.post(\"/admin/scrape-now\").then((r) => r.data);
"
