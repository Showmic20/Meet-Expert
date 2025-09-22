// types/react-native-onboarding-swiper.d.ts
declare module 'react-native-onboarding-swiper' {
  import * as React from 'react';
  import { StyleProp, ViewStyle, TextStyle } from 'react-native';

  export type OnboardingPage = {
    backgroundColor: string;
    image?: React.ReactNode;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
  };

  export interface OnboardingProps {
    pages: OnboardingPage[];

    onSkip?: () => void;
    onDone?: () => void;
    skipToPage?: number;

    showSkip?: boolean;
    showNext?: boolean;
    showDone?: boolean;

    // Buttons & dots
    SkipButtonComponent?: React.ComponentType<any>;
    NextButtonComponent?: React.ComponentType<any>;
    DoneButtonComponent?: React.ComponentType<any>;
    DotComponent?: React.ComponentType<any>;

    // Styling
    bottomBarColor?: string;
    containerStyles?: StyleProp<ViewStyle>;
    imageContainerStyles?: StyleProp<ViewStyle>;
    titleStyles?: StyleProp<TextStyle>;
    subTitleStyles?: StyleProp<TextStyle>;

    // Behavior
    transitionAnimationDuration?: number;
  }

  export default class Onboarding extends React.Component<OnboardingProps> {}
}
