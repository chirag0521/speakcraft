import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// The component was originally written for Claude's artifact runtime,
// which provides a `window.storage` API for saving the streak, vocab
// bank, etc. A normal browser doesn't have that, so this polyfills the
// same shape using localStorage, so the app's code needs no changes.
window.storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    if (v === null) throw new Error("not found");
    return { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix) {
    const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
    return { keys };
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
