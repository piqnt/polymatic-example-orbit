// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import * as Stage from "stage-js";
import { Middleware } from "polymatic";

import { Asteroid, Bullet, Orbit, Planet } from "./Data";
import { Space } from "./Space";
import { Loader } from "./Loader";
import { Terminal } from "./Terminal";
import { FrameLoop } from "./FrameLoop";

export interface MainContext {
  stage?: Stage.Root;

  score?: number;
  life?: number;

  planet?: Planet;
  orbits?: Orbit[];
  bullets?: Bullet[];
  asteroids?: Asteroid[];
}

export class Main extends Middleware<MainContext> {
  constructor() {
    super();
    this.use(new FrameLoop());
    this.use(new Loader());
    this.on("stage-ready", this.handleStageRead);
  }
  handleStageRead = () => {
    this.use(new Terminal());
    this.use(new Space());
  };
}
