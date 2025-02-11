// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import { Middleware } from "polymatic";

import { type MainContext } from "./Main";
import { randomNumber } from "./Calc";
import { Asteroid, Bullet, EXPLODE, LIFE, Orbit, PLANET, Planet, vectDist, type Vector } from "./Data";
import { type FrameLoopEvent } from "./FrameLoop";

export class Space extends Middleware<MainContext> {
  // todo: use timeout?
  time = 0;

  nextOrbitPosition = 0;
  nextAsteroidTime = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("user-start", this.userStart);
    this.on("user-shoot", this.userShoot);
    this.on("frame-update", this.handleFrameUpdate);
  }

  handleActivate = () => {
    this.setContext((context) => {
      context.planet = new Planet();
      context.orbits = [];
      context.bullets = [];
      context.asteroids = [];
    });
  };

  // start/reset game
  userStart = () => {
    this.time = 0;

    this.nextOrbitPosition = 0;
    this.nextAsteroidTime = 0;

    this.context.life = LIFE;
    this.context.score = 0;

    this.context.orbits.length = 0;
    this.context.asteroids.length = 0;
    this.context.bullets.length = 0;

    const orbit = new Orbit(8, 2, this.nextOrbitPosition).first();
    this.context.orbits.push(orbit);

    this.emit("game-start");
  };

  handleFrameUpdate = (ev: FrameLoopEvent) => {
    if (!this.context.planet) return;

    // avoid jumps
    const dt = Math.min(ev.dt, 100);

    // total time
    this.time += dt;

    // if less than 3 orbits and last is ready add another orbit
    if (this.context.orbits.length < 3 && this.context.orbits[this.context.orbits.length - 1]?.ready()) {
      const orbit = new Orbit(8, 2, (this.nextOrbitPosition += 0.4));
      this.context.orbits.push(orbit);
    }

    // tick all orbits
    for (let i = this.context.orbits.length - 1; i >= 0; i--) {
      const orbit = this.context.orbits[i];
      orbit._ready = Math.max(0, orbit._ready - dt);
      const angle = (-orbit.freq * this.time) / 1000 + orbit.offset;
      orbit.x = orbit.radius * Math.sin(angle);
      orbit.y = orbit.radius * Math.cos(angle);
    }

    for (let i = this.context.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.context.asteroids[i];
      asteroid.x += (asteroid.velocity.x * dt) / 1000;
      asteroid.y += (asteroid.velocity.y * dt) / 1000;
      const hit = vectDist(asteroid, this.context.planet) < PLANET;
      if (hit) {
        this.context.life--;
        this.context.asteroids.splice(i, 1);
      }
    }

    for (let i = this.context.bullets.length - 1; i >= 0; i--) {
      const bullet = this.context.bullets[i];
      bullet.x += (bullet.velocity.x * dt) / 1000;
      bullet.y += (bullet.velocity.y * dt) / 1000;
      const hit = vectDist(bullet, bullet.target) < 1;
      if (hit) {
        bullet.exploded = true;
        this.context.bullets.splice(i, 1);
        // todo: call this with 50ms delay
        this.explode(bullet);
      }
    }

    // if it's time to add next asteroid
    if ((this.nextAsteroidTime -= dt) < 0) {
      this.nextAsteroidTime = ((randomNumber(2, 3) * 180) / (this.time / 1000 + 180)) * 1000;
      // create an asteroid at a random angle and radius
      const a = randomNumber(0, 2 * Math.PI);
      const r = randomNumber(120, 180);
      const velocity = randomNumber(0.7, 1.7) * (4 + this.time * 0.00001);
      const asteroid = new Asteroid(
        {
          x: r * Math.sin(a),
          y: r * Math.cos(a),
        },
        this.context.planet,
        velocity,
      );
      this.context.asteroids.push(asteroid);
    }

    this.emit("game-update");

    if (this.context.life == 0) {
      this.emit("game-over");
    }
  };

  userShoot = (target: Vector) => {
    if (this.context.orbits[0].ready()) {
      const bullet = new Bullet(this.context.orbits[0], target, 25);
      this.context.bullets.push(bullet);

      this.context.orbits[0].fired = true;
      this.context.orbits.splice(0, 1);

      if (!this.context.orbits.length) {
        const orbit = new Orbit(8, 2, (this.nextOrbitPosition += 0.4));
        this.context.orbits.push(orbit);
      }
      this.context.orbits[0].first();
    }
  };

  explode = (loc: Vector) => {
    for (let i = this.context.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.context.asteroids[i];
      if (vectDist(asteroid, loc) < EXPLODE) {
        asteroid.exploded = true;
        this.context.asteroids.splice(i, 1);
        // game.life = Math.min(LIFE, game.life + 1);
        this.context.score++;
      }
    }
  };
}
