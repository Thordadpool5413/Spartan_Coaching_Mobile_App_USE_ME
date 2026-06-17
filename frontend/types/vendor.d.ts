declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';

  export const Ionicons: ComponentType<any> & {
    glyphMap: Record<string, number>;
  };
}

declare module 'expo-blur' {
  import type { ComponentType } from 'react';

  export const BlurView: ComponentType<any>;
}

declare module 'react-native-markdown-display' {
  import type { ComponentType } from 'react';

  const Markdown: ComponentType<any>;
  export default Markdown;
}
