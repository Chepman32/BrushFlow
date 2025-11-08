declare module 'react-native-vector-icons/Feather' {
  const Feather: any;
  export default Feather;
}

declare module 'utif' {
  export function encodeImage(
    rgba: ArrayBuffer | Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    metadata?: Record<string, any>,
  ): ArrayBuffer;
}
