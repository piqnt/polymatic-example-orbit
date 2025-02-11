// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import * as Stage from "stage-js";
import { Middleware } from "polymatic";

import { type MainContext } from "./Main";

import bgImage from "../media/bg.png";
import digitImage from "../media/digit.png";
import mainImage from "../media/main.png";

export class Loader extends Middleware<MainContext> {
  constructor() {
    super();
    this.on("activate", this.handleActivated);
  }

  handleActivated = async () => {
    await Stage.atlas({
      image: { src: bgImage, ratio: 8 },
      name: "background",
    });

    await Stage.atlas({
      image: { src: mainImage, ratio: 8 },
      textures: {
        "planet": { x: 0, y: 0, width: 12, height: 12 },
        "play": { x: 0, y: 16, width: 12, height: 12 },
        "explosion": { x: 12, y: 0, width: 12, height: 12 },
        "orbit": { x: 0, y: 12, width: 4, height: 4 },
        "first": { x: 4, y: 12, width: 4, height: 4 },
        "asteroid": { x: 8, y: 12, width: 4, height: 4 },
        "bullet": { x: 12, y: 12, width: 4, height: 4 },
      },
    });

    await Stage.atlas({
      image: { src: digitImage, ratio: 8 },
      ppu: 8,
      textures: {
        "digit": {
          "0": { x: 0, y: 0, width: 0.7, height: 1 },
          "1": { x: 1, y: 0, width: 0.7, height: 1 },
          "2": { x: 2, y: 0, width: 0.7, height: 1 },
          "3": { x: 3, y: 0, width: 0.7, height: 1 },
          "4": { x: 4, y: 0, width: 0.7, height: 1 },
          "5": { x: 5, y: 0, width: 0.7, height: 1 },
          "6": { x: 6, y: 0, width: 0.7, height: 1 },
          "7": { x: 7, y: 0, width: 0.7, height: 1 },
          "8": { x: 8, y: 0, width: 0.7, height: 1 },
          "9": { x: 9, y: 0, width: 0.7, height: 1 },
          "-": { x: 10, y: 0, width: 0.7, height: 1 },
          "+": { x: 11, y: 0, width: 0.8, height: 1 },
        },
      },
    });

    const stage = Stage.mount();
    stage.viewbox(150, 150);
    this.setContext((context) => {
      context.stage = stage;
    });
    this.emit("stage-ready");
  };
}
