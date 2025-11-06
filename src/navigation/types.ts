import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<DrawerParamList>;
  Canvas: { artworkId?: string };
};

export type DrawerParamList = {
  Gallery: undefined;
  Settings: undefined;
  Trash: undefined;
  Premium: undefined;
  About: undefined;
};
