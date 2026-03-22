/** Custom High-Fidelity Aesthetic for Bridge Extension. */
export const SIDEBAR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

  :root {
    --br-bg: #121212;
    --br-card: #27272a;
    --br-card-dark: #18181b;
    --br-card-black: #09090b;
    --br-text: #f4f4f5;
    --br-text-muted: #a1a1aa;
    --br-primary: #34d399;
    --br-primary-hover: #10b981;
    --br-danger: #ef4444;
    --br-warning: #f97316;
    --br-border: #3f3f46;
    --vscode-font-family: 'Outfit', sans-serif;
  }

  * { box-sizing: border-box; }
  body {
    font-family: 'Outfit', -apple-system, sans-serif;
    color: var(--br-text);
    background: var(--br-bg);
    padding: 0 0 60px 0; /* space for bottom nav */
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
  }
  
  .content-pad {
    padding: 16px;
  }

  h2 { margin: 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;}
  h3 { margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--br-text-muted); }
  p { margin: 0 0 12px 0; opacity: 0.9; }
  
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px;
    background: var(--br-card-black);
    border-bottom: 1px solid var(--br-card);
  }

  .logo-text {
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo-svg { color: var(--br-primary); margin-top: -2px; }

  .status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .status-locked {
    background: rgba(239, 68, 68, 0.15);
    color: var(--br-danger);
    border: 1px solid rgba(239, 68, 68, 0.4);
  }
  .status-unlocked {
    background: rgba(52, 211, 153, 0.15);
    color: var(--br-primary);
    border: 1px solid rgba(52, 211, 153, 0.4);
  }

  .card {
    background: var(--br-card);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  .card-dark {
    background: var(--br-card-black);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .card-warning {
    background: rgba(249, 115, 22, 0.1);
    border: 1px solid rgba(249, 115, 22, 0.2);
  }
  .card-warning .warning-title {
    color: var(--br-warning);
    font-weight: 600;
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 4px;
  }
  .card-warning .warning-text { color: color-mix(in srgb, var(--br-warning) 80%, white); font-size: 12px; margin: 0; }

  .gate-label { font-size: 11px; color: var(--br-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .gate-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }

  textarea, input[type="text"], input[type="number"] {
    width: 100%;
    min-height: 80px;
    background: var(--br-card-black);
    color: var(--br-text);
    border: 1px solid var(--br-border);
    border-radius: 8px;
    padding: 12px;
    font-family: inherit;
    font-size: 13px;
    resize: vertical;
    transition: border-color 0.2s;
  }
  textarea:focus, input[type="text"]:focus {
    outline: none;
    border-color: var(--br-primary);
  }
  input[type="text"], input[type="number"] { min-height: 40px; resize: none; }
  
  .chat-input-wrapper {
    position: relative;
    border-radius: 8px;
    background: var(--br-card-black);
    border: 1px solid var(--br-border);
    display: flex; align-items: center;
    padding-right: 12px;
  }
  .chat-input-wrapper textarea {
    border: none;
    background: transparent;
    min-height: 50px;
    margin: 0;
  }
  .chat-input-wrapper textarea:focus { border-color: transparent; }
  .chat-submit-icon {
    color: var(--br-primary);
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 4px;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s;
  }
  .chat-submit-icon:hover { transform: scale(1.1); }

  .code-block {
    background: var(--br-card-black);
    border-left: 2px solid var(--br-primary);
    padding: 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    overflow-x: auto;
    margin-bottom: 12px;
    color: #a6e22e;
  }

  .option {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 8px; cursor: pointer;
    background: var(--br-card-black);
    margin-bottom: 8px;
    border: 1px solid transparent;
    transition: all 0.2s;
  }
  .option:hover { border-color: var(--br-border); }
  .custom-radio {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid var(--br-text-muted);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .option input { display: none; }
  .option span { flex: 1; font-size: 13px; }
  .option.selected {
    border-color: var(--br-primary);
  }
  .option.selected .custom-radio {
    border-color: var(--br-primary);
  }
  .option.selected .custom-radio::after {
    content: '';
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--br-primary);
  }

  button {
    background: var(--br-primary);
    color: #000;
    border: none; padding: 12px 16px; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 600;
    width: 100%;
    display: flex; justify-content: center; align-items: center; gap: 8px;
    transition: background 0.2s;
  }
  button:hover { background: var(--br-primary-hover); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .badge-inserted {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(52, 211, 153, 0.15);
    color: var(--br-primary);
    padding: 6px 10px; border-radius: 4px;
    font-size: 11px; font-weight: 600; margin-bottom: 12px;
  }

  /* Bottom Nav */
  .bottom-nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 56px;
    background: var(--br-card-black);
    border-top: 1px solid var(--br-border);
    display: flex; justify-content: space-around; align-items: center;
    z-index: 100;
  }
  .nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    color: var(--br-text-muted);
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    cursor: pointer;
  }
  .nav-item.active { color: var(--br-primary); border-top: 2px solid var(--br-primary); padding-top: 6px; margin-top: -8px; }
  .nav-item svg { width: 22px; height: 22px; }

  .feedback { margin-top: 12px; padding: 12px; border-radius: 8px; font-size: 12px; }
  .feedback.ok { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: var(--br-primary); }
  .feedback.err { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--br-danger); }

  .mentor-header { display: flex; align-items: center; gap: 8px; color: var(--br-text-muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; margin-top: 24px;}
  .mentor-header svg { color: var(--br-primary); }
  
  .mentor-thread {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
  }

  .mentor-box {
    font-size: 13px;
    white-space: pre-wrap;
    line-height: 1.5;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--br-border);
  }

  .mentor-box-assistant {
    background: var(--br-card);
    color: var(--br-text);
  }

  .mentor-box-user {
    background: rgba(52, 211, 153, 0.12);
    border-color: rgba(52, 211, 153, 0.3);
    color: var(--br-text);
    margin-left: 20px;
  }

  .mentor-box-resource {
    background: var(--br-card-black);
    color: var(--br-text);
  }

  .mentor-box-loading {
    opacity: 0.8;
  }

  .mentor-stepper {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mentor-stepper-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .mentor-stepper-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(52, 211, 153, 0.14);
    color: var(--br-primary);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mentor-stepper-count {
    color: var(--br-text-muted);
    font-size: 11px;
    font-weight: 600;
  }

  .mentor-stepper-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 14px;
  }

  .mentor-stepper-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--br-text);
    margin-bottom: 8px;
  }

  .mentor-stepper-body {
    font-size: 13px;
    color: var(--br-text);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .mentor-stepper-meta {
    margin-top: 10px;
    color: var(--br-text-muted);
    font-size: 11px;
  }

  .mentor-stepper-controls {
    display: flex;
    gap: 10px;
  }

  .mentor-stepper-btn {
    width: auto;
    flex: 1;
    min-width: 0;
  }

  .mentor-stepper-btn-secondary {
    background: transparent;
    color: var(--br-text);
    border: 1px solid var(--br-border);
  }

  .mentor-stepper-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  
  .hidden { display: none !important; }
`;
