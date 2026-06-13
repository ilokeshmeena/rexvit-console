export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error(
      `Tauri command "${command}" is unavailable in browser preview.`,
    );
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}
