// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import * as Stage from "stage-js";
import { Binder, Driver, Middleware } from "polymatic";

import { type MainContext } from "./Main";
import { Asteroid, Bullet, LIFE, Orbit, Planet } from "./Data";

class ScreenSwitch extends Stage.Node {
  view = (active: Stage.Node) => {
    if (active.parent() !== this) {
      active.remove().appendTo(this);
    }
    if (!active.visible()) {
      active.show();
    }
    for (let child = this.first(); child; child = child.next()) {
      active !== child && child.visible() && child.hide();
    }
  };
}

export class Terminal extends Middleware<MainContext> {
  screenSwitch: ScreenSwitch;
  playScreen: Stage.Node;
  homeScreen: Stage.Node;
  space: Stage.Node;
  life: Stage.Monotype;
  score: Stage.Monotype;
  startButton: Stage.Sprite;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("frame-render", this.handleFrameRender);
    this.on("game-start", this.handleGameStart);
    this.on("game-over", this.handleGameOver);
  }

  handleActivate = () => {
    const stage = this.context.stage;

    const background = Stage.sprite("background");
    background.pin("align", 0.5);
    background.on("viewport", () => {
      // on viewport change scale it to fill stage
      background.pin({
        scaleMode: "out",
        scaleWidth: stage.width(),
        scaleHeight: stage.height(),
      });
    });
    background.appendTo(stage);

    this.screenSwitch = new ScreenSwitch();
    this.screenSwitch.appendTo(stage);

    this.homeScreen = Stage.component();
    this.homeScreen.on("viewport", () => {
      this.homeScreen.pin({
        width: stage.width(),
        height: stage.height(),
      });
    });
    this.homeScreen.hide();
    this.homeScreen.appendTo(stage);

    this.startButton = Stage.sprite("play");
    this.startButton.pin("align", 0.5);
    this.startButton.on("click", () => this.emit("user-start"));
    this.startButton.appendTo(this.homeScreen);

    this.playScreen = Stage.component();
    this.playScreen.on("viewport", () => {
      this.playScreen.pin({
        width: stage.width(),
        height: stage.height(),
      });
    });
    this.playScreen.hide();
    this.playScreen.appendTo(stage);

    this.space = Stage.component();
    this.space.pin("align", 0.5);
    this.space.appendTo(this.playScreen);

    this.score = Stage.monotype("digit");
    this.score.scale(0.8);

    this.life = Stage.monotype("digit");
    this.life.scale(0.8);

    const topLeft = Stage.row(0);
    topLeft.spacing(2);
    topLeft.pin({
      offset: 2,
      align: 0,
      handle: 0,
    });
    topLeft.appendTo(stage);
    topLeft.append(this.life, this.score);

    this.space.on(Stage.POINTER_DOWN, (point) => {
      this.emit("user-shoot", { x: point.x, y: point.y });
    });
    this.space.attr("spy", true);

    this.screenSwitch.view(this.homeScreen);
  };

  handleGameStart = () => {
    this.screenSwitch.view(this.playScreen);
  };

  handleGameOver = () => {
    this.screenSwitch.view(this.homeScreen);
  };

  handleFrameRender = () => {
    if (!this.context.stage) return;
    this.score?.value(this.context.score);
    this.life?.value(this.context.life);
    this.binder.data([this.context.planet, ...this.context.asteroids, ...this.context.orbits, ...this.context.bullets]);
  };

  planetRenderDriver = Driver.create({
    filter: (obj) => obj.type === "planet",
    enter: (obj: Planet) => {
      const img = Stage.sprite("planet").pin("handle", 0.5);
      img.appendTo(this.space);
      return img;
    },
    update: (obj: Planet, img: Stage.Sprite) => {
      const health = Math.min(1, Math.max(0, Math.pow(this.context.life / LIFE, 2)));
      img.alpha(health);
    },
    exit: (obj: Planet, img: Stage.Sprite) => {
      img.remove();
    },
  });

  asteroidRenderDriver = Driver.create({
    filter: (obj) => obj.type === "asteroid",
    enter: (obj: Asteroid) => {
      const img = Stage.sprite("asteroid").pin("handle", 0.5);
      img.appendTo(this.space);
      return img;
    },
    update: (obj: Asteroid, img: Stage.Sprite) => {
      img.offset(obj);
    },
    exit: (obj: Asteroid, img: Stage.Sprite) => {
      if (obj.exploded) {
        const explosion = Stage.sprite("explosion");
        explosion.appendTo(this.space);
        explosion.pin("handle", 0.5);
        explosion.offset(obj);
        explosion.scale(0.1);
        explosion.tween(100).scale(2).tween(200).alpha(0).remove();
      }
      img.remove();
    },
  });

  orbitRenderDriver = Driver.create({
    filter: (obj) => obj.type === "orbit",
    enter: (obj: Orbit) => {
      const img = Stage.sprite("orbit").pin("handle", 0.5);
      // const ring = Stage.sprite("first").pin("align", 0.5).appendTo(img).hide();
      img.appendTo(this.space);
      return img;
    },
    update: (obj: Orbit, img: Stage.Sprite) => {
      img.offset(obj);
      img.alpha(100 / (obj._ready + 100));
      // ring.alpha(obj._ready <= 0).visible(obj._first);
    },
    exit: (obj: Orbit, img: Stage.Sprite) => {
      img.remove();
    },
  });

  bulletRenderDriver = Driver.create({
    filter: (obj) => obj.type === "bullet",
    enter: (obj: Bullet) => {
      const img = Stage.sprite("bullet").pin("handle", 0.5);
      img.appendTo(this.space);
      return img;
    },
    update: (obj: Bullet, img: Stage.Sprite) => {
      img.offset(obj);
    },
    exit: (obj: Bullet, img: Stage.Sprite) => {
      if (obj.exploded) {
        const explosion = Stage.sprite("explosion");
        explosion.appendTo(this.space);
        explosion.pin("handle", 0.5);
        explosion.offset(obj);
        explosion.scale(0.1);
        explosion.tween(50).scale(1).tween(200).alpha(0).remove();
      }
      img.remove();
    },
  });

  binder = Binder.create<Planet | Asteroid | Orbit | Bullet>({
    key: (object) => object.key,
    drivers: [this.planetRenderDriver, this.asteroidRenderDriver, this.orbitRenderDriver, this.bulletRenderDriver],
  });
}
