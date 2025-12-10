// React hook for native haptic feedback
// Provides easy-to-use haptic triggers for common UI interactions

import { useCallback } from "react";
import { 
  lightTap, 
  mediumTap, 
  heavyTap, 
  successFeedback, 
  errorFeedback,
  selection,
  impact,
  notification
} from "@/lib/nativeHaptics";

export function useNativeHaptics() {
  // Common UI interactions
  const onButtonPress = useCallback(() => lightTap(), []);
  const onSend = useCallback(() => mediumTap(), []);
  const onNewChat = useCallback(() => mediumTap(), []);
  const onModeSwitch = useCallback(() => lightTap(), []);
  const onCopy = useCallback(() => lightTap(), []);
  const onGenerate = useCallback(() => mediumTap(), []);
  const onSidebarToggle = useCallback(() => lightTap(), []);
  const onSuccess = useCallback(() => successFeedback(), []);
  const onError = useCallback(() => errorFeedback(), []);
  const onSelect = useCallback(() => selection(), []);
  
  return {
    // Pre-bound actions
    onButtonPress,
    onSend,
    onNewChat,
    onModeSwitch,
    onCopy,
    onGenerate,
    onSidebarToggle,
    onSuccess,
    onError,
    onSelect,
    
    // Raw access for custom patterns
    impact,
    notification,
    selection,
    lightTap,
    mediumTap,
  };
}
