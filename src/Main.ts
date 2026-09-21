// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import { type Application, type Container } from "pixi.js";
import { Middleware } from "polymatic";

import { Asteroid, Bullet, Orbit, Planet } from "./Data";
import { Space } from "./Space";
import { PixiManager, type Textures } from "./PixiManager";
import { Terminal } from "./Terminal";
import { FrameLoop } from "./FrameLoop";

export interface MainContext {
  pixi?: Application;
  scene?: Container;
  textures?: Textures;

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
    this.use(new PixiManager());
    this.on("pixi-ready", this.handlePixiReady);
  }
  handlePixiReady = () => {
    this.use(new Terminal());
    this.use(new Space());
  };
}
