export function registerGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    console.error("Unhandled runtime error", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection", event.reason);
  });
}

