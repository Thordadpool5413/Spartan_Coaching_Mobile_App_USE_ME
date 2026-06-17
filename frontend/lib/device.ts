import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'spartan_device_id';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let _memoryFallback: string | null = null;

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = _memoryFallback ?? uuid();
      _memoryFallback = id;
      try {
        await AsyncStorage.setItem(KEY, id);
      } catch (writeErr) {
        console.warn('[device] AsyncStorage write failed, using in-memory ID:', writeErr);
      }
    } else {
      _memoryFallback = id;
    }
    return id;
  } catch (readErr) {
    console.warn('[device] AsyncStorage read failed, using in-memory fallback:', readErr);
    if (!_memoryFallback) {
      _memoryFallback = uuid();
    }
    return _memoryFallback;
  }
}
