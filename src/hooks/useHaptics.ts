import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const haptics = {
  light: async () => {
    if (isNative) await Haptics.impact({ style: ImpactStyle.Light });
  },
  medium: async () => {
    if (isNative) await Haptics.impact({ style: ImpactStyle.Medium });
  },
  heavy: async () => {
    if (isNative) await Haptics.impact({ style: ImpactStyle.Heavy });
  },
  success: async () => {
    if (isNative) await Haptics.notification({ type: NotificationType.Success });
  },
  warning: async () => {
    if (isNative) await Haptics.notification({ type: NotificationType.Warning });
  },
  error: async () => {
    if (isNative) await Haptics.notification({ type: NotificationType.Error });
  },
  selection: async () => {
    if (isNative) await Haptics.selectionStart();
  },
};
