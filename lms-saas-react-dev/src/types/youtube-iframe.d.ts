export {};

declare global {
  interface Window {
    YT: YT.PlayerStatic;
    onYouTubeIframeAPIReady: () => void;
  }
}
