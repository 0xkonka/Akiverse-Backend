import {
  choiceMultiple,
  compareArrays,
  getRandomInt,
  groupBy,
  makeCompare,
  parseBoolean,
  asPartial,
  shuffle,
} from "../src/utils";

describe("compareArrays", () => {
  it("[0, 100] < [1, 0]", () => {
    expect(compareArrays([0, 100], [1, 0])).toBeLessThan(0);
  });

  it("[1, 2] = [1, 2]", () => {
    expect(compareArrays([1, 2], [1, 2])).toBe(0);
  });

  it("[1, 3] > [1, 2]", () => {
    expect(compareArrays([1, 3], [1, 2])).toBeGreaterThan(0);
  });
});

type MakeCompareTest = {
  a: number;
  b: number;
  c: number;
  order: number;
};
describe("makeCompare", () => {
  it("makeCompare", () => {
    const testArray: MakeCompareTest[] = [
      {
        a: 1,
        b: 3,
        c: 1,
        order: 3,
      },
      {
        a: 1,
        b: 2,
        c: 1,
        order: 2,
      },
      {
        a: 2,
        b: 1,
        c: 1,
        order: 4,
      },
      {
        a: 3,
        b: 3,
        c: 2,
        order: 6,
      },
      {
        a: 3,
        b: 2,
        c: 1,
        order: 5,
      },
      {
        a: 1,
        b: 1,
        c: 1,
        order: 1,
      },
    ];
    const toArray = (a: MakeCompareTest): number[] => {
      return [a.a, a.b, a.c];
    };
    testArray.sort(makeCompare(toArray));
    let i = 0;
    for (const item of testArray) {
      i++;
      expect(item.order).toEqual(i);
    }
  });
});

describe("groupBy", () => {
  it("[0, 1, 3, 1, 4] grouped by parity: [[0], [1, 3, 1], [4]]", () => {
    expect(groupBy([0, 1, 3, 1, 4], (x) => x % 2)).toEqual([
      [0],
      [1, 3, 1],
      [4],
    ]);
  });

  it("[] grouped by parity: []", () => {
    expect(groupBy([], (x) => x % 2)).toEqual([]);
  });
});

describe("shuffle", () => {
  it("shuffle", () => {
    const before = ["a", "b", "c", "d", "e", "f", "g"];
    const after = shuffle(before);
    expect(after).not.toEqual(before);
  });
});

describe("choiceMultiple", () => {
  function save(n: number, map: Map<number, number>): void {
    const before = map.get(n);
    if (before) {
      map.set(n, before + 1);
    } else {
      map.set(n, 1);
    }
  }
  it("random", () => {
    const returnCounterMap = new Map<number, number>();
    const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (let i = 0; i < 1000; i++) {
      const retArray = choiceMultiple(testArray, 3);
      expect(retArray).toHaveLength(3);
      const first = retArray[0];
      const second = retArray[1];
      const third = retArray[2];

      // 重複がないこと
      expect(first).not.toEqual(second);
      expect(first).not.toEqual(third);
      expect(second).not.toEqual(third);

      // Mapに出現回数を保存
      retArray.forEach((value) => {
        save(value, returnCounterMap);
      });
    }

    returnCounterMap.forEach((value) => {
      expect(value).toBeGreaterThan(200);
    });
  });
});

describe("getRandomInt", () => {
  it("random", () => {
    let zero = 0;
    let one = 0;
    let two = 0;
    let three = 0;
    for (let i = 0; i < 1000; i++) {
      const ret = getRandomInt(0, 3);
      switch (ret) {
        case 0:
          zero++;
          break;
        case 1:
          one++;
          break;
        case 2:
          two++;
          break;
        case 3:
          three++;
          break;
      }
    }
    expect(zero).toBeGreaterThan(100);
    expect(one).toBeGreaterThan(100);
    expect(two).toBeGreaterThan(100);
    expect(three).toBeGreaterThan(100);
  });
});

describe("parseBoolean", () => {
  type Test = {
    input: string | undefined;
    expected: boolean | undefined;
  };
  const tests: Array<Test> = [
    { input: "True", expected: true },
    { input: "true", expected: true },
    { input: "TRUE", expected: true },
    { input: "Trueview", expected: undefined },
    { input: "False", expected: false },
    { input: "false", expected: false },
    { input: "FALSE", expected: false },
    { input: "Falsey", expected: undefined },
    { input: "", expected: undefined },
    { input: undefined, expected: undefined },
  ];

  for (const test of tests) {
    it(`input:${test.input} expect:${test.expected}`, () => {
      expect(parseBoolean(test.input)).toEqual(test.expected);
    });
  }
});

describe("asPartial", () => {
  it("removes keys with falsy values", () => {
    expect(asPartial({ a: 1, b: null })).toEqual({ a: 1 });
  });
});
