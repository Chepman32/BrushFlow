import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<DrawerParamList>;
  Canvas: { artworkId?: string; projectId?: string | null };
};

export type DrawerParamList = {
  Gallery: undefined;
  Settings: undefined;
  Trash: undefined;
  Premium: undefined;
  About: undefined;
};
