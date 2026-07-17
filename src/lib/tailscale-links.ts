export const TAILSCALE_LINKS = {
  download: "https://tailscale.com/download",
  mac: "https://tailscale.com/docs/install/mac",
  linux: "https://tailscale.com/docs/install/linux",
  windows: "https://tailscale.com/docs/install/windows",
  serve: "https://tailscale.com/docs/features/tailscale-serve",
} as const;

export const TAILSCALE_SERVE_COMMAND =
  "tailscale serve --bg http://127.0.0.1:8642";
