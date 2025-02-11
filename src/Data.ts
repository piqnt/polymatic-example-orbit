// Copyright (c) Ali Shakiba
// Licensed under the MIT License

import { nanoid } from "nanoid";

export interface Vector {
  x: number;
  y: number;
}

export const PLANET = 6; // planet collision radius
export const EXPLODE = 6; // explode radius
export const RELOAD = 1000; // reload time
export const LIFE = 3;
export class Planet {
  key = "planet-" + nanoid(6);
  type = "planet" as const;

  x = 0;
  y = 0;
}

export class Asteroid {
  key = "asteroid-" + nanoid(6);
  type = "asteroid" as const;

  x: number;
  y: number;
  velocity: Vector;

  exploded = false;

  constructor(from: Vector, planet: Vector, speed: number) {
    this.x = from.x;
    this.y = from.y;

    // calculate velocity vector
    this.velocity = unitVect(
      {
        x: planet.x - from.x,
        y: planet.y - from.y,
      },
      speed,
    );
  }
}

export class Orbit {
  key = "orbit-" + nanoid(6);
  type = "orbit" as const;

  x = 0;
  y = 0;
  _first = false;

  fired = false;
  _ready = RELOAD; // time to reload and ready
  radius: number;
  freq: number;
  offset: number;

  constructor(radius: number, freq: number, offset: number) {
    this.radius = radius;
    this.freq = freq;
    this.offset = offset;
  }

  first = () => {
    this._first = true;
    return this;
  };

  ready = () => {
    return this._ready <= 0;
  };
}

export class Bullet {
  key = "bullet-" + nanoid(6);
  type = "bullet" as const;

  x: number;
  y: number;
  target: Vector;
  velocity: Vector;

  exploded: boolean;
  fired: boolean;

  constructor(from: Vector, target: Vector, speed: number) {
    this.x = from.x;
    this.y = from.y;

    // copy target location
    this.target = { x: target.x, y: target.y };

    // calculate velocity vector
    this.velocity = unitVect(
      {
        x: target.x - from.x,
        y: target.y - from.y,
      },
      speed,
    );
  }
}

// unit vector multiplied
export function unitVect(vect: Vector, m = 1) {
  const length = Math.sqrt(vect.x * vect.x + vect.y * vect.y);
  return {
    x: (vect.x / length) * m,
    y: (vect.y / length) * m,
  };
}

// distance between two point/vector
export function vectDist(a: Vector, b: Vector) {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return Math.sqrt(x * x + y * y);
}
