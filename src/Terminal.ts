// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import { Container, Sprite, type FederatedPointerEvent, type Texture } from "pixi.js";
import { Binder, Driver, Middleware } from "polymatic";
import { TransitionManager } from "@piqnt/transition";

import { type MainContext } from "./Main";
import { Asteroid, Bullet, LIFE, Orbit, Planet, type Vector } from "./Data";
import { type FrameLoopEvent } from "./FrameLoop";

// the smaller screen dimension is fitted to this many scene units
const VIEWBOX_WIDTH = 150;
const VIEWBOX_HEIGHT = 150;

const HUD_MARGIN = 2;
const HUD_SPACING = 2;
const HUD_SCALE = 0.8;

export class Terminal extends Middleware<MainContext> {
  background: Sprite;
  homeScreen: Container;
  playScreen: Container;
  space: Container;
  hud: Container;
  life: DigitText;
  score: DigitText;

  transitionManager = new TransitionManager();

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on("frame-render", this.handleFrameRender);
    this.on("game-start", this.handleGameStart);
    this.on("game-over", this.handleGameOver);
  }

  handleActivate = () => {
    const pixi = this.context.pixi;
    const scene = this.context.scene;
    const textures = this.context.textures;

    this.background = new Sprite(textures.background);
    this.background.anchor.set(0.5);
    scene.addChild(this.background);

    // home screen: play button at the center
    this.homeScreen = new Container();
    scene.addChild(this.homeScreen);

    const startButton = new Sprite(textures.play);
    startButton.anchor.set(0.5);
    startButton.eventMode = "static";
    startButton.cursor = "pointer";
    startButton.on("pointertap", () => this.emit("user-start"));
    this.homeScreen.addChild(startButton);

    // play screen: space with the origin at the center
    this.playScreen = new Container();
    scene.addChild(this.playScreen);

    this.space = new Container();
    this.playScreen.addChild(this.space);

    // life and score at the top-left corner
    this.hud = new Container();
    scene.addChild(this.hud);

    this.life = new DigitText(textures.digits);
    this.life.scale.set(HUD_SCALE);
    this.hud.addChild(this.life);

    this.score = new DigitText(textures.digits);
    this.score.scale.set(HUD_SCALE);
    this.hud.addChild(this.score);

    // receive pointer events anywhere on the screen, not just on sprites
    pixi.stage.eventMode = "static";
    pixi.stage.hitArea = pixi.screen;
    pixi.stage.on("pointerdown", this.handlePointerDown);

    pixi.renderer.on("resize", this.handleViewport);
    this.handleViewport();

    this.showScreen(this.homeScreen);
  };

  handleDeactivate = () => {
    this.context.pixi?.renderer.off("resize", this.handleViewport);
  };

  /**
   * Fit the viewbox inside the screen, center scene origin on the screen,
   * cover the screen with the background, and place the hud at the top-left corner.
   */
  handleViewport = () => {
    const pixi = this.context.pixi;
    const scene = this.context.scene;

    const screenWidth = pixi.screen.width;
    const screenHeight = pixi.screen.height;

    const scale = Math.min(screenWidth / VIEWBOX_WIDTH, screenHeight / VIEWBOX_HEIGHT);
    scene.scale.set(scale);
    scene.position.set(screenWidth / 2, screenHeight / 2);

    // visible area in scene units
    const width = screenWidth / scale;
    const height = screenHeight / scale;

    const texture = this.background.texture;
    this.background.scale.set(Math.max(width / texture.width, height / texture.height));

    this.hud.position.set(-width / 2 + HUD_MARGIN, -height / 2 + HUD_MARGIN);
  };

  showScreen = (screen: Container) => {
    this.homeScreen.visible = screen === this.homeScreen;
    this.playScreen.visible = screen === this.playScreen;
  };

  handleGameStart = () => {
    this.showScreen(this.playScreen);
  };

  handleGameOver = () => {
    this.showScreen(this.homeScreen);
  };

  handlePointerDown = (e: FederatedPointerEvent) => {
    if (!this.playScreen.visible) return;
    const point = this.space.toLocal(e.global);
    this.emit("user-shoot", { x: point.x, y: point.y });
  };

  handleFrameRender = (ev: FrameLoopEvent) => {
    this.life.setValue(this.context.life);
    this.score.setValue(this.context.score);
    this.score.position.x = this.life.position.x + this.life.width + HUD_SPACING;

    this.binder.data([this.context.planet, ...this.context.asteroids, ...this.context.orbits, ...this.context.bullets]);
    this.transitionManager.update(ev.dt);
  };

  explode = (point: Vector, grow: number, scale: number) => {
    const explosion = new Sprite(this.context.textures.explosion);
    explosion.anchor.set(0.5);
    explosion.position.set(point.x, point.y);
    explosion.scale.set(0.1);
    this.space.addChild(explosion);
    this.transitionManager
      .select(explosion)
      .tween(grow)
      .to({ scale: { x: scale, y: scale } })
      .tween(200)
      .to({ alpha: 0 })
      .done(() => {
        explosion.removeFromParent();
        explosion.destroy();
      });
  };

  planetRenderDriver = Driver.create({
    filter: (obj) => obj.type === "planet",
    enter: (obj: Planet) => {
      const img = new Sprite(this.context.textures.planet);
      img.anchor.set(0.5);
      this.space.addChild(img);
      return img;
    },
    update: (obj: Planet, img: Sprite) => {
      const health = Math.min(1, Math.max(0, Math.pow(this.context.life / LIFE, 2)));
      img.alpha = health;
    },
    exit: (obj: Planet, img: Sprite) => {
      img.removeFromParent();
      img.destroy();
    },
  });

  asteroidRenderDriver = Driver.create({
    filter: (obj) => obj.type === "asteroid",
    enter: (obj: Asteroid) => {
      const img = new Sprite(this.context.textures.asteroid);
      img.anchor.set(0.5);
      this.space.addChild(img);
      return img;
    },
    update: (obj: Asteroid, img: Sprite) => {
      img.position.set(obj.x, obj.y);
    },
    exit: (obj: Asteroid, img: Sprite) => {
      if (obj.exploded) {
        this.explode(obj, 100, 2);
      }
      img.removeFromParent();
      img.destroy();
    },
  });

  orbitRenderDriver = Driver.create({
    filter: (obj) => obj.type === "orbit",
    enter: (obj: Orbit) => {
      const img = new Sprite(this.context.textures.orbit);
      img.anchor.set(0.5);
      this.space.addChild(img);
      return img;
    },
    update: (obj: Orbit, img: Sprite) => {
      img.position.set(obj.x, obj.y);
      img.alpha = 100 / (obj._ready + 100);
    },
    exit: (obj: Orbit, img: Sprite) => {
      img.removeFromParent();
      img.destroy();
    },
  });

  bulletRenderDriver = Driver.create({
    filter: (obj) => obj.type === "bullet",
    enter: (obj: Bullet) => {
      const img = new Sprite(this.context.textures.bullet);
      img.anchor.set(0.5);
      this.space.addChild(img);
      return img;
    },
    update: (obj: Bullet, img: Sprite) => {
      img.position.set(obj.x, obj.y);
    },
    exit: (obj: Bullet, img: Sprite) => {
      if (obj.exploded) {
        this.explode(obj, 50, 1);
      }
      img.removeFromParent();
      img.destroy();
    },
  });

  binder = Binder.create<Planet | Asteroid | Orbit | Bullet>({
    key: (object) => object.key,
    drivers: [this.planetRenderDriver, this.asteroidRenderDriver, this.orbitRenderDriver, this.bulletRenderDriver],
  });
}

/**
 * Renders a number as a row of digit sprites.
 */
class DigitText extends Container {
  digits: Record<string, Texture>;
  value: string | null = null;

  constructor(digits: Record<string, Texture>) {
    super();
    this.digits = digits;
  }

  setValue(value: number | string | undefined) {
    const text = value === undefined || value === null ? "" : String(value);
    if (text === this.value) return;
    this.value = text;

    this.removeChildren().forEach((child) => child.destroy());
    let x = 0;
    for (const char of text) {
      const texture = this.digits[char];
      if (!texture) continue;
      const sprite = new Sprite(texture);
      sprite.position.x = x;
      this.addChild(sprite);
      x += texture.width;
    }
  }
}
