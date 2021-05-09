export const format = <T>(x: any): string | T => {
  try {
    return new Intl.NumberFormat().format(x);
  } catch (err) {
    return x;
  }
};
