// Copyright (c) Ali Shakiba
// Licensed under the MIT License

export const randomNumber = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};
