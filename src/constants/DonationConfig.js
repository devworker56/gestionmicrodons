// constants/DonationConfig.js
export const DONATION_CONFIG = {
  // Session timeout in seconds (matches ESP32)
  SESSION_TIMEOUT_SECONDS: 90,
  
  // Warning threshold in seconds (when to show "expiring soon" message)
  // ESP32 warns at 60 seconds elapsed = 30 seconds remaining
  WARNING_THRESHOLD_SECONDS: 30,
  
  // Warning trigger value (countdown value when warning should appear)
  // When countdown reaches this value, show warning
  WARNING_TRIGGER: 31, // 30 seconds remaining + 1 for the condition logic
  
  // Wake-up timeout in milliseconds (how long QRScanner waits for session)
  WAKEUP_TIMEOUT_MS: 15000, // 15 seconds
  
  // Canadian coin values (hardcoded in ESP32)
  COIN_VALUES: {
    NICKEL: 0.05,
    DIME: 0.10,
    QUARTER: 0.25,
    LOONIE: 1.00,
    TOONIE: 2.00
  },
  
  // Tax credit rates (Canadian federal)
  TAX_CREDIT: {
    FIRST_TIER: {
      THRESHOLD: 200,
      RATE: 0.15
    },
    SECOND_TIER_RATE: 0.29
  }
};