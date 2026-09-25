const lime = [0.847, 1, 0.341, 1] as const;

function layer(name: string, shapes: object[], transform: object, op: number) {
  return {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [100, 100, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
      ...transform,
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

function ring(stroke = 8) {
  return {
    ty: "gr",
    nm: "ring",
    it: [
      { ty: "el", d: 1, s: { a: 0, k: [128, 128] }, p: { a: 0, k: [0, 0] } },
      { ty: "st", c: { a: 0, k: lime }, o: { a: 0, k: 100 }, w: { a: 0, k: stroke }, lc: 2, lj: 2 },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
    ],
  };
}

function check() {
  return {
    ty: "gr",
    nm: "check",
    it: [
      {
        ty: "sh",
        ks: {
          a: 0,
          k: {
            c: false,
            v: [[-34, 4], [-10, 28], [40, -28]],
            i: [[0, 0], [0, 0], [0, 0]],
            o: [[0, 0], [0, 0], [0, 0]],
          },
        },
      },
      {
        ty: "tm",
        s: { a: 0, k: 0 },
        e: { a: 1, k: [{ t: 6, s: [0] }, { t: 18, s: [100] }] },
        o: { a: 0, k: 0 },
        m: 1,
      },
      { ty: "st", c: { a: 0, k: lime }, o: { a: 0, k: 100 }, w: { a: 0, k: 10 }, lc: 2, lj: 2 },
      { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
    ],
  };
}

function animation(name: string, op: number, layers: object[]) {
  return { v: "5.7.4", fr: 30, ip: 0, op, w: 200, h: 200, nm: name, ddd: 0, assets: [], layers };
}

export const motionMoments = {
  "workout-complete": animation("workout-complete", 32, [
    layer("pop", [ring(8), check()], {
      s: {
        a: 1,
        k: [
          { t: 0, s: [72, 72, 100] },
          { t: 12, s: [100, 100, 100] },
        ],
      },
    }, 32),
  ]),
  "rest-complete": animation("rest-complete", 24, [
    layer("rest", [ring(7), check()], {
      o: { a: 1, k: [{ t: 0, s: [0] }, { t: 8, s: [100] }] },
    }, 24),
  ]),
  syncing: animation("syncing", 30, [
    layer("spin", [
      {
        ty: "gr",
        nm: "arc",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [110, 110] }, p: { a: 0, k: [0, 0] } },
          {
            ty: "tm",
            s: { a: 0, k: 0 },
            e: { a: 0, k: 68 },
            o: { a: 0, k: 0 },
            m: 1,
          },
          { ty: "st", c: { a: 0, k: lime }, o: { a: 0, k: 100 }, w: { a: 0, k: 12 }, lc: 2, lj: 2 },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      },
    ], {
      r: {
        a: 1,
        k: [
          { t: 0, s: [0] },
          { t: 30, s: [360] },
        ],
      },
    }, 30),
  ]),
  "empty-progress": animation("empty-progress", 48, [
    layer("bars", [
      {
        ty: "gr",
        nm: "bars",
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [18, 36] }, p: { a: 0, k: [-36, 24] }, r: { a: 0, k: 0 } },
          { ty: "rc", d: 1, s: { a: 0, k: [18, 58] }, p: { a: 0, k: [0, 14] }, r: { a: 0, k: 0 } },
          { ty: "rc", d: 1, s: { a: 0, k: [18, 78] }, p: { a: 0, k: [36, 4] }, r: { a: 0, k: 0 } },
          { ty: "fl", c: { a: 0, k: lime }, o: { a: 0, k: 80 } },
          {
            ty: "tr",
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
      },
    ], {}, 48),
  ]),
} as const;

export type MotionName = keyof typeof motionMoments;

export const motionLoops: Record<MotionName, boolean> = {
  "workout-complete": false,
  "rest-complete": false,
  syncing: true,
  "empty-progress": false,
};
