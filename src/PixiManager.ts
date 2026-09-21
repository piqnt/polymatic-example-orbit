// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import { Application, Assets, Container, Rectangle, Texture } from "pixi.js";
import { Middleware } from "polymatic";

import { type MainContext } from "./Main";
import { type FrameLoopEvent } from "./FrameLoop";

import bgImage from "../media/bg.png";
import digitImage from "../media/digit.png";
import mainImage from "../media/main.png";

export interface Textures {
  background: Texture;
  planet: Texture;
  play: Texture;
  explosion: Texture;
  orbit: Texture;
  first: Texture;
  asteroid: Texture;
  bullet: Texture;
  digits: Record<string, Texture>;
}

/**
 * Creates and owns the Pixi application, loads textures, and drives Pixi's
 * ticker from the FrameLoop so there is a single loop.
 */
export class PixiManager extends Middleware<MainContext> {
  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on("frame-after", this.handleFrameAfter);
  }

  handleActivate = async () => {
    // Textures
    // Images are loaded at pixel ratio 8, frames below are in scene units (8 pixels).
    const background = await Assets.load<Texture>({ src: bgImage, data: { resolution: 8 } });
    const mainAtlas = await Assets.load<Texture>({ src: mainImage, data: { resolution: 8 } });
    const digitAtlas = await Assets.load<Texture>({ src: digitImage, data: { resolution: 8 } });

    const frame = (atlas: Texture, x: number, y: number, width: number, height: number) =>
      new Texture({
        source: atlas.source,
        frame: new Rectangle(x, y, width, height),
      });

    // digits are 8 units apart, each 0.7 (or 0.8 for "+") wide and 1 unit high, in 8 unit cells
    const digitPpu = 8;
    const digits: Record<string, Texture> = {};
    "0123456789-+".split("").forEach((char, index) => {
      const width = char === "+" ? 0.8 : 0.7;
      digits[char] = frame(digitAtlas, index * digitPpu, 0, width * digitPpu, digitPpu);
    });

    const textures: Textures = {
      background,
      planet: frame(mainAtlas, 0, 0, 12, 12),
      play: frame(mainAtlas, 0, 16, 12, 12),
      explosion: frame(mainAtlas, 12, 0, 12, 12),
      orbit: frame(mainAtlas, 0, 12, 4, 4),
      first: frame(mainAtlas, 4, 12, 4, 4),
      asteroid: frame(mainAtlas, 8, 12, 4, 4),
      bullet: frame(mainAtlas, 12, 12, 4, 4),
      digits,
    };

    const pixi = new Application();
    await pixi.init({
      resizeTo: window,
      backgroundAlpha: 0,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      // ticker is updated manually in handleFrameAfter, see FrameLoop
      autoStart: false,
    });
    document.body.appendChild(pixi.canvas);

    // scene container, scaled and centered by Terminal to fit the viewbox
    const scene = new Container();
    pixi.stage.addChild(scene);

    this.setContext((context) => {
      context.pixi = pixi;
      context.scene = scene;
      context.textures = textures;
    });

    this.emit("pixi-ready");
  };

  handleDeactivate = () => {
    this.context.pixi?.destroy({ removeView: true }, { children: true });
  };

  handleFrameAfter = (ev: FrameLoopEvent) => {
    if (!this.context.pixi) return;
    // runs ticker listeners and then renders the stage
    this.context.pixi.ticker.update(ev.now);
  };
}
