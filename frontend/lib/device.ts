import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'spartan_device_id';

function uuid() {
  // RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = uuid();
      await AsyncStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}
